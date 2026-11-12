// @vitest-environment jsdom
import { createElement, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { InstructionEditor } from './InstructionEditor';

afterEach(cleanup);

it('applies bold to selected instructions when the toolbar is clicked', async () => {
  function Harness() {
    const [value, setValue] = useState('hello world');
    return createElement(InstructionEditor, {
      value,
      readOnly: false,
      onChange: setValue,
    });
  }
  render(createElement(Harness));
  const input = screen.getByLabelText(
    'Instructions for students',
  ) as HTMLTextAreaElement;
  input.focus();
  input.setSelectionRange(0, 5);
  const button = screen.getByRole('button', { name: 'Bold' });
  fireEvent.mouseDown(button);
  fireEvent.click(button);
  await waitFor(() => expect(input.value).toBe('**hello** world'));
  expect(screen.getByRole('status').textContent).toContain('Bold applied');
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  expect((await screen.findByText('hello', {}, { timeout: 10000 })).tagName).toBe('STRONG');
});

it.each([
  ['Italic', '*hello*'],
  ['Underline', '<u>hello</u>'],
  ['Strikethrough', '~~hello~~'],
  ['Code', '`hello`'],
  ['Heading', '## hello'],
  ['Quote', '> hello'],
  ['Bulleted list', '- hello'],
  ['Numbered list', '1. hello'],
  ['Checklist', '- [ ] hello'],
])('applies %s using its toolbar button', async (label, expected) => {
  function Harness() {
    const [value, setValue] = useState('hello');
    return createElement(InstructionEditor, {
      value,
      readOnly: false,
      onChange: setValue,
    });
  }
  render(createElement(Harness));
  const input = screen.getByLabelText(
    'Instructions for students',
  ) as HTMLTextAreaElement;
  input.focus();
  input.setSelectionRange(0, 5);
  const button = screen.getByRole('button', { name: label });
  fireEvent.mouseDown(button);
  fireEvent.click(button);
  await waitFor(() => expect(input.value).toBe(expected));
});

it('uses a link icon and inserts the editable Markdown link', async () => {
  function Harness() {
    const [value, setValue] = useState('course');
    return createElement(InstructionEditor, {
      value,
      readOnly: false,
      onChange: setValue,
    });
  }
  render(createElement(Harness));
  const input = screen.getByLabelText(
    'Instructions for students',
  ) as HTMLTextAreaElement;
  input.focus();
  input.setSelectionRange(0, 6);
  const button = screen.getByRole('button', { name: 'Link' });
  expect(button.querySelector('svg')).not.toBeNull();
  fireEvent.mouseDown(button);
  fireEvent.click(button);
  await waitFor(() => expect(input.value).toBe('[course](url)'));
});

it('places the cursor inside empty underline markers', async () => {
  function Harness() {
    const [value, setValue] = useState('');
    return createElement(InstructionEditor, {
      value,
      readOnly: false,
      onChange: setValue,
    });
  }
  render(createElement(Harness));
  const input = screen.getByLabelText(
    'Instructions for students',
  ) as HTMLTextAreaElement;
  input.focus();
  const button = screen.getByRole('button', { name: 'Underline' });
  fireEvent.mouseDown(button);
  fireEvent.click(button);
  await waitFor(() => expect(input.value).toBe('<u></u>'));
  await waitFor(() => expect(input.selectionStart).toBe(3));
  expect(input.selectionEnd).toBe(3);
});
