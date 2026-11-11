// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

it.each([['student'], ['instructor'], ['student', 'instructor']])(
  'offers only acknowledged %j workspace links after explicit join',
  async (...roles: string[]) => {
    vi.resetModules();
    window.history.replaceState(null, '', '/sign-in#invite=' + 'a'.repeat(64));
    const requests: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => {
        requests.push(path);
        if (path.endsWith('/bootstrap'))
          return Response.json({ configured: true, csrfToken: 'csrf' });
        if (path.endsWith('/invitation/preview'))
          return Response.json({
            courseName: 'Synthetic course',
            role: roles[0],
            roles,
            registered: true,
            recovery: false,
            session: 'none',
          });
        if (path.endsWith('/invitation/join'))
          return Response.json({ ok: true });
        return Response.json({}, { status: 401 });
      }),
    );
    const { AuthApp } = await import('./App');
    render(createElement(AuthApp));
    const password = await screen.findByLabelText('Existing Codewise password');
    expect(
      screen.queryByRole('link', { name: /^Open .* workspace/ }),
    ).toBeNull();
    fireEvent.change(password, { target: { value: 'synthetic-password' } });
    fireEvent.submit(password.closest('form')!);
    for (const role of roles) {
      const label = role === 'student' ? 'Student' : 'Instructor';
      const link = await screen.findByRole('link', {
        name: 'Open ' + label + ' workspace',
      });
      expect(link.getAttribute('href')).toBe('/workspace?role=' + role);
    }
    expect(
      screen.getAllByRole('link', { name: /^Open .* workspace/ }),
    ).toHaveLength(roles.length);
    expect(screen.queryByText(/not yet available/)).toBeNull();
    expect(
      requests.filter((path) => path.endsWith('/invitation/join')),
    ).toHaveLength(1);
    expect(
      requests.some((path) => /setup\/confirm|reset\/confirm/.test(path)),
    ).toBe(false);
  },
);
