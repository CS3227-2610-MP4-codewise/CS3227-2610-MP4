import { BoundaryError } from '../../src/shared/instructor-contracts/schema';
import { randomToken } from '../../src/server/auth/primitives';
import type {
  CredentialProvider,
  FirebaseUser,
} from '../../src/server/auth/firebase';
/** Isolated synthetic provider, never imported into application code. */
export class SyntheticFirebase implements CredentialProvider {
  issuer = 'https://securetoken.google.com/synthetic-project';
  users = new Map<string, FirebaseUser>();
  passwords = new Map<string, string>();
  codes = new Map<string, string>();
  unavailable = false;
  async provision(uid: string, email: string) {
    if (
      [...this.users.values()].some((u) => u.email === email && u.uid !== uid)
    )
      throw new Error('synthetic collision');
    if (!this.users.has(uid))
      this.users.set(uid, {
        uid,
        email,
        verified: false,
        disabled: false,
        passwordAt: 1,
        validSince: 1,
      });
  }
  async current(uid: string) {
    if (this.unavailable) throw new Error('synthetic unavailable');
    const u = this.users.get(uid);
    if (!u) throw new BoundaryError('UNAUTHENTICATED');
    return { ...u };
  }
  async login(email: string, value: string) {
    const u = [...this.users.values()].find((u) => u.email === email);
    if (!u || this.passwords.get(u.uid) !== value)
      throw new BoundaryError('UNAUTHENTICATED');
    return this.current(u.uid);
  }
  async action(email: string) {
    const code = randomToken();
    this.codes.set(code, email);
    return code;
  }
  async inspect(code: string) {
    const email = this.codes.get(code);
    if (!email) throw new BoundaryError('UNAUTHENTICATED');
    return email;
  }
  async reset(code: string, value: string) {
    const email = await this.inspect(code);
    this.codes.delete(code);
    const u = [...this.users.values()].find((u) => u.email === email)!;
    u.passwordAt++;
    u.validSince++;
    this.passwords.set(u.uid, value);
    return email;
  }
  async verifyEmail(uid: string) {
    this.users.get(uid)!.verified = true;
  }
}
