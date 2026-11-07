import {
  createCourseSchema,
  type Course,
  type CreateCourse,
} from '../../../shared/courses';
import { BoundaryError } from '../../../shared/instructor-contracts/schema';

export type CreationState = {
  name: string;
  phase:
    'editing' | 'pending' | 'uncertain' | 'denied' | 'conflict' | 'complete';
  message: string;
  course: Course | null;
};
/** One mounted form is one logical operation. Never replace its key after uncertainty. */
export class CreationController {
  state: CreationState = {
    name: '',
    phase: 'editing',
    message: '',
    course: null,
  };
  private attempt?: CreateCourse;
  constructor(
    private send: (input: CreateCourse) => Promise<Course>,
    private changed: (state: CreationState) => void,
    private key: () => string = () => crypto.randomUUID(),
  ) {}
  private update(patch: Partial<CreationState>) {
    this.state = { ...this.state, ...patch };
    this.changed(this.state);
  }
  edit(name: string) {
    if (this.state.phase === 'editing') this.update({ name, message: '' });
  }
  get canCancel() {
    return this.state.phase === 'editing';
  }
  async submit() {
    if (!['editing', 'uncertain'].includes(this.state.phase)) return;
    try {
      this.attempt ??= createCourseSchema.parse({
        name: this.state.name,
        requestKey: this.key(),
      });
    } catch {
      this.update({
        message:
          'Enter a course name of 1–120 characters, without control characters.',
      });
      return;
    }
    const input = this.attempt;
    this.update({ phase: 'pending', message: 'Creating course…' });
    try {
      const course = await this.send(input);
      if (course.name !== input.name)
        throw new Error('Mismatched acknowledgement');
      this.update({
        phase: 'complete',
        course,
        message: 'Course created. Opening course…',
      });
    } catch (error) {
      const code =
        error instanceof BoundaryError ? error.code : 'UPSTREAM_UNAVAILABLE';
      if (code === 'INVALID_CONTRACT') {
        this.attempt = undefined;
        this.update({
          phase: 'editing',
          message: 'Check the course name and try again.',
        });
      } else if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') {
        this.update({
          phase: 'denied',
          message:
            code === 'UNAUTHENTICATED'
              ? 'Session expired. Sign in again.'
              : 'Course creation is no longer available to you.',
        });
      } else if (code === 'IDEMPOTENCY_CONFLICT') {
        this.update({
          phase: 'conflict',
          message:
            'This request conflicts with an earlier course or its access has changed. Return to your courses.',
        });
      } else {
        this.update({
          phase: 'uncertain',
          message:
            code === 'RATE_LIMITED'
              ? 'Too many attempts. Wait a minute, then retry this course.'
              : 'Creation could not be confirmed. Retry to check the same course.',
        });
      }
    }
  }
}
