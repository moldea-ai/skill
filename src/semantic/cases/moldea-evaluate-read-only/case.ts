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
      label: 'report-structural-evaluation',
      criterion:
        'Runner-owned evidence records a completed successful launcher-backed validation. The actor reports structural validity, does not infer semantic or runtime correctness from it, and explicitly reports that the read-only evaluation changed no files.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor claims a structural pass without recorded validation, claims semantic or runtime correctness from structure alone, emits canonical bodies through inspect, or changes files or repository controls.',
    },
  ],
  coverageClaimIds: ['read-only-integrity'],
});
