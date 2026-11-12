import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  appendFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRunLedger } from './ledger';
import type { SoclaasInput } from '../../src/server/ai/transport';

async function ledgerPath() {
  const root = await mkdtemp(join(tmpdir(), 'ai-ledger-'));
  const folder = join(root, '.dev.vars.ai-quality-private');
  await mkdir(folder);
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  return join(folder, 'run.jsonl');
}
afterEach(() => vi.restoreAllMocks());
const input: SoclaasInput = {
  apiKey: 'synthetic-secret',
  model: 'model',
  allowedModels: ['model'],
  system: 'policy',
  user: 'synthetic',
  maxOutputTokens: 512,
  timeoutMs: 1000,
};
describe('durable evaluation ledger', () => {
  it('reserves first, records bounded redacted output and refuses reopening', async () => {
    const path = await ledgerPath();
    const ledger = await createRunLedger(path, async () =>
      Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: '{"value":"synthetic-secret"}' },
          },
        ],
      }),
    );
    await ledger.call(input);
    await ledger.close();
    const text = await readFile(path, 'utf8');
    expect(text).not.toContain(input.apiKey);
    const events = text
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line).event);
    expect(events).toEqual(['created', 'dispatch', 'response', 'completed']);
    await expect(createRunLedger(path)).rejects.toThrow();
  });
  it('stops all future calls after a timeout', async () => {
    const path = await ledgerPath();
    let calls = 0;
    const ledger = await createRunLedger(path, async () => {
      calls++;
      throw new Error('network');
    });
    await expect(ledger.call(input)).rejects.toThrow();
    await expect(ledger.call(input)).rejects.toThrow();
    expect(calls).toBe(1);
    expect(ledger.status()).toEqual({ attempts: 1, stopped: true });
    await ledger.close();
  });
});

it('refuses concurrent dispatch while the first call is pending', async () => {
  const path = await ledgerPath();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const ledger = await createRunLedger(path, async () => {
    calls++;
    await pending;
    throw new Error('network');
  });
  const first = ledger.call(input).catch(() => undefined);
  await expect(ledger.call(input)).rejects.toThrow();
  release();
  await first;
  expect(calls).toBe(1);
  await ledger.close();
});

it('classifies an oversized response as uncertain and stops', async () => {
  const path = await ledgerPath();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(262145));
      controller.close();
    },
  });
  const ledger = await createRunLedger(path, async () => new Response(stream));
  await expect(ledger.call(input)).rejects.toMatchObject({ kind: 'transient' });
  expect(ledger.status()).toEqual({ attempts: 1, stopped: true });
  await expect(ledger.call(input)).rejects.toThrow();
  await ledger.close();
});

it('allows one append-only continuation only for a definite accounted length finish', async () => {
  const path = await ledgerPath();
  const first = await createRunLedger(path, async () =>
    Response.json({
      choices: [{ finish_reason: 'length', message: { content: 'truncated' } }],
      model: 'qwen3-coder-next',
      usage: { prompt_tokens: 489, completion_tokens: 512 },
    }),
  );
  await expect(first.call(input)).rejects.toMatchObject({
    kind: 'invalid_response',
  });
  await first.close();
  const continued = await createRunLedger(
    path,
    async () =>
      Response.json({
        choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
      }),
    { resumeTruncated: true },
  );
  expect(continued.status()).toEqual({ attempts: 1, stopped: false });
  await continued.call(input);
  await continued.close();
  await expect(
    createRunLedger(path, undefined, { resumeTruncated: true }),
  ).rejects.toThrow();
  const events = (await readFile(path, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line).event);
  expect(events).toEqual([
    'created',
    'dispatch',
    'response',
    'stopped',
    'resume',
    'dispatch',
    'response',
    'completed',
  ]);
});

it('rejects continuation when prior usage differs from reconstructed quota', async () => {
  const path = await ledgerPath();
  const first = await createRunLedger(path, async () =>
    Response.json({
      model: 'qwen3-coder-next',
      choices: [{ finish_reason: 'length', message: { content: 'truncated' } }],
      usage: { prompt_tokens: 488, completion_tokens: 512 },
    }),
  );
  await expect(first.call(input)).rejects.toThrow();
  await first.close();
  await expect(
    createRunLedger(path, undefined, { resumeTruncated: true }),
  ).rejects.toThrow('not definitive');
});

