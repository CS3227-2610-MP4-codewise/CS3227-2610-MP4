import { createRoot } from 'react-dom/client';
import { AssessmentWorkspace } from './AssessmentWorkspace';
import { AssessmentController } from './controller';
import { assessmentClient, workspace } from './client';
import '../../styles.css';
import { object, id } from '../../../shared/instructor-contracts/schema';
async function start() {
  const root = createRoot(document.getElementById('root')!);
  try {
    const r = await fetch('/__assessment-preview/api/fixture', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!r.ok) throw Error();
    const raw = object(await r.json(), ['attemptId', 'csrf']);
    const fixture = {
      attemptId: id(raw.attemptId, '$.attemptId'),
      csrf: id(raw.csrf, '$.csrf'),
    };
    const created = await fetch('/__assessment-preview/api/assessments', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': fixture.csrf,
      },
      body: JSON.stringify({
        attemptId: fixture.attemptId,
        requestKey: 'preview_assessment',
      }),
    });
    if (!created.ok) throw Error();
    const v = workspace(await created.json());
    root.render(
      <AssessmentWorkspace
        controller={new AssessmentController(assessmentClient(fixture.csrf))}
        id={v.head.id}
      />,
    );
  } catch {
    root.render(
      <main>
        <h1>Assessment preview unavailable</h1>
        <p>Run the isolated assessment preview server, then reload.</p>
      </main>,
    );
  }
}
void start();
