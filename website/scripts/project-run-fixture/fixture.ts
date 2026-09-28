import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadProjectRun, type IProjectRunModel } from '../../src/lib/project-runs/index.ts';

// small synthetic records exercise the source contract without copying native sessions
export const PROJECT_RUN_FIXTURE_ID = 'illustrative-run';
export const PROJECT_RUN_FIXTURE_COMMIT = 'a'.repeat(40);

/**
 * Writes a self-contained synthetic source to a caller-owned disposable directory.
 * @returns Resolves when the source files are ready for the reader.
 */
export const writeProjectRunFixture = async (root: string, count = 17): Promise<void> => {
  const writeJson = async (relativePath: string, record: unknown): Promise<void> => {
    const destination = path.join(root, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, JSON.stringify(record));
  };
  const manifestPath = 'evidence/run.json';
  await writeJson('evidence/index.json', {
    formatVersion: 1,
    runs: [{ runId: PROJECT_RUN_FIXTURE_ID, manifestPath }],
  });
  await writeJson(manifestPath, {
    formatVersion: 1,
    runId: PROJECT_RUN_FIXTURE_ID,
    date: '2026-09-27',
    summary:
      'Coding sessions across small projects, from the first request to the context left behind.',
    attempts: Array.from({ length: count }, (_, index) => `evidence/attempt-${index + 1}.json`),
    review: 'evidence/review.md',
    limitations: [],
  });
  await mkdir(path.join(root, 'scenarios'), { recursive: true });
  await writeFile(
    path.join(root, 'scenarios', 'field-notes.md'),
    '# Field Notes\n\nA field-service planning app.',
  );
  for (let index = 1; index <= count; index += 1) {
    await writeJson(`evidence/attempt-${index}.json`, {
      formatVersion: 1,
      runId: PROJECT_RUN_FIXTURE_ID,
      scenarioId: `field-notes-${index}`,
      attemptId: index === 3 ? 'project_3' : `project-${index}`,
      baseCommit: 'b'.repeat(40),
      finalCommit: 'c'.repeat(40),
      lastDurableCommit: 'c'.repeat(40),
      scenarioDefinition: { path: 'scenarios/field-notes.md', commit: 'd'.repeat(40) },
      observedSummary:
        'The agent added visit reminders and connected their implementation to the saved scheduling policy. A follow-up corrected the timezone assumption.',
      requests: [
        {
          id: 'initial',
          ordinal: 1,
          kind: 'initial',
          text: 'Add visit reminders. Keep the existing rule that customers receive reminders in their local timezone. Preserve the current cancellation behavior, check daylight saving changes, and keep the saved scheduling policy connected to the code that applies it. Existing customers should receive the same reminder content.',
          observedResult: 'Reminders were added, but the first implementation assumed UTC.',
        },
        {
          id: 'follow-up',
          ordinal: 2,
          kind: 'follow-up',
          text: 'Review how the scheduling policy reaches the reminder code.',
          observedResult: 'The policy and implementation relationship were checked.',
        },
        {
          id: 'correction',
          ordinal: 3,
          kind: 'intervention',
          text: 'Use the customer timezone, including daylight saving changes.',
          observedResult: 'The agent corrected the timezone handling.',
        },
      ],
      interventions: [
        {
          originalResult: 'The first implementation assumed UTC.',
          assistedResult: 'The timezone correction required a developer prompt.',
        },
      ],
      failures: [],
      skillRelease: 'v6.0.1',
      review: 'evidence/review.md',
      assets: [{ kind: 'session', tag: 'illustrative-run', name: 'session.jsonl.gz' }],
      limitations: ['Illustrative records for website tests. No coding session was executed.'],
      evidenceStatus: 'incomplete',
      reviewStatus: 'pending',
      actorOutcome: 'concluded',
    });
  }
};

/**
 * Creates the isolated source used only by synthetic website generation and checks.
 * @returns The loaded fixture model, after removing its temporary source files.
 * @throws
 * - Project run source could not be loaded
 */
export const prepareProjectRunFixture = async (
  repositoryRoot: string,
): Promise<IProjectRunModel> => {
  const parent = path.join(repositoryRoot, '.evidence', 'fixtures');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'website-project-runs-'));
  try {
    await writeProjectRunFixture(root);
    const model = await loadProjectRun({
      kind: 'fixture',
      root,
      runId: PROJECT_RUN_FIXTURE_ID,
      commit: PROJECT_RUN_FIXTURE_COMMIT,
    });
    const example = model.pages[0]?.attempts[1];
    if (example !== undefined && example.initialRequest !== null) {
      const timestamp = '2026-09-27T12:00:00.000Z';
      example.session = [
        {
          ordinal: 0,
          lastOrdinal: 0,
          timestamp,
          kind: 'session',
          title: 'Session started',
          content: 'Host test',
          isRedacted: false,
        },
        {
          ordinal: 1,
          lastOrdinal: 1,
          timestamp,
          kind: 'turn',
          title: 'Agent turn',
          content: 'Synthetic example',
          isRedacted: false,
        },
        {
          ordinal: 2,
          lastOrdinal: 2,
          timestamp,
          kind: 'message',
          role: 'user',
          title: 'Developer',
          content: example.initialRequest.text,
          isRedacted: false,
        },
        {
          ordinal: 3,
          lastOrdinal: 3,
          timestamp,
          kind: 'message',
          role: 'assistant',
          title: 'Coding agent',
          content: 'I will check the saved scheduling policy.',
          isRedacted: false,
        },
        {
          ordinal: 4,
          lastOrdinal: 5,
          timestamp,
          kind: 'tool',
          title: 'exec',
          content: 'cat moldea/project.md',
          output: 'The reminder schedule uses each customer timezone.',
          status: 'completed',
          isRedacted: false,
        },
        {
          ordinal: 6,
          lastOrdinal: 7,
          timestamp,
          kind: 'tool',
          title: 'apply_patch',
          content: '*** Begin Patch\\n*** Update File: moldea/project.md\\n*** End Patch',
          output: 'Script failed: apply_patch verification failed: invalid patch.',
          status: 'completed',
          patchTargets: [{ action: 'Update', path: 'moldea/project.md' }],
          isRedacted: false,
        },
        {
          ordinal: 8,
          lastOrdinal: 9,
          timestamp,
          kind: 'tool',
          title: 'apply_patch',
          content: '*** Begin Patch\\n*** Update File: moldea/project.md\\n*** End Patch',
          output: 'Patch applied.',
          status: 'completed',
          patchTargets: [{ action: 'Update', path: 'moldea/project.md' }],
          isRedacted: false,
        },
        {
          ordinal: 10,
          lastOrdinal: 10,
          timestamp,
          kind: 'compaction',
          title: 'Context compacted',
          content: 'Encrypted summary omitted from this recording.',
          compaction: {
            message: '',
            replacementHistory: [
              { role: 'user', content: 'Keep the customer timezone.' },
              { role: 'assistant', content: 'I checked the scheduling policy.' },
            ],
            retainedUserMessages: [
              { order: 0, text: 'Keep the customer timezone.', complete: true },
            ],
            encryptedSummaryOmitted: true,
          },
          isRedacted: false,
        },
        {
          ordinal: 11,
          lastOrdinal: 11,
          timestamp,
          kind: 'message',
          role: 'assistant',
          title: 'Coding agent',
          content: 'The saved policy requires the customer timezone.',
          isRedacted: false,
        },
      ];
    }
    return model;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};
