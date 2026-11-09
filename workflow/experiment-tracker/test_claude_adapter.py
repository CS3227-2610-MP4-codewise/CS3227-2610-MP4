"""Synthetic Claude Code adapter cases for EXP-10; no real transcripts or prompts."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

SPEC = importlib.util.spec_from_file_location('tracker', Path(__file__).with_name('tracker.py'))
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

SID = 'claude-root'
OLD = '2026-11-08T01:00:00.000Z'


class ClaudeAdapterTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        (self.root / 'workflow/templates').mkdir(parents=True)
        (self.root / 'workflow/templates/member-log.md').write_text(
            '# Increment title\n\n## Request\n\nName the human owner, bounded objective, OpenSpec change/requirement IDs, and branch/PR if known.\n')
        self.tracker = mod.Tracker(self.root)
        self.source = self.root / (SID + '.jsonl')
        self.prompts = 0

    def tearDown(self):
        self.tracker.db.close()
        self.temp.cleanup()

    # Record builders mirror observed Claude Code 2.1.319 field names only.
    def base(self, kind, ts=None, **fields):
        return {'type': kind, 'sessionId': SID, 'cwd': str(self.root), 'version': '2.1.319',
                'timestamp': ts or mod.now(), **fields}

    def prompt(self, turn, index, ts=None):
        self.prompts += 1
        return self.base('user', ts, promptId=turn, uuid=turn + '-u', turnOrigin='human',
                         turnPosition={'promptIndex': self.prompts, 'turnIndex': index},
                         message={'role': 'user', 'content': 'PRIVATE_PROMPT'})

    def reply(self, message_id, stop='tool_use', ts=None, tool=None, thinking=5, model='claude-opus-5-5', **fields):
        usage = {'input_tokens': 10, 'cache_read_input_tokens': 100, 'cache_creation_input_tokens': 20,
                 'output_tokens': 30, 'service_tier': 'standard'}
        if thinking is not None:
            usage['output_tokens_details'] = {'thinking_tokens': thinking}
        content = [{'type': 'text', 'text': 'PRIVATE_REPLY'}]
        if tool:
            content.append({'type': 'tool_use', 'id': tool, 'name': 'Bash', 'input': {'command': 'SECRET_COMMAND'}})
        return self.base('assistant', ts, effort='medium', requestId='req-' + message_id, message={
            'id': message_id, 'model': model, 'stop_reason': stop, 'usage': usage, 'content': content}, **fields)

    def done(self, ts=None):
        return self.base('system', ts, subtype='turn_duration', durationMs=10, messageCount=3)

    def interrupted(self):
        return self.base('user', interruptedMessageId='msg-x', message={'content': '[Request interrupted by user]'})

    def write(self, *records, path=None):
        with (path or self.source).open('a') as f:
            for record in records:
                f.write(json.dumps(record) + '\n')

    def start(self):
        """One completed earlier turn, then recording starts inside turn 2."""
        self.write({'type': 'mode', 'mode': 'normal', 'sessionId': SID},
                   self.prompt('old-turn', 1, OLD), self.reply('msg-old', 'end_turn', OLD), self.done(OLD),
                   self.prompt('turn-two', 2))
        self.assertEqual(SID, self.tracker.attach(self.source))
        self.tracker.start('claude-increment', 'Claude increment', 'EXP-10', session=SID)

    def hook(self, event='PreToolUse', **fields):
        return mod.enqueue(self.root, {'cwd': str(self.root), 'session_id': SID, 'hook_event_name': event,
                                       'transcript_path': str(self.source), **fields}, 'claude')

    def test_attach_records_client_and_validates_identity(self):
        self.start()
        self.assertEqual('claude-code 2.1.319',
                         self.tracker.db.execute('SELECT client FROM sessions WHERE id=?', (SID,)).fetchone()[0])
        renamed = self.root / 'wrong-name.jsonl'
        renamed.write_text(self.source.read_text())
        with self.assertRaisesRegex(ValueError, 'file name'):
            self.tracker.attach(renamed)
        mixed = self.root / 'mixed.jsonl'
        self.write({'type': 'mode', 'sessionId': 'mixed'}, dict(self.base('user'), sessionId='other'), path=mixed)
        with self.assertRaisesRegex(ValueError, 'Inconsistent'):
            self.tracker.attach(mixed)
        # Later foreign records are rejected per record during import, never counted.
        self.write(dict(self.reply('msg-foreign', 'end_turn'), sessionId='foreign'), self.reply('msg-a', 'end_turn'),
                   self.done())
        self.tracker.sync()
        snapshot = self.tracker.snapshot()
        self.assertEqual(160, snapshot['totals']['total_tokens'])
        self.assertIn('Malformed', snapshot['sources'][0]['warning'])
        outside = self.root / 'outside.jsonl'
        self.write(dict(self.base('user'), sessionId='outside', cwd='/unrelated'), path=outside)
        with self.assertRaisesRegex(ValueError, 'outside'):
            self.tracker.attach(outside)
        unknown = self.root / 'unknown.jsonl'
        self.write({'type': 'user', 'cwd': str(self.root)}, path=unknown)
        with self.assertRaisesRegex(ValueError, 'First record'):
            self.tracker.attach(unknown)

    def test_start_excludes_earlier_turns_and_maps_usage(self):
        self.start()
        split = self.reply('msg-a', tool='toolu_a')
        self.write(split, split, self.base('user', promptId='turn-two', toolUseResult={'stdout': 'PRIVATE_OUTPUT'}),
                   self.reply('msg-b', 'end_turn'), self.done())
        self.tracker.sync()
        snapshot = self.tracker.snapshot('claude-increment')
        self.assertEqual({'input_tokens': 260, 'cached_input_tokens': 200, 'output_tokens': 60,
                          'reasoning_output_tokens': 10, 'total_tokens': 320}, snapshot['totals'])
        self.assertEqual({'cache_creation_input_tokens': 40}, snapshot['supplemental_totals'])
        self.assertEqual('observed-complete', snapshot['status'])
        self.assertEqual(['turn-two'], [a['turn_id'] for a in snapshot['admitted_turns']])
        self.assertEqual({'Bash': 1}, {r['data']['name']: 1 for r in snapshot['records'] if r['kind'] == 'tool'})
        usage = [r for r in snapshot['records'] if r['kind'] == 'usage']
        self.assertEqual(('claude-opus-5-5', 'medium', 'response_id'),
                         (usage[0]['data']['model'], usage[0]['data']['effort'], usage[0]['data']['method']))
        content = json.dumps(snapshot)
        for private in ('PRIVATE', 'SECRET', 'msg-old', 'old-turn'):
            self.assertNotIn(private, content)

    def test_queued_prompt_joins_open_turn(self):
        self.start()
        self.write(self.prompt('queued-prompt', 2), self.reply('msg-a', 'end_turn'), self.done())
        self.tracker.sync()
        snapshot = self.tracker.snapshot()
        self.assertEqual(['turn-two'], [a['turn_id'] for a in snapshot['admitted_turns']])
        self.assertEqual({'turn-two'}, {r['turn_id'] for r in snapshot['records']})

    def test_new_turn_drains_until_turn_duration(self):
        self.start()
        self.write(self.reply('msg-a', 'end_turn'), self.done(), self.prompt('turn-three', 3), self.reply('msg-c'))
        self.tracker.sync()
        self.assertIsNotNone(self.tracker.admission(SID, 'turn-three'))
        self.assertEqual('provisional', self.tracker.snapshot()['status'])
        self.assertEqual('draining-to-stop', self.tracker.control(SID, 'stop')['state'])
        self.write(self.done())
        self.tracker.sync()
        self.assertEqual('stopped', self.tracker.recording_status(SID)['state'])
        self.assertEqual('observed-complete', self.tracker.snapshot()['status'])

    def test_interrupt_marks_turn_aborted(self):
        self.start()
        self.write(self.reply('msg-a'), self.interrupted(), self.prompt('turn-three', 3))
        self.tracker.sync()
        entry = self.tracker.admission(SID, 'turn-two')
        self.assertEqual(('turn_aborted', 1), (entry['terminal'], entry['partial']))
        self.assertIsNotNone(self.tracker.admission(SID, 'turn-three'))  # New turnIndex after the abort.

    def test_pause_excludes_general_turn(self):
        self.start()
        self.tracker.control(SID, 'pause')
        self.write(self.reply('msg-a', 'end_turn'), self.done(), self.prompt('general', 3), self.reply('msg-g'))
        self.tracker.sync()
        self.assertEqual('paused', self.tracker.recording_status(SID)['state'])
        self.assertIsNone(self.tracker.admission(SID, 'general'))
        self.assertFalse(self.hook())
        self.assertNotIn('msg-g', json.dumps(self.tracker.snapshot()))

    def test_inline_sidechain_and_synthetic_records_are_not_counted(self):
        self.start()
        self.write(self.reply('msg-side', isSidechain=True), self.reply('msg-synthetic', model='<synthetic>'),
                   self.reply('msg-a', 'end_turn'), self.done())
        self.tracker.sync()
        snapshot = self.tracker.snapshot()
        self.assertEqual(160, snapshot['totals']['total_tokens'])
        self.assertEqual('partial', snapshot['status'])
        self.assertIn('Inline sidechain', snapshot['sources'][0]['warning'])

    def test_missing_thinking_counter_stays_unavailable(self):
        self.start()
        self.write(self.reply('msg-a', 'end_turn', thinking=None), self.done())
        self.tracker.sync()
        snapshot = self.tracker.snapshot()
        self.assertIsNone(snapshot['totals']['reasoning_output_tokens'])
        self.assertEqual(160, snapshot['totals']['total_tokens'])
        self.assertIn('reasoning_output_tokens', ' '.join(snapshot['coverage']))

    def test_hook_derives_turn_and_discards_private_fields(self):
        self.start()
        self.assertTrue(self.hook(tool_name='Bash', tool_use_id='toolu_h', tool_input={'command': 'SECRET_COMMAND'},
                                  tool_response={'stdout': 'PRIVATE_OUTPUT'}, prompt='PRIVATE_PROMPT'))
        queued = [json.loads(p.read_text()) for p in (self.tracker.state / 'queue').glob('*.json')]
        self.assertEqual(['turn-two'], [e['turn_id'] for e in queued])
        self.tracker.sync()
        content = json.dumps(self.tracker.snapshot())
        self.assertNotIn('PRIVATE', content)
        self.assertNotIn('SECRET', content)
        self.write(self.reply('msg-a', 'end_turn'), self.done())
        self.assertFalse(self.hook(event='Stop'))  # No open turn to attribute.

    def test_hook_for_unrecorded_session_reads_nothing(self):
        self.write(self.prompt('turn-one', 1))
        self.tracker.attach(self.source)
        with mock.patch.object(mod, 'claude_source_turn') as read:
            self.assertFalse(self.hook())
        read.assert_not_called()
        self.assertFalse((self.tracker.state / 'queue').exists())

    def test_hook_admits_only_turns_started_inside_window(self):
        self.start()
        self.write(self.reply('msg-a', 'end_turn'), self.done(), self.prompt('turn-three', 3))
        self.assertTrue(self.hook(tool_use_id='toolu_three'))
        self.assertIsNotNone(self.tracker.admission(SID, 'turn-three'))
        self.write(self.done(), self.prompt('backdated', 4, OLD))
        self.assertFalse(self.hook(tool_use_id='toolu_backdated'))
        self.assertIsNone(self.tracker.admission(SID, 'backdated'))

    def test_subagent_links_attaches_and_completes(self):
        self.start()
        self.assertTrue(self.hook(event='SubagentStart', agent_id='a1234', agent_type='Explore'))
        child = self.root / SID / 'subagents' / 'agent-a1234.jsonl'
        child.parent.mkdir(parents=True)
        self.write(self.base('user', agentId='a1234', isSidechain=True, promptId='child-prompt',
                             message={'content': 'PRIVATE_TASK'}),
                   self.reply('msg-child', 'end_turn', agentId='a1234', isSidechain=True), path=child)
        with self.assertRaisesRegex(ValueError, 'parent'):
            self.tracker.attach(child, 'someone-else')
        self.assertTrue(self.hook(event='SubagentStop', agent_id='a1234', agent_transcript_path=str(child)))
        self.write(self.reply('msg-a', 'end_turn'), self.done())
        self.tracker.sync()
        entry = self.tracker.admission('a1234', 'child-prompt')
        self.assertEqual('task_complete', entry['terminal'])
        self.assertEqual(SID, self.tracker.db.execute("SELECT parent FROM sessions WHERE id='a1234'").fetchone()[0])
        snapshot = self.tracker.snapshot()
        self.assertEqual(320, snapshot['totals']['total_tokens'])
        self.assertEqual('observed-complete', snapshot['status'])
        self.assertNotIn('Inline sidechain', json.dumps(snapshot['sources']))

    def test_unlinked_subagent_is_not_admitted(self):
        self.start()
        child = self.root / SID / 'subagents' / 'agent-b999.jsonl'
        child.parent.mkdir(parents=True)
        self.write(self.base('user', agentId='b999', isSidechain=True, promptId='child-prompt'),
                   self.reply('msg-child', 'end_turn', agentId='b999', isSidechain=True), path=child)
        self.tracker.attach(child)
        self.tracker.sync()
        self.assertIsNone(self.tracker.admission('b999', 'child-prompt'))
        self.assertNotIn('msg-child', json.dumps(self.tracker.snapshot()))

    def test_hook_cli_is_silent_and_nonblocking(self):
        for payload in ('invalid secret', json.dumps([]), json.dumps({'session_id': SID})):
            result = subprocess.run([sys.executable, str(Path(mod.__file__)), '--root', str(self.root),
                                     'hook', '--client', 'claude'], input=payload, capture_output=True, text=True)
            self.assertEqual((0, '', ''), (result.returncode, result.stdout, result.stderr))

    def test_hook_config_preserves_settings_and_is_idempotent(self):
        path = self.root / '.claude/settings.local.json'
        path.parent.mkdir()
        original = {'permissions': {'allow': ['Bash(ls)']},
                    'hooks': {'Stop': [{'hooks': [{'type': 'command', 'command': 'echo keep'}]}]}}
        path.write_text(json.dumps(original))
        mod.hook_config(self.root, client='claude')
        first = json.loads(path.read_text())
        self.assertEqual(set(mod.CLAUDE_EVENTS), set(first['hooks']))
        owned = [h for groups in first['hooks'].values() for g in groups for h in g['hooks'] if mod.owned_hook(h, 'claude')]
        self.assertEqual(len(mod.CLAUDE_EVENTS), len(owned))
        self.assertTrue(all('statusMessage' not in h and h['command'].endswith(' hook --client claude') for h in owned))
        mod.hook_config(self.root, client='claude')
        self.assertEqual(first, json.loads(path.read_text()))
        self.assertFalse((self.root / '.codex/hooks.json').exists())
        mod.hook_config(self.root, False, client='claude')
        self.assertEqual(original, json.loads(path.read_text()))
        path.write_text('{}')
        mod.hook_config(self.root, client='claude')
        mod.hook_config(self.root, False, client='claude')
        self.assertEqual({}, json.loads(path.read_text()))

    def test_attach_by_exact_claude_session_id(self):
        config = self.root / 'claude-config'
        project = config / 'projects' / '-synthetic-project'
        project.mkdir(parents=True)
        self.source = project / (SID + '.jsonl')
        self.write(self.prompt('turn-one', 1))
        with mock.patch.dict(os.environ, {'CLAUDE_CONFIG_DIR': str(config)}):
            self.assertEqual(SID, self.tracker.attach_claude(SID))
            for invalid in ('../escape', '*', 'missing-session'):
                with self.assertRaises(ValueError):
                    self.tracker.attach_claude(invalid)
        result = subprocess.run([sys.executable, str(Path(mod.__file__)), '--root', str(self.root), 'attach',
                                 str(self.source), '--claude-session', SID], capture_output=True, text=True)
        self.assertEqual(1, result.returncode)

    def test_mixed_clients_are_flagged_for_comparison(self):
        self.start()
        self.write(self.reply('msg-a', 'end_turn'), self.done())
        self.tracker.sync()
        self.assertNotIn(mod.MIXED_CLIENT_GAP, self.tracker.snapshot()['coverage'])
        run = self.tracker.run_for(SID)['id']
        self.tracker.session('codex-session', str(self.root))
        self.tracker.db.execute("UPDATE sessions SET client='0.99.0' WHERE id='codex-session'")
        self.tracker.db.execute("INSERT INTO members VALUES (?,'codex-session',NULL)", (run,))
        self.tracker.db.commit()
        self.assertIn(mod.MIXED_CLIENT_GAP, self.tracker.snapshot()['coverage'])

    def test_doctor_reports_both_clients(self):
        mod.hook_config(self.root, client='claude')
        completed = subprocess.CompletedProcess([], 0, 'synthetic 1.0\n', '')
        with mock.patch.object(mod.subprocess, 'run', return_value=completed):
            report = mod.doctor(self.tracker)
        self.assertTrue(report['clients']['claude']['project_hooks_installed'])
        self.assertFalse(report['clients']['codex']['project_hooks_installed'])
        self.assertEqual('.claude/settings.local.json', report['clients']['claude']['hook_file'])

    def test_claude_skill_copy_matches_repository_skill(self):
        repo = Path(__file__).resolve().parents[2]
        self.assertEqual((repo / '.agents/skills/project-experiment/SKILL.md').read_text(),
                         (repo / '.claude/skills/project-experiment/SKILL.md').read_text())


if __name__ == '__main__':
    unittest.main()
