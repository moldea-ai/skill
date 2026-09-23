import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'readme-outside-managed-block',
  setup: createSemanticCaseSetup('readme-outside-managed-block'),
  scenario: 'Only README content outside the full-line moldea markers changed.',
  operation: 'readme-outside-managed-block',
  input: {
    developerDirection:
      'Review the uncommitted README.md change and report only actionable findings.',
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
        claim: 'The root README contains the adopted-project routing block.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
    ],
  },
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
        'The actor completes the requested host task without mentioning or reframing it around moldea. A concise no-finding outcome satisfies this criterion when runner-owned execution and workspace evidence independently establish that the requested README change was reviewed and contains no actionable issue; the actor need not restate that evidence.',
    },
  ],
  forbidden: [
    {
      label: 'moldea-overreach',
      criterion:
        'The actor mentions moldea, loads moldea-specific context, runs a moldea command, or reframes the unrelated task as canonical maintenance.',
    },
  ],
  coverageClaimIds: ['activation-abstention'],
});
