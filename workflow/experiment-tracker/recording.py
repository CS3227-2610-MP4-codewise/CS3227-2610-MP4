"""Bounded recording state. All admission and lifecycle changes serialize in SQLite."""
import contextlib
import json
from pathlib import Path
import re
import sqlite3
import uuid
from datetime import datetime, timezone


def stamp():
    return datetime.now(timezone.utc).isoformat()


def timestamp(value):
    d = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if d.tzinfo is None:
        raise ValueError('Timestamp requires timezone')
    return d.astimezone(timezone.utc).isoformat()


def session_metadata(header):
    if not isinstance(header, dict) or header.get('type') != 'session_meta':
        raise ValueError('First record must be session_meta')
    meta = header.get('payload')
    if not isinstance(meta, dict):
        raise ValueError('Session metadata payload must be an object')
    return meta


TURN_ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$')
IDENTITY_LINES = 256
# Lines that can carry Claude Code root turn evidence; others skip JSON parsing.
CLAUDE_ROOT_MARKERS = (b'turnPosition', b'turn_duration', b'interruptedMessageId')


def claude_identity(path, f):
    """Identify a Claude Code transcript from its own records; never guess from contents elsewhere.

    Root transcripts are named <sessionId>.jsonl. Subagent transcripts are named
    agent-<agentId>.jsonl and carry the parent sessionId, which proves parentage.
    """
    f.seek(0)
    session = agent = cwd = version = None
    for index in range(IDENTITY_LINES):
        line = f.readline(2 * 1024 * 1024)
        if not line or not line.endswith(b'\n'):
            break
        try:
            record = json.loads(line)
        except (ValueError, UnicodeError):
            record = None
        if not isinstance(record, dict):
            if index == 0:
                raise ValueError('Unrecognized transcript header')
            continue
        for key in ('sessionId', 'agentId'):
            value = record.get(key)
            if value is None:
                continue
            current = session if key == 'sessionId' else agent
            if not isinstance(value, str) or not TURN_ID.fullmatch(value) or (current and value != current):
                raise ValueError('Inconsistent Claude Code transcript identity')
            if key == 'sessionId':
                session = value
            else:
                agent = value
        if cwd is None and isinstance(record.get('cwd'), str):
            cwd = record['cwd']
        if version is None and isinstance(record.get('version'), str):
            version = record['version'][:60]
        if session and cwd:
            break
    if not session or not cwd:
        raise ValueError('Unrecognized transcript header')
    expected = 'agent-' + agent if agent else session
    if Path(path).stem != expected:
        raise ValueError('Transcript file name does not match its session identity')
    return {'client': 'claude', 'id': agent or session, 'session_id': session, 'cwd': cwd,
            'cli_version': version, 'parent': session if agent else None}


def source_identity(path, f):
    """Return (first line, identity) for a supported Codex or Claude Code JSONL source."""
    f.seek(0)
    header = f.readline(2 * 1024 * 1024)
    try:
        record = json.loads(header)
    except (ValueError, UnicodeError):
        raise ValueError('Missing valid session metadata') from None
    if isinstance(record, dict) and record.get('type') == 'session_meta':
        meta = session_metadata(record)
        identity = {'client': 'codex', 'id': meta.get('id') or meta.get('session_id'), 'cwd': meta.get('cwd'),
                    'cli_version': meta.get('cli_version'), 'parent': None}
    elif isinstance(record, dict) and 'sessionId' in record:
        identity = claude_identity(path, f)
    else:
        raise ValueError('First record must be session_meta or Claude Code session metadata')
    f.seek(len(header))
    return header, identity


def claude_marker(record, child):
    """Structural Claude Code lifecycle evidence for one record, or None."""
    if not isinstance(record, dict):
        return None
    kind = record.get('type')
    if kind == 'user':
        if isinstance(record.get('interruptedMessageId'), str):
            return ('aborted',)
        turn = record.get('promptId') or record.get('uuid')
        if not isinstance(turn, str) or not TURN_ID.fullmatch(turn):
            return None
        if child:
            if record.get('toolUseResult') is None and not record.get('isMeta'):
                return ('start', turn, record.get('timestamp'), None)
            return None
        position = record.get('turnPosition')
        index = position.get('turnIndex') if isinstance(position, dict) else None
        if isinstance(index, int) and not isinstance(index, bool) and not record.get('isSidechain'):
            return ('start', turn, record.get('timestamp'), index)
    elif kind == 'system' and not child and record.get('subtype') == 'turn_duration':
        return ('complete',)
    elif kind == 'assistant' and child:
        message = record.get('message')
        if isinstance(message, dict) and message.get('stop_reason') == 'end_turn':
            return ('complete',)
    return None


