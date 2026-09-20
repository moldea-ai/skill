import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'adopted-explicit-context-correction',
  setup: createSemanticCaseSetup('adopted-explicit-context-correction'),
  scenario:
    'An adopted repository receives a natural-language correction to a stale product boundary without an explicit moldea or documentation request.',
  operation: 'maintain-knowledge-handoff',
  input: {
    developerDirection:
      'The existing project context is outdated. The service extracts and validates invoice data for accounting systems. It never authorizes payments.',
    repositoryEvidence: [
      {
        claim: 'Canonical project context contains the stale payment-authority statement.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The developer explicitly identifies the statement as outdated and supplies the current boundary.',
        source: {
          kind: 'developer-direction',
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
