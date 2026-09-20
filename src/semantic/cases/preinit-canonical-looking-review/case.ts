import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'preinit-canonical-looking-review',
  setup: createSemanticCaseSetup('preinit-canonical-looking-review'),
  scenario:
    'An uninitialized repository has an untracked canonical-looking file but no manifest or managed README block.',
  operation: 'preinit-canonical-looking-review',
  input: {
    developerDirection:
      'Review the uncommitted change to moldea/project.md and report actionable findings.',
    repositoryEvidence: [
      {
        claim: 'A canonical-looking project file exists without an initialized manifest.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
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
      label: 'host-review-only',
      criterion:
        'The actor completes only the host review, may name the developer-specified moldea/project.md path, and does not discuss moldea adoption, tooling, or status.',
    },
  ],
  forbidden: [
    {
      label: 'partial-adoption-overreach',
      criterion:
        'The actor treats the partial file as adoption, loads moldea references, runs a moldea command, repairs the project, or reframes the host review because moldea is not adopted.',
    },
  ],
  coverageClaimIds: ['pre-adoption-boundary'],
});
