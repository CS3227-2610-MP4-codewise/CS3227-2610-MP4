import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { boundedProviderJson } from './firebase';
export interface AuthMailer {
  send(
    email: string,
    subject: string,
    text: string,
  ): Promise<{ state: 'queued' | 'failed' | 'unknown'; messageId?: string }>;
}
export type BrevoConfig = { key: string; sender: string; name: string };
/** No provider keys, tracking payloads or action links returned to the browser. */
export class BrevoMailer implements AuthMailer {
  constructor(
    private config: BrevoConfig,
    private transport: typeof fetch = fetch,
  ) {}
  async send(email: string, subject: string, text: string) {
    try {
      const response = await this.transport(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'api-key': this.config.key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { email: this.config.sender, name: this.config.name },
            to: [{ email }],
            subject,
            textContent: text,
          }),
        },
      );
      if (response.status !== 201)
        return {
          state:
            response.status >= 500 ? ('unknown' as const) : ('failed' as const),
        };
      const data = await boundedProviderJson(response);
      return typeof data.messageId === 'string' && data.messageId.length <= 512
        ? { state: 'queued' as const, messageId: data.messageId }
        : { state: 'unknown' as const };
    } catch {
      return { state: 'unknown' as const };
    }
  }
}
export function requireMailer(mailer?: AuthMailer): AuthMailer {
  if (!mailer) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  return mailer;
}
