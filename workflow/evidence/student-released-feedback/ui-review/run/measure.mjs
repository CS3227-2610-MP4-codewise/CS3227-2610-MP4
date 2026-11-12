import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve(import.meta.dirname, '..');
const meta = await (await fetch('http://127.0.0.1:9229/json/version')).json();
const ws = new WebSocket(meta.webSocketDebuggerUrl);
let seq = 0,
  sid;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  }
};
await new Promise((r) => {
  ws.onopen = r;
});
const send = (method, params = {}, session = sid) =>
  new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, (m) =>
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result),
    );
    ws.send(
      JSON.stringify({
        id,
        method,
        params,
        ...(session ? { sessionId: session } : {}),
      }),
    );
  });
const { targetId } = await send(
  'Target.createTarget',
  { url: 'about:blank' },
  null,
);
({ sessionId: sid } = await send(
  'Target.attachToTarget',
  { targetId, flatten: true },
  null,
));
await send('Page.bringToFront');
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');

const ev = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// All requested input and screenshots are CDP-driven in real headless Edge.
const key = async (k, code, virtual) => {
  await send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: k,
    code,
    windowsVirtualKeyCode: virtual,
    nativeVirtualKeyCode: virtual,
  });
  if (k === 'Enter')
    await send('Input.dispatchKeyEvent', {
      type: 'char',
      text: '\r',
      unmodifiedText: '\r',
      key: k,
      code,
      windowsVirtualKeyCode: virtual,
    });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: k,
    code,
    windowsVirtualKeyCode: virtual,
  });
};
const states = process.env.REVIEW_STATES?.split(',') || [
  'loading',
  'none',
  'released',
  'released-noannotations',
  'replaced',
  'withdrawn-historical',
  'withdrawn-current',
  'unmatched',
  'stale',
  'expired',
  'network',
  'unavailable',
  'history',
];
const helpers = String.raw`
const root=document.querySelector('.cw-wb-attempt')||document.querySelector('.cw-wb-attempts');
const all=s=>[...root.querySelectorAll(s)];
const rgba=c=>{const cv=document.createElement('canvas');cv.width=cv.height=1;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((x,i)=>i===3?x/255:x);};
const blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])).concat(1);
const bg=e=>{if(!e)return [255,255,255,1];const c=rgba(getComputedStyle(e).backgroundColor);return c[3]===1?c:blend(c,bg(e.parentElement));};
const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const colorCheck=(e,prop='color',against=bg(e))=>{const c=rgba(getComputedStyle(e)[prop]);const fg=blend(c,against);return {fg:fg.slice(0,3),bg:against.slice(0,3),ratio:ratio(fg,against)};};
const label=e=>e.tagName.toLowerCase()+'.'+[...e.classList].join('.')+' ['+(e.getAttribute('aria-label')||e.textContent.trim().slice(0,55))+']';
`;
const measure = `(()=>{${helpers}
const controls=all('button,select,a,[tabindex]');
const contrast=[];for(const sel of ['p','h3','h4','.cw-fb-criteria th','.cw-fb-criteria td','.cw-fb-bounds','.cw-fb-no','.cw-fb-marker','.cw-fb-letter','.cw-fb-code','.cw-fb-code .token','.cw-student-source .token','.cw-wb-feedback-marker','.cw-student-notice'])for(const e of all(sel))contrast.push({selector:sel,label:label(e),...colorCheck(e)});
const motion=all('*').filter(e=>{const s=getComputedStyle(e);return [s.transitionDuration,s.animationDuration].some(x=>x.split(',').some(t=>parseFloat(t)>0));}).map(label);
return {innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,targets:controls.map(e=>{const r=e.getBoundingClientRect();return {selector:label(e),w:r.width,h:r.height,pass:r.width>=44&&r.height>=44};}),contrast,motion,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,privacyMatches:document.documentElement.outerHTML.match(/PRIVATE-|reason|approv|reviewer|privateReference|PRIVATE_REFERENCE|PRIVATE-DRAFT-TEXT/gi)||[],sources:all('[role="region"][aria-label^="Submitted source for question"]').map(e=>({name:e.getAttribute('aria-label'),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight})),text:root.innerText,feedbackText:root.querySelector('.cw-fb')?.innerText,tableCount:all('table').length,historyFlags:all('.cw-wb-attempt-list>li').map(e=>e.textContent.includes('Feedback released')),lines:all('.cw-fb-source').map(e=>[...e.querySelectorAll('.cw-fb-line')].map(l=>{const c=l.querySelector('.cw-fb-code'),r=c.getBoundingClientRect();return {number:l.querySelector('.cw-fb-no').textContent,noCount:l.querySelectorAll('.cw-fb-no').length,height:r.height,lineHeight:parseFloat(getComputedStyle(c).lineHeight),width:r.width,scrollWidth:c.scrollWidth,text:c.textContent};})),unmatched:all('.cw-fb-unavailable li').map(e=>e.textContent),annotated:all('.cw-fb-line[data-annotated]').map(e=>({question:e.closest('.cw-fb-question').querySelector('h4').textContent,line:e.querySelector('.cw-fb-no').textContent})),indicators:all('.cw-wb-feedback-marker,.cw-fb-marker,.cw-fb-line[data-selected]').map(e=>({label:label(e),...colorCheck(e,e.matches('.cw-fb-line')?'borderLeftColor':'borderTopColor',bg(e.parentElement))}))};})()`;
const focusMeasure = `(()=>{${helpers}const e=document.activeElement,s=getComputedStyle(e);return {label:label(e),visible:e.matches(':focus-visible'),outlineWidth:parseFloat(s.outlineWidth),outlineStyle:s.outlineStyle,outlineColor:s.outlineColor,outlineOffset:s.outlineOffset,...colorCheck(e,'outlineColor',bg(e.parentElement))};})()`;
const focusAll = async () => {
  const count = await ev(
    `document.querySelectorAll('.cw-wb button,.cw-wb select,.cw-wb a,.cw-wb [tabindex]').length`,
  );
  const samples = [];
  await key('Tab', 'Tab', 9);
  for (let i = 0; i < count; i++) {
    await ev(
      `(()=>{const e=document.querySelectorAll('.cw-wb button,.cw-wb select,.cw-wb a,.cw-wb [tabindex]')[${i}];e.focus();e.scrollIntoView({block:'center'});})()`,
    );
    samples.push(await ev(focusMeasure));
  }
  return samples;
};
const screenshot = async (name) => {
  if (process.env.REVIEW_SCREENSHOTS === '0') return;
  await ev('window.scrollTo(0,0)');
  const metrics = await send('Page.getLayoutMetrics');
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: metrics.cssContentSize.height,
      scale: 1,
    },
  });
  writeFileSync(
    resolve(out, 'screenshots', name + '.png'),
    Buffer.from(r.data, 'base64'),
  );
};
const mapping = async () => {
  const result = [];
  const n = await ev(`document.querySelectorAll('.cw-fb-marker').length`);
  for (let i = 0; i < n; i++) {
    for (const selector of ['.cw-fb-marker', '.cw-fb-observation']) {
      await ev(`document.querySelectorAll('${selector}')[${i}].focus()`);
      await key('Enter', 'Enter', 13);
      await wait(60);
      result.push(
        await ev(
          `(()=>{${helpers}const e=document.querySelectorAll('${selector}')[${i}],m=document.querySelectorAll('.cw-fb-marker')[${i}],o=document.querySelectorAll('.cw-fb-observation')[${i}],region=all('[role="region"]').find(e=>e.getAttribute('aria-label')==='Observation '+m.textContent);return {trigger:'${selector}',index:${i},name:m.getAttribute('aria-label'),row:m.closest('.cw-fb-line').querySelector('.cw-fb-no').textContent,markerPressed:m.getAttribute('aria-pressed'),observationPressed:o.getAttribute('aria-pressed'),retainedFocus:document.activeElement===e,selected:all('.cw-fb-line[data-selected]').map(l=>l.querySelector('.cw-fb-no').textContent),live:root.querySelector('[aria-live="polite"]').textContent,note:region?.textContent,selectedContrast:all('.cw-fb-line[data-selected] .cw-fb-code,.cw-fb-line[data-selected] .token,.cw-fb-line[data-selected] .cw-fb-no').map(e=>({label:label(e),...colorCheck(e)})),selectedRule:all('.cw-fb-line[data-selected]').map(e=>colorCheck(e,'borderLeftColor',bg(e)))};})()`,
        ),
      );
    }
  }
  return result;
};
const results = [];
for (const width of [320, 768, 1024, 1440])
  for (const theme of ['light', 'dark'])
    for (const state of states) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
      });
      await send('Page.navigate', {
        url: `http://127.0.0.1:5189/index.html?theme=${theme}&state=${state}`,
      });
      let ready = false;
      for (let n = 0; n < 80; n++) {
        if (
          await ev(`!!document.querySelector('.cw-fb,.cw-wb-attempt-list')`)
        ) {
          ready = true;
          break;
        }
        await wait(100);
      }
      if (!ready)
        throw new Error(
          'No panel ' +
            width +
            theme +
            state +
            ' ' +
            (await ev('document.body.innerText')),
        );
      await wait(150);
      if (['replaced', 'withdrawn-historical'].includes(state)) {
        await ev(
          `(()=>{const e=document.querySelector('select');e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
        );
        await wait(150);
      }
      const data = {
        width,
        theme,
        state,
        browser: meta.Browser,
        initial: await ev(measure),
      };
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      data.reducedInitial = await ev(measure);
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
      });
      data.focus = await focusAll();
      await screenshot(`${width}-${theme}-${state}`);
      if (state === 'released') {
        data.mapping = await mapping();
        data.selectedFocus = await ev(focusMeasure);
        data.selected = await ev(measure);
        await screenshot(`${width}-${theme}-${state}-selected`);
      }
      if (state === 'stale') {
        await ev(`document.querySelector('.cw-student-notice button').focus()`);
        await key('Enter', 'Enter', 13);
        await wait(150);
        data.retry = await ev(measure);
      }
      if (state === 'withdrawn-current') {
        await ev(
          `(()=>{const e=document.querySelector('select');e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
        );
        await wait(150);
        data.older = await ev(measure);
      }
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      data.reduced = await ev(measure);
      results.push(data);
      writeFileSync(
        resolve(out, process.env.REVIEW_OUTPUT || 'metrics.json'),
        JSON.stringify(results, null, 2),
      );
      console.log(`${results.length}/104 ${width}-${theme}-${state}`);
    }
await send('Target.closeTarget', { targetId }, null);
ws.close();
