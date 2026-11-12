const m = await (await fetch('http://127.0.0.1:9229/json/version')).json();
const ws = new WebSocket(m.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0,
  sid;
const p = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    p.get(m.id)(m.result);
    p.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((r) => {
    p.set(++id, r);
    ws.send(
      JSON.stringify({
        id,
        method,
        params,
        ...(sid ? { sessionId: sid } : {}),
      }),
    );
  });
const { targetId } = await send('Target.createTarget', {
  url: 'http://127.0.0.1:5189/index.html?state=released',
});
({ sessionId: sid } = await send('Target.attachToTarget', {
  targetId,
  flatten: true,
}));
await send('Page.bringToFront');
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await new Promise((r) => setTimeout(r, 1000));
const ev = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true })).result
    .value;
console.log(
  await ev(
    `(()=>{const e=document.querySelector('.cw-fb-marker');e.focus();window.events=[];for(const t of ['keydown','keyup','click'])e.addEventListener(t,e=>window.events.push([e.type,e.key,e.code,e.keyCode]));return {hasFocus:document.hasFocus(),active:document.activeElement.outerHTML};})()`,
  ),
);
await send('Input.dispatchKeyEvent', {
  type: 'rawKeyDown',
  key: 'Enter',
  code: 'Enter',
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13,
});
await send('Input.dispatchKeyEvent', {
  type: 'char',
  text: '\r',
  unmodifiedText: '\r',
  key: 'Enter',
  code: 'Enter',
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13,
});
await send('Input.dispatchKeyEvent', {
  type: 'keyUp',
  key: 'Enter',
  code: 'Enter',
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13,
});
await new Promise((r) => setTimeout(r, 100));
console.log(
  await ev(
    `({events:window.events,pressed:document.querySelector('.cw-fb-marker').getAttribute('aria-pressed'),live:document.querySelector('[aria-live]').textContent})`,
  ),
);
await send('Target.closeTarget', { targetId });
ws.close();
