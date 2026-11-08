import { expect, it } from 'vitest';
import { highlightPython } from './python-highlight';

it('colors Python syntax while escaping source markup', () => {
  const result = highlightPython(
    '# note\ndef greet():\n    return "<img src=x>"\n',
  );
  expect(result).toContain('token keyword');
  expect(result).toContain('token comment');
  expect(result).toContain('token function');
  expect(result).toContain('token string');
  expect(result).toContain('&lt;img');
  expect(result).not.toContain('<img');
});
