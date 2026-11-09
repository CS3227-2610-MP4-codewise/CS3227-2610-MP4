"""Bounded recording state. All admission and lifecycle changes serialize in SQLite."""
import contextlib
import json
from pathlib import Path
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


class Recording:
    def migrate_recording(self):
        row = self.db.execute("SELECT value FROM settings WHERE key='version'").fetchone()
        if row and int(row[0]) not in (1, 2):
            raise ValueError('Unsupported tracker database version')
        if row and int(row[0]) == 1:
            backup = self.state / 'backups' / ('v1-' + uuid.uuid4().hex + '.sqlite3')
            backup.parent.mkdir(mode=0o700, exist_ok=True)
            with contextlib.closing(sqlite3.connect(backup)) as destination:
                self.db.backup(destination)
            backup.chmod(0o600)
        self.db.execute('BEGIN IMMEDIATE')
        try:
            statements = [
                '''CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,increment_id TEXT NOT NULL,
                   root TEXT NOT NULL,state TEXT NOT NULL,created TEXT NOT NULL,partial INTEGER NOT NULL DEFAULT 0)''',
                '''CREATE UNIQUE INDEX IF NOT EXISTS active_root ON runs(root) WHERE state!='stopped' ''',
                '''CREATE TABLE IF NOT EXISTS windows(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,
                   opened TEXT NOT NULL,closed TEXT)''',
                '''CREATE TABLE IF NOT EXISTS members(run_id TEXT NOT NULL,session_id TEXT NOT NULL,parent TEXT,
                   PRIMARY KEY(run_id,session_id))''',
                '''CREATE TABLE IF NOT EXISTS admitted(session_id TEXT NOT NULL,turn_id TEXT NOT NULL,
                   run_id TEXT NOT NULL,window_id TEXT NOT NULL,admitted_at TEXT NOT NULL,
                   terminal TEXT,partial INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session_id,turn_id))''',
                '''CREATE TABLE IF NOT EXISTS roles(id INTEGER PRIMARY KEY,run_id TEXT NOT NULL,
                   session_id TEXT NOT NULL,runtime_id TEXT NOT NULL,role TEXT NOT NULL,label TEXT NOT NULL,ts TEXT NOT NULL)''',
            ]
            for sql in statements:
                self.db.execute(sql)
            columns = {r['name'] for r in self.db.execute('PRAGMA table_info(records)')}
            for field in ('run_id', 'window_id'):
                if field not in columns:
                    self.db.execute(f'ALTER TABLE records ADD COLUMN {field} TEXT')
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
            header = json.loads(f.readline(2*1024*1024))
            meta = session_metadata(header)
            if (meta.get('id') or meta.get('session_id')) != sid or not self.scoped(meta.get('cwd')):
                raise ValueError('Source identity or scope changed')
            for line in f:
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
            self.db.execute('INSERT INTO members VALUES (?,?,NULL)',(run_id,sid))
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

    def control(self, sid, action):
        # Reconcile terminal evidence before freezing the active-turn set.
        self.sync()
        turn=self.current_turn(sid) if action=='resume' else None
        self.db.execute('BEGIN IMMEDIATE')
        try:
            run=self.run_for(sid)
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
                self.settle(run['id'])
            elif action=='finalize':
                if not run['state'].startswith('draining-'):
                    raise ValueError('Partial finalization requires draining state')
                self.db.execute('UPDATE admitted SET partial=1 WHERE run_id=? AND terminal IS NULL',(run['id'],))
                self.db.execute("UPDATE runs SET state='stopped',partial=1 WHERE id=?",(run['id'],))
            else:
                raise ValueError('Unknown lifecycle action')
            self.db.commit()
        except Exception:
            self.db.rollback();raise
        return self.recording_status(sid)

    def settle(self, run_id):
        run=self.db.execute('SELECT * FROM runs WHERE id=?',(run_id,)).fetchone()
        if run and run['state'].startswith('draining-'):
            pending=self.db.execute('SELECT 1 FROM admitted WHERE run_id=? AND terminal IS NULL AND partial=0',(run_id,)).fetchone()
            if not pending:
                self.db.execute('UPDATE runs SET state=? WHERE id=?',
                                ('paused' if run['state']=='draining-to-pause' else 'stopped',run_id))

    def terminal(self, sid, turn, status):
        entry=self.admission(sid,turn)
        if entry:
            self.db.execute('UPDATE admitted SET terminal=?,partial=? WHERE session_id=? AND turn_id=?',
                            (status,int(status!='task_complete'),sid,turn))
            if status!='task_complete':
                self.db.execute('UPDATE runs SET partial=1 WHERE id=?',(entry['run_id'],))
            self.settle(entry['run_id'])

    def admit_started(self, sid, turn, at):
        entry=self.admission(sid,turn)
        if entry:
            return entry
        run=self.run_for(sid)
        if not run or run['state']!='recording':
            return None
        window=self.db.execute('SELECT opened FROM windows WHERE run_id=? AND closed IS NULL',(run['id'],)).fetchone()
        if not window or timestamp(at)<window['opened']:
            return None
        return self.admit(run,sid,turn,at)

    def link_child(self, parent, parent_turn, child):
        entry=self.admission(parent,parent_turn)
        run=self.run_for(parent)
        if not entry or not run or run['state']!='recording' or entry['run_id']!=run['id']:
            return False
        existing=self.run_for(child)
        if existing and existing['id']!=run['id']:
            return False
        self.session(child,parent=parent)
        self.db.execute('INSERT OR IGNORE INTO members VALUES (?,?,?)',(run['id'],child,parent))
        return True

    def recording_status(self, sid):
        run=self.db.execute('SELECT r.* FROM runs r JOIN members m ON m.run_id=r.id WHERE m.session_id=? ORDER BY r.created DESC LIMIT 1',
                            (sid,)).fetchone()
        if not run:
            return {'session':sid,'state':'off','pending_turns':[]}
        return {**dict(run),'pending_turns':[dict(r) for r in self.db.execute(
            'SELECT session_id,turn_id,partial FROM admitted WHERE run_id=? AND terminal IS NULL',(run['id'],))],
            'windows':[dict(r) for r in self.db.execute('SELECT * FROM windows WHERE run_id=? ORDER BY opened',(run['id'],))]}
