import { describe, it, expect, vi } from 'vitest';
import {
  GmailTransport,
  type SmtpConnection,
} from '../../src/server/auth/gmail';
const config = { sender: 'sender@gmail.com', appPassword: 'abcdefghijklmnop' };
const content = {
  sender: config.sender,
  recipient: 'student@u.nus.edu',
  subject: 'Your Codewise invitation',
  text:
    'Synthetic password link:\nhttps://app.example.test/sign-in#invite=synthetic\n.\r\nMAIL FROM:<attacker@example.test>\n' +
    'a'.repeat(2200),
};
function server(
  options: {
    replies?: string[];
    hangAt?: number;
    disconnectAt?: number;
    fragment?: boolean;
    opened?: Promise<unknown>;
  } = {},
) {
  let controller: ReadableStreamDefaultController<Uint8Array>,
    closed = false;
  const writes: string[] = [];
  const enqueue = (text: string) => {
    const bytes = new TextEncoder().encode(text);
    if (options.fragment) {
      for (const v of bytes) controller.enqueue(Uint8Array.of(v));
    } else controller.enqueue(bytes);
  };
  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      enqueue('220 smtp.gmail.com ESMTP synthetic\r\n');
    },
  });
  const close = vi.fn(async () => {
    if (!closed) {
      closed = true;
      try {
        controller.close();
      } catch {
        /* already cancelled */
      }
    }
  });
  const writable = new WritableStream<Uint8Array>({
    write(bytes) {
      writes.push(new TextDecoder().decode(bytes));
      if (options.disconnectAt === writes.length) {
        void close();
        return;
      }
      if (options.hangAt === writes.length) return;
      enqueue(
        options.replies?.[writes.length - 1] ??
          [
            '250-smtp.gmail.com\r\n250 AUTH PLAIN LOGIN\r\n',
            '235 2.7.0 Accepted\r\n',
            '250 2.1.0 OK\r\n',
            '250 2.1.5 OK\r\n',
            '354 Go ahead\r\n',
            '250 2.0.0 Queued\r\n',
          ][writes.length - 1],
      );
    },
  });
  const socket: SmtpConnection = {
    readable,
    writable,
    opened: options.opened ?? Promise.resolve({}),
    closed: new Promise(() => {}),
    close,
  };
  return { writes, close, connect: vi.fn(async () => socket) };
}
describe('Gmail implicit-TLS submission contract (synthetic socket)', () => {
  it('submits exactly one encoded message and reports queue acceptance only', async () => {
    const fake = server({ fragment: true }),
      transport = new GmailTransport(config, fake.connect);
    expect(await transport.send(content)).toEqual({ state: 'queued' });
    expect(fake.connect).toHaveBeenCalledTimes(1);
    expect(fake.writes).toHaveLength(6);
    expect(fake.writes[0]).toBe('EHLO codewise.invalid\r\n');
    expect(atob(fake.writes[1].slice('AUTH PLAIN '.length).trim())).toBe(
      '\0' + config.sender + '\0' + config.appPassword,
    );
    expect(fake.writes[2]).toBe('MAIL FROM:<sender@gmail.com>\r\n');
    expect(fake.writes[3]).toBe('RCPT TO:<student@u.nus.edu>\r\n');
    const message = fake.writes[5],
      body = message
        .split('\r\n\r\n')[1]
        .replace(/\r\n\.\r\n$/, '')
        .replace(/\r\n/g, '');
    expect(atob(body)).toBe(content.text);
    expect(message).not.toContain('MAIL FROM:<attacker');
    expect(message.split('\r\n').every((line) => line.length <= 998)).toBe(
      true,
    );
    expect(fake.close).toHaveBeenCalled();
  });
  it('rejects credentials, recipient, header and configuration injection before connecting', async () => {
    const fake = server();
    for (const input of [
      { ...content, recipient: 'x@u.nus.edu>\r\nDATA' },
      { ...content, subject: 'hello\r\nBcc: x@example.test' },
      { ...content, sender: 'other@gmail.com' },
    ])
      await expect(
        new GmailTransport(config, fake.connect).send(input),
      ).rejects.toThrow();
    await expect(
      new GmailTransport(
        { ...config, appPassword: 'regular-account-password' },
        fake.connect,
      ).send(content),
    ).rejects.toThrow();
    expect(fake.connect).not.toHaveBeenCalled();
  });
  it('classifies explicit Gmail auth, recipient and DATA rejections as failed, never queued', async () => {
    for (const step of [2, 4, 6]) {
      const replies = Array<string>(6);
      replies[step - 1] = '550 5.7.0 Synthetic rejection\r\n';
      const fake = server({ replies });
      expect(
        await new GmailTransport(config, fake.connect).send(content),
      ).toEqual({ state: 'failed' });
      expect(fake.writes).toHaveLength(step);
    }
  });
  it('treats disconnect after DATA as unknown and never retries the message', async () => {
    const fake = server({ disconnectAt: 6 });
    expect(
      await new GmailTransport(config, fake.connect).send(content),
    ).toEqual({ state: 'unknown' });
    expect(fake.writes).toHaveLength(6);
    expect(fake.connect).toHaveBeenCalledTimes(1);
  });
  it('bounds reply lengths, line counts and mixed response codes', async () => {
    for (const reply of [
      '250 ' + 'x'.repeat(2000) + '\r\n',
      '250-first\r\n235 bad mix\r\n',
      '250-more\r\n'.repeat(33),
      'invalid\r\n',
    ]) {
      const fake = server({ replies: [reply] });
      expect(
        await new GmailTransport(config, fake.connect).send(content),
      ).toEqual({ state: 'unknown' });
      expect(fake.writes).toHaveLength(1);
    }
  });
  it('closes timed-out connections without later sending credentials or DATA', async () => {
    const fake = server({ hangAt: 1 });
    expect(
      await new GmailTransport(config, fake.connect, 20).send(content),
    ).toEqual({ state: 'unknown' });
    expect(fake.close).toHaveBeenCalled();
    expect(fake.writes).toHaveLength(1);
    let open!: () => void;
    const delayed = server({
      opened: new Promise((resolve) => {
        open = () => resolve({});
      }),
    });
    expect(
      await new GmailTransport(config, delayed.connect, 20).send(content),
    ).toEqual({ state: 'unknown' });
    open();
    await Promise.resolve();
    await Promise.resolve();
    expect(delayed.writes).toHaveLength(0);
  });
  it('closes a socket arriving after the deadline and never advances beyond stalled AUTH', async () => {
    const late = server();
    let arrive!: (value: SmtpConnection) => void;
    const connect = () =>
      new Promise<SmtpConnection>((resolve) => {
        arrive = resolve;
      });
    expect(await new GmailTransport(config, connect, 20).send(content)).toEqual(
      { state: 'unknown' },
    );
    arrive(await late.connect());
    await Promise.resolve();
    await Promise.resolve();
    expect(late.close).toHaveBeenCalled();
    expect(late.writes).toHaveLength(0);
    const auth = server({ hangAt: 2 });
    expect(
      await new GmailTransport(config, auth.connect, 20).send(content),
    ).toEqual({ state: 'unknown' });
    expect(auth.writes).toHaveLength(2);
    expect(
      auth.writes.some(
        (value) => value.startsWith('MAIL FROM:') || value.startsWith('DATA'),
      ),
    ).toBe(false);
  });
});
