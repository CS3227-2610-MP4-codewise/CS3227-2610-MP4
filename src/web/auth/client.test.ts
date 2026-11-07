import { describe, expect, it } from 'vitest';
import {
  joinedWorkspaceMessage,
  parseInvitationPreview,
  takeAuthProof,
} from './client';

describe('invitation entry', () => {
  it('reports the actual workspace availability after joining', () => {
    expect(joinedWorkspaceMessage('student')).toBe(
      'The Student workspace is not yet available.',
    );
    expect(joinedWorkspaceMessage('instructor')).toBe(
      'You can now open your Instructor workspace.',
    );
  });
  it('strips the invitation and proof fragment before using the link', () => {
    const token = 'a'.repeat(64),
      ticket = 'b'.repeat(64),
      replaced: string[] = [];
    expect(
      takeAuthProof(
        {
          pathname: '/sign-in',
          search: '',
          hash: `#invite=${token}&ticket=${ticket}&code=proof`,
        },
        (url) => replaced.push(url),
      ),
    ).toEqual({ invite: token, ticket, code: 'proof' });
    expect(replaced).toEqual(['/sign-in']);
  });
  it('rejects malformed preview data instead of assuming an account or role', () => {
    expect(parseInvitationPreview({ legacy: true, session: 'none' })).toEqual({
      legacy: true,
      session: 'none',
    });
    expect(() =>
      parseInvitationPreview({ legacy: true, session: 'matching' }),
    ).toThrow();
    expect(
      parseInvitationPreview({
        courseName: 'Software',
        role: 'instructor',
        registered: true,
        session: 'other',
      }),
    ).toEqual({
      courseName: 'Software',
      role: 'instructor',
      registered: true,
      session: 'other',
    });
    for (const value of [
      null,
      {},
      {
        courseName: 'Software',
        role: 'admin',
        registered: true,
        session: 'none',
      },
      { courseName: 'Software', role: 'student', registered: false },
    ]) {
      expect(() => parseInvitationPreview(value)).toThrow();
    }
  });
});
