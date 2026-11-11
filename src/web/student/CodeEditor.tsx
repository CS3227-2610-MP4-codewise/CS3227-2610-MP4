/**
 * SW-04 editor seam. The workbook imports only this module, so the editor implementation
 * (here: native textarea + Prism overlay) can be swapped without touching workbook logic.
 */
export {
  PrismEditor as CodeEditor,
  type CodeEditorHandle,
  type CodeEditorProps,
} from './PrismEditor';
