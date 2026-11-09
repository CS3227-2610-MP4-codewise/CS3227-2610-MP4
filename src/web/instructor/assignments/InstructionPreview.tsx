import { InstructionText } from '../../ui/instruction-text';

export default function InstructionPreview({ value }: { value: string }) {
  return <InstructionText value={value || '*Nothing to preview yet.*'} />;
}
