// Isolated synthetic benchmark only: never imported by the application Worker.
import setupWasm from 'argon2id/lib/setup.js';
import simd from 'argon2id/dist/simd.wasm';
import scalar from 'argon2id/dist/no-simd.wasm';

let ready, memory;
const loader = (module) => (imports) => {
  memory = imports.env.memory;
  return { module, instance: new WebAssembly.Instance(module, imports) };
};
const engine = () => (ready ??= setupWasm(loader(simd), loader(scalar)));
const same = (a, b) => {
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
};

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/noop')
      return Response.json({
        hashes: 0,
        wasmBytes: memory?.buffer.byteLength ?? 0,
      });
    const hash = await engine();
    const password = new TextEncoder().encode(
      path === '/unicode' ? '🔐'.repeat(64) : 'synthetic-passphrase-only',
    );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const parameters = {
      password,
      salt,
      parallelism: 1,
      passes: 2,
      memorySize: 19456,
      tagLength: 32,
    };
    const result = hash(parameters);
    let hashes = 1,
      verified;
    if (path === '/verify') {
      verified = same(result, hash(parameters));
      hashes++;
    }
    if (path === '/wrong') {
      verified = same(
        result,
        hash({
          ...parameters,
          password: new TextEncoder().encode('different-synthetic-passphrase'),
        }),
      );
      hashes++;
    }
    if (path === '/unicode') {
      verified = !same(
        result,
        hash({ ...parameters, password: password.slice(0, 72) }),
      );
      hashes++;
    }
    return Response.json({
      hashes,
      tagBytes: result.length,
      verified,
      wasmBytes: memory.buffer.byteLength,
    });
  },
};
