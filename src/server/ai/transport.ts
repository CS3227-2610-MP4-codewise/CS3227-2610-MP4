/** Server-only SoCLaaS transport. Activation and per-action credentials belong to the caller. */
export const SOCLAAS_CHAT_ENDPOINT =
  'https://soclaas-api.comp.nus.edu.sg/v1/chat/completions';
const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_TOKENS = 8192;

export type SoclaasErrorKind =
  | 'configuration'
  | 'invalid_request'
  | 'authentication'
  | 'rate_limited'
  | 'transient'
  | 'timeout'
  | 'cancelled'
  | 'invalid_response';

/** Never includes provider response bodies, request context, or credentials. */
export class SoclaasTransportError extends Error {
  constructor(
    readonly kind: SoclaasErrorKind,
    readonly retryAfterMs: number | null = null,
    readonly usage?: SoclaasResult['usage'],
  ) {
    super('AI provider request could not be completed.');
    this.name = 'SoclaasTransportError';
  }
}
export type SoclaasInput = {
  apiKey: string;
  model: string;
  allowedModels: readonly string[];
  system: string;
  user: string;
  maxOutputTokens: number;
  timeoutMs: number;
  signal?: AbortSignal;
};
export type SoclaasResult = {
  payload: unknown;
  usage:
    | { status: 'unavailable' }
    | { status: 'reported'; inputTokens: number; outputTokens: number };
};

function retryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  if (value.length > 128) return Infinity;
  const seconds = /^\d+$/.test(value) ? Number(value) : NaN;
  const absolute = Number.isNaN(seconds) ? Date.parse(value) : NaN;
  const ms = Number.isNaN(seconds) ? absolute - now : seconds * 1000;
  if (ms === Infinity || ms > Number.MAX_SAFE_INTEGER) return Infinity;
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
async function readBounded(response: Response): Promise<unknown> {
  const length = response.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new SoclaasTransportError('invalid_response');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new SoclaasTransportError('invalid_response');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES)
        throw new SoclaasTransportError('invalid_response');
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = new Uint8Array(bytes);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(result));
  } catch {
    throw new SoclaasTransportError('invalid_response');
  }
}

/** Makes exactly one call; the gateway owns retries, budgets and domain validation. */
export async function callSoclaas(
  input: SoclaasInput,
  fetcher: typeof fetch = fetch.bind(globalThis),
): Promise<SoclaasResult> {
  if (
    typeof input.apiKey !== 'string' ||
    input.apiKey.length < 1 ||
    input.apiKey.length > 4096 ||
    /[\r\n]/.test(input.apiKey) ||
    typeof input.model !== 'string' ||
    !/^[A-Za-z0-9_.:/-]{1,160}$/.test(input.model) ||
    !Array.isArray(input.allowedModels) ||
    !input.allowedModels.includes(input.model)
  )
    throw new SoclaasTransportError('configuration');
  if (
    typeof input.system !== 'string' ||
    !input.system ||
    typeof input.user !== 'string' ||
    !input.user ||
    !Number.isSafeInteger(input.maxOutputTokens) ||
    input.maxOutputTokens < 1 ||
    input.maxOutputTokens > MAX_OUTPUT_TOKENS ||
    !Number.isSafeInteger(input.timeoutMs) ||
    input.timeoutMs < 1 ||
    input.timeoutMs > MAX_TIMEOUT_MS
  )
    throw new SoclaasTransportError('invalid_request');
  if (input.signal?.aborted) throw new SoclaasTransportError('cancelled');
  const body = JSON.stringify({
    model: input.model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
    max_tokens: input.maxOutputTokens,
    stream: false,
  });
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES)
    throw new SoclaasTransportError('invalid_request');
  const controller = new AbortController();
  let timeout = false;
  const timer = setTimeout(() => {
    timeout = true;
    controller.abort();
  }, input.timeoutMs);
  const cancel = () => controller.abort();
  input.signal?.addEventListener('abort', cancel, { once: true });
  try {
    const response = await fetcher(SOCLAAS_CHAT_ENDPOINT, {
      method: 'POST',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Authorization: 'Bearer ' + input.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new SoclaasTransportError('invalid_response');
    }
    if (!response.ok) {
      const delay = retryAfter(response.headers.get('retry-after'));
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403)
        throw new SoclaasTransportError('authentication');
      if (response.status === 429)
        throw new SoclaasTransportError('rate_limited', delay);
      if ([408, 500, 502, 503, 504].includes(response.status))
        throw new SoclaasTransportError('transient', delay);
      throw new SoclaasTransportError('invalid_request');
    }
    const envelope = record(await readBounded(response));
    let usage: SoclaasResult['usage'] = { status: 'unavailable' };
    if (envelope?.usage != null) {
      const raw = record(envelope.usage),
        i = raw?.prompt_tokens,
        o = raw?.completion_tokens;
      if (
        !Number.isSafeInteger(i) ||
        (i as number) < 0 ||
        !Number.isSafeInteger(o) ||
        (o as number) < 0
      )
        throw new SoclaasTransportError('invalid_response');
      usage = {
        status: 'reported',
        inputTokens: i as number,
        outputTokens: o as number,
      };
    }
    const choices = envelope?.choices;
    const choice =
      Array.isArray(choices) && choices.length === 1
        ? record(choices[0])
        : null;
    const message = record(choice?.message);
    if (
      choice?.finish_reason !== 'stop' ||
      typeof message?.content !== 'string'
    )
      throw new SoclaasTransportError('invalid_response', null, usage);
    let payload: unknown;
    try {
      // Some compatible models wrap otherwise complete JSON in one Markdown fence.
      // Accept only the entire fenced document; the domain validator still decides trust.
      const fence = /^\s*```json[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*\s*$/i.exec(
        message.content,
      );
      payload = JSON.parse(fence ? fence[1] : message.content);
    } catch {
      throw new SoclaasTransportError('invalid_response', null, usage);
    }
    return { payload, usage };
  } catch (error) {
    if (timeout) throw new SoclaasTransportError('timeout');
    if (input.signal?.aborted) throw new SoclaasTransportError('cancelled');
    if (error instanceof SoclaasTransportError) throw error;
    throw new SoclaasTransportError('transient');
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener('abort', cancel);
  }
}
