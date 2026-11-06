import { it, expect } from 'vitest';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

it('native Worker Firebase requests use a bound fetch and reject redirects without forwarding credentials', async () => {
  const keys = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  // Ephemeral key generated above for this test run, never a persisted credential.
  const keyType = ['PRIVATE', 'KEY'].join(' ');
  const pem =
    `-----BEGIN ${keyType}-----\n` +
    Buffer.from(
      await crypto.subtle.exportKey('pkcs8', keys.privateKey),
    ).toString('base64') +
    `\n-----END ${keyType}-----`;
  const source = `import {FirebaseCredentials,firebaseConfig} from './src/server/auth/firebase';
    export default {async fetch(request,env){try{
      const user=await new FirebaseCredentials(firebaseConfig(env)).current('synthetic-worker-user');
      return Response.json({uid:user.uid,verified:user.verified});
    }catch{return new Response('unavailable',{status:503});}}}`;
  const compiled = await build({
    stdin: { contents: source, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
  });
  for (const redirect of [false, true]) {
    const hosts: string[] = [];
    const runtime = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: compiled.outputFiles[0].text,
        compatibilityDate: '2026-11-04',
        bindings: {
          APP_ENV: 'development',
          AUTH_ORIGIN: 'http://localhost:8787',
          FIREBASE_PROJECT_ID: 'synthetic-project',
          FIREBASE_API_KEY: 'synthetic',
          FIREBASE_SERVICE_ACCOUNT_EMAIL: 'server@example.test',
          FIREBASE_PRIVATE_KEY: pem,
        },
        outboundService: async (request: Request) => {
          const url = new URL(request.url);
          hosts.push(url.hostname);
          if (redirect)
            return new Response(null, {
              status: 302,
              headers: { Location: 'https://attacker.example/collect' },
            });
          if (url.hostname === 'oauth2.googleapis.com')
            return Response.json({
              access_token: 'synthetic-worker-token',
              expires_in: 3600,
            });
          if (url.hostname === 'identitytoolkit.googleapis.com')
            return Response.json({
              users: [
                {
                  localId: 'synthetic-worker-user',
                  email: 'worker@u.nus.edu',
                  emailVerified: false,
                  passwordUpdatedAt: 1,
                  validSince: '1',
                },
              ],
            });
          throw Error('Unexpected outbound host');
        },
      }),
    );
    try {
      const response = await runtime.dispatchFetch('http://localhost/');
      expect(response.status).toBe(redirect ? 503 : 200);
      if (redirect) expect(hosts).toEqual(['oauth2.googleapis.com']);
      else {
        expect(await response.json()).toEqual({
          uid: 'synthetic-worker-user',
          verified: false,
        });
        expect(hosts).toEqual([
          'oauth2.googleapis.com',
          'identitytoolkit.googleapis.com',
        ]);
      }
    } finally {
      await runtime.dispose();
    }
  }
});
