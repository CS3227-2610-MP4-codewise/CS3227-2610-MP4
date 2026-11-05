/** CON-02: strict runtime schemas. Parsing validates data, never authority. */
export type Issue = { path: string; code: string };
export const errorCodes = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_CONTRACT',
  'REVISION_CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'STALE_EVIDENCE',
  'AI_DISABLED',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
] as const;
export type ErrorCode = (typeof errorCodes)[number];
export class BoundaryError extends Error {
  constructor(public readonly code: ErrorCode) {
    super('Operation could not be completed.');
  }
}
export class ContractError extends BoundaryError {
  readonly issues: Issue[];
  constructor(path: string, code: string) {
    super('INVALID_CONTRACT');
    this.issues = [{ path, code }];
  }
}
export function fail(path: string, code = 'invalid'): never {
  throw new ContractError(path, code);
}
export function assert(
  condition: unknown,
  path: string,
  code = 'invalid',
): asserts condition {
  if (!condition) fail(path, code);
}
export function inspectJson(value: unknown): void {
  let nodes = 0,
    bytes = 0;
  const seen = new Set<object>();
  function visit(v: unknown, depth: number): void {
    assert(++nodes <= 30000 && depth <= 32, '$', 'complexity');
    if (typeof v === 'string') bytes += new TextEncoder().encode(v).length;
    else if (typeof v === 'number') assert(Number.isFinite(v), '$', 'finite');
    else if (v !== null && typeof v === 'object') {
      assert(!seen.has(v), '$', 'cycle');
      seen.add(v);
      const proto = Object.getPrototypeOf(v);
      assert(
        Array.isArray(v)
          ? proto === Array.prototype
          : proto === Object.prototype || proto === null,
        '$',
        'plain_object',
      );
      const descriptors = Object.getOwnPropertyDescriptors(v);
      for (const key of Reflect.ownKeys(descriptors)) {
        assert(typeof key === 'string', '$', 'json');
        const d = descriptors[key];
        assert(
          !d.get &&
            !d.set &&
            (d.enumerable || (Array.isArray(v) && key === 'length')),
          '$',
          'json',
        );
        if (Array.isArray(v) && key === 'length') continue;
        bytes += new TextEncoder().encode(key).length;
        visit(d.value, depth + 1);
      }
      seen.delete(v);
    } else assert(v === null || typeof v === 'boolean', '$', 'json');
    assert(bytes <= 1048576, '$', 'size');
  }
  visit(value, 0);
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <= 1048576,
    '$',
    'size',
  );
}
export interface Schema<T> {
  parse(value: unknown): T;
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; issues: Issue[] };
}
export type Infer<S> = S extends Schema<infer T> ? T : never;
export function schema<T>(decode: (v: unknown) => T): Schema<T> {
  const parse = (v: unknown) => {
    inspectJson(v);
    return structuredClone(decode(v));
  };
  return {
    parse,
    safeParse(v) {
      try {
        return { success: true, data: parse(v) };
      } catch (e) {
        if (e instanceof ContractError)
          return { success: false, issues: e.issues };
        throw e;
      }
    },
  };
}
export function object(
  v: unknown,
  keys: readonly string[],
  p = '$',
  optional: readonly string[] = [],
): Record<string, unknown> {
  assert(v !== null && typeof v === 'object' && !Array.isArray(v), p, 'object');
  const r = v as Record<string, unknown>;
  assert(
    Object.keys(r).every((k) => keys.includes(k) || optional.includes(k)),
    p,
    'unknown_field',
  );
  for (const k of keys) assert(Object.hasOwn(r, k), p + '.' + k, 'required');
  return r;
}
export function text(v: unknown, p: string, max = 8192, empty = false): string {
  assert(typeof v === 'string', p, 'string');
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = v.charCodeAt(++i);
      assert(next >= 0xdc00 && next <= 0xdfff, p, 'unicode');
    } else assert(c < 0xdc00 || c > 0xdfff, p, 'unicode');
  }
  assert(
    (empty || v.length > 0) && new TextEncoder().encode(v).length <= max,
    p,
    'length',
  );
  return v;
}
export function id(v: unknown, p: string): string {
  const s = text(v, p, 512);
  assert(
    Array.from(s).length <= 128 &&
      !Array.from(s).some((ch) => {
        const c = ch.codePointAt(0)!;
        return c < 32 || (c >= 127 && c <= 159);
      }),
    p,
    'id',
  );
  return s;
}
export function title(v: unknown, p: string): string {
  const s = text(v, p, 800);
  assert(Array.from(s).length <= 200, p, 'length');
  return s;
}
export function integer(
  v: unknown,
  p: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
): number {
  assert(
    typeof v === 'number' &&
      Number.isSafeInteger(v) &&
      v >= min &&
      v <= max &&
      !Object.is(v, -0),
    p,
    'integer',
  );
  return v;
}
export function literal<T extends string | number | boolean>(
  v: unknown,
  expected: T,
  p: string,
): T {
  assert(v === expected, p, 'literal');
  return expected;
}
export function oneOf<T extends string>(
  v: unknown,
  values: readonly T[],
  p: string,
): T {
  assert(typeof v === 'string' && values.includes(v as T), p, 'enum');
  return v as T;
}
export function timestamp(v: unknown, p: string): string {
  const s = text(v, p, 24);
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s),
    p,
    'timestamp',
  );
  const d = new Date(s);
  assert(Number.isFinite(d.valueOf()) && d.toISOString() === s, p, 'timestamp');
  return s;
}
export function array<T>(
  v: unknown,
  decode: (v: unknown, p: string) => T,
  p: string,
  min = 0,
  max = 200,
): T[] {
  assert(Array.isArray(v) && v.length >= min && v.length <= max, p, 'array');
  return Array.from(v, (x, i) => decode(x, p + '[' + i + ']'));
}
export function unique(values: readonly (string | number)[], p: string): void {
  assert(new Set(values).size === values.length, p, 'duplicate');
}
export function score(v: unknown, p: string): number {
  assert(
    typeof v === 'number' &&
      Number.isFinite(v) &&
      !Object.is(v, -0) &&
      v >= 0 &&
      v <= 1000 &&
      Number(v.toFixed(2)) === v,
    p,
    'score',
  );
  return v;
}
export const hundredths = (v: number) => Math.round(score(v, '$.score') * 100);
export function source(v: unknown, p = '$.source'): string {
  const s = text(v, p, 32768, true);
  assert(!s.includes('\r') && !s.includes('\0'), p, 'canonical_source');
  return s;
}
export function canonicalizeSource(v: unknown): string {
  const s = text(v, '$.source', 65536, true).replace(/\r\n?/g, '\n');
  return source(s);
}
export async function sourceHash(v: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(source(v)),
  );
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}
export function excerpt(v: string, start: number, end: number): string {
  const lines = source(v).split('\n');
  integer(start, '$.startLine');
  integer(end, '$.endLine');
  assert(start <= end && end <= lines.length, '$.range', 'lines');
  return lines.slice(start - 1, end).join('\n');
}

/** Safe serialization, unlike parsing alone, deliberately hides unknown exceptions. */
export function toSafeError(error: unknown, requestId: string) {
  const code =
    error instanceof BoundaryError ? error.code : 'UPSTREAM_UNAVAILABLE';
  return {
    error: {
      code,
      message: 'Operation could not be completed.',
      requestId: id(requestId, '$.requestId'),
      ...(error instanceof ContractError
        ? { issues: structuredClone(error.issues) }
        : {}),
    },
  };
}
