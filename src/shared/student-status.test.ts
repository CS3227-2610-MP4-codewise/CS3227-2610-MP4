import { describe, expect, it } from 'vitest';
import {
  assignmentStatusIds,
  assignmentStatusPageSchema,
} from './student-work';

// AS-02: closed status shapes. Parsing validates shape only, never authority.
const ids = (n: number) => Array.from({ length: n }, (_, i) => 'a' + i);

describe('assignment status ids', () => {
  it('accepts one to fifty unique assignment IDs', () => {
    expect(assignmentStatusIds(['alpha'])).toEqual(['alpha']);
    expect(assignmentStatusIds(ids(50))).toHaveLength(50);
    expect(
      assignmentStatusIds(['00000000-0000-4000-8000-000000000001']),
    ).toHaveLength(1);
  });

  it('rejects none, more than one page, duplicates and malformed IDs', () => {
    expect(() => assignmentStatusIds([])).toThrow();
    expect(() => assignmentStatusIds(ids(51))).toThrow();
    expect(() => assignmentStatusIds(['a', 'a'])).toThrow();
    expect(() => assignmentStatusIds([''])).toThrow();
    expect(() => assignmentStatusIds(['bad\u0000id'])).toThrow();
    expect(() => assignmentStatusIds(['x'.repeat(129)])).toThrow();
  });
});

describe('assignment status page', () => {
  it('parses the closed shape with every status value', () => {
    const page = {
      schemaVersion: 1,
      items: [
        { assignmentId: 'a', status: 'feedback-released' },
        { assignmentId: 'b', status: 'submitted' },
        { assignmentId: 'c', status: 'due-soon' },
        { assignmentId: 'd', status: 'none' },
      ],
    };
    expect(assignmentStatusPageSchema.parse(page)).toEqual(page);
  });

  it('rejects unknown statuses, extra fields, duplicates and other versions', () => {
    const item = { assignmentId: 'a', status: 'submitted' };
    for (const bad of [
      { schemaVersion: 1, items: [{ ...item, status: 'graded' }] },
      { schemaVersion: 1, items: [{ ...item, attemptId: 'x' }] },
      { schemaVersion: 1, items: [{ ...item, score: 3 }] },
      { schemaVersion: 1, items: [item, item] },
      { schemaVersion: 2, items: [item] },
      { schemaVersion: 1, items: [item], serverTime: 'x' },
      {
        schemaVersion: 1,
        items: ids(51).map((assignmentId) => ({
          assignmentId,
          status: 'none',
        })),
      },
    ])
      expect(() => assignmentStatusPageSchema.parse(bad)).toThrow();
  });
});
