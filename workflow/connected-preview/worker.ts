import { createApplication } from '../../src/server/index';
import { localSamples } from './samples';
/** Explicit development entry; normal Worker does not import a sample producer. */
export default createApplication({
  localSubmissions: ({ assignments, request }) =>
    localSamples(assignments, request),
});
