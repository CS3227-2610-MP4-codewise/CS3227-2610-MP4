import Markdown from 'react-markdown';
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

export function InstructionText({ value }: { value: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, instructionSchema]]}
    >
      {value}
    </Markdown>
  );
}
