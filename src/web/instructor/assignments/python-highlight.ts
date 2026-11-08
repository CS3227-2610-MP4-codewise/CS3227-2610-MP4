import Prism from 'prismjs';
import 'prismjs/components/prism-python';

/** Prism escapes source before adding syntax spans; it never executes code. */
export function highlightPython(source: string): string {
  return Prism.highlight(source, Prism.languages.python, 'python');
}
