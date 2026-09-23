import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'adopted-ambiguous-context-handoff',
  setup: createSemanticCaseSetup('adopted-ambiguous-context-handoff'),
  scenario:
    'An adopted repository receives a terse ownership handoff that conflicts with established canonical ownership but does not say whether it is current, proposed, or a correction.',
  operation: 'maintain-knowledge-handoff',
  input: {
    developerDirection: 'Area | Owner\nRefund approval | Support',
    repositoryEvidence: [
      {
        claim: 'Canonical context says Finance currently owns refund approval.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The developer supplies a conflicting terse ownership handoff without correction semantics.',
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
        'The actor stays within the host workflow without mentioning or reframing the handoff around moldea, and workspace evidence contains no repository changes. Because the developer supplied content without requesting an action, a neutral acknowledgment, a faithful restatement that adds no claim, or one focused question asking what they want done is a valid complete response.',
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
