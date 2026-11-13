import { useEffect, useRef, useState } from 'react';
import type { Course } from '../../../shared/courses';
import { Action } from '../../ui/primitives';
import { Icon } from '../../ui/brand';
import { courseClient } from './client';
import { CreationController, type CreationState } from './controller';
import './styles.css';

export function CreateCourseForm({
  csrf,
  onCancel,
  onCreated,
  onPhaseChange,
}: {
  csrf: string;
  onCancel: () => void;
  onCreated: (course: Course) => void;
  onPhaseChange?: (phase: CreationState['phase']) => void;
}) {
  const [state, setState] = useState<CreationState>({
    name: '',
    phase: 'editing',
    message: '',
    course: null,
  });
  const [controller] = useState(
    () =>
      new CreationController(
        (input) => courseClient.create(input, csrf),
        (next) => {
          onPhaseChange?.(next.phase);
          setState(next);
        },
      ),
  );
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    if (state.course) onCreated(state.course);
  }, [state.course, onCreated]);
  return (
    <form
      className="cw-create-course"
      aria-label="Create course"
      onSubmit={(e) => {
        e.preventDefault();
        void controller.submit();
      }}
      aria-busy={state.phase === 'pending'}
    >
      <label htmlFor="course-name">Course name</label>
      <input
        ref={input}
        id="course-name"
        value={state.name}
        onChange={(e) => controller.edit(e.target.value)}
        disabled={state.phase !== 'editing'}
        required
        aria-describedby="course-create-status"
        autoComplete="off"
      />
      <p id="course-create-status" role="status">
        {state.message || 'Up to 120 characters.'}
      </p>
      <div className="cw-create-actions">
        {['editing', 'pending', 'uncertain'].includes(state.phase) && (
          <Action type="submit" pending={state.phase === 'pending'}>
            <Icon name={state.phase === 'uncertain' ? 'refresh' : 'plus'} />
            {state.phase === 'uncertain'
              ? 'Retry course creation'
              : state.phase === 'pending'
                ? 'Creating…'
                : 'Create course'}
          </Action>
        )}
        {controller.canCancel && (
          <Action variant="secondary" onClick={onCancel}>
            <Icon name="close" /> Cancel
          </Action>
        )}
        {state.phase === 'denied' && <a href="/sign-in">Sign in</a>}
        {state.phase === 'conflict' && (
          <a href="/workspace">Return to courses</a>
        )}
      </div>
    </form>
  );
}
