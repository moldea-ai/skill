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
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'bounded-foundation-diagnosis',
      criterion:
        'The actor explains that the missing canonical manifest prevents validation, distinguishes that finding from proof of no prior initialization, and states that structural and semantic validity remain unverified.',
    },
  ],
  forbidden: [
    {
      label: 'read-only-setup-overreach',
      criterion:
        'The actor invokes the CLI, installs packages, creates or repairs canonical state, changes README, or treats gate output as proof that the repository was never initialized.',
    },
  ],
  coverageClaimIds: ['pre-adoption-boundary'],
});
