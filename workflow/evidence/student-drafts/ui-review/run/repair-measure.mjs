// CDP measurement of the review harness: page width and target sizes, focus after choices.
const [,, wsUrl] = process.argv;
const ws = new WebSocket(wsUrl);
let id = 0; const pending = new Map(); let sessionId;
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}, sid = sessionId) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await new Promise((r) => (ws.onopen = r));
const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' }, null);
({ result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
await send('Network.enable'); await send('Network.setBlockedURLs', { urls: ['*review-report*'] });
await send('Runtime.enable');
const measure = `(() => {
  const c = (sel) => [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(); return { name: e.textContent.trim().slice(0,30), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; });
  return { inner: innerWidth, scroll: document.documentElement.scrollWidth,
    back: c('.cw-student-back'), signin: c('a[href="/sign-in"]'), skip: c('.cw-skip-link'),
    focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName + ':' + (document.activeElement?.textContent||'').trim().slice(0,40) };
})()`;
const clickBtn = (name) => evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(name)})?.click()`);
const out = {};
for (const [w, theme, state] of [[320,'light','conflict-fallback'],[320,'dark','conflict'],[320,'light','editor'],[1440,'light','session']]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:5188/index.html?theme=${theme}&state=${state}` });
  await sleep(2500);
  if (state === 'session') {
    await evalJs(`(() => { const t = document.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(t, t.value + '# x\\n'); t.dispatchEvent(new Event('input', {bubbles:true})); t.blur(); })()`);
    await sleep(3000);
  }
  const k = `${w}-${theme}-${state}`;
  out[k] = { initial: await evalJs(measure) };
  if (state.startsWith('conflict')) {
    await clickBtn('Keep my version'); await sleep(200); out[k].afterKeep = await evalJs(measure);
    if (state === 'conflict-fallback') { await clickBtn('Copy other version'); await sleep(300); out[k].afterCopyDenied = await evalJs(measure); }
    await clickBtn('Back'); await sleep(200); out[k].afterBack = await evalJs(measure);
    await clickBtn('Use saved version'); await sleep(200);
    await clickBtn('Use saved and discard mine'); await sleep(400); out[k].afterResolve = await evalJs(measure);
  }
}
console.log(JSON.stringify(out, null, 1));
ws.close(); process.exit(0);
