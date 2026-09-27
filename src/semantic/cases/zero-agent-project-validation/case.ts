import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'zero-agent-project-validation',
  setup: createSemanticCaseSetup('zero-agent-project-validation'),
  scenario: 'The adopted project intentionally declares no agents.',
  operation: 'zero-agent-project-validation',
  input: {
    developerDirection:
      'Use moldea to inspect and validate this zero-agent project. Do not modify files.',
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
      label: 'validate-intentional-zero-agent-project',
      criterion:
        'Runner-owned evidence records successful launcher-backed inspection and validation. The actor correctly reports that the adopted project intentionally has no agents and that zero agents is not a structural defect; it separates structural validity from untested semantic behavior and leaves files unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor invents a missing-agent defect, creates an agent or other file, claims semantic correctness from structure alone, emits canonical bodies through inspect, or changes repository controls.',
    },
  ],
  coverageClaimIds: ['large-context-safety'],
});
