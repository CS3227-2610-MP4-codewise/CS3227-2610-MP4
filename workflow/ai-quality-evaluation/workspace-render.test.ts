// @vitest-environment jsdom
import React from 'react';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AssessmentWorkspace } from '../../src/web/instructor/assessments/AssessmentWorkspace';
import type {
  AssessmentController,
  AssessmentState,
} from '../../src/web/instructor/assessments/controller';

describe.skipIf(process.env.SOCLAAS_EVAL_UI !== 'true')(
  'captured synthetic instructor candidate presentation',
  () => {
    it('renders the actual saved Q2 candidate and its rubric feedback', async () => {
      const lines = (
        await readFile('.dev.vars.ai-quality-private/results.jsonl', 'utf8')
      )
        .trim()
        .split('\n');
      const last = JSON.parse(lines[lines.length - 1]) as {
        workspaceView: string;
        body: string;
      };
      const view = JSON.parse(last.workspaceView);
      const result = JSON.parse(last.body);
      const state: AssessmentState = {
        view,
        feedback: view.revision.feedback,
        dirty: false,
        busy: null,
        message: '',
        selectedRevision: null,
        aiPending: false,
        candidate: {
          candidateId: result.candidateId,
          payload: result.payload,
          revisionId: view.head.headRevisionId,
        },
      };
      const controller = {
        subscribe: () => () => {},
        snapshot: () => state,
        open: async () => {},
        dispose: () => {},
      } as unknown as AssessmentController;
      render(
        React.createElement(AssessmentWorkspace, {
          controller,
          id: view.head.id,
          preview: true,
        }),
      );
      const heading = screen.getByText('Private AI suggestion');
      const region = heading.parentElement!;
      const summary = within(region).getByText('Question 1: Positive sum');
      fireEvent.click(summary);
      expect(summary.closest('details')?.open).toBe(true);
      for (const criterion of result.payload.criteria) {
        expect(region.textContent).toContain(criterion.explanation);
        expect(region.textContent).toContain(
          `${criterion.score} / ${criterion.maximumScore}`,
        );
      }
      expect(
        within(region).getByRole('button', { name: 'Adopt AI draft' }),
      ).toBeTruthy();
    });
  },
);
