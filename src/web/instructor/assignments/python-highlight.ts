import Prism from 'prismjs';
import 'prismjs/components/prism-python';

// Prism recognizes declared function names, but not ordinary or dotted calls.
// This is syntactic highlighting: it does not import or execute Python modules.
Prism.languages.insertBefore('python', 'punctuation', {
  'call-receiver':
    /[\p{ID_Start}_][\p{ID_Continue}]*(?=\s*\.\s*[\p{ID_Start}_][\p{ID_Continue}]*\s*\()/u,
  callable: /[\p{ID_Start}_][\p{ID_Continue}]*(?=\s*\()/u,
});

/** Prism escapes source before adding syntax spans; it never executes code. */
export function highlightPython(source: string): string {
  return Prism.highlight(source, Prism.languages.python, 'python');
}
