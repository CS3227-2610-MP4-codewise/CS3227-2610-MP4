import { BoundaryError } from '../../shared/instructor-contracts/schema';
import type { MailContent, MailTransport } from './mail';

export interface SmtpConnection {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  opened: Promise<unknown>;
  closed: Promise<void>;
  close(): Promise<void>;
}
export type GmailConnection = () => Promise<SmtpConnection>;
/** Fixed Gmail endpoint, implicit TLS with normal certificate validation; no plaintext fallback. */
export const connectGmail: GmailConnection = async () => {
  const { connect } = await import('cloudflare:sockets');
  return connect(
    { hostname: 'smtp.gmail.com', port: 465 },
    { secureTransport: 'on', allowHalfOpen: false },
  );
};
class SmtpRejection extends Error {}
const base64 = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const address = (value: string) => {
  if (
    value.length > 254 ||
    !/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(value)
  )
    throw new BoundaryError('INVALID_CONTRACT');
  return value.toLowerCase();
};
/** Minimal fixed-provider SMTP submission, one recipient/message/connection. Never logs transcripts. */
export class GmailTransport implements MailTransport {
  constructor(
    private config: { sender: string; appPassword: string },
    private connect: GmailConnection = connectGmail,
    private timeoutMs = 15_000,
  ) {}
  async send(
    content: MailContent,
  ): Promise<{ state: 'queued' | 'failed' | 'unknown' }> {
    const sender = address(content.sender),
      recipient = address(content.recipient),
      password = this.config.appPassword.replace(/ /g, '');
    if (
      sender !== address(this.config.sender) ||
      !/^[a-z0-9._+-]+@(gmail\.com|googlemail\.com)$/.test(sender) ||
      !/^[a-zA-Z0-9]{16}$/.test(password) ||
      !/^[\x20-\x7e]{1,128}$/.test(content.subject) ||
      new TextEncoder().encode(content.text).length > 16384
    )
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    let socket: SmtpConnection | undefined,
      reader: ReadableStreamDefaultReader<Uint8Array> | undefined,
      writer: WritableStreamDefaultWriter<Uint8Array> | undefined,
      expired = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      void socket?.close().catch(() => {});
      void reader?.cancel().catch(() => {});
      void writer?.abort().catch(() => {});
    };
    const work = async () => {
      try {
        socket = await this.connect();
        void socket.closed.catch(() => {});
        if (expired) {
          cleanup();
          return { state: 'unknown' as const };
        }
        await socket.opened;
        if (expired) throw Error('SMTP deadline');
        reader = socket.readable.getReader();
        writer = socket.writable.getWriter();
        const decoder = new TextDecoder('utf-8', { fatal: true });
        let buffered = '',
          total = 0;
        const line = async () => {
          for (;;) {
            const end = buffered.indexOf('\r\n');
            if (end >= 0) {
              const value = buffered.slice(0, end);
              buffered = buffered.slice(end + 2);
              if (value.length > 1024) throw Error('SMTP reply size');
              return value;
            }
            const part = await reader!.read();
            if (part.done) throw Error('SMTP disconnected');
            total += part.value.byteLength;
            if (total > 65536) throw Error('SMTP reply size');
            buffered += decoder.decode(part.value, { stream: true });
            if (buffered.length > 16384) throw Error('SMTP reply size');
          }
        };
        const reply = async (expected: number[]) => {
          let code: number | undefined;
          for (let count = 0; count < 32; count++) {
            const value = await line(),
              match = /^(\d{3})([ -])([\x20-\x7e]*)$/.exec(value);
            if (!match) throw Error('SMTP malformed reply');
            const next = Number(match[1]);
            if (code !== undefined && next !== code)
              throw Error('SMTP mixed reply');
            code = next;
            if (match[2] === ' ') {
              if (code >= 400) throw new SmtpRejection();
              if (!expected.includes(code))
                throw Error('SMTP unexpected reply');
              return;
            }
          }
          throw Error('SMTP reply limit');
        };
        const command = async (text: string, expected: number[]) => {
          if (expired) throw Error('SMTP deadline');
          await writer!.write(new TextEncoder().encode(text + '\r\n'));
          await reply(expected);
        };
        await reply([220]);
        await command('EHLO codewise.invalid', [250]);
        await command(
          'AUTH PLAIN ' + base64('\0' + sender + '\0' + password),
          [235],
        );
        await command('MAIL FROM:<' + sender + '>', [250]);
        await command('RCPT TO:<' + recipient + '>', [250, 251]);
        await command('DATA', [354]);
        // Base64 wrapping prevents long URL lines and SMTP dot/command injection in the body.
        const body =
          base64(content.text)
            .match(/.{1,76}/g)
            ?.join('\r\n') ?? '';
        const message = [
          'From: Codewise <' + sender + '>',
          'To: <' + recipient + '>',
          'Subject: ' + content.subject,
          'Date: ' + new Date().toUTCString(),
          'Message-ID: <' +
            crypto.randomUUID() +
            '@' +
            sender.split('@')[1] +
            '>',
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          body,
        ].join('\r\n');
        await command(message + '\r\n.', [250]);
        // 250 after DATA is queue acceptance, never inbox delivery. Do not retry on ambiguous failure.
        return { state: 'queued' as const };
      } catch (error) {
        return {
          state:
            error instanceof SmtpRejection
              ? ('failed' as const)
              : ('unknown' as const),
        };
      } finally {
        cleanup();
      }
    };
    const timeout = new Promise<{ state: 'unknown' }>((resolve) => {
      timer = setTimeout(() => {
        expired = true;
        cleanup();
        resolve({ state: 'unknown' });
      }, this.timeoutMs);
    });
    try {
      return await Promise.race([work(), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
