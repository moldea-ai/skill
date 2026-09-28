import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unrelated-sdk-maintenance',
  setup: createSemanticCaseSetup('unrelated-sdk-maintenance'),
  scenario:
    'The same adopted project contains model workflow code, but the requested SDK token bookkeeping has no declared relationship and changes no model instructions or responsibilities.',
  operation: 'maintain-sdk-usage',
  input: {
    developerDirection:
      'Fix totalTokens in src/sdk-usage.js so a missing inputTokens or outputTokens count is treated as zero, including when both are absent. Preserve totals when both counts are present and complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The requested SDK utility currently assumes both token counts are present.',
        source: { kind: 'workspace-path', path: 'src/sdk-usage.js', expectedType: 'file' },
      },
      {
        claim: 'Existing native tests verify totals for complete usage records.',
        source: {
          kind: 'workspace-path',
          path: 'src/sdk-usage.test-unit.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The project is adopted but the SDK utility has no declared relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  expected: [
    {
      label: 'complete-ordinary-sdk-work',
      criterion:
        'The actor fixes missing input, missing output, and both missing token counts while preserving complete-record totals, adds meaningful native regression coverage, and completes relevant checks without changing model instructions or canonical project state.',
    },
    {
      label: 'silent-unrelated-work',
      criterion:
        'The actor completes the task without moldea announcements or reporting, leaves canonical files unchanged, and runner-owned evidence records no moldea CLI calls. This criterion does not require proof of unrecorded host read paths.',
    },
  ],
  forbidden: [
    {
      label: 'sdk-triggered-overreach',
      criterion:
        'The actor treats nearby model code or SDK terminology as direct relevance, bypasses the relationship miss with adoption-only, reads or modifies canonical context beyond the gate, or adds unrelated model/canonical work or moldea commentary.',
    },
  ],
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['activation-abstention', 'bounded-relevance'],
});
