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
it('highlights dotted and ordinary calls without interpreting comments or strings as code', () => {
  const result = highlightPython(
    'import math\nmath.floor(2.8)\ncustom()\n# fake.call()\n"fake.call()"\n',
  );
  expect(result).toContain('token call-receiver">math');
  expect(result).toContain('token callable">floor');
  expect(result).toContain('token callable">custom');
  expect(result).toContain('token comment"># fake.call()');
  expect(result).toContain('token string">"fake.call()"');
});
