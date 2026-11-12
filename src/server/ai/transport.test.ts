import { describe, expect, it, vi } from 'vitest';
import {
  callSoclaas,
  SoclaasTransportError,
  SOCLAAS_CHAT_ENDPOINT,
  type SoclaasInput,
} from './transport';

const request: SoclaasInput = {
  apiKey: 'synthetic-key',
  model: 'synthetic-model',
  allowedModels: ['synthetic-model'],
  system: 'Synthetic policy.',
  user: 'Synthetic evidence.',
  maxOutputTokens: 200,
  timeoutMs: 1000,
};
function reply(content: unknown, usage?: unknown) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          message: { content: JSON.stringify(content) },
        },
      ],
      ...(usage === undefined ? {} : { usage }),
    }),
    { status: 200 },
  );
}
describe('AI-01–05 synthetic SoCLaaS transport', () => {
  it.each(['stop', 'length'])(
    'preserves valid reported usage when content is rejected (%s)',
    async (finish_reason) => {
      await expect(
        callSoclaas(request, async () =>
          Response.json({
            choices: [
              {
                finish_reason,
                message: { content: 'private non-JSON content' },
              },
            ],
            usage: { prompt_tokens: 99, completion_tokens: 3 },
          }),
        ),
      ).rejects.toMatchObject({
        kind: 'invalid_response',
        usage: { status: 'reported', inputTokens: 99, outputTokens: 3 },
      });
    },
  );
  it('sends one fixed-host request with only the supplied action credential and no tools', async () => {
    const fetcher = vi.fn(async () =>
      reply({ draft: 'synthetic' }, { prompt_tokens: 5, completion_tokens: 3 }),
    ) as unknown as typeof fetch;
    expect(await callSoclaas(request, fetcher)).toEqual({
      payload: { draft: 'synthetic' },
      usage: { status: 'reported', inputTokens: 5, outputTokens: 3 },
    });
    const [url, init] = vi.mocked(fetcher).mock.calls[0];
    expect(url).toBe(SOCLAAS_CHAT_ENDPOINT);
    expect(init?.redirect).toBe('manual');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer synthetic-key',
    });
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: request.model,
      stream: false,
      max_tokens: 200,
    });
    expect(body).not.toHaveProperty('tools');
  });
  it('preserves unknown usage instead of inventing counts', async () => {
    expect(
      (await callSoclaas(request, async () => reply({ ok: true }))).usage,
    ).toEqual({ status: 'unavailable' });
  });
  it('rejects disabled key, non-allowlisted model and oversized input before transport', async () => {
    const fetcher = vi.fn();
    for (const altered of [
      { apiKey: '' },
      { model: 'other' },
      { user: 'x'.repeat(140000) },
      { maxOutputTokens: 0 },
    ])
      await expect(
        callSoclaas({ ...request, ...altered }, fetcher),
      ).rejects.toBeInstanceOf(SoclaasTransportError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('classifies retryable and nonretryable HTTP failures without exposing provider body', async () => {
    for (const [status, kind] of [
      [401, 'authentication'],
      [429, 'rate_limited'],
      [503, 'transient'],
      [400, 'invalid_request'],
      [302, 'invalid_response'],
    ] as const) {
      const f = async () =>
        new Response('private provider body', {
          status,
          headers: { 'Retry-After': '2' },
        });
      const e = await callSoclaas(request, f).catch((error: unknown) => error);
      expect(e).toBeInstanceOf(SoclaasTransportError);
      expect((e as SoclaasTransportError).kind).toBe(kind);
      expect(JSON.stringify(e)).not.toContain('private provider body');
      if (status === 429 || status === 503)
        expect((e as SoclaasTransportError).retryAfterMs).toBe(2000);
    }
  });
  it('rejects malformed, oversized, truncated and malformed-usage responses', async () => {
    const responses = [
      new Response('not json'),
      new Response('x'.repeat(270000)),
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'length', message: { content: '{}' } }],
        }),
      ),
      reply({}, { prompt_tokens: -1, completion_tokens: 1 }),
    ];
    for (const response of responses)
      await expect(
        callSoclaas(request, async () => response),
      ).rejects.toMatchObject({ kind: 'invalid_response' });
  });
  it('preserves very large Retry-After as longer than the gateway deadline', async () => {
    const response = new Response('', {
      status: 429,
      headers: { 'Retry-After': '86401' },
    });
    const error = await callSoclaas(request, async () => response).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({
      kind: 'rate_limited',
      retryAfterMs: 86_401_000,
    });
    const huge = new Response('', {
      status: 429,
      headers: { 'Retry-After': '9'.repeat(129) },
    });
    const hugeError = await callSoclaas(request, async () => huge).catch(
      (e: unknown) => e,
    );
    expect(hugeError).toMatchObject({
      kind: 'rate_limited',
      retryAfterMs: Infinity,
    });
  });
  it('aborts on timeout and caller cancellation, without returning the key', async () => {
    const f: typeof fetch = async (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          'abort',
          () => reject(new Error('provider failure containing synthetic-key')),
          { once: true },
        );
      });
    const error = await callSoclaas({ ...request, timeoutMs: 5 }, f).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ kind: 'timeout' });
    expect(String(error)).not.toContain(request.apiKey);
    const controller = new AbortController();
    controller.abort();
    await expect(
      callSoclaas({ ...request, signal: controller.signal }, f),
    ).rejects.toMatchObject({ kind: 'cancelled' });
  });
});

it('accepts one complete fenced JSON document and rejects added prose or multiple documents', async () => {
  const response = (content: string, finish_reason = 'stop') =>
    Response.json({ choices: [{ finish_reason, message: { content } }] });
  expect(
    (
      await callSoclaas(request, async () =>
        response('```json\n{"draft":"synthetic"}\n```'),
      )
    ).payload,
  ).toEqual({ draft: 'synthetic' });
  for (const content of [
    'Commentary\n```json\n{"draft":1}\n```',
    '```json\n{"draft":1}\n```\nextra',
    '```json\n{"draft":1}\n```\n```json\n{"draft":2}\n```',
    '```json\nnot-json\n```',
  ])
    await expect(
      callSoclaas(request, async () => response(content)),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  await expect(
    callSoclaas(request, async () => response('```json\n{}\n```', 'length')),
  ).rejects.toMatchObject({ kind: 'invalid_response' });
});
