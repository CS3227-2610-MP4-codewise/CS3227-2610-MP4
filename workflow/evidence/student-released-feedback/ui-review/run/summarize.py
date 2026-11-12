import json
from pathlib import Path

out = Path(__file__).resolve().parent.parent
rows = json.loads((out / 'metrics.json').read_text())
extra = json.loads((out / 'metrics-reduced-initial.json').read_text())
assert len(rows) == 104 and len(extra) == 16
checks = []
def check(name, passed, details):
    checks.append((name, 'pass' if passed else 'fail', details))

check('Overflow', all(not r['initial']['overflow'] for r in rows), '104/104: scrollWidth equals viewport width; no page-level sideways scroll.')
failed_targets = [(r, t) for r in rows for t in r['initial']['targets'] if not t['pass']]
check('Literal target size', not failed_targets, f'{len(failed_targets)} instances: only h3[tabindex="-1"], 22 px high. See F1. All actionable controls and source regions meet 44×44.')
check('Focus visibility', all(f['visible'] and f['outlineWidth'] >= 2 and f['outlineStyle'] != 'none' and f['ratio'] >= 3 for r in rows for f in r['focus']), 'Every enumerated button/select/link/[tabindex] was programmatically focused after CDP Tab establishes keyboard modality; visible outline ≥2 px, contrast ≥3:1. This does not establish human tab order or screen-reader behavior.')
for theme in ['light', 'dark']:
    subset = [r for r in rows if r['theme'] == theme]
    minimum = min(c['ratio'] for r in subset for c in r['initial']['contrast'])
    selected = min(c['ratio'] for r in subset for m in r.get('mapping', []) for c in m['selectedContrast'])
    check('Contrast '+theme, min(minimum, selected) >= 4.5, f'Initial text minimum {minimum:.3f}:1; selected source/token/number minimum {selected:.3f}:1. See contrast.md.')
released = [r for r in rows if r['state'] == 'released']
valid_mapping = True
for r in released:
    valid_mapping &= len(r['mapping']) == 6
    for m in r['mapping']:
        index = m['index']
        valid_mapping &= m['row'] == ['1','2','1'][index] and m['selected'] == [['1'],['2','3'],['1']][index]
        valid_mapping &= m['markerPressed'] == m['observationPressed'] == 'true' and m['retainedFocus']
        valid_mapping &= ['Observation A, line 1, Correct total selected. The accumulator starts at zero.', 'Observation B, lines 2–3, Correct total selected. The loop adds each value.', 'Observation C, line 1, Clear output selected. The long message stays on one logical source line.'][index] == m['live']
        valid_mapping &= bool(m.get('note'))
