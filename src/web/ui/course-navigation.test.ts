import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { CourseNavigation, type CourseSection } from './course-navigation';
describe('IAL-11/UI-04 consistent course context', () => {
  for (const active of [
    'assignments',
    'grading',
    'students',
  ] as CourseSection[]) {
    it(`preserves the same destinations and one current section on ${active}`, () => {
      const html = renderToStaticMarkup(
        createElement(CourseNavigation, { courseId: 'course_1', active }),
      );
      expect(html).toContain('aria-label="Course navigation"');
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      for (const path of [
        '/instructor/assignments',
        '/instructor/review',
        '/auth/invitations',
      ])
        expect(html).toContain(path + '?courseId=course_1');
      expect(html).toContain('Assignments</a>');
      expect(html).toContain('Grading</a>');
      expect(html).toContain('Students</a>');
      expect(html).not.toContain('Assessments</a>');
    });
  }
  it('does not invent course destinations when no course is available', () => {
    expect(
      renderToStaticMarkup(
        createElement(CourseNavigation, { courseId: '', active: 'grading' }),
      ),
    ).toBe('');
  });
});
