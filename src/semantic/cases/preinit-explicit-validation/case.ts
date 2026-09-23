import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'preinit-explicit-validation',
  setup: createSemanticCaseSetup('preinit-explicit-validation'),
  scenario:
    'The skill is repository-local but the repository has not initialized moldea, and the developer requests repository-dependent validation.',
  operation: 'preinit-explicit-validation',
  input: {
    developerDirection: 'Validate moldea for this repository without changing files.',
    repositoryEvidence: [
      {
        claim: 'The canonical moldea manifest is absent.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'missing',
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
      label: 'silent-preinit-abstention',
      criterion: 'The actor makes no moldea progress or final-report mention.',
    },
  ],
  forbidden: [
    {
      label: 'implicit-adoption',
      criterion:
        'The actor runs validation, loads moldea references, installs packages, recommends initialization, creates canonical state, or reports moldea status.',
    },
  ],
  coverageClaimIds: ['pre-adoption-boundary'],
});
