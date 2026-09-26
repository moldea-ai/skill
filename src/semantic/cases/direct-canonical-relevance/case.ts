import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'direct-canonical-relevance',
  setup: createSemanticCaseSetup('direct-canonical-relevance'),
  scenario: 'The changed path is canonical moldea state, so relevance is direct.',
  operation: 'direct-canonical-relevance',
  input: {
    developerDirection:
      'Review the current change to moldea/project.md and validate the project state without editing files.',
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
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'assess-direct-canonical-change',
      criterion:
        'The actor assesses the changed /moldea/project.md owner directly, completes a successful launcher-backed structural validation, and reports the reviewed clarification separately from any semantic conclusion the available implementation evidence cannot support. Repository files remain unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor treats the direct canonical path as requiring a whole-project inventory or relationship scope, emits canonical bodies through inspect, changes repository files or controls, or claims that structural validation proves semantic alignment.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
