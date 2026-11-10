import type { Element, Root, RootContent } from 'hast';
import Markdown, { type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

/**
 * Neutral sanitized instruction renderer shared by the instructor preview and the
 * student overview, so both roles see the same interpretation of published text.
 * Raw HTML is parsed only to be sanitized; scripts, handlers and unsafe URLs are removed.
 */
export const instructionSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
};

/**
 * Runs after sanitization: marks each code block as a focusable, labelled scroll region,
 * numbered in document order. The attributes come from code, never from content, and the
 * rendered element stays a plain `<pre>`, so React keeps the same node (and its focus and
 * scroll position) across re-renders.
 */
function codeRegions(label: string) {
  return (tree: Root) => {
    let block = 0;
    const walk = (nodes: RootContent[]) => {
      for (const node of nodes) {
        if (node.type !== 'element') continue;
        const element = node as Element;
        if (element.tagName === 'pre') {
          element.properties = {
            ...element.properties,
            tabIndex: 0,
            role: 'region',
            ariaLabel: `${label}, block ${++block}`,
          };
        }
        walk(element.children);
      }
    };
    walk(tree.children);
  };
}

/**
 * `codeLabel` (UI-07, SD-06) makes each code block a focusable, labelled scroll region,
 * so keyboard users can scroll long lines at narrow widths or 200% zoom. Without it the
 * output is unchanged (the instructor preview does not opt in).
 */
export function InstructionText({
  value,
  codeLabel,
}: {
  value: string;
  codeLabel?: string;
}) {
  const rehypePlugins: NonNullable<Options['rehypePlugins']> = [
    rehypeRaw,
    [rehypeSanitize, instructionSchema],
  ];
  if (codeLabel) rehypePlugins.push([codeRegions, codeLabel]);
  return (
    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
      {value}
    </Markdown>
  );
}
