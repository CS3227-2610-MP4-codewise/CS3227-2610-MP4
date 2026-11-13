import { useEffect, useState } from 'react';
import { Icon } from './brand';
export type CourseSection = 'assignments' | 'grading' | 'students';
const sections = [
  { key: 'assignments', label: 'Assignments', path: '/instructor/assignments' },
  { key: 'grading', label: 'Grading', path: '/instructor/review' },
  { key: 'students', label: 'People', path: '/auth/invitations' },
] as const;
/** One course navigation hierarchy for authoring, grading and invitations. */
export function CourseNavigation({
  courseId,
  active,
}: {
  courseId: string;
  active: CourseSection;
}) {
  const [context, setContext] = useState({ id: '', name: '' });
  useEffect(() => {
    let current = true;
    void fetch('/api/courses', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) =>
        response.ok ? (response.json() as Promise<unknown>) : null,
      )
      .then((body) => {
        if (
          !body ||
          typeof body !== 'object' ||
          !('courses' in body) ||
          !Array.isArray(body.courses)
        )
          return;
        const course = body.courses.find(
          (item: unknown) =>
            item &&
            typeof item === 'object' &&
            'id' in item &&
            item.id === courseId,
        );
        if (current && course && typeof course.name === 'string')
          setContext({ id: courseId, name: course.name });
      })
      .catch(() => {
        /* Feature requests retain their own authorization/error handling. */
      });
    return () => {
      current = false;
    };
  }, [courseId]);
  if (!courseId) return null;
  return (
    <section className="cw-course-context" aria-label="Current course">
      <p className="cw-course-name">
        {context.id === courseId ? context.name : 'Course workspace'}
      </p>
      <nav className="cw-course-tabs" aria-label="Course navigation">
        {sections.map((section) => (
          <a
            key={section.key}
            href={section.path + '?courseId=' + encodeURIComponent(courseId)}
            aria-current={active === section.key ? 'page' : undefined}
          >
            <Icon
              name={
                section.key === 'assignments'
                  ? 'list'
                  : section.key === 'grading'
                    ? 'check-circle'
                    : 'users'
              }
            />
            {section.label}
          </a>
        ))}
      </nav>
    </section>
  );
}
