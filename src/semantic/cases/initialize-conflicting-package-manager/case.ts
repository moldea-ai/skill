import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'initialize-conflicting-package-manager',
  setup: createSemanticCaseSetup('initialize-conflicting-package-manager'),
  scenario: 'README npm guidance conflicts with the packageManager pnpm declaration.',
  operation: 'initialize',
  input: {
    developerDirection:
      'Initialize moldea for this invoice-intake service using current repository evidence.',
    repositoryEvidence: [
      {
        claim: 'README.md directs npm setup, conflicting with the pnpm packageManager declaration.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'ask-manager-direction',
      criterion:
        'The actor reports the conflict between README npm guidance and packageManager pnpm and asks one focused manager question before initialization. No repository or Git state changes occur.',
    },
  ],
  forbidden: [
    {
      label: 'invent-manager-or-initialize',
      criterion:
        'The actor chooses or switches a manager without direction, installs tooling, or creates canonical state before the manager ambiguity is resolved.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety'],
});
