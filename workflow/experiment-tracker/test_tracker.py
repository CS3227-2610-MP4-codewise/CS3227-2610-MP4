"""Synthetic integration/security cases for EXP-01–06; no real transcripts."""
import concurrent.futures
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('tracker', Path(__file__).with_name('tracker.py'))
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class TrackerTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'workflow/templates').mkdir(parents=True)
        (self.root / 'workflow/templates/member-log.md').write_text('# Increment title\n\n## Request\n\nName the human owner, bounded objective, OpenSpec change/requirement IDs, and branch/PR if known.\n\n## Results\n\nPreserve this history.\n')
        self.tracker = mod.Tracker(self.root)
        self.source = self.root / 'synthetic.jsonl'
        self.rows = [{'type':'session_meta','payload':{'id':'session-a','cwd':str(self.root),'cli_version':'synthetic-1'}}]

    def tearDown(self):
        self.tracker.db.close()
        self.temp.cleanup()

    def write(self):
        self.source.write_text(''.join(json.dumps(r)+'\n' for r in self.rows))

    def record(self, kind, payload):
        return {'type':kind,'timestamp':'2026-11-08T01:00:00+00:00','payload':payload}

    def usage(self, response='response-a', turn='turn-a', amount=100):
        return self.record('token_usage_record', {'response_id':response,'turn_id':turn,'usage':{
            'input_tokens':amount,'cached_input_tokens':40,'output_tokens':20,
            'reasoning_output_tokens':10,'total_tokens':amount+20}})

    def attach(self):
        self.write()
        full=list(self.rows)
        self.rows=self.rows[:1]+[self.record('event_msg',{'type':'task_started','turn_id':'turn-a'})]
        self.write()
        self.tracker.attach(self.source)
        self.tracker.start('test-increment','Synthetic increment','EXP-01–06',session='session-a')
        self.rows=self.rows+full[1:]
        self.write()

    def test_usage_deduplicates_by_response_and_repeated_sync(self):
        self.rows += [self.usage(),self.usage()]
        self.attach()
        for _ in range(3): self.tracker.sync()
        s=self.tracker.snapshot('test-increment')
        self.assertEqual(120,s['totals']['total_tokens'])
        self.assertEqual(.4,s['cache_ratio'])
        self.assertEqual(.5,s['reasoning_output_ratio'])
        self.assertEqual('provisional',s['status'])

    def test_complete_then_later_turn_is_provisional(self):
        self.rows += [self.usage(),self.record('event_msg',{'type':'task_complete','turn_id':'turn-a'})]
        self.attach();self.tracker.sync()
        self.assertEqual('observed-complete',self.tracker.snapshot()['status'])
        with self.source.open('a') as f:
            f.write(json.dumps({'type':'event_msg','timestamp':mod.now(),'payload':{'type':'task_started','turn_id':'turn-b'}})+'\n')
            f.write(json.dumps(self.usage('response-b','turn-b'))+'\n')
        self.tracker.sync()
        self.assertEqual('provisional',self.tracker.snapshot()['status'])

    def test_fallback_cumulative_deltas_and_response_precedence(self):
        def fallback(total):
            return self.record('event_msg',{'type':'token_count','info':{'total_token_usage':{
                'input_tokens':total,'cached_input_tokens':0,'output_tokens':0,'reasoning_output_tokens':0,'total_tokens':total}}})
        self.rows += [fallback(100),fallback(100),fallback(150)]
        self.attach();self.tracker.sync()
        self.assertEqual(150,self.tracker.snapshot()['totals']['total_tokens'])
        with self.source.open('a') as f: f.write(json.dumps(self.usage())+'\n')
        self.tracker.sync()
        self.assertEqual(120,self.tracker.snapshot()['totals']['total_tokens'])
        self.assertFalse(any(r['kind']=='usage_fallback' for r in self.tracker.snapshot()['records']))

    def test_partial_line_is_imported_after_completion(self):
        self.attach()
        line=json.dumps(self.usage())
        with self.source.open('a') as f:f.write(line[:40])
        self.tracker.sync()
        self.assertIsNone(self.tracker.snapshot()['totals']['total_tokens'])
        with self.source.open('a') as f:f.write(line[40:]+'\n')
        self.tracker.sync()
        self.assertEqual(120,self.tracker.snapshot()['totals']['total_tokens'])

    def test_source_truncation_rebuilds_without_stale_usage(self):
        self.rows += [self.usage()];self.attach();self.tracker.sync()
        self.rows=self.rows[:1];self.write();self.tracker.sync()
        self.assertIsNone(self.tracker.snapshot()['totals']['total_tokens'])

    def test_same_header_rewrite_is_detected(self):
        self.rows += [self.usage()];self.attach();self.tracker.sync()
        self.rows[-1]=self.usage(amount=200);self.write();self.tracker.sync()
        self.assertEqual(220,self.tracker.snapshot()['totals']['total_tokens'])

    def test_malformed_input_is_reported_without_raw_data(self):
        self.attach()
        with self.source.open('a') as f:f.write('SENSITIVE_INVALID_PAYLOAD\n')
        self.tracker.sync()
        s=json.dumps(self.tracker.snapshot())
        self.assertIn('partial',s);self.assertNotIn('SENSITIVE',s)

    def test_unrelated_scope_and_changed_source_refused(self):
        self.rows[0]['payload']['cwd']='/unrelated'
        self.write()
        with self.assertRaises(ValueError):self.tracker.attach(self.source)
        self.rows[0]['payload']['cwd']=str(self.root);self.attach()
        self.rows[0]['payload']['cwd']='/unrelated';self.write();self.tracker.sync()
        self.assertIn('unsupported',self.tracker.snapshot()['sources'][0]['warning'])

    def test_missing_counters_remain_unavailable(self):
        self.rows += [self.record('token_usage_record',{'response_id':'r','usage':{'input_tokens':10}})]
        self.attach();self.tracker.sync()
        self.assertIsNone(self.tracker.snapshot()['totals']['total_tokens'])
        self.assertEqual(10,self.tracker.snapshot()['totals']['input_tokens'])

    def test_invalid_subset_is_refused(self):
        with self.assertRaises(ValueError):mod.counts({'input_tokens':10,'cached_input_tokens':11})
        with self.assertRaises(ValueError):mod.counts({'output_tokens':10,'reasoning_output_tokens':11})

    def test_hook_privacy_and_stable_tool_identity(self):
        event={'cwd':str(self.root),'session_id':'session-a','hook_event_name':'PostToolUse',
               'tool_name':'Bash','tool_use_id':'call-a','prompt':'PRIVATE_PROMPT',
               'tool_input':{'command':'SECRET'},'tool_response':{'output':'PRIVATE_OUTPUT','exit_code':1},
               'last_assistant_message':'PRIVATE_REASONING'}
        self.attach();event['turn_id']='turn-a'
        mod.enqueue(self.root,event);mod.enqueue(self.root,event)
        self.assertEqual(1,len(list((self.tracker.state/'queue').glob('*.json'))))
        self.tracker.sync()
        content=json.dumps(self.tracker.snapshot())
        self.assertNotIn('PRIVATE',content);self.assertNotIn('SECRET',content)
        self.assertIn('exit_code',content)

    def test_concurrent_hook_writes(self):
        self.attach()
        def send(i):return mod.enqueue(self.root,{'cwd':str(self.root),'session_id':'session-a',
            'hook_event_name':'PreToolUse','tool_use_id':f'call-{i}','turn_id':'turn-a'})
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            self.assertTrue(all(pool.map(send,range(40))))
        self.tracker.sync()
        self.assertEqual(40,len([r for r in self.tracker.snapshot()['records'] if r['kind']=='hook']))

    def test_child_inherits_increment_but_not_invented_tokens(self):
        self.attach()
        mod.enqueue(self.root,{'cwd':str(self.root),'session_id':'session-a','hook_event_name':'SubagentStart','agent_id':'child-a','turn_id':'turn-a'})
        self.tracker.sync()
        s=self.tracker.snapshot('test-increment')
        self.assertEqual(2,len(s['sessions']))
        self.assertIsNone(s['totals']['total_tokens'])
        self.assertIn('no registered transcript',' '.join(s['coverage']))
        self.assertEqual('unknown',s['coordination_checks'][0]['result'])

    def test_unrelated_hook_is_discarded(self):
        self.assertFalse(mod.enqueue(self.root,{'cwd':'/unrelated','session_id':'s','hook_event_name':'Stop'}))

    def test_hooks_preserve_other_handlers_and_are_idempotent(self):
        path=self.root/'.codex/hooks.json';path.parent.mkdir()
        original={'description':'preserve','hooks':{'Stop':[{'matcher':'x','hooks':[{'type':'command','command':'echo existing'}]}]}}
        path.write_text(json.dumps(original))
        mod.hook_config(self.root);first=json.loads(path.read_text())
        mod.hook_config(self.root);self.assertEqual(first,json.loads(path.read_text()))
        mod.hook_config(self.root,False);self.assertEqual(original,json.loads(path.read_text()))

    def test_log_is_one_per_increment_append_only_and_idempotent(self):
        self.attach()
        path=self.tracker.ensure_log('test-increment');initial=path.read_text()
        self.tracker.checkpoint('test-increment','first','Implement','PASS synthetic tests')
        first=path.read_text();self.assertTrue(first.startswith(initial))
        self.tracker.checkpoint('test-increment','first','Changed','Changed')
        self.assertEqual(first,path.read_text())
        self.tracker.checkpoint('test-increment','second','Continue','PASS more tests')
        self.assertTrue(path.read_text().startswith(first))
        self.assertEqual(1,len(list((self.root/'logs/keith').glob('*.md'))))

    def test_log_slug_rejects_traversal(self):
        with self.assertRaises(ValueError):self.tracker.start('../darryl','bad')

    def test_annotations_and_waits_are_explicit(self):
        self.attach()
        self.tracker.annotate('test-increment','blocked',{'summary':'Awaiting producer'},task='task-a',ts='2026-11-08T01:00:00+00:00')
        self.tracker.annotate('test-increment','unblocked',{'summary':'Producer ready'},task='task-a',ts='2026-11-08T01:02:00+00:00')
        self.assertEqual(120,self.tracker.snapshot()['blocked_intervals'][0]['seconds'])
        with self.assertRaises(ValueError):self.tracker.annotate('test-increment','context',{'raw_prompt':'not allowed'})

    def test_conflicting_ownership_is_visible(self):
        self.attach()
        for agent in ('agent-a','agent-b'):
            self.tracker.annotate('test-increment','assignment',{'files':'shared.ts','summary':'Synthetic ownership'},agent=agent)
        self.assertIn('fail',self.tracker.snapshot()['coordination_checks'][0]['result'])

    def test_export_drops_source_paths_and_request_records(self):
        self.rows += [self.usage()];self.attach();self.tracker.sync()
        out=mod.export_summary(self.tracker,'test-increment',self.root/'export')
        content=(out/'summary.json').read_text()
        self.assertNotIn(str(self.source),content);self.assertNotIn('records',json.loads(content))
        self.assertEqual(120,json.loads(content)['totals']['total_tokens'])

    def test_report_embedded_payload_is_script_safe(self):
        self.attach()
        self.tracker.annotate('test-increment','decision',{'summary':'</script><script>attack()</script>'})
        path=mod.report(self.tracker,self.root/'report.html')
        self.assertNotIn('</script><script>attack()',path.read_text())
        self.assertIn('\\u003c/script',path.read_text())

    def test_hook_cli_is_nonblocking_even_on_invalid_input(self):
        result=subprocess.run([sys.executable,str(Path(mod.__file__)),'--root',str(self.root),'hook'],
            input='invalid secret',capture_output=True,text=True)
        self.assertEqual(0,result.returncode);self.assertEqual('{}',result.stdout.strip())
        self.assertNotIn('secret',result.stderr)


    def test_nested_children_require_actual_links_during_recording(self):
        self.attach()
        self.assertTrue(self.tracker.link_child('session-a','turn-a','child'))
        run=self.tracker.run_for('child')
        self.tracker.admit(run,'child','child-turn',mod.now())
        self.assertTrue(self.tracker.link_child('child','child-turn','grandchild'))
        self.assertEqual(3,len(self.tracker.snapshot('test-increment')['sessions']))

    def test_parent_cycle_and_conflicting_parent_refused(self):
        self.attach()
        self.tracker.session('child-a',str(self.root),'session-a')
        with self.assertRaises(ValueError):self.tracker.session('session-a',str(self.root),'child-a')
        self.tracker.session('parent-b',str(self.root))
        with self.assertRaises(ValueError):self.tracker.session('child-a',str(self.root),'parent-b')

    def test_dependency_trigger_requires_prior_evidence(self):
        self.attach()
        self.tracker.annotate('test-increment','assignment',{'summary':'Consume producer'},task='consumer',dependency='producer',aid='assignment',ts='2026-11-08T02:00:00+00:00')
        self.assertEqual('unknown',self.tracker.snapshot()['coordination_checks'][-1]['result'])
        self.tracker.annotate('test-increment','handoff',{'summary':'Producer ready','outcome':'pass','evidence':'synthetic revision'},task='producer',ts='2026-11-08T01:00:00+00:00')
        self.assertEqual('pass',self.tracker.snapshot()['coordination_checks'][-1]['result'])

    def test_ownership_windows_are_separate(self):
        self.attach()
        for agent in ('agent-a','agent-b'):
            self.tracker.annotate('test-increment','assignment',{'files':'shared.ts','window':agent},agent=agent)
        self.assertTrue(all(c['result']=='pass' for c in self.tracker.snapshot()['coordination_checks']))

    def test_duplicate_checkpoint_after_database_loss_preserves_history(self):
        self.attach();path=self.tracker.checkpoint('test-increment','first','Request','Results')
        self.tracker.db.execute('DELETE FROM checkpoints');self.tracker.db.commit()
        first=path.read_text();self.tracker.checkpoint('test-increment','first','Changed','Changed')
        self.assertEqual(first,path.read_text())

    def test_symlink_member_log_refused(self):
        self.attach()
        path=self.root/'logs/keith/test-increment.md';path.unlink()
        target=self.root/'other.md';target.write_text('keep');path.symlink_to(target)
        with self.assertRaises(ValueError):self.tracker.ensure_log('test-increment')
        self.assertEqual('keep',target.read_text())

    def test_uninstall_preserves_empty_unowned_groups(self):
        path=self.root/'.codex/hooks.json';path.parent.mkdir()
        original={'hooks':{'Stop':[{'matcher':'original','hooks':[]}]}}
        path.write_text(json.dumps(original));mod.hook_config(self.root);mod.hook_config(self.root,False)
        self.assertEqual(original,json.loads(path.read_text()))


    def append_record(self,kind,payload):
        with self.source.open('a') as f:
            f.write(json.dumps({'type':kind,'timestamp':mod.now(),'payload':payload})+'\n')

    def begin(self,turn):
        self.append_record('event_msg',{'type':'task_started','turn_id':turn})

    def end(self,turn):
        self.append_record('event_msg',{'type':'task_complete','turn_id':turn})

    def test_attach_and_sync_without_opt_in_never_imports_usage(self):
        self.rows += [self.usage()];self.write();self.tracker.attach(self.source);self.tracker.sync()
        self.assertEqual(0,self.tracker.db.execute('SELECT count(*) FROM records').fetchone()[0])
        self.assertIsNone(self.tracker.snapshot()['totals']['total_tokens'])
        self.assertFalse(mod.enqueue(self.root,{'cwd':str(self.root),'session_id':'session-a','turn_id':'turn-a','hook_event_name':'PreModelRequest'}))
        self.assertFalse((self.tracker.state/'queue').exists())

    def test_current_turn_only_excludes_earlier_turns(self):
        self.rows += [self.record('event_msg',{'type':'task_started','turn_id':'old'}),self.usage('old-response','old'),
                      self.record('event_msg',{'type':'task_complete','turn_id':'old'}),
                      self.record('event_msg',{'type':'task_started','turn_id':'turn-a'}),self.usage()]
        self.write();self.tracker.attach(self.source)
        self.tracker.start('bounded','Bounded',session='session-a');self.tracker.sync()
        self.assertEqual(120,self.tracker.snapshot()['totals']['total_tokens'])
        self.assertNotIn('old-response',json.dumps(self.tracker.snapshot()['records']))

    def test_unknown_current_turn_refuses_start_without_log(self):
        self.write();self.tracker.attach(self.source)
        with self.assertRaises(ValueError):self.tracker.start('unknown','Unknown',session='session-a')
        self.assertFalse((self.root/'logs/keith/unknown.md').exists())

    def test_pause_drains_and_excludes_general_turn_then_resume(self):
        self.attach();self.append_record('token_usage_record',self.usage()['payload'])
        status=self.tracker.control('session-a','pause')
        self.assertEqual('draining-to-pause',status['state'])
        with self.assertRaises(ValueError):self.tracker.control('session-a','resume')
        self.end('turn-a');self.begin('general')
        self.append_record('token_usage_record',self.usage('general-response','general',500)['payload'])
        self.tracker.sync();self.assertEqual('paused',self.tracker.recording_status('session-a')['state'])
        self.assertEqual(120,self.tracker.snapshot()['totals']['total_tokens'])
        self.assertFalse(mod.enqueue(self.root,{'cwd':str(self.root),'session_id':'session-a','turn_id':'general','hook_event_name':'PreModelRequest'}))
        self.end('general');self.begin('resumed')
        self.tracker.control('session-a','resume')
        self.append_record('token_usage_record',self.usage('new-response','resumed')['payload']);self.tracker.sync()
        self.assertEqual(240,self.tracker.snapshot()['totals']['total_tokens'])
        self.assertNotIn('general-response',json.dumps(self.tracker.snapshot()['records']))
        self.assertEqual(2,len(self.tracker.snapshot()['windows']))

    def test_stop_freezes_children_and_waits_for_known_active_child(self):
        self.attach();self.tracker.link_child('session-a','turn-a','child')
        run=self.tracker.run_for('child');self.tracker.admit(run,'child','child-turn',mod.now());self.tracker.db.commit()
        self.assertEqual('draining-to-stop',self.tracker.control('session-a','stop')['state'])
        self.assertFalse(self.tracker.link_child('session-a','turn-a','new-child'))
        self.end('turn-a');self.tracker.sync()
        self.assertEqual('draining-to-stop',self.tracker.recording_status('session-a')['state'])
        self.tracker.terminal('child','child-turn','task_complete');self.tracker.db.commit()
        self.assertEqual('stopped',self.tracker.recording_status('session-a')['state'])

    def test_late_usage_retained_after_stop_but_new_turn_excluded(self):
        self.attach();self.tracker.control('session-a','stop');self.end('turn-a');self.tracker.sync()
        self.append_record('token_usage_record',self.usage()['payload']);self.begin('untracked')
        self.append_record('token_usage_record',self.usage('untracked','untracked',900)['payload']);self.tracker.sync()
        self.assertEqual(120,self.tracker.snapshot()['totals']['total_tokens'])
        self.assertEqual('stopped',self.tracker.recording_status('session-a')['state'])
        with self.assertRaises(ValueError):self.tracker.control('session-a','resume')

    def test_explicit_partial_finalization_records_missing_terminal(self):
        self.attach();self.tracker.control('session-a','stop')
        status=self.tracker.control('session-a','finalize')
        self.assertEqual('stopped',status['state']);self.assertTrue(status['partial'])
        self.assertIn('coverage incomplete',' '.join(self.tracker.snapshot()['coverage']))

    def test_new_run_same_increment_reuses_log(self):
        self.attach();path=self.tracker.ensure_log('test-increment');first=path.read_text()
        self.tracker.control('session-a','stop');self.end('turn-a');self.tracker.sync();self.begin('next')
        self.tracker.start('test-increment','Synthetic increment',session='session-a')
        self.assertEqual(2,len(self.tracker.snapshot()['runs']));self.assertEqual(first,path.read_text())

    def test_two_increments_can_share_session_with_distinct_turns(self):
        self.attach();self.append_record('token_usage_record',self.usage()['payload'])
        self.tracker.control('session-a','stop');self.end('turn-a');self.tracker.sync();self.begin('next')
        self.tracker.start('second','Second',session='session-a')
        self.append_record('token_usage_record',self.usage('r2','next',200)['payload']);self.tracker.sync()
        self.assertEqual(120,self.tracker.snapshot('test-increment')['totals']['total_tokens'])
        self.assertEqual(220,self.tracker.snapshot('second')['totals']['total_tokens'])

    def test_role_history_preserves_runtime_identity(self):
        self.attach();self.tracker.agent_role('session-a','session-a','implementer','Implementer')
        roles=self.tracker.snapshot()['roles']
        self.assertEqual(['/root','/root'],[r['runtime_id'] for r in roles])
        self.assertEqual('Implementer',roles[-1]['label'])
        with self.assertRaises(ValueError):self.tracker.agent_role('session-a','session-a','reviewer','Reviewer','/fake')

    def test_unknown_child_or_child_during_drain_is_not_admitted(self):
        self.attach();self.tracker.control('session-a','pause')
        for sid in ('unrelated','new-child'):
            self.assertFalse(mod.enqueue(self.root,{'cwd':str(self.root),'session_id':sid,'turn_id':'x','hook_event_name':'PreModelRequest'}))
        self.assertFalse(self.tracker.link_child('session-a','turn-a','new-child'))

    def test_cumulative_boundary_skips_ambiguous_first_sample(self):
        def cumulative(n):
            return {'type':'token_count','info':{'total_token_usage':{'input_tokens':n,'cached_input_tokens':0,'output_tokens':0,'reasoning_output_tokens':0,'total_tokens':n}}}
        self.attach();self.append_record('event_msg',cumulative(100));self.tracker.control('session-a','pause')
        self.end('turn-a');self.tracker.sync();self.begin('general');self.append_record('event_msg',cumulative(900));self.end('general');self.begin('resumed')
        self.tracker.control('session-a','resume');self.append_record('event_msg',cumulative(950));self.append_record('event_msg',cumulative(970));self.tracker.sync()
        self.assertEqual(120,self.tracker.snapshot()['totals']['total_tokens'])
        self.assertIn('partial',self.tracker.snapshot()['sources'][0]['warning'])

    def test_v1_migration_backups_and_excludes_unbounded_records(self):
        self.tracker.db.execute("INSERT INTO records(id,source,session_id,ts,kind,data) VALUES ('legacy','old','old',?,'usage',?)",(mod.now(),json.dumps({'total_tokens':999})))
        self.tracker.db.execute("UPDATE settings SET value='1' WHERE key='version'");self.tracker.db.commit();self.tracker.db.close()
        self.tracker=mod.Tracker(self.root)
        self.assertTrue(list((self.tracker.state/'backups').glob('v1-*.sqlite3')))
        self.assertEqual(1,self.tracker.snapshot()['legacy']['excluded_records'])
        self.assertIsNone(self.tracker.snapshot()['totals']['total_tokens'])

    def test_queue_cannot_forge_run_attribution(self):
        self.attach();queue=self.tracker.state/'queue';queue.mkdir(exist_ok=True)
        (queue/'forged.json').write_text(json.dumps({'cwd':str(self.root),'session_id':'session-a','turn_id':'turn-a','run_id':'wrong','timestamp':mod.now(),'event_id':'forged'}))
        self.tracker.sync();self.assertFalse(any(r['kind']=='hook' for r in self.tracker.snapshot()['records']))

    def test_stop_hook_does_not_close_turn_before_source_terminal(self):
        self.attach();mod.enqueue(self.root,{'cwd':str(self.root),'session_id':'session-a','turn_id':'turn-a','hook_event_name':'Stop'})
        self.tracker.control('session-a','stop')
        self.assertEqual('draining-to-stop',self.tracker.recording_status('session-a')['state'])


    def test_source_replay_preserves_legacy_rows_from_same_transcript(self):
        self.attach()
        self.tracker.db.execute("INSERT INTO records(id,source,session_id,ts,kind,data) VALUES ('legacy-same-source',?,'session-a',?,'usage',?)",(str(self.source),mod.now(),json.dumps({'total_tokens':999})))
        self.tracker.db.commit();self.tracker.sync()
        self.assertEqual(1,self.tracker.snapshot()['legacy']['excluded_records'])
        self.assertIsNone(self.tracker.snapshot()['totals']['total_tokens'])
        self.tracker.db.execute("UPDATE sources SET offset=0,prefix=NULL,state='{}'");self.tracker.db.commit();self.tracker.sync()
        self.assertEqual(1,self.tracker.snapshot()['legacy']['excluded_records'])

    def test_real_v1_column_migration_keeps_data(self):
        self.tracker.db.execute('ALTER TABLE records DROP COLUMN run_id')
        self.tracker.db.execute('ALTER TABLE records DROP COLUMN window_id')
        self.tracker.db.execute("UPDATE settings SET value='1' WHERE key='version'");self.tracker.db.commit();self.tracker.db.close()
        self.tracker=mod.Tracker(self.root)
        self.assertIn('run_id',{r['name'] for r in self.tracker.db.execute('PRAGMA table_info(records)')})
        self.assertEqual('2',self.tracker.db.execute("SELECT value FROM settings WHERE key='version'").fetchone()[0])

    def test_child_hook_proves_source_and_inherits_recording(self):
        self.attach()
        self.assertTrue(mod.enqueue(self.root,{'cwd':str(self.root),'session_id':'session-a','turn_id':'turn-a','hook_event_name':'SubagentStart','agent_id':'child'}))
        child=self.root/'child.jsonl'
        child.write_text(json.dumps({'type':'session_meta','payload':{'id':'child','cwd':str(self.root)}})+'\n'+json.dumps({'type':'event_msg','timestamp':mod.now(),'payload':{'type':'task_started','turn_id':'child-turn'}})+'\n')
        self.assertTrue(mod.enqueue(self.root,{'cwd':str(self.root),'session_id':'child','turn_id':'child-turn','hook_event_name':'PreModelRequest','transcript_path':str(child)}))
        self.tracker.sync()
        admission=self.tracker.admission('child','child-turn')
        self.assertEqual(self.tracker.run_for('session-a')['id'],admission['run_id'])
        self.assertEqual('session-a',self.tracker.db.execute("SELECT parent FROM sessions WHERE id='child'").fetchone()[0])

    def test_concurrent_start_only_opens_one_run(self):
        self.attach();self.tracker.control('session-a','stop');self.end('turn-a');self.tracker.sync();self.begin('next')
        def activate(_):
            t=mod.Tracker(self.root)
            try:
                t.start('test-increment','Synthetic increment',session='session-a');return True
            except (ValueError,sqlite3.Error):return False
            finally:t.db.close()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(activate,range(2)))
        self.assertEqual(1,sum(results))
        self.assertEqual(2,len(self.tracker.snapshot()['runs']))

    def test_paused_source_attach_cannot_reenable_collection(self):
        self.attach();self.tracker.control('session-a','pause');self.end('turn-a');self.tracker.sync();self.begin('general')
        self.tracker.attach(self.source)
        self.append_record('token_usage_record',self.usage('general','general')['payload']);self.tracker.sync()
        self.assertEqual('paused',self.tracker.recording_status('session-a')['state'])
        self.assertFalse(any(r['turn_id']=='general' for r in self.tracker.snapshot()['records']))


if __name__=='__main__':unittest.main()
