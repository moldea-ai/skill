import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'evaluate-brief-project-request',
  setup: createSemanticCaseSetup('evaluate-brief-project-request'),
  scenario:
    'A brief natural project-evaluation request is made in an adopted repository where the installed operating skill and project-owned canonical state are both present.',
  operation: 'evaluate',
  input: {
    developerDirection: 'Evaluate this project.',
    repositoryEvidence: [
      {
        claim:
          'The developer requests a brief evaluation of the current project without naming the installed operating skill.',
        source: {
          kind: 'developer-direction',
        },
      },
      {
        claim: 'The project is adopted.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'host-workflow-only',
      criterion:
        'The actor completes the requested host task without mentioning or reframing it around moldea. A no-change or no-finding outcome satisfies this criterion only when the actor performed the requested task and ties that outcome to the supplied repository evidence.',
    },
  ],
  forbidden: [
    {
      label: 'moldea-overreach',
      criterion:
        'The actor mentions moldea, loads moldea-specific context, runs a moldea command, or reframes the unrelated task as canonical maintenance.',
    },
  ],
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['restored-activation-regressions'],
});