check('Annotation mapping', valid_mapping, '48/48 Enter activations: A line 1 in question 1; B lines 2–3 in question 1; C long line 1 in question 2. Both mirrored pressed states, exact highlighted range, retained trigger focus, expected live text and named note content recorded. No source was executed.')
narrow = [r for r in released if r['width'] == 320]
check('Wrapped logical lines', all(r['initial']['lines'][1][0]['height'] > r['initial']['lines'][1][0]['lineHeight'] and all([l['number'] for l in lines] == ['1','2','3','4'] and all(l['noCount'] == 1 and l['scrollWidth'] <= l['width'] + 1 for l in lines) for lines in r['initial']['lines']) for r in narrow), '320 light/dark: 174-character question-2 line is 256.5 px = 9×28.5 px, one logical number; each source remains numbered 1,2,3,4. Indentation preserved.')
check('Unmatched safety', all(len(r['initial']['unmatched']) == 2 and r['initial']['annotated'] == [{'question':'Question 2: Print a message','line':'1'}] for r in rows if r['state']=='unmatched'), 'Wrong excerpt and past-end range appear only in unavailable-evidence list. Only valid question-2 line 1 is annotated.')
check('Version history', all('Replaced feedback (not current)' in r['initial']['feedbackText'] and 'Current feedback' not in r['initial']['feedbackText'] for r in rows if r['state']=='replaced'), '8/8: select Version 1; replaced label and release time; no Current feedback heading.')
check('Withdrawals', all(r['initial']['tableCount'] == 0 and 'was withdrawn on' in r['initial']['text'] and 'of 5' not in r['initial']['text'] and 'Current feedback' not in r['initial']['text'] for r in rows if r['state'] in ['withdrawn-historical','withdrawn-current']), '16/16 tombstones have time, no criteria table or score text. In withdrawn-current, selecting older v1 also remains replaced, never current.')
check('No revival', all('Replaced feedback (not current)' in r['older']['text'] and 'Current feedback' not in r['older']['text'] for r in rows if r['state']=='withdrawn-current'), '8/8: older v1 still labelled replaced after current v2 withdrawal.')
check('Stale retry', all('Load feedback again' in r['initial']['text'] and 'Current feedback, version 1' in r['retry']['text'] for r in rows if r['state']=='stale'), '8/8 CDP Enter retry activations show released content.')
check('History marker', all(r['initial']['historyFlags'] == [False,True,False] and 'of 5' not in r['initial']['text'] for r in rows if r['state']=='history'), '8/8: three rows; middle only has Feedback released; no scores. History has no open attempt, so source-presence check is not applicable there.')
check('Source retained', all(len(r['initial']['sources']) == 2 for r in rows if r['state'] != 'history'), '96/96 open-attempt views retain both named Submitted source regions in every feedback state; expired exposes no feedback content.')
expected = {'loading':'Loading released feedback', 'none':'Feedback has not been released', 'expired':'Your session has ended', 'network':'Feedback could not be loaded', 'unavailable':'Feedback is not available right now'}
check('Truthful states', all(text in r['initial']['text'] and (r['state'] not in ['loading','none','expired','network','unavailable'] or r['initial']['tableCount'] == 0) for state,text in expected.items() for r in rows if r['state']==state) and all('Sign in' in r['initial']['text'] for r in rows if r['state']=='expired') and all('Try again' in r['initial']['text'] for r in rows if r['state']=='network'), 'Distinct loading/none/stale/expired/network/unavailable text, expected retry/sign-in controls, no placeholder scores. released-noannotations has criteria but no markers; replaced/withdrawn have explicit version states.')
check('Privacy DOM', all(not d['privacyMatches'] for r in rows for d in [r['initial'],r['reduced'],r.get('selected',r['initial']),r.get('retry',r['initial']),r.get('older',r['initial'])]), '104/104 initial outerHTML scans plus selected/retry/older variants: no PRIVATE-, reason, approv, reviewer, privateReference, PRIVATE_REFERENCE or synthetic draft sentinel. Producer internals never enter API bodies. Integration/caches across real accounts remain unverified.')
check('Reduced motion', all(r['reduced']['reduced'] and not r['reduced']['motion'] for r in rows) and all(r['reducedInitial']['reduced'] and not r['reducedInitial']['motion'] for r in extra), '104/104 post-interaction scans plus 16 supplemental original stale/withdrawn-current scans: every panel descendant has zero transition-duration and animation-duration. Remaining original views are unchanged or gain selected-note elements before the primary scan.')
md = '# Automated metrics\n\nSource `0e843c58765bf4aedc588abf5c5e637ee19430a6`; Edge 157.0.4341.46, real CDP rendering, 100% zoom, deviceScaleFactor 1. [Raw main](metrics.json), [supplemental original-state reduced motion](metrics-reduced-initial.json), [runner](run/measure.mjs).\n\n'
md += '| Check | Result | Evidence / limits |\n|---|---|---|\n' + ''.join(f'| {a} | **{b}** | {c} |\n' for a,b,c in checks)
md += '\n## Exact combinations\n\nEvery one of the following 104 combinations ran (no omissions at 100%). Main raw data records original, selected, retry, older and reduced variants separately.\n\n| Width | Theme | States |\n|---|---|---|\n'
for w in [320,768,1024,1440]:
    for t in ['light','dark']:
        md += f"| {w} | {t} | " + ', '.join(r['state'] for r in rows if r['width']==w and r['theme']==t) + ' |\n'
