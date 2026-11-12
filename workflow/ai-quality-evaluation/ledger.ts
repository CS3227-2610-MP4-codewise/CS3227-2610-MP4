import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  callSoclaas,
  SoclaasTransportError,
} from '../../src/server/ai/transport';
import type {
  SoclaasInput,
  SoclaasResult,
} from '../../src/server/ai/transport';

/** A new exclusive, ignored file per run. Existing files must never be resumed automatically. */
export async function createRunLedger(
  path: string,
  fetcher: typeof fetch = fetch,
  options: {
    resumeTruncated?: boolean;
    resumeFenced?: boolean;
    resumeAfterEleven?: boolean;
  } = {},
) {
  if (
    resolve(path) !==
    resolve(process.cwd(), '.dev.vars.ai-quality-private', 'run.jsonl')
  )
    throw new Error('Invalid evaluation ledger path');
  let attempts = 0;
  let stopped = false;
  let inFlight = false;
  let file: Awaited<ReturnType<typeof open>>;
  if (options.resumeTruncated) {
    const entries = (await readFile(path, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const [created, dispatch, response, stoppedEntry] = entries;
    if (
      entries.length !== 4 ||
      created?.event !== 'created' ||
      dispatch?.event !== 'dispatch' ||
      dispatch.attempt !== 1 ||
      response?.event !== 'response' ||
      response.attempt !== 1 ||
      response.status !== 200 ||
      stoppedEntry?.event !== 'stopped' ||
      stoppedEntry.attempt !== 1 ||
      stoppedEntry.kind !== 'invalid_response'
    )
      throw new Error('Prior run is not eligible for continuation');
    const envelope = JSON.parse(response.body);
    const usage = envelope?.usage;
    if (
      envelope?.model !== 'qwen3-coder-next' ||
      envelope?.choices?.length !== 1 ||
      envelope.choices[0]?.finish_reason !== 'length' ||
      usage?.prompt_tokens !== 489 ||
      usage?.completion_tokens !== 512
    )
      throw new Error('Prior completion or usage is not definitive');
    const lock = await open(
      resolve(
        process.cwd(),
        '.dev.vars.ai-quality-private',
        'continuation.lock',
      ),
      'wx',
      0o600,
    );
    await lock.writeFile('One-time continuation; do not remove or reuse.\n');
    await lock.sync();
    await lock.close();
    file = await open(path, 'a', 0o600);
    attempts = 1;
  } else if (options.resumeFenced) {
    const entries = (await readFile(path, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const expected = [
      'created',
      'dispatch',
      'response',
      'stopped',
      'resume',
      'dispatch',
      'response',
      'completed',
      'dispatch',
      'response',
      'stopped',
    ];
    if (
      entries.length !== expected.length ||
      entries.some((entry, index) => entry.event !== expected[index]) ||
      entries[1].attempt !== 1 ||
      entries[2].attempt !== 1 ||
      entries[3].attempt !== 1 ||
      entries[3].kind !== 'invalid_response' ||
      entries[4].priorAttempts !== 1 ||
      entries[5].attempt !== 2 ||
      entries[6].attempt !== 2 ||
      entries[7].attempt !== 2 ||
      entries[8].attempt !== 3 ||
      entries[9].attempt !== 3 ||
      entries[10].attempt !== 3 ||
      entries[10].kind !== 'invalid_response'
    )
      throw new Error('Prior run is not eligible for continuation');
    for (const [index, finish, input, output] of [
      [2, 'length', 489, 512],
      [6, 'stop', 490, 821],
      [9, 'stop', 478, 541],
    ] as const) {
      const entry = entries[index];
      const envelope = JSON.parse(entry.body);
      if (
        entry.status !== 200 ||
        envelope.model !== 'qwen3-coder-next' ||
        envelope.choices?.length !== 1 ||
        envelope.choices[0]?.finish_reason !== finish ||
        envelope.usage?.prompt_tokens !== input ||
        envelope.usage?.completion_tokens !== output
      )
        throw new Error('Prior completion or usage is not definitive');
    }
    await readFile(
      resolve(
        process.cwd(),
        '.dev.vars.ai-quality-private',
        'continuation.lock',
      ),
      'utf8',
    );
    const lock = await open(
      resolve(
        process.cwd(),
        '.dev.vars.ai-quality-private',
        'continuation-3.lock',
      ),
      'wx',
      0o600,
    );
    await lock.writeFile('Second continuation; do not remove or reuse.\n');
    await lock.sync();
    await lock.close();
    file = await open(path, 'a', 0o600);
    attempts = 3;
  } else if (options.resumeAfterEleven) {
    const entries = (await readFile(path, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const usage = [
      [489, 512],
      [490, 821],
      [478, 541],
      [506, 940],
      [530, 625],
      [491, 446],
      [527, 402],
      [521, 794],
      [515, 845],
      [515, 411],
      [521, 827],
    ] as const;
    let cursor = 0;
    if (entries[cursor++]?.event !== 'created')
      throw new Error('Invalid prior ledger');
    for (let attempt = 1; attempt <= 11; attempt++) {
      if (attempt === 2 || attempt === 4) {
        const resume = entries[cursor++];
        if (resume?.event !== 'resume' || resume.priorAttempts !== attempt - 1)
          throw new Error('Invalid prior continuation');
      }
      const dispatch = entries[cursor++],
        response = entries[cursor++],
        terminal = entries[cursor++];
      if (
        dispatch?.event !== 'dispatch' ||
        dispatch.attempt !== attempt ||
        response?.event !== 'response' ||
        response.attempt !== attempt ||
        response.status !== 200 ||
        terminal?.attempt !== attempt
      )
        throw new Error('Invalid prior dispatch');
      const envelope = JSON.parse(response.body);
      const [input, output] = usage[attempt - 1];
      const finish = attempt === 1 ? 'length' : 'stop';
      if (
        envelope.model !== 'qwen3-coder-next' ||
        envelope.choices?.length !== 1 ||
        envelope.choices[0]?.finish_reason !== finish ||
        envelope.usage?.prompt_tokens !== input ||
        envelope.usage?.completion_tokens !== output
      )
        throw new Error('Prior completion or usage is not definitive');
      if (attempt === 1 || attempt === 3) {
        if (
          terminal.event !== 'stopped' ||
          terminal.kind !== 'invalid_response'
        )
          throw new Error('Invalid prior stop');
      } else if (
        terminal.event !== 'completed' ||
        terminal.usage?.status !== 'reported' ||
        terminal.usage.inputTokens !== input ||
        terminal.usage.outputTokens !== output
      )
        throw new Error('Invalid prior completion');
    }
    if (cursor !== entries.length)
      throw new Error('Unexpected prior ledger entries');
    await readFile(
      resolve(
        process.cwd(),
        '.dev.vars.ai-quality-private',
        'continuation.lock',
      ),
      'utf8',
    );
    await readFile(
      resolve(
        process.cwd(),
        '.dev.vars.ai-quality-private',
        'continuation-3.lock',
      ),
      'utf8',
    );
    const lock = await open(
      resolve(
        process.cwd(),
        '.dev.vars.ai-quality-private',
        'continuation-11.lock',
      ),
      'wx',
      0o600,
    );
    await lock.writeFile('Final continuation; do not remove or reuse.\n');
    await lock.sync();
    await lock.close();
    file = await open(path, 'a', 0o600);
    attempts = 11;
  } else {
    file = await open(path, 'wx', 0o600);
  }
  const record = async (value: unknown) => {
    await file.writeFile(JSON.stringify(value) + '\n');
    await file.sync();
  };
  await record(
    options.resumeTruncated || options.resumeFenced || options.resumeAfterEleven
      ? { event: 'resume', priorAttempts: attempts }
      : { event: 'created', maxAttempts: 12 },
  );
  return {
    status: () => ({ attempts, stopped }),
    close: () => file.close(),
    call: async (input: SoclaasInput): Promise<SoclaasResult> => {
      if (stopped || inFlight || attempts >= 12)
        throw new SoclaasTransportError('configuration');
      inFlight = true;
      const attempt = ++attempts;
      try {
        // The reservation is durable before the network call; a crash consumes this attempt.
        await record({ event: 'dispatch', attempt });
        const result = await callSoclaas(input, async (url, init) => {
          const response = await fetcher(url, init);
          const length = Number(response.headers.get('content-length'));
          if (length > 262144) throw new SoclaasTransportError('transient');
          const reader = response.clone().body?.getReader();
          if (!reader) throw new SoclaasTransportError('transient');
          const chunks: Uint8Array[] = [];
          let size = 0;
          try {
            for (;;) {
              const part = await reader.read();
              if (part.done) break;
              size += part.value.length;
              if (size > 262144) throw new SoclaasTransportError('transient');
              chunks.push(part.value);
            }
          } finally {
            void reader.cancel().catch(() => {});
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          const raw = new TextDecoder()
            .decode(bytes)
            .split(input.apiKey)
            .join('[REDACTED]')
            .split(JSON.stringify(input.apiKey).slice(1, -1))
            .join('[REDACTED]');
          await record({
            event: 'response',
            attempt,
            status: response.status,
            body: raw,
          });
          return response;
        });
        await record({
          event: 'completed',
          attempt,
          usage: result.usage,
        });
        return result;
      } catch (error) {
        // Never continue after any transport failure: its completion or accounting may be uncertain.
        stopped = true;
        await record({
          event: 'stopped',
          attempt,
          kind: error instanceof SoclaasTransportError ? error.kind : 'unknown',
        }).catch(() => {});
        if (error instanceof SoclaasTransportError) throw error;
        throw new SoclaasTransportError('transient');
      } finally {
        inFlight = false;
      }
    },
  };
}
