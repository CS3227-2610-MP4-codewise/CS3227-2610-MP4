import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { formatInstruction } from './InstructionEditor';
import InstructionPreview from './InstructionPreview';

it('wraps selected text for the requested formatting controls', () => {
  expect(formatInstruction('hello world', 0, 5, 'bold').value).toBe(
    '**hello** world',
  );
  expect(formatInstruction('hello', 0, 5, 'underline').value).toBe(
    '<u>hello</u>',
  );
  expect(formatInstruction('a\nb', 0, 3, 'bullets').value).toBe('- a\n- b');
  expect(formatInstruction('hello', 0, 5, 'link').value).toBe('[hello](url)');
  expect(formatInstruction('item', 0, 4, 'checklist').value).toBe('- [ ] item');
});
it('places the caret between empty markers without adding placeholder text', () => {
  expect(formatInstruction('', 0, 0, 'underline')).toEqual({
    value: '<u></u>',
    start: 3,
    end: 3,
  });
  expect(formatInstruction('', 0, 0, 'bold')).toEqual({
    value: '****',
    start: 2,
    end: 2,
  });
  expect(formatInstruction('', 0, 0, 'link')).toEqual({
    value: '[](url)',
    start: 1,
    end: 1,
  });
});
it('preserves multi-line code and tabs in a fenced preview', () => {
  const source = 'def x():\n\treturn 1';
  const formatted = formatInstruction(source, 0, source.length, 'code');
  expect(formatted.value).toBe('```\ndef x():\n\treturn 1\n```');
  const html = renderToStaticMarkup(
    createElement(InstructionPreview, { value: formatted.value }),
  );
  expect(html).toContain('<pre><code>def x():\n\treturn 1\n</code></pre>');
  expect(
    formatInstruction(source + '\n', 0, source.length + 1, 'code').value,
  ).toBe('```\ndef x():\n\treturn 1\n```');
});
it('renders a checklist as a disabled checkbox in the preview', () => {
  const html = renderToStaticMarkup(
    createElement(InstructionPreview, { value: '- [ ] item' }),
  );
  expect(html).toContain('type="checkbox"');
  expect(html).toContain('disabled');
});
it('retains single newlines in preview text and checklist items', () => {
  const paragraph = renderToStaticMarkup(
    createElement(InstructionPreview, { value: 'First line\nSecond line' }),
  );
  const checklist = renderToStaticMarkup(
    createElement(InstructionPreview, { value: '- [ ] first line\nsecond line' }),
  );
  expect(paragraph).toContain('First line\nSecond line');
  expect(checklist).toContain('first line\nsecond line');
});
it('renders formatting while stripping unsafe HTML and link protocols', () => {
  const html = renderToStaticMarkup(
    createElement(InstructionPreview, {
      value:
        '**bold** <u>underlined</u> <script>alert(1)</script> [bad](javascript:alert(1))',
    }),
  );
  expect(html).toContain('<strong>bold</strong>');
  expect(html).toContain('<u>underlined</u>');
  expect(html).not.toContain('<script');
  expect(html).not.toContain('javascript:');
});
