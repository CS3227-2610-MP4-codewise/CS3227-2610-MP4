import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { emailAddress } from './primitives';

export interface AuthMailer {
  send(
    email: string,
    link: string,
  ): Promise<{
    state: 'queued' | 'failed' | 'unknown';
    messageId?: string;
  }>;
}
export type MailContent = {
  sender: string;
  recipient: string;
  subject: string;
  text: string;
};
export interface MailTransport {
  send(
    content: MailContent,
  ): Promise<{ state: 'queued' | 'failed' | 'unknown'; messageId?: string }>;
}
/** Transport-independent proof-link validation and plain-text content. */
export class AuthEmail implements AuthMailer {
  constructor(
    private config: { sender: string; origin: string },
    private transport: MailTransport,
  ) {}
  async send(email: string, link: string) {
    const url = new URL(link),
      fragment = new URLSearchParams(url.hash.slice(1));
    if (
      url.origin !== this.config.origin ||
      url.username ||
      url.password ||
      url.search ||
      !['/sign-in', '/auth/reset'].includes(url.pathname) ||
      fragment.getAll('code').length !== 1 ||
      !/^[A-Za-z0-9_-]{1,2048}$/.test(fragment.get('code') ?? '') ||
      fragment.getAll('ticket').length !== 1 ||
      !/^[a-f0-9]{64}$/.test(fragment.get('ticket') ?? '') ||
      (url.pathname === '/sign-in' &&
        (fragment.getAll('invite').length !== 1 ||
          !/^[a-f0-9]{64}$/.test(fragment.get('invite') ?? '')))
    )
      throw new BoundaryError('INVALID_CONTRACT');
    const recipient = emailAddress(email),
      sender = emailAddress(this.config.sender),
      setup = url.pathname === '/sign-in';
    return this.transport.send({
      sender,
      recipient,
      subject: setup
        ? 'Your Codewise invitation'
        : 'Reset your Codewise password',
      text:
        (setup
          ? 'Your instructor invited you to Codewise. Choose your password:\n'
          : 'Choose a new Codewise password:\n') +
        link +
        '\nThis password link is single-use and valid for 10 minutes.' +
        (setup
          ? ' Your invitation remains valid until accepted or revoked; reopen its link to request a new password email. Course access is assigned separately.'
          : ' If you did not request this, ignore this email.'),
    });
  }
}
export function requireMailer(mailer?: AuthMailer): AuthMailer {
  if (!mailer) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  return mailer;
}
