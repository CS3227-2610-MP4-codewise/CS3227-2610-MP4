import {
  schema,
  object,
  text,
  assert,
  array,
  type Infer,
} from './instructor-contracts/schema';

export function courseName(value: unknown) {
  const name = text(value, '$.name', 960).trim();
  assert(
    Array.from(name).length >= 1 && Array.from(name).length <= 120,
    '$.name',
    'length',
  );
  assert(
    new TextEncoder().encode(name).length <= 480 &&
      !Array.from(name).some((ch) => {
        const point = ch.codePointAt(0)!;
        return point < 32 || (point >= 127 && point <= 159);
      }),
    '$.name',
    'name',
  );
  return name;
}
export const createCourseSchema = schema((value) => {
  const o = object(value, ['name', 'requestKey']);
  const requestKey = text(o.requestKey, '$.requestKey', 36);
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      requestKey,
    ),
    '$.requestKey',
  );
  return { name: courseName(o.name), requestKey };
});
function course(value: unknown, path = '$.course') {
  const o = object(value, ['id', 'name'], path);
  const id = text(o.id, path + '.id', 128);
  assert(/^[A-Za-z0-9_-]{1,128}$/.test(id), path + '.id');
  return { id, name: text(o.name, path + '.name', 480) };
}
export const courseResultSchema = schema((value) => {
  const o = object(value, ['course']);
  return { course: course(o.course) };
});
export const courseListSchema = schema((value) => {
  const o = object(value, ['courses']);
  return { courses: array(o.courses, course, '$.courses', 0, 100) };
});
export const courseCreationSchema = schema((value) => {
  const o = object(value, ['canCreate']);
  assert(typeof o.canCreate === 'boolean', '$.canCreate');
  return { canCreate: o.canCreate };
});
export type Course = Infer<typeof courseResultSchema>['course'];
export type CreateCourse = Infer<typeof createCourseSchema>;