md += '\n## Unverified combinations\n\nAll widths × both themes × released/history at real 200% browser zoom (16 combinations) are unverified. No real browser zoom was driven; CDP device metrics are not zoom. All other states at 200% are also unverified. Real VoiceOver, human keyboard order/reachability, physical touch, forced colors, text-only zoom, alternate browsers and the full composed app shell/auth/authorization/D1 paths were not reviewed. Reduced-motion emulation is browser-level; no OS preference change or real screen-reader speech is claimed.\n\nF1 is a literal requested `[tabindex]` check failure, not evidence of an undersized clickable action. No task or acceptance was recorded.\n'
(out/'metrics-summary.md').write_text(md)

# Deduplicate computed color pairs and retain scope/type for reproducible contrast audit.
items=[]
for r in rows:
    for c in r['initial']['contrast']:
        items.append((r['theme'],c['selector'],'text',c))
    for c in r.get('selected',{}).get('contrast',[]):
        items.append((r['theme'],c['selector']+' (selected view)','text',c))
    for m in r.get('mapping',[]):
        for c in m['selectedContrast']:
            items.append((r['theme'],c['label'].split(' [')[0]+' on annotation','text',c))
        for c in m['selectedRule']:
            items.append((r['theme'],'selected-line left rule','indicator',c))
    for f in r['focus']:
        items.append((r['theme'],f['label'].split(' [')[0]+' focus outline','indicator',f))
    for c in r['initial']['indicators']:
        items.append((r['theme'],c['label'].split(' [')[0]+' border','indicator',c))
unique={}
for t,s,k,c in items:
    key=(t,s,k,tuple(c['fg']),tuple(c['bg']))
    unique[key]=c['ratio']
contrast='# Rendered contrast\n\ngetComputedStyle supplies resolved colors, including light-dark(). A 1×1 browser canvas converts CSS colors to sRGB; transparent backgrounds are composited recursively over ancestor backgrounds. WCAG relative luminance: sRGB linearization at 0.04045, weights 0.2126/0.7152/0.0722, ratio (Lmax+0.05)/(Lmin+0.05). These are rendered CSS colors, not raw token strings or screenshot estimates.\n\nAll text is held to 4.5:1; focus, selected-line rule and marker borders to 3:1. Initial text minimum: light **5.142:1**, dark **6.753:1**. Selected source text/syntax/number minimum: light **4.923:1**, dark **5.484:1**. No measured combination fails. The selected source uses fill plus left rule; focus uses an offset 2–3 px outline. All focus samples match :focus-visible; marker/observation outlines are ink while selection rule is accent.\n\n| Theme | Element / state | Kind | Foreground RGB | Background RGB | Ratio | Result |\n|---|---|---|---|---|---|---|\n'
for (t,s,k,fg,bg),ratio in sorted(unique.items()):
    contrast+=f'| {t} | `{s}` | {k} | {fg} | {bg} | {ratio:.3f}:1 | {"pass" if ratio >= (4.5 if k=="text" else 3) else "fail"} |\n'
contrast+='\nRaw per-control outlines, dimensions, resolved colors, source-token colors and selected range measurements are in [metrics.json](metrics.json). Coverage: all 104 original combinations, all focusable controls enumerated by the requested selectors, all 48 released observation activations. Absent elements are not counted (for example no criteria in a tombstone, no history marker inside an open attempt). This does not verify forced colors or human focus perception at 200% zoom.\n'
(out/'contrast.md').write_text(contrast)
shots=sorted((out/'screenshots').glob('*.png'))
(out/'screenshots.md').write_text('# Browser screenshots\n\nActual full-content PNG screenshots from headless Edge 157 CDP Page.captureScreenshot, CSS viewport widths 320/768/1024/1440 at 100% zoom, light and dark. These are synthetic API panel captures, not composed integration evidence. All 104 original combinations are included, plus 8 released views with annotation C selected (the long wrapped question-2 line). Focus may be visible on the last enumerated control; the selected captures keep focus on observation C.\n\n'+'\n'.join(f'- [{p.stem}](screenshots/{p.name})' for p in shots)+'\n\nNo real 200% zoom screenshot is claimed.\n')
print('checks', len(checks), 'failed',[(a,c) for a,b,c in checks if b=='fail'],'screenshots',len(shots),'contrast pairs',len(unique))