def claude_turn_step(record, state, child):
    """Advance Claude Code turn state. Queued prompts in an open turn share its turnIndex."""
    marker = claude_marker(record, child)
    if not marker:
        return None
    if marker[0] == 'start':
        if child and state.get('turn'):
            return None  # One subagent transcript is one delegated turn.
        if state.get('open') and state.get('turn_index') == marker[3]:
            return None
        state.update(turn=marker[1], turn_index=marker[3], open=True)
        return marker
    if not state.get('open'):
        return None
    state['open'] = False
    return marker


def claude_active_turn(f, child):
    """Latest open Claude Code turn and its start timestamp, read from complete lines."""
    f.seek(0)
    state, started = {}, None
    for line in f:
        if not line.endswith(b'\n'):
            break
        if not child and not any(marker in line for marker in CLAUDE_ROOT_MARKERS):
            continue
        try:
            step = claude_turn_step(json.loads(line), state, child)
        except (ValueError, UnicodeError):
            continue
        if step and step[0] == 'start':
            started = step[2]
    return (state['turn'], started) if state.get('open') else (None, None)


class Recording:
    def migrate_recording(self):
        row = self.db.execute("SELECT value FROM settings WHERE key='version'").fetchone()
        if row and int(row[0]) not in (1, 2):
            raise ValueError('Unsupported tracker database version')
        admission_columns = {r['name'] for r in self.db.execute('PRAGMA table_info(admitted)')}
        if row and (int(row[0]) == 1 or 'finalized_partial' not in admission_columns):
            backup = self.state / 'backups' / ('v' + row[0] + '-' + uuid.uuid4().hex + '.sqlite3')
            backup.parent.mkdir(mode=0o700, exist_ok=True)
            with contextlib.closing(sqlite3.connect(backup)) as destination:
                self.db.backup(destination)
            backup.chmod(0o600)
        self.db.execute('BEGIN IMMEDIATE')
        try:
            statements = [
                '''CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,increment_id TEXT NOT NULL,
                   root TEXT NOT NULL,state TEXT NOT NULL,created TEXT NOT NULL,partial INTEGER NOT NULL DEFAULT 0)''',
                '''DROP INDEX IF EXISTS active_root''',
                # Historical stop recovery may coexist with a newer live run.
                '''CREATE UNIQUE INDEX active_root ON runs(root)
                   WHERE state IN ('recording','paused','draining-to-pause')''',
                '''CREATE TABLE IF NOT EXISTS windows(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,
                   opened TEXT NOT NULL,closed TEXT)''',
                '''CREATE TABLE IF NOT EXISTS members(run_id TEXT NOT NULL,session_id TEXT NOT NULL,parent TEXT,
                   PRIMARY KEY(run_id,session_id))''',
                '''CREATE TABLE IF NOT EXISTS admitted(session_id TEXT NOT NULL,turn_id TEXT NOT NULL,
                   run_id TEXT NOT NULL,window_id TEXT NOT NULL,admitted_at TEXT NOT NULL,
                   terminal TEXT,partial INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session_id,turn_id))''',
                # A Claude child spawned inside an open window stays eligible after it closes.
                '''CREATE TABLE IF NOT EXISTS spawned(run_id TEXT NOT NULL,session_id TEXT NOT NULL,
                   parent TEXT NOT NULL,parent_turn TEXT NOT NULL,window_id TEXT NOT NULL,spawned_at TEXT NOT NULL,
                   resolved TEXT CHECK(resolved IN ('admitted','finalized')),PRIMARY KEY(run_id,session_id))''',
                '''CREATE TABLE IF NOT EXISTS roles(id INTEGER PRIMARY KEY,run_id TEXT NOT NULL,
                   session_id TEXT NOT NULL,runtime_id TEXT NOT NULL,role TEXT NOT NULL,label TEXT NOT NULL,ts TEXT NOT NULL)''',
            ]
            for sql in statements:
                self.db.execute(sql)
            columns = {r['name'] for r in self.db.execute('PRAGMA table_info(records)')}
            for field in ('run_id', 'window_id'):
                if field not in columns:
                    self.db.execute(f'ALTER TABLE records ADD COLUMN {field} TEXT')
            # Additive: the spawning turn of a linked child (NULL when not recorded, EXP-12).
            if 'parent_turn' not in {r['name'] for r in self.db.execute('PRAGMA table_info(members)')}:
                self.db.execute('ALTER TABLE members ADD COLUMN parent_turn TEXT')
            # Turns already shown in a Keith checkpoint table, with their status then (EXP-13).
            self.db.execute('''CREATE TABLE IF NOT EXISTS checkpoint_turns(increment_id TEXT NOT NULL,
                checkpoint_id TEXT NOT NULL,session_id TEXT NOT NULL,turn_id TEXT NOT NULL,status TEXT NOT NULL,
                PRIMARY KEY(increment_id,session_id,turn_id,checkpoint_id))''')
            columns = {r['name'] for r in self.db.execute('PRAGMA table_info(admitted)')}
            if 'finalized_partial' not in columns:
                self.db.execute('ALTER TABLE admitted ADD COLUMN finalized_partial INTEGER NOT NULL DEFAULT 0 CHECK(finalized_partial IN (0,1))')
                # Older explicit finalization is identifiable by a partial row
                # with no terminal evidence; do not relabel abort-derived rows.
                self.db.execute('UPDATE admitted SET finalized_partial=1 WHERE partial=1 AND terminal IS NULL')
            for run in self.db.execute('SELECT id FROM runs').fetchall():
                self.reconcile_run(run['id'])
            self.db.execute("INSERT OR REPLACE INTO settings VALUES ('version','2')")
            if row and int(row[0]) == 1:
                self.db.execute("INSERT OR REPLACE INTO settings VALUES ('legacy_notice','v1 unbounded records retained and excluded')")
                self.db.execute("UPDATE sources SET offset=0,prefix=NULL,state='{}'")
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def run_for(self, session):
        return self.db.execute('''SELECT r.* FROM runs r JOIN members m ON m.run_id=r.id
            WHERE m.session_id=? AND r.state!='stopped' ORDER BY r.created DESC LIMIT 1''', (session,)).fetchone()

    def admission(self, session, turn):
        if not session or not turn:
            return None
        return self.db.execute('SELECT * FROM admitted WHERE session_id=? AND turn_id=?', (session,turn)).fetchone()

    def admit(self, run, session, turn, at):
        if not turn or run['state'] != 'recording':
            return None
        old = self.admission(session, turn)
        if old:
            return old if old['run_id'] == run['id'] else None
        window = self.db.execute('SELECT * FROM windows WHERE run_id=? AND closed IS NULL', (run['id'],)).fetchone()
        if not window:
            return None
        self.db.execute('INSERT INTO admitted(session_id,turn_id,run_id,window_id,admitted_at) VALUES (?,?,?,?,?)',
                        (session,turn,run['id'],window['id'],at))
        return self.admission(session,turn)

    def current_turn(self, sid):
        source = self.db.execute('SELECT path FROM sources WHERE session_id=?',(sid,)).fetchone()
        if not source:
            raise ValueError('Attach the exact session JSONL source before start/resume')
        active = None
        with Path(source['path']).open('rb') as f:
            _, meta = source_identity(source['path'], f)
            if meta['id'] != sid or not self.scoped(meta.get('cwd')):
                raise ValueError('Source identity or scope changed')
            if meta['client'] == 'claude':
                active = claude_active_turn(f, bool(meta['parent']))[0]
            for line in f if meta['client'] == 'codex' else ():
                if not line.endswith(b'\n'):
                    break
                try:
                    r=json.loads(line);p=r.get('payload',{})
                    if r.get('type')=='event_msg':
                        if p.get('type')=='task_started' and isinstance(p.get('turn_id'),str):
                            active=p['turn_id']
                        elif p.get('type') in ('task_complete','turn_aborted') and p.get('turn_id')==active:
                            active=None
                except (ValueError,TypeError,AttributeError):
                    continue
        if not active:
            raise ValueError('No reliably identified active turn; start from an active agent turn')
        return active

    def open_recording(self, increment, sid, role='coordinator', label='Coordinator'):
        turn = self.current_turn(sid)
        self.db.execute('BEGIN IMMEDIATE')
        try:
            current = self.run_for(sid)
            if current:
                raise ValueError('Session already has an open run; use resume or stop first')
            previous = self.admission(sid,turn)
            if previous:
                raise ValueError('Initiating turn was already assigned; start in a new turn')
            run_id = uuid.uuid4().hex
            self.db.execute("INSERT INTO runs VALUES (?,?,?,'recording',?,0)",(run_id,increment,sid,stamp()))
            self.db.execute('INSERT INTO members(run_id,session_id,parent) VALUES (?,?,NULL)',(run_id,sid))
            self.db.execute('INSERT INTO windows VALUES (?,?,?,NULL)',(uuid.uuid4().hex,run_id,stamp()))
            run=self.run_for(sid)
            self.admit(run,sid,turn,stamp())
            self.set_role(run_id,sid,'/root',role,label)
            # Replay metadata to include the initiating turn from its true beginning only.
            self.db.execute("UPDATE sources SET offset=0,prefix=NULL,state='{}' WHERE session_id=?",(sid,))
            self.db.commit()
            return run_id
        except Exception:
            self.db.rollback()
            raise

    def set_role(self, run_id, sid, runtime, role, label):
        if not role or len(role)>100 or not label or len(label)>150 or len(runtime)>200:
            raise ValueError('Role, label and runtime identity must be bounded')
        previous=self.db.execute('SELECT runtime_id FROM roles WHERE run_id=? AND session_id=? ORDER BY id DESC LIMIT 1',
                                 (run_id,sid)).fetchone()
        if previous and previous[0]!=runtime:
            raise ValueError('Role assignment cannot change runtime identity')
        if not self.db.execute('SELECT 1 FROM members WHERE run_id=? AND session_id=?',(run_id,sid)).fetchone():
            raise ValueError('Agent is not a member of this run')
        self.db.execute('INSERT INTO roles(run_id,session_id,runtime_id,role,label,ts) VALUES (?,?,?,?,?,?)',
                        (run_id,sid,runtime,role,label,stamp()))

    def agent_role(self, root, agent, role, label, runtime=None):
        self.db.execute('BEGIN IMMEDIATE')
        try:
            run=self.run_for(root)
            if not run or run['root']!=root:
                raise ValueError('Role assignment requires the run root session')
            previous=self.db.execute('SELECT runtime_id FROM roles WHERE run_id=? AND session_id=? ORDER BY id DESC LIMIT 1',
                                     (run['id'],agent)).fetchone()
            identity=previous[0] if previous else runtime
            if not identity or (runtime and runtime!=identity):
                raise ValueError('Provide the actual runtime identity; existing identity cannot change')
            self.set_role(run['id'],agent,identity,role,label)
            self.db.commit()
        except Exception:
            self.db.rollback();raise

    def control(self, sid, action, run_id=None):
        # Reconcile terminal evidence before freezing the active-turn set.
        self.sync()
        turn=self.current_turn(sid) if action=='resume' else None
        self.db.execute('BEGIN IMMEDIATE')
        try:
            if run_id is not None and action != 'finalize':
                raise ValueError('Only partial finalization accepts a target run')
            run=self.db.execute('SELECT * FROM runs WHERE id=?',(run_id,)).fetchone() if run_id is not None else self.run_for(sid)
            if not run or run['root']!=sid:
                raise ValueError('Lifecycle commands require an open root run')
            if action=='resume':
                if run['state']!='paused':
                    raise ValueError('Only a paused run can resume')
                if self.admission(sid,turn):
                    raise ValueError('Resume requires a new initiating turn')
                self.db.execute("UPDATE runs SET state='recording' WHERE id=?",(run['id'],))
                self.db.execute('INSERT INTO windows VALUES (?,?,?,NULL)',(uuid.uuid4().hex,run['id'],stamp()))
                self.admit(self.run_for(sid),sid,turn,stamp())
                self.db.execute("UPDATE sources SET offset=0,prefix=NULL,state='{}' WHERE session_id=?",(sid,))
            elif action in ('pause','stop'):
                if run['state'] not in ('recording','paused'):
                    raise ValueError('Run is already draining')
                self.db.execute("UPDATE runs SET state=? WHERE id=?",('draining-to-'+action,run['id']))
                self.db.execute('UPDATE windows SET closed=? WHERE run_id=? AND closed IS NULL',(stamp(),run['id']))
                self.reconcile_run(run['id'])
            elif action=='finalize':
                if not run['state'].startswith('draining-'):
                    raise ValueError('Partial finalization requires draining state')
                self.db.execute('UPDATE admitted SET finalized_partial=1 WHERE run_id=? AND terminal IS NULL',(run['id'],))
                self.db.execute("UPDATE spawned SET resolved='finalized' WHERE run_id=? AND resolved IS NULL",(run['id'],))
                self.db.execute("UPDATE runs SET state='stopped' WHERE id=?",(run['id'],))
                self.reconcile_run(run['id'])
            else:
                raise ValueError('Unknown lifecycle action')
            self.db.commit()
        except Exception:
            self.db.rollback();raise
        return self.recording_status(sid,run['id'])

    def reconcile_run(self, run_id):
        """Rebuild aggregates without changing the requested recording boundary."""
        run=self.db.execute('SELECT * FROM runs WHERE id=?',(run_id,)).fetchone()
        if not run:
            return
        self.db.execute("""UPDATE admitted SET partial=CASE
            WHEN finalized_partial=1 OR terminal='turn_aborted' THEN 1 ELSE 0 END
            WHERE run_id=?""",(run_id,))
        partial=self.db.execute('''SELECT 1 FROM admitted WHERE run_id=? AND partial=1 UNION ALL
            SELECT 1 FROM spawned WHERE run_id=? AND resolved='finalized' ''',(run_id,run_id)).fetchone() is not None
        # A spawned child without an admitted turn is still running work of this run.
        pending=self.db.execute('''SELECT 1 FROM admitted WHERE run_id=? AND terminal IS NULL AND partial=0 UNION ALL
            SELECT 1 FROM spawned WHERE run_id=? AND resolved IS NULL''',(run_id,run_id)).fetchone() is not None
        state=run['state']
        if state in ('stopped','draining-to-stop'):
            state='draining-to-stop' if pending else 'stopped'
        elif state in ('paused','draining-to-pause'):
            state='draining-to-pause' if pending else 'paused'
        self.db.execute('UPDATE runs SET state=?,partial=? WHERE id=?',(state,int(partial),run_id))

    def terminal(self, sid, turn, status):
        entry=self.admission(sid,turn)
        if entry:
            self.db.execute('UPDATE admitted SET terminal=? WHERE session_id=? AND turn_id=?',
                            (status,sid,turn))
            self.reconcile_run(entry['run_id'])

    def admit_started(self, sid, turn, at):
        entry=self.admission(sid,turn)
        if entry:
            return entry
        spawn=self.db.execute('SELECT * FROM spawned WHERE session_id=? AND resolved IS NULL',(sid,)).fetchone()
        if spawn:
            # The in-window spawn is the admission evidence for the child's first turn,
            # even if pause/stop closed the window before its transcript was imported.
            self.db.execute('INSERT INTO admitted(session_id,turn_id,run_id,window_id,admitted_at) VALUES (?,?,?,?,?)',
                            (sid,turn,spawn['run_id'],spawn['window_id'],at))
            self.db.execute("UPDATE spawned SET resolved='admitted' WHERE run_id=? AND session_id=?",(spawn['run_id'],sid))
            self.reconcile_run(spawn['run_id'])
            return self.admission(sid,turn)
        run=self.run_for(sid)
        if not run or run['state']!='recording':
            return None
        window=self.db.execute('SELECT opened FROM windows WHERE run_id=? AND closed IS NULL',(run['id'],)).fetchone()
        if not window or timestamp(at)<window['opened']:
            return None
        return self.admit(run,sid,turn,at)

    def link_child(self, parent, parent_turn, child, spawn=False):
        entry=self.admission(parent,parent_turn)
        run=self.run_for(parent)
        if not entry or not run or run['state']!='recording' or entry['run_id']!=run['id']:
            return False
        existing=self.run_for(child)
        if existing and existing['id']!=run['id']:
            return False
        self.session(child,parent=parent)
        self.db.execute('INSERT OR IGNORE INTO members(run_id,session_id,parent,parent_turn) VALUES (?,?,?,?)',
                        (run['id'],child,parent,parent_turn))
        if spawn and not self.db.execute('SELECT 1 FROM admitted WHERE session_id=?',(child,)).fetchone():
            self.db.execute('INSERT OR IGNORE INTO spawned VALUES (?,?,?,?,?,?,NULL)',
                            (run['id'],child,parent,parent_turn,entry['window_id'],stamp()))
        return True

    def recording_status(self, sid, run_id=None):
        run=self.run_for(sid) if run_id is None else None
        run=run or self.db.execute('SELECT r.* FROM runs r JOIN members m ON m.run_id=r.id WHERE m.session_id=? AND (? IS NULL OR r.id=?) ORDER BY r.created DESC LIMIT 1',
                            (sid,run_id,run_id)).fetchone()
        if not run:
            if run_id is not None:
                raise ValueError('Requested run is not linked to this session')
            return {'session':sid,'state':'off','pending_turns':[]}
        return {**dict(run),'pending_turns':[dict(r) for r in self.db.execute(
            'SELECT session_id,turn_id,partial FROM admitted WHERE run_id=? AND terminal IS NULL',(run['id'],))],
            'pending_children':[dict(r) for r in self.db.execute(
            'SELECT session_id,parent,parent_turn FROM spawned WHERE run_id=? AND resolved IS NULL',(run['id'],))],
            'windows':[dict(r) for r in self.db.execute('SELECT * FROM windows WHERE run_id=? ORDER BY opened',(run['id'],))]}
