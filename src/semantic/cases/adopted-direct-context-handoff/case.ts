import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'adopted-direct-context-handoff',
  setup: createSemanticCaseSetup('adopted-direct-context-handoff'),
  scenario:
    'An adopted repository receives a raw structured handoff containing durable team responsibilities and one transient sprint detail without an explicit moldea or documentation request.',
  operation: 'maintain-knowledge-handoff',
  input: {
    developerDirection:
      'current_team:\n  platform:\n    owns:\n      - application runtime\n      - delivery pipeline\n  product:\n    owns:\n      - workflow definitions\n  security:\n    approves:\n      - production access\ncurrent_sprint:\n  platform_focus: migrate dashboard filters',
    repositoryEvidence: [
      {
        claim: 'An adopted project foundation exists without team ownership context.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The developer supplies current team responsibilities and a transient sprint detail.',
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
        'The actor stays within the host workflow without mentioning or reframing the handoff around moldea. Because the developer supplied context without requesting an action, one focused question asking what they want done is a valid complete response, and workspace evidence must contain no repository changes.',
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