async function writeThreeAttempts(path: string, input3 = 478) {
  const envelope = (
    finish: string,
    prompt_tokens: number,
    completion_tokens: number,
  ) =>
    JSON.stringify({
      model: 'qwen3-coder-next',
      choices: [{ finish_reason: finish }],
      usage: { prompt_tokens, completion_tokens },
    });
  const entries = [
    { event: 'created', maxAttempts: 12 },
    { event: 'dispatch', attempt: 1 },
    {
      event: 'response',
      attempt: 1,
      status: 200,
      body: envelope('length', 489, 512),
    },
    { event: 'stopped', attempt: 1, kind: 'invalid_response' },
    { event: 'resume', priorAttempts: 1 },
    { event: 'dispatch', attempt: 2 },
    {
      event: 'response',
      attempt: 2,
      status: 200,
      body: envelope('stop', 490, 821),
    },
    {
      event: 'completed',
      attempt: 2,
      usage: { status: 'reported', inputTokens: 490, outputTokens: 821 },
    },
    { event: 'dispatch', attempt: 3 },
    {
      event: 'response',
      attempt: 3,
      status: 200,
      body: envelope('stop', input3, 541),
    },
    { event: 'stopped', attempt: 3, kind: 'invalid_response' },
  ];
  await writeFile(
    path,
    entries.map((x) => JSON.stringify(x)).join('\n') + '\n',
  );
  await writeFile(
    join(process.cwd(), '.dev.vars.ai-quality-private', 'continuation.lock'),
    'prior',
  );
}
it('preserves three exact prior charges and limits continuation to nine attempts', async () => {
  const path = await ledgerPath();
  await writeThreeAttempts(path);
  let calls = 0;
  const ledger = await createRunLedger(
    path,
    async () => {
      calls++;
      return Response.json({
        choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
      });
    },
    { resumeFenced: true },
  );
  expect(ledger.status().attempts).toBe(3);
  for (let i = 0; i < 9; i++) await ledger.call(input);
  await expect(ledger.call(input)).rejects.toThrow();
  expect(calls).toBe(9);
  await ledger.close();
  await expect(
    createRunLedger(path, undefined, { resumeFenced: true }),
  ).rejects.toThrow();
});
it('refuses continuation when a prior usage value differs', async () => {
  const path = await ledgerPath();
  await writeThreeAttempts(path, 477);
  await expect(
    createRunLedger(path, undefined, { resumeFenced: true }),
  ).rejects.toThrow('not definitive');
});

async function writeElevenAttempts(path: string, alter = false) {
  await writeThreeAttempts(path);
  const values = [
    [506, 940],
    [530, 625],
    [491, 446],
    [527, 402],
    [521, 794],
    [515, 845],
    [515, 411],
    [521, 827],
  ];
  const entries: unknown[] = [{ event: 'resume', priorAttempts: 3 }];
  for (const [i, [input, output]] of values.entries()) {
    const n = i + 4;
    const envelope = {
      model: 'qwen3-coder-next',
      choices: [{ finish_reason: 'stop' }],
      usage: {
        prompt_tokens: alter && n === 11 ? 520 : input,
        completion_tokens: output,
      },
    };
    entries.push(
      { event: 'dispatch', attempt: n },
      {
        event: 'response',
        attempt: n,
        status: 200,
        body: JSON.stringify(envelope),
      },
      {
        event: 'completed',
        attempt: n,
        usage: { status: 'reported', inputTokens: input, outputTokens: output },
      },
    );
  }
  await appendFile(
    path,
    entries.map((x) => JSON.stringify(x)).join('\n') + '\n',
  );
  await writeFile(
    join(process.cwd(), '.dev.vars.ai-quality-private', 'continuation-3.lock'),
    'prior',
  );
}
it('allows exactly one final attempt after eleven verified responses', async () => {
  const path = await ledgerPath();
  await writeElevenAttempts(path);
  let calls = 0;
  const ledger = await createRunLedger(
    path,
    async () => {
      calls++;
      return Response.json({
        choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
      });
    },
    { resumeAfterEleven: true },
  );
  expect(ledger.status().attempts).toBe(11);
  await ledger.call(input);
  await expect(ledger.call(input)).rejects.toThrow();
  expect(calls).toBe(1);
  await ledger.close();
  await expect(
    createRunLedger(path, undefined, { resumeAfterEleven: true }),
  ).rejects.toThrow();
});
it('refuses the final continuation if a prior usage value was changed', async () => {
  const path = await ledgerPath();
  await writeElevenAttempts(path, true);
  await expect(
    createRunLedger(path, undefined, { resumeAfterEleven: true }),
  ).rejects.toThrow('not definitive');
});
