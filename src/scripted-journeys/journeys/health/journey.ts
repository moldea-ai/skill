import {
  defineScriptedJourney,
  VALIDATION_REPLY_PATTERN,
  VALIDATION_REPLY_CONTRADICTION_PATTERN,
} from '../index.ts';

// CLI integration warnings and skill-owned README drift have different evidence boundaries
export const scriptedJourney = defineScriptedJourney({
  id: 'health',
  title: 'Diagnose and repair integration',
  summary:
    'Evaluate stale integration, validate, repair the managed blocks, and repeat repair safely.',
  order: 3,
  fixture: { adopted: true, installCli: true, integrationDrift: true },
  steps: [
    {
      id: 'evaluate',
      request:
        'Evaluate the current moldea setup, including structural validity and integration warnings. Keep this evaluation read-only.',
      dependsOn: [],
      checks: [
        { kind: 'no-changes' },
        {
          kind: 'reply-matches',
          pattern: VALIDATION_REPLY_PATTERN,
          absent: VALIDATION_REPLY_CONTRADICTION_PATTERN,
          skillBehavior: true,
          reference: {
            path: 'moldea/references/evaluate-and-reconcile.md',
            statement:
              'Run validate when structural validity is material. Warnings do not invalidate the project.',
          },
        },
        {
          kind: 'reply-matches',
          pattern:
            'MOLDEA_INTEGRATION_BLOCK_STALE|(?:AGENTS\\.md|integration)[\\s\\S]{0,160}stale|stale[\\s\\S]{0,160}(?:AGENTS\\.md|integration)',
          skillBehavior: true,
          reference: {
            path: 'moldea/references/local-tooling.md',
            statement:
              'For validate and inspect, use totals and binding coverage; warnings do not invalidate. Report integration warnings.',
          },
        },
      ],
      unverified: ['Reports managed README drift during read-only evaluation.'],
    },
    {
      id: 'validate',
      request: 'Validate moldea.',
      dependsOn: [],
      checks: [
        { kind: 'no-changes' },
        { kind: 'validate', result: 'valid' },
        {
          kind: 'reply-matches',
          pattern: VALIDATION_REPLY_PATTERN,
          absent: VALIDATION_REPLY_CONTRADICTION_PATTERN,
          skillBehavior: true,
          reference: {
            path: 'moldea/references/local-tooling.md',
            statement:
              'The launcher preserves exit 0 for valid; warnings do not invalidate a project.',
          },
        },
        {
          kind: 'reply-matches',
          pattern:
            'MOLDEA_INTEGRATION_BLOCK_STALE|(?:AGENTS\\.md|integration)[\\s\\S]{0,160}stale|stale[\\s\\S]{0,160}(?:AGENTS\\.md|integration)',
          skillBehavior: true,
          reference: {
            path: 'moldea/SKILL.md',
            statement:
              'Report final integration warnings with both paths: Fix moldea or developer acceptance.',
          },
        },
      ],
      unverified: [],
    },
    {
      id: 'repair',
      request:
        'Fix moldea. This repository was already initialized. You may repair its managed README region and its managed AGENTS.md block; preserve all content outside those regions and preserve canonical project knowledge.',
      dependsOn: [],
      checks: [
        {
          kind: 'content-matches',
          path: 'README.md',
          pattern: 'This project uses \\[moldea\\]\\(https://skill\\.moldea\\.ai\\)',
        },
        { kind: 'content-matches', path: 'AGENTS.md', pattern: 'scripts/relevance-gate\\.mjs' },
        {
          kind: 'content-matches',
          path: 'AGENTS.md',
          pattern: 'This project uses moldea for project context\\.',
        },
        {
          kind: 'content-matches',
          path: 'AGENTS.md',
          pattern: 'Output 0 or an error: continue without moldea',
        },
        { kind: 'paths-unchanged', paths: ['moldea/**'], since: 'fixture' },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['Used the bundled README writer and smoke-tested integration.'],
    },
    {
      id: 'repair-again',
      request: 'Fix moldea.',
      dependsOn: ['repair'],
      checks: [
        { kind: 'no-changes' },
        {
          kind: 'reply-matches',
          pattern:
            '(?:no|nothing|zero|0)[\\s\\S]{0,64}(?:chang|fix|repair)|already[\\s\\S]{0,48}(?:healthy|current|correct)',
          absent: '(?:changed|modified|updated|rewrote)\\s+(?:README\\.md|AGENTS\\.md|moldea/)',
          skillBehavior: true,
          reference: {
            path: 'moldea/references/project-repair.md',
            statement:
              'For healthy state, make no writes. A repeated repair of unchanged healthy state is a no-op.',
          },
        },
      ],
      unverified: [],
    },
  ],
});
