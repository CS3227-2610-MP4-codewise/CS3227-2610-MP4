#!/usr/bin/env python3
"""Independent project experiment tracking. Standard library only; no model calls."""
import argparse
import contextlib
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shlex
import sqlite3
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recording import Recording

VERSION = 2
OWNER = "Codewise experiment tracker"
EVENTS = ("SessionStart", "SessionEnd", "SubagentStart", "SubagentStop", "Stop",
          "Interrupt", "PreToolUse", "PostToolUse", "PreCompact", "PostCompact",
          "UserPromptSubmit", "PreModelRequest", "PostModelRequest")
COUNTERS = ("input_tokens", "cached_input_tokens", "output_tokens",
            "reasoning_output_tokens", "total_tokens")
ANNOTATIONS = ("experiment", "assignment", "context", "blocked", "unblocked", "idle",
               "active", "handoff", "review", "conflict", "decision", "retry",
               "rework", "verification", "acceptance", "overhead")
SAFE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$")


def now():
    return datetime.now(timezone.utc).isoformat()


def identifier(value):
    if not isinstance(value, str) or not SAFE.fullmatch(value):
        raise ValueError("Invalid identifier (use short letters, digits, dots, dashes or slashes)")
    return value


def slug(value):
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value) or len(value) > 90:
        raise ValueError("Increment/checkpoint must be a short kebab-case identifier")
    return value


def safe_text(value, limit=3000):
    if not isinstance(value, str) or len(value) > limit or "\x00" in value:
        raise ValueError("Annotation must be bounded redacted text")
    return value


def inside(path, roots):
    p = Path(path).resolve()
    return any(p == r or r in p.parents for r in roots)


