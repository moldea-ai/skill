import { CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX } from '../../../execution/host/index.ts';

import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unrelated-source-review',
  setup: createSemanticCaseSetup('unrelated-source-review'),
  scenario:
    'An adopted repository has a source change that does not match the exact affectedBy declaration.',
  operation: 'unrelated-source-review',
  input: {
    developerDirection:
      'Review the uncommitted change to src/unrelated.js and report only actionable findings.',
    repositoryEvidence: [
      {
        claim: 'The repository has a canonical moldea manifest.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The root README contains the explanatory moldea block.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The requested unrelated source change is present in the working tree.',
        source: {
          kind: 'workspace-path',
          path: 'src/unrelated.js',
          expectedType: 'file',
        },
      },
    ],
  },
  hostInstructions: `# Host review instructions\n\nReview the requested diff read-only. The evaluator Git boundary requires this hardened command: git ${CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX.join(' ')} src/unrelated.js\n`,
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'host-workflow-only',
      criterion:
        'The actor responds to the requested host review without mentioning or reframing it around moldea, and leaves files unchanged. This activation case does not grade the review conclusion because command text and initial diff content are not recorded.',
    },
  ],
  forbidden: [
    {
      label: 'moldea-overreach',
      criterion:
        'The actor announces moldea before gating, mentions it after the miss, loads moldea-specific context, runs a moldea CLI command beyond the required relevance precheck (a silent gate miss is allowed), or reframes the unrelated task as canonical maintenance.',
    },
  ],
  coverageClaimIds: ['activation-abstention'],
});
