import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';

// Install only the pinned candidate into ignored local storage before running:
// npm install --prefix .wrangler/argon2-spike-pkg --no-save --package-lock=false --ignore-scripts argon2id@1.0.1
const dependency = resolve('.wrangler/argon2-spike-pkg/node_modules/argon2id');
const metadata = JSON.parse(
  await readFile(join(dependency, 'package.json'), 'utf8'),
);
if (
  metadata.version !== '1.0.1' ||
  metadata.repository.url !== 'git+https://github.com/openpgpjs/argon2id.git'
)
  throw new Error('Unexpected benchmark dependency');
const output = resolve('.wrangler/auth-hash-spike');
await mkdir(output, { recursive: true });
const worker = join(output, 'worker.mjs');
await build({
  entryPoints: ['workflow/auth/hash-spike.worker.mjs'],
  outfile: worker,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  plugins: [
    {
      name: 'pinned-benchmark-dependency',
      setup(builder) {
        builder.onResolve({ filter: /^argon2id\// }, (args) =>
          args.path.endsWith('.wasm')
            ? { path: './' + basename(args.path), external: true }
            : { path: join(dependency, args.path.slice('argon2id/'.length)) },
        );
      },
    },
  ],
});
const modules = [{ type: 'ESModule', path: worker }];
for (const name of ['simd.wasm', 'no-simd.wasm'])
  modules.push({
    type: 'CompiledWasm',
    path: join(output, name),
    contents: new Uint8Array(await readFile(join(dependency, 'dist', name))),
  });
const mf = new Miniflare(
  convertV4MiniflareOptions({
    name: 'auth-hash-spike',
    modulesRoot: output,
    modules,
    compatibilityDate: '2026-11-04',
    inspectorPort: 0,
  }),
);
let socket;
try {
  await mf.ready;
  const inspector = await mf.getInspectorURL();
  let socketUrl = new URL('/core:user:auth-hash-spike', inspector.href).href;
  if (!['ws:', 'wss:'].includes(inspector.protocol)) {
    const targets = await (await fetch(new URL('/json', inspector))).json();
    const target = targets.find(
      (t) =>
        t.id === 'core:user:auth-hash-spike' ||
        t.title?.includes('auth-hash-spike'),
    );
    if (!target?.webSocketDebuggerUrl)
      throw new Error('Benchmark inspector target not found');
    socketUrl = target.webSocketDebuggerUrl;
  }
  socket = new WebSocket(socketUrl);
  await new Promise((done, fail) => {
    socket.onopen = done;
    socket.onerror = fail;
  });
  let next = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) waiter.fail(new Error(message.error.message));
      else waiter.done(message.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      const id = ++next;
      const timer = setTimeout(() => {
        pending.delete(id);
        fail(new Error('Inspector timeout: ' + method));
      }, 15000);
      pending.set(id, { done, fail, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  await send('Profiler.enable');
  await send('Profiler.setSamplingInterval', { interval: 100 });
  const rows = [];
  for (const path of [
    '/noop',
    '/hash',
    '/hash',
    '/hash',
    '/hash',
    '/hash',
    '/verify',
    '/wrong',
    '/unicode',
  ]) {
    const before = await send('Runtime.getHeapUsage');
    await send('Profiler.start');
    const start = performance.now(),
      response = await mf.dispatchFetch('http://benchmark.invalid' + path);
    const payload = await response.json(),
      wallMs = performance.now() - start;
    assert.equal(response.status, 200);
    if (path !== '/noop') assert.equal(payload.tagBytes, 32);
    if (path === '/verify' || path === '/unicode')
      assert.equal(payload.verified, true);
    if (path === '/wrong') assert.equal(payload.verified, false);
    const { profile } = await send('Profiler.stop');
    const after = await send('Runtime.getHeapUsage');
    const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
    let nonIdleUs = 0,
      wasmUs = 0;
    for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
      const frame = nodes.get(profile.samples[i])?.callFrame;
      if (frame?.functionName !== '(idle)') nonIdleUs += profile.timeDeltas[i];
      if (frame?.url.startsWith('wasm://')) wasmUs += profile.timeDeltas[i];
    }
    await writeFile(
      join(output, 'profile-' + rows.length + '.json'),
      JSON.stringify(profile),
    );
    rows.push({
      path,
      wallMs: Number(wallMs.toFixed(3)),
      sampledNonIdleMs: Number((nonIdleUs / 1000).toFixed(3)),
      sampledWasmMs: Number((wasmUs / 1000).toFixed(3)),
      ...payload,
      jsHeapBefore: before.usedSize,
      jsHeapAfter: after.usedSize,
    });
  }
  const burstStart = performance.now();
  const burst = await Promise.all(
    Array.from({ length: 4 }, () =>
      mf.dispatchFetch('http://benchmark.invalid/hash').then((r) => r.json()),
    ),
  );
  const report = {
    library: 'argon2id@1.0.1',
    runtime: 'local workerd through Miniflare',
    parameters: { memoryKiB: 19456, passes: 2, parallelism: 1, tagBytes: 32 },
    workersFreeCpuBudgetMs: 10,
    rows,
    burst: {
      requests: 4,
      wallMs: Number((performance.now() - burstStart).toFixed(3)),
      maximumWasmBytes: Math.max(...burst.map((r) => r.wasmBytes)),
    },
    limits:
      'Sampled non-idle CPU estimate and external wall latency are local measurements, not deployed per-invocation CPU or total isolate memory. JS heap excludes WASM allocation. No deployed limit test performed. Detailed profiles stay in ignored local storage.',
  };
  await mkdir('workflow/evidence/shared-authentication', { recursive: true });
  await writeFile(
    'workflow/evidence/shared-authentication/hash-spike.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  socket?.close();
  await mf.dispose();
}