def write_atomic(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(content, encoding="utf-8")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def counts(raw):
    if not isinstance(raw, dict):
        return None
    result = {}
    for k in COUNTERS:
        v = raw.get(k)
        result[k] = v if isinstance(v, int) and not isinstance(v, bool) and v >= 0 else None
    if all(v is None for v in result.values()):
        return None
    for subset, full in (("cached_input_tokens", "input_tokens"),
                         ("reasoning_output_tokens", "output_tokens")):
        if result[subset] is not None and result[full] is not None and result[subset] > result[full]:
            raise ValueError("Usage subset exceeds parent counter")
    return result


class Tracker(Recording):
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.state = self.root / ".experiment-tracker"
        if self.state.is_symlink():
            raise ValueError('Private tracker directory must not be a symlink')
        self.state.mkdir(mode=0o700, exist_ok=True)
        self.db = sqlite3.connect(self.state / "tracker.sqlite3", timeout=2)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS roots(path TEXT PRIMARY KEY);
          CREATE TABLE IF NOT EXISTS increments(
            id TEXT PRIMARY KEY,title TEXT NOT NULL,requirements TEXT NOT NULL,
            hypothesis TEXT NOT NULL,comparison_group TEXT NOT NULL,created TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS sessions(
            id TEXT PRIMARY KEY,increment_id TEXT REFERENCES increments(id),parent TEXT,
            cwd TEXT,client TEXT,created TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS sources(
            path TEXT PRIMARY KEY,session_id TEXT UNIQUE REFERENCES sessions(id),
            offset INTEGER NOT NULL DEFAULT 0,prefix TEXT,state TEXT NOT NULL DEFAULT '{}',
            warning TEXT,last_sync TEXT);
          CREATE TABLE IF NOT EXISTS records(
            id TEXT PRIMARY KEY,source TEXT NOT NULL,session_id TEXT NOT NULL,
            turn_id TEXT,ts TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL);
          CREATE INDEX IF NOT EXISTS record_session ON records(session_id,kind);
          CREATE TABLE IF NOT EXISTS annotations(
            id TEXT PRIMARY KEY,increment_id TEXT NOT NULL REFERENCES increments(id),
            session_id TEXT,agent TEXT NOT NULL,task TEXT,dependency TEXT,
            kind TEXT NOT NULL,ts TEXT NOT NULL,data TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS checkpoints(
            increment_id TEXT NOT NULL,id TEXT NOT NULL,created TEXT NOT NULL,
            PRIMARY KEY(increment_id,id));
          CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        """)
        self.migrate_recording()
        self.db.execute("INSERT OR IGNORE INTO roots VALUES (?)", (str(self.root),))
        self.db.commit()
        os.chmod(self.state / "tracker.sqlite3", 0o600)

    def roots(self):
        return [Path(r[0]) for r in self.db.execute("SELECT path FROM roots")]

    def scoped(self, cwd):
        return isinstance(cwd, str) and inside(cwd, self.roots())

    def session(self, sid, cwd=None, parent=None):
        identifier(sid)
        if cwd is not None and not self.scoped(cwd):
            raise ValueError("Session cwd is outside registered project roots")
        if parent:
            identifier(parent)
            if not self.db.execute("SELECT 1 FROM sessions WHERE id=?", (parent,)).fetchone():
                raise ValueError("Parent session must be registered first")
            ancestor = parent
            while ancestor:
                if ancestor == sid:
                    raise ValueError('Session ancestry cannot contain cycles')
                ancestor = self.db.execute('SELECT parent FROM sessions WHERE id=?', (ancestor,)).fetchone()
                ancestor = ancestor[0] if ancestor else None
            old = self.db.execute('SELECT parent FROM sessions WHERE id=?', (sid,)).fetchone()
            if old and old[0] and old[0] != parent:
                raise ValueError('Conflicting parent attribution')
        self.db.execute("INSERT OR IGNORE INTO sessions(id,cwd,parent,created) VALUES (?,?,?,?)",
                        (sid, cwd, parent, now()))
        self.db.execute("UPDATE sessions SET cwd=COALESCE(?,cwd),parent=COALESCE(?,parent) WHERE id=?",
                        (cwd, parent, sid))
        if parent:
            self.db.execute("UPDATE sessions SET increment_id=(SELECT increment_id FROM sessions WHERE id=?) "
                            "WHERE id=? AND increment_id IS NULL", (parent, sid))

    def put(self, rid, source, sid, turn, ts, kind, data):
        entry = self.admission(sid,turn)
        if not entry:
            return
        self.db.execute("INSERT OR IGNORE INTO records(id,source,session_id,turn_id,ts,kind,data,run_id,window_id) VALUES (?,?,?,?,?,?,?,?,?)",
                        (entry['run_id']+':'+rid,source,sid,turn,ts,kind,json.dumps(data,sort_keys=True),entry['run_id'],entry['window_id']))

    def start(self, increment, title, requirements="", hypothesis="", group="", session=None, role="coordinator", label="Coordinator"):
        slug(increment)
        if not session:
            raise ValueError('Start requires an explicit session and attached active turn')
        identifier(session);identifier(role);safe_text(label,150)
        self.current_turn(session)  # Refuse without creating increment/log when identity is unknown.
        self.db.execute("INSERT OR IGNORE INTO increments VALUES (?,?,?,?,?,?)",
                        (increment,safe_text(title),safe_text(requirements),safe_text(hypothesis),safe_text(group),now()))
        self.db.commit()
        self.open_recording(increment,session,role,label)
        self.ensure_log(increment)

    def ensure_log(self, increment):
        item = self.db.execute("SELECT * FROM increments WHERE id=?", (increment,)).fetchone()
        if not item:
            raise ValueError("Start the increment first")
        path = self.root / "logs" / "keith" / (slug(increment) + ".md")
        if not inside(path, [self.root / 'logs' / 'keith']) or path.is_symlink():
            raise ValueError('Member log must stay inside Keith logs')
        import fcntl
        with (self.state / 'log.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            if not path.exists():
                template = self.root / "workflow/templates/member-log.md"
                if not template.exists():
                    raise ValueError("Keith member-log template missing")
                body = template.read_text().replace("# Increment title", "# " + item['title'], 1)
                body = body.replace("Name the human owner, bounded objective, OpenSpec change/requirement IDs, and branch/PR if known.",
                                    f"Keith — {item['title']}. Requirements: {item['requirements'] or 'unavailable'}. Increment: `{increment}`.", 1)
                write_atomic(path, body)
        return path

    def attach(self, path, parent=None):
        path = Path(path).expanduser().resolve()
        if path.suffix != ".jsonl":
            raise ValueError("Only uncompressed JSONL transcripts are supported")
        with path.open('rb') as f:
            first = f.readline(2 * 1024 * 1024)
        try:
            record = json.loads(first)
        except (ValueError, UnicodeError):
            raise ValueError("Missing valid session metadata") from None
        meta = record.get("payload", {})
        if record.get("type") != "session_meta" or not isinstance(meta, dict):
            raise ValueError("First record must be session_meta")
        if not self.scoped(meta.get("cwd")):
            raise ValueError("Transcript cwd is outside registered project roots")
        sid = identifier(meta.get("id") or meta.get("session_id"))
        self.session(sid, meta["cwd"], parent)
        client = meta.get('cli_version')
        if isinstance(client, str):
            self.db.execute("UPDATE sessions SET client=? WHERE id=?", (safe_text(client, 100), sid))
        existing = self.db.execute("SELECT path FROM sources WHERE session_id=?", (sid,)).fetchone()
        if existing and existing[0] != str(path):
            raise ValueError("Session already has a registered source")
        self.db.execute("INSERT OR IGNORE INTO sources(path,session_id) VALUES (?,?)", (str(path), sid))
        self.db.commit()
        return sid

    def annotate(self, increment, kind, data, agent="main", session=None, task=None, dependency=None, aid=None, ts=None):
        if kind not in ANNOTATIONS:
            raise ValueError("Unknown annotation kind")
        # Explicit summaries only: arbitrary nested/raw payloads are not accepted.
        allowed = {"summary", "rationale", "outcome", "evidence", "files", "context_strategy",
                   "instruction_version", "severity", "confounders", "next_action", "task_type", "window"}
        if not isinstance(data, dict) or set(data) - allowed:
            raise ValueError("Unknown annotation fields")
        data = {k: safe_text(v) for k, v in data.items()}
        for value in (agent, session, task, dependency):
            if value is not None:
                identifier(value)
        stamp = datetime.fromisoformat((ts or now()).replace('Z', '+00:00'))
        if stamp.tzinfo is None:
            raise ValueError('Annotation timestamps require an explicit timezone')
        stamp = stamp.astimezone(timezone.utc).isoformat()
        self.db.execute("INSERT OR IGNORE INTO annotations VALUES (?,?,?,?,?,?,?,?,?)",
                        (identifier(aid or uuid.uuid4().hex), slug(increment), session, agent, task,
                         dependency, kind, stamp, json.dumps(data)))
        self.db.commit()

    def sync(self):
        started = time.monotonic()
        queued = 0
        for file in sorted((self.state / "queue").glob("*.json")):
            try:
                event = json.loads(file.read_text())
                if not self.scoped(event.get('cwd')):
                    file.unlink()
                    continue
                sid = event['session_id']
                entry = self.admission(sid,event.get('turn_id'))
                if not entry or entry['run_id'] != event.get('run_id'):
                    file.unlink()
                    continue
                self.put(event['event_id'], 'hook', sid, event.get('turn_id'), event['timestamp'], 'hook', event)
                self.db.commit()
                transcript = event.get('transcript_path')
                if transcript:
                    with contextlib.suppress(OSError, ValueError):
                        self.attach(transcript)
                child_path = event.get('agent_transcript_path')
                if child_path:
                    with contextlib.suppress(OSError, ValueError):
                        self.attach(child_path, sid)
                file.unlink()
                queued += 1
            except (ValueError, KeyError, OSError, sqlite3.Error):
                self.db.rollback()
                # Keep failed queue items for diagnosis; never persist the raw error/payload.
                continue
        for source in self.db.execute("SELECT * FROM sources WHERE session_id IN (SELECT session_id FROM members)").fetchall():
            try:
                self.import_source(source)
            except (OSError, ValueError, sqlite3.Error):
                self.db.rollback()
                self.db.execute("UPDATE sources SET warning=?,last_sync=? WHERE path=?",
                                ('Source unavailable or unsupported; inspect locally', now(), source['path']))
                self.db.commit()
        self.db.execute("INSERT OR REPLACE INTO settings VALUES ('last_sync',?)",
                        (json.dumps({'timestamp': now(), 'duration_ms': round((time.monotonic()-started)*1000, 2),
                                     'queued': queued}),))
        self.db.commit()
        return queued

    def import_source(self, source):
        # Source admission and controls share a write lock, so a stale recording
        # read cannot admit a new turn after pause/stop freezes the run.
        self.db.execute('BEGIN IMMEDIATE')
        path, sid = Path(source['path']), source['session_id']
        # Revalidate scope even for previously registered files (including replacement/symlinks).
        with path.open('rb') as f:
            header = f.readline(2 * 1024 * 1024)
            meta = json.loads(header).get('payload', {})
            if not self.scoped(meta.get('cwd')) or (meta.get('id') or meta.get('session_id')) != sid:
                raise ValueError("Source identity/scope changed")
            digest = hashlib.sha256(header).hexdigest()
            offset = source['offset']
            state = json.loads(source['state'])
            # A tail checkpoint detects same-header rewrite as well as truncation.
            tail = state.get('tail')
            if offset:
                f.seek(max(0, offset - 256))
                observed_tail = hashlib.sha256(f.read(min(offset, 256))).hexdigest()
            else:
                observed_tail = None
            if source['prefix'] != digest or path.stat().st_size < offset or (tail and tail != observed_tail):
                # Source replay must never erase the preserved v1/unbounded archive.
                self.db.execute("DELETE FROM records WHERE source=? AND run_id IS NOT NULL", (str(path),))
                # Terminal/abort flags are derived from this session's source.
                # Keep explicit partial finalization (terminal already NULL),
                # but require fresh terminal evidence when rebuilding records.
                self.db.execute("""UPDATE admitted SET
                    partial=CASE WHEN terminal IS NULL THEN partial ELSE 0 END,
                    terminal=NULL WHERE session_id=?""", (sid,))
                offset, state = 0, {}
            f.seek(offset)
            warnings = set(state.get('warnings', []))
            while True:
                position = f.tell()
                line = f.readline(16 * 1024 * 1024 + 1)
                if not line:
                    break
                if not line.endswith(b'\n'):
                    if len(line) > 16 * 1024 * 1024:
                        raise ValueError("Oversized source record")
                    break  # A writer may still be appending this record.
                offset = f.tell()
                try:
                    record = json.loads(line)
                    self.import_record(sid, str(path), position, record, state)
                except (ValueError, TypeError, KeyError):
                    warnings.add('Malformed/unsupported records skipped; coverage partial')
            f.seek(max(0, offset-256))
            state['tail'] = hashlib.sha256(f.read(min(offset, 256))).hexdigest()
            warnings.update(state.get('warnings',[]))
            state['warnings'] = sorted(warnings)
            self.db.execute("UPDATE sources SET offset=?,prefix=?,state=?,warning=?,last_sync=? WHERE path=?",
                            (offset, digest, json.dumps(state), '; '.join(sorted(warnings)) or None, now(), str(path)))
        self.db.commit()

    def import_record(self, sid, source, position, record, state):
        if not isinstance(record,dict) or not isinstance(record.get('payload',{}),dict):
            raise ValueError('Invalid metadata record')
        p=record.get('payload',{});rt=record.get('type');pt=p.get('type')
        ts=record.get('timestamp') or now()
        turn=p.get('turn_id') or state.get('turn')
        if turn: identifier(turn)
        if rt=='turn_context':
            state['turn']=turn
            state['model']=safe_text(p.get('model') or 'unavailable',150)
            state['effort']=safe_text(p.get('effort') or 'unavailable',100)
        if rt=='event_msg' and pt=='task_started':
            state['initial_turn']=turn if 'initial_turn' not in state else state['initial_turn']
            state['turn']=turn
            state['fallback_ready']=bool(state.get('total')) and turn==state.get('initial_turn')
            self.admit_started(sid,turn,ts)
        entry=self.admission(sid,turn)
        rid=f"{sid}:{position}:{rt}"
        if rt=='token_usage_record':
            if entry:
                usage=counts(p.get('usage'));response=p.get('response_id')
                if usage and response:
                    identifier(response)
                    state.setdefault('response_turns',[])
                    if turn not in state['response_turns']: state['response_turns'].append(turn)
                    self.db.execute("DELETE FROM records WHERE session_id=? AND turn_id=? AND kind='usage_fallback' AND run_id IS NOT NULL",(sid,turn))
                    self.put(f"{sid}:response:{response}",source,sid,turn,ts,'usage',
                             {**usage,'model':state.get('model','unavailable'),'effort':state.get('effort','unavailable'),'method':'response_id'})
        elif rt=='event_msg' and pt=='token_count':
            total=counts((p.get('info') or {}).get('total_token_usage'))
            if total:
                previous=state.get('total')
                # Zero is safe only for the very first source turn. Across boundaries,
                # the first cumulative sample establishes a baseline; never charge a gap.
                ready=state.get('fallback_ready') or turn==state.get('initial_turn') and previous is None
                if entry and turn not in state.get('response_turns',[]) and ready:
                    previous=previous or {k:0 for k in COUNTERS}
                    delta={k:total[k]-previous[k] if total[k] is not None and previous.get(k) is not None else None for k in COUNTERS}
                    if any(v is not None and v<0 for v in delta.values()):
                        raise ValueError('Cumulative counters reset')
                    if any(v for v in delta.values()):
                        self.put(rid,source,sid,turn,ts,'usage_fallback',
                                 {**delta,'model':state.get('model','unavailable'),'effort':state.get('effort','unavailable'),'method':'cumulative_delta'})
                elif entry and turn not in state.get('response_turns',[]):
                    state.setdefault('warnings',[])
                    message='Boundary cumulative sample excluded: exact delta unavailable; coverage partial'
                    if message not in state['warnings']:state['warnings'].append(message)
                state['total']=total
                state['fallback_ready']=True
        elif entry and rt=='event_msg' and pt in ('task_started','task_complete','turn_aborted'):
            self.put(rid,source,sid,turn,ts,'lifecycle',{'event':pt})
            if pt!='task_started': self.terminal(sid,turn,pt)
        elif entry and rt=='compacted':
            self.put(rid,source,sid,turn,ts,'compaction',{})
        elif entry and rt=='response_item' and pt in ('function_call','custom_tool_call'):
            call=p.get('call_id')
            if call:
                self.put(f"{sid}:call:{identifier(call)}",source,sid,turn,ts,'tool',
                         {'name':safe_text(p.get('name') or 'unavailable',200),'call_id':call})
        # All message/tool bodies and excluded-turn usage are discarded, not stored.

    def snapshot(self, increment=None):
        runs=[dict(r) for r in self.db.execute('SELECT * FROM runs ORDER BY created')
              if increment is None or r['increment_id']==increment]
        run_ids={r['id'] for r in runs}
        member_ids={r['session_id'] for r in self.db.execute('SELECT * FROM members') if r['run_id'] in run_ids}
        sessions = [dict(r) for r in self.db.execute('SELECT * FROM sessions ORDER BY created,id')
                    if r['id'] in member_ids]
        for item in sessions:
            item['increment_id']=next((r['increment_id'] for r in reversed(runs) if self.db.execute('SELECT 1 FROM members WHERE run_id=? AND session_id=?',(r['id'],item['id'])).fetchone()),None)
        ids = {r['id'] for r in sessions}
        records = []
        for r in self.db.execute('SELECT * FROM records ORDER BY ts,id'):
            if r['run_id'] in run_ids:
                records.append({**dict(r), 'data': json.loads(r['data'])})
        annotations = [{**dict(r), 'data': json.loads(r['data'])} for r in self.db.execute('SELECT * FROM annotations ORDER BY ts,id')
                       if increment is None or r['increment_id'] == increment]
        # Source paths are intentionally omitted from presentation/export data.
        sources = [{'session_id': r['session_id'], 'warning': r['warning'], 'last_sync': r['last_sync']}
                   for r in self.db.execute('SELECT * FROM sources') if r['session_id'] in ids]
        usage = [r for r in records if r['kind'] in ('usage', 'usage_fallback')]
        totals = {k: sum(r['data'][k] for r in usage if r['data'].get(k) is not None)
                  if usage and all(r['data'].get(k) is not None for r in usage) else None for k in COUNTERS}
        complete = {(r['session_id'], r['turn_id']) for r in records
                    if r['kind'] == 'lifecycle' and r['data']['event'] == 'task_complete'}
        provisional = any((r['session_id'], r['turn_id']) not in complete for r in usage) or any(r['terminal'] is None and not r['partial'] for r in self.db.execute('SELECT * FROM admitted') if r['run_id'] in run_ids)
        # Hook-only completion is advisory, not proof the final response usage was imported.
        gaps = ['Active/idle time and unnecessary retries require annotations; silence is not evidence.',
                'Client hook coverage is observational, not guaranteed; unknown fields are unavailable.',
                'Only admitted turns count; excluded conversation may still appear as context in later project requests.',
                'No causal savings or monetary cost inferred. Comparisons require equivalent scope and quality.']
        legacy_count=self.db.execute('SELECT count(*) FROM records WHERE run_id IS NULL').fetchone()[0]
        if legacy_count: gaps.append(f'{legacy_count} legacy/unbounded records retained but excluded from totals.')
        if any(r['partial'] for r in runs): gaps.append('Explicit partial finalization or aborted turn: coverage incomplete.')
        if any(r['state'].startswith('draining-') for r in runs): gaps.append('Draining: pending turns require source terminal evidence or explicit partial finalization.')
        missing = ids - {s['session_id'] for s in sources}
        if missing:
            gaps.append(f'{len(missing)} session(s) have no registered transcript; token coverage incomplete.')
        if any(s['warning'] for s in sources):
            gaps.append('Source warnings: token coverage partial; totals represent observed records only.')
        partial = bool(missing or any(s['warning'] for s in sources) or any(r['partial'] for r in runs))
        if any(r['kind'] == 'usage_fallback' for r in usage):
            gaps.append('Cumulative fallback: request-level attribution unavailable.')
        blocked = {}
        waits = []
        for a in annotations:
            key = (a['increment_id'], a['session_id'], a['agent'], a['task'], a['dependency'])
            if a['kind'] == 'blocked':
                blocked.setdefault(key, a['ts'])
            elif a['kind'] == 'unblocked' and key in blocked:
                start = blocked.pop(key)
                seconds = (datetime.fromisoformat(a['ts'].replace('Z', '+00:00')) -
                           datetime.fromisoformat(start.replace('Z', '+00:00'))).total_seconds()
                if seconds >= 0:
                    waits.append({'increment_id': a['increment_id'], 'session_id': a['session_id'],
                                  'agent': a['agent'], 'task': a['task'], 'seconds': seconds})
        if blocked:
            gaps.append('Open blocked intervals: duration unavailable until an unblocked annotation.')
        assignments = {a['agent'] for a in annotations if a['kind'] == 'assignment'}
        checks = [{'rule': 'Assignment exists for linked child', 'agent': s['id'],
                   'increment_id': s['increment_id'],
                   'result': 'pass' if s['id'] in assignments else 'unknown'} for s in sessions if s['parent']]
        owners = {}
        for a in annotations:
            if a['kind'] == 'assignment':
                for file in a['data'].get('files', '').split(','):
                    file = file.strip()
                    if file:
                        owners.setdefault((a['increment_id'], a['data'].get('window', 'increment'), file), set()).add(a['agent'])
        for (inc, window, file), agents in owners.items():
            checks.append({'rule': 'Exclusive ownership (annotated window)', 'file': file,
                           'increment_id': inc, 'window': window,
                           'result': 'pass' if len(agents) == 1 else 'fail: overlapping assignments'})
        for a in annotations:
            if a['kind'] in ('handoff', 'verification', 'review'):
                checks.append({'rule': a['kind'] + ' evidence/outcome recorded', 'annotation': a['id'],
                               'increment_id': a['increment_id'],
                               'result': 'pass' if a['data'].get('evidence') and a['data'].get('outcome') else 'unknown'})
            if a['kind'] == 'assignment' and a['dependency']:
                ready = [r for r in annotations if r['increment_id'] == a['increment_id']
                         and r['task'] == a['dependency'] and r['kind'] in ('handoff', 'verification')
                         and r['data'].get('outcome', '').lower() in ('pass', 'accepted', 'complete')
                         and r['data'].get('evidence') and r['ts'] <= a['ts']]
                checks.append({'rule': 'Dependency evidence before assignment trigger', 'annotation': a['id'],
                               'increment_id': a['increment_id'],
                               'result': 'pass' if ready else 'unknown'})
        tool_names = {}
        for r in records:
            if r['kind'] == 'tool':
                name = r['data']['name']
                tool_names[name] = tool_names.get(name, 0) + 1
        safe_records = []
        for r in records:
            d = dict(r['data'])
            for k in ('cwd', 'transcript_path', 'agent_transcript_path', 'event_id'):
                d.pop(k, None)
            safe_records.append({k: v for k, v in {**r, 'data': d}.items() if k != 'source'})
        return {'version': VERSION, 'generated': now(), 'classification': 'private metadata and redacted annotations',
                'increments': [dict(r) for r in self.db.execute('SELECT * FROM increments')
                               if increment is None or r['id'] == increment],
                'sessions': [{k: v for k, v in s.items() if k != 'cwd'} for s in sessions],
                'runs':runs,'windows':[dict(r) for r in self.db.execute('SELECT * FROM windows') if r['run_id'] in run_ids],
                'admitted_turns':[dict(r) for r in self.db.execute('SELECT * FROM admitted') if r['run_id'] in run_ids],
                'roles':[dict(r) for r in self.db.execute('SELECT * FROM roles ORDER BY id') if r['run_id'] in run_ids],
                'legacy':{'classification':'legacy/unbounded','excluded_records':legacy_count},
                'sources': sources, 'totals': totals, 'status': 'partial' if partial else 'provisional' if provisional else 'observed-complete' if usage else 'unavailable',
                'cache_ratio': totals['cached_input_tokens'] / totals['input_tokens'] if totals['input_tokens'] and totals['cached_input_tokens'] is not None else None,
                'reasoning_output_ratio': totals['reasoning_output_tokens'] / totals['output_tokens'] if totals['output_tokens'] and totals['reasoning_output_tokens'] is not None else None,
                'records': safe_records, 'annotations': annotations, 'blocked_intervals': waits,
                'coordination_checks': checks, 'repeated_tool_candidates': {k:v for k,v in tool_names.items() if v > 1},
                'coverage': gaps, 'tracker_overhead': json.loads(self.db.execute("SELECT value FROM settings WHERE key='last_sync'").fetchone()[0])
                if self.db.execute("SELECT 1 FROM settings WHERE key='last_sync'").fetchone() else None}

    def checkpoint(self, increment, checkpoint, request, results, evidence="", next_action=""):
        slug(checkpoint)
        path = self.ensure_log(increment)
        marker = f"<!-- experiment-checkpoint:{increment}:{checkpoint} -->"
        # Lock across processes; filesystem marker is authoritative after a crash before DB commit.
        import fcntl
        with (self.state / 'log.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            body = path.read_text()
            if marker in body:
                return path
            s = self.snapshot(increment)
            value = lambda k: str(s['totals'][k]) if s['totals'][k] is not None else 'unavailable'
            addition = (f"\n\n{marker}\n## Request\n\n{safe_text(request)}\n\n## Results\n\n"
                        f"- Checkpoint: {now()} (`{checkpoint}`); owner: Keith.\n"
                        f"- Changes and why: {safe_text(results)}\n"
                        f"- Contributor / agent responsibilities: see linked experiment annotations; no inferred agent activity.\n"
                        f"- Measured usage: input {value('input_tokens')}; cached input subset {value('cached_input_tokens')}; "
                        f"output {value('output_tokens')}; reasoning output subset {value('reasoning_output_tokens')}; total {value('total_tokens')}.\n"
                        f"- Coverage/status: {s['status']}; {len(s['sessions'])} linked sessions, {len(s['runs'])} bounded runs. "
                        "Only admitted turns count; legacy unbounded totals are excluded. Totals are cumulative for this increment; do not add checkpoint totals together.\n"
                        f"- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.\n"
                        f"- Evidence or handoff links: {safe_text(evidence) or 'unavailable'}.\n"
                        f"- Remaining limitations and next owner: {safe_text(next_action) or 'Keith; inspect report coverage before acceptance'}.\n")
            write_atomic(path, body + addition)
            self.db.execute('INSERT OR IGNORE INTO checkpoints VALUES (?,?,?)', (increment, checkpoint, now()))
            self.db.commit()
        return path


def enqueue(root, raw):
    """Gate admission before persistence, serialized with lifecycle commands."""
    started=time.monotonic()
    if not isinstance(raw,dict):return False
    root=Path(root).resolve();state=root/'.experiment-tracker';dbpath=state/'tracker.sqlite3'
    if not dbpath.exists():return False  # Hooks never create or activate a tracker.
    with contextlib.closing(sqlite3.connect(dbpath,timeout=.5)) as db:
        db.row_factory=sqlite3.Row
        version=db.execute("SELECT value FROM settings WHERE key='version'").fetchone()
        if not version or version[0]!='2':return False
        gate=object.__new__(Tracker);gate.root=root;gate.state=state;gate.db=db
        cwd=raw.get('cwd');event=raw.get('hook_event_name');sid=raw.get('session_id');turn=raw.get('turn_id')
        if not gate.scoped(cwd) or event not in EVENTS or not isinstance(sid,str) or not isinstance(turn,str):return False
        identifier(sid);identifier(turn)
        db.execute('BEGIN IMMEDIATE')
        entry=gate.admission(sid,turn)
        run=gate.run_for(sid)
        if not entry:
            if not run or run['state']!='recording':return False
            # Verify a source-bearing callback rather than guessing a child's/current turn.
            path=raw.get('transcript_path')
            if path and isinstance(path,str):
                path=Path(path).expanduser().resolve()
                if path.suffix!='.jsonl':return False
                with path.open('rb') as f:header=json.loads(f.readline(2*1024*1024))
                meta=header.get('payload',{})
                if header.get('type')!='session_meta' or (meta.get('id') or meta.get('session_id'))!=sid or not gate.scoped(meta.get('cwd')):return False
                existing=db.execute('SELECT path FROM sources WHERE session_id=?',(sid,)).fetchone()
                if existing and existing[0]!=str(path):return False
                db.execute('INSERT OR IGNORE INTO sources(path,session_id) VALUES (?,?)',(str(path),sid))
            if gate.current_turn(sid)!=turn:return False
            # Only prompt/model start can admit a fresh turn. Late results cannot activate it.
            if event not in ('UserPromptSubmit','PreModelRequest'):return False
            entry=gate.admit(run,sid,turn,now())
        if not entry:return False
        safe={'hook_event_name':event,'session_id':sid,'turn_id':turn,'cwd':str(Path(cwd).resolve()),
              'timestamp':now(),'run_id':entry['run_id'],'window_id':entry['window_id']}
        for key in ('tool_use_id','agent_id','agent_type','model'):
            value=raw.get(key)
            if isinstance(value,str) and SAFE.fullmatch(value):safe[key]=value
        if event=='SubagentStart' and safe.get('agent_id'):
            gate.link_child(sid,turn,safe['agent_id'])
        for key in ('transcript_path','agent_transcript_path'):
            value=raw.get(key)
            if isinstance(value,str) and len(value)<4096:safe[key]=str(Path(value).expanduser().resolve())
        if isinstance(raw.get('tool_name'),str):safe['tool_name']=safe_text(raw['tool_name'],200)
        if raw.get('status') in ('completed','failed','cancelled'):safe['status']=raw['status']
        response=raw.get('tool_response')
        if isinstance(response,dict):
            if isinstance(response.get('exit_code'),int):safe['exit_code']=response['exit_code']
            if isinstance(response.get('isError'),bool):safe['is_error']=response['isError']
        identity=[sid,event,turn,safe.get('tool_use_id'),safe.get('agent_id')]
        safe['event_id']=hashlib.sha256(json.dumps(identity).encode()).hexdigest() if safe.get('tool_use_id') else uuid.uuid4().hex
        safe['enqueue_ms']=round((time.monotonic()-started)*1000,2)
        # Persist while holding the admission lock: pause/stop cannot cross this write.
        queue=state/'queue';queue.mkdir(mode=0o700,exist_ok=True)
        write_atomic(queue/(safe['event_id']+'.json'),json.dumps(safe))
        db.commit()
        return True


def hook_config(root, install=True, target=None):
    path = Path(target or root) / '.codex/hooks.json'
    if path.is_symlink():
        raise ValueError('Refuse symlink hook configuration')
    config = json.loads(path.read_text()) if path.exists() else {}
    if not install and not path.exists():
        return path
    hooks = config.setdefault('hooks', {})
    if not isinstance(hooks, dict):
        raise ValueError('Unsupported hook configuration')
    command = (shlex.quote(sys.executable) + ' ' + shlex.quote(str(Path(root) / 'workflow/experiment-tracker/tracker.py'))
               + ' --root ' + shlex.quote(str(Path(root))) + ' hook')
    for event in EVENTS:
        groups = hooks.get(event, [])
        if not isinstance(groups, list):
            raise ValueError('Unsupported hook groups')
        kept = []
        for group in groups:
            remaining = [h for h in group.get('hooks', []) if not
                         (h.get('statusMessage') == OWNER and 'workflow/experiment-tracker/tracker.py' in h.get('command', ''))]
            if remaining or remaining == group.get('hooks', []):
                kept.append({**group, 'hooks': remaining})
        if install:
            kept.append({'hooks': [{'type': 'command', 'command': command, 'timeout': 3, 'statusMessage': OWNER}]})
        if kept:
            hooks[event] = kept
        else:
            hooks.pop(event, None)
    write_atomic(path, json.dumps(config, indent=2) + '\n')
    return path


def doctor(tracker):
    path = tracker.root / '.codex/hooks.json'
    installed = False
    if path.exists():
        data = json.loads(path.read_text())
        installed = any(h.get('statusMessage') == OWNER for groups in data.get('hooks', {}).values()
                        for g in groups for h in g.get('hooks', []))
    try:
        client = subprocess.run(['codex', '--version'], capture_output=True, text=True, timeout=3).stdout.strip() or 'unavailable'
    except (OSError, subprocess.TimeoutExpired):
        client = 'unavailable'
    observed = sorted({json.loads(r[0]).get('hook_event_name') for r in tracker.db.execute("SELECT data FROM records WHERE kind='hook'")})
    return {'python': sys.version.split()[0], 'sqlite': sqlite3.sqlite_version, 'client': client,
            'project_hooks_installed': installed, 'observed_hook_events': observed,
            'hook_support': 'observed only for listed events; restart and review /hooks after installation',
            'source_adapter': 'session_meta JSONL; response token_usage_record or cumulative token_count fallback',
            'registered_sources': tracker.db.execute('SELECT count(*) FROM sources').fetchone()[0],
            'pending_queue': len(list((tracker.state / 'queue').glob('*.json'))),
            'recording_default':'off; explicit start/resume required',
            'recording_runs':[dict(r) for r in tracker.db.execute('SELECT id,increment_id,root,state,partial FROM runs')],
            'scope': 'admitted turns only; attached sources do not activate collection',
            'limits': 'compressed transcripts, unknown schemas, request costs and inferred idle time unavailable'}


def report(tracker, destination=None):
    data = tracker.snapshot()
    template = (Path(__file__).parent / 'report.html').read_text()
    encoded = json.dumps(data).replace('<', '\\u003c').replace('&', '\\u0026')
    path = Path(destination) if destination else tracker.state / 'report.html'
    template, replaced = re.subn(r'/\*DATA\*/\s*null', lambda _: encoded, template)
    if replaced != 1:
        raise ValueError('Missing unique dashboard data marker')
    write_atomic(path, template)
    return path


def export_summary(tracker, increment, directory):
    snapshot = tracker.snapshot(increment)
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    # No request records or source paths leave local state. Annotations must be redacted by their author.
    summary = {k:v for k,v in snapshot.items() if k not in ('records',)}
    summary['measurement_groups'] = [
        {'source_record_id': r['id'], 'session_id': r['session_id'], 'turn_id': r['turn_id'],
         'run_id': r['run_id'], 'window_id': r['window_id'],
         'method': r['data']['method']} for r in snapshot['records']
        if r['kind'] in ('usage', 'usage_fallback')]
    write_atomic(directory / 'summary.json', json.dumps(summary, indent=2) + '\n')
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(['increment','classification','status',*COUNTERS,'cache_ratio','reasoning_output_ratio'])
    writer.writerow([increment,'measured; ratios derived',snapshot['status'],
                     *[snapshot['totals'][k] if snapshot['totals'][k] is not None else 'unavailable' for k in COUNTERS],
                     snapshot['cache_ratio'],snapshot['reasoning_output_ratio']])
    write_atomic(directory / 'summary.csv', out.getvalue())
    return directory


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    sub = p.add_subparsers(dest='command', required=True)
    for name in ('doctor','sync','validate','hook'):
        sub.add_parser(name)
    for name in ('install-hooks', 'uninstall-hooks'):
        sub.add_parser(name).add_argument('--worktree', type=Path)
    start = sub.add_parser('start')
    start.add_argument('increment'); start.add_argument('--title', required=True)
    for field in ('requirements','hypothesis','group','session'):
        start.add_argument('--'+field, default=None if field == 'session' else '')
    attach = sub.add_parser('attach'); attach.add_argument('transcript', type=Path); attach.add_argument('--parent')
    roots = sub.add_parser('register-worktree'); roots.add_argument('path',type=Path)
    ann = sub.add_parser('annotate'); ann.add_argument('increment'); ann.add_argument('kind', choices=ANNOTATIONS)
    ann.add_argument('--data', required=True, help='JSON object of redacted annotation fields')
    for field in ('agent','session','task','dependency','id','timestamp'):
        ann.add_argument('--'+field, default='main' if field=='agent' else None)
    rep = sub.add_parser('report'); rep.add_argument('--output', type=Path)
    exp = sub.add_parser('export'); exp.add_argument('increment'); exp.add_argument('--output',required=True,type=Path)
    log = sub.add_parser('checkpoint'); log.add_argument('increment'); log.add_argument('checkpoint')
    log.add_argument('--request', required=True); log.add_argument('--results', required=True)
    log.add_argument('--evidence',default=''); log.add_argument('--next-action',default='')
    for command in ('pause','resume','stop','status','finalize'):
        control=sub.add_parser(command);control.add_argument('--session',required=True)
        if command=='finalize':control.add_argument('--partial',action='store_true',required=True)
    role=sub.add_parser('agent-role');role.add_argument('--session',required=True);role.add_argument('--agent',required=True)
    role.add_argument('--role',required=True);role.add_argument('--label',required=True);role.add_argument('--runtime-id')
    start.add_argument('--role',default='coordinator');start.add_argument('--label',default='Coordinator')
    return p


def main(argv=None):
    args = parser().parse_args(argv)
    if args.command == 'hook':
        try:
            raw = sys.stdin.buffer.read(8 * 1024 * 1024 + 1)
            if len(raw) <= 8 * 1024 * 1024:
                enqueue(args.root, json.loads(raw))
        except (ValueError, OSError, sqlite3.Error):
            # No sensitive exception text and no blocking/continuation output.
            pass
        print('{}')
        return 0
    try:
        tracker = Tracker(args.root)
        if args.command == 'doctor':
            print(json.dumps(doctor(tracker), indent=2))
        elif args.command in ('install-hooks','uninstall-hooks'):
            target = args.worktree.resolve() if args.worktree else tracker.root
            if target not in tracker.roots():
                raise ValueError('Register the worktree before installing its hooks')
            print(hook_config(tracker.root, args.command == 'install-hooks', target))
        elif args.command == 'start':
            tracker.start(args.increment,args.title,args.requirements,args.hypothesis,args.group,args.session,args.role,args.label)
            print(tracker.ensure_log(args.increment))
        elif args.command in ('pause','resume','stop','finalize'):
            print(json.dumps(tracker.control(args.session,args.command),indent=2))
        elif args.command == 'status':
            tracker.sync()
            print(json.dumps(tracker.recording_status(args.session),indent=2))
        elif args.command == 'agent-role':
            tracker.agent_role(args.session,args.agent,args.role,args.label,args.runtime_id)
        elif args.command == 'attach':
            print(tracker.attach(args.transcript,args.parent))
        elif args.command == 'register-worktree':
            path = args.path.resolve()
            def common(root):
                result = subprocess.run(['git','-C',str(root),'rev-parse','--path-format=absolute','--git-common-dir'],capture_output=True,text=True,check=True)
                return Path(result.stdout.strip()).resolve()
            if common(path) != common(tracker.root):
                raise ValueError('Worktree must belong to the same Git repository')
            tracker.db.execute('INSERT OR IGNORE INTO roots VALUES (?)',(str(path),)); tracker.db.commit()
        elif args.command == 'annotate':
            tracker.annotate(args.increment,args.kind,json.loads(args.data),args.agent,args.session,args.task,args.dependency,args.id,args.timestamp)
        elif args.command == 'sync':
            print(json.dumps({'queued':tracker.sync(),'coverage':tracker.snapshot()['coverage']}))
        elif args.command == 'report':
            print(report(tracker,args.output))
        elif args.command == 'export':
            print(export_summary(tracker,args.increment,args.output))
        elif args.command == 'checkpoint':
            print(tracker.checkpoint(args.increment,args.checkpoint,args.request,args.results,args.evidence,args.next_action))
        elif args.command == 'validate':
            result = tracker.db.execute('PRAGMA integrity_check').fetchone()[0]
            if result != 'ok':
                raise ValueError('Database integrity check failed')
            tracker.snapshot()
            print('PASS: database integrity and report aggregation; inspect doctor/report for coverage')
        tracker.db.close()
        return 0
    except (ValueError, OSError, sqlite3.Error, subprocess.SubprocessError) as error:
        print(str(error) if isinstance(error,ValueError) else f'Tracker command failed ({type(error).__name__}); inspect doctor locally.',file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
