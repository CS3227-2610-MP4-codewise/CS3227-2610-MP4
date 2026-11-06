import { createRoot } from 'react-dom/client';
import '../../styles.css';
import { AssignmentWorkspace } from './AssignmentWorkspace';
import { previewClient } from './client';
createRoot(document.getElementById('root')!).render(
  <AssignmentWorkspace client={previewClient} />,
);
