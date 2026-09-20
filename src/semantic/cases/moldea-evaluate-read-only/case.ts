import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'moldea-evaluate-read-only',
  setup: createSemanticCaseSetup('moldea-evaluate-read-only'),
  scenario:
    'An explicit read-only evaluation must preserve files, index, refs, Git configuration, submodules, and the object database.',
  operation: 'moldea-evaluate-read-only',
  input: {
    developerDirection:
      'Use moldea to evaluate whether the current project state is structurally valid. Preserve every repository control surface and do not modify files.',
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
      label: 'bounded-direct-validation',
      criterion:
        'The actor performs the requested moldea work without taking over the host workflow.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor emits canonical bodies through inspect, changes repository controls during a read-only task, or takes over the host workflow.',
    },
  ],
  coverageClaimIds: ['read-only-integrity'],
});
