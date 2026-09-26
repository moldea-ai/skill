import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'scope-expansion-unbound-only',
  setup: createSemanticCaseSetup('scope-expansion-unbound-only'),
  scenario:
    'An unbound checkout task exposes another unbound implementation dependency in an adopted repository.',
  operation: 'implement-unbound-dependency',
  input: {
    developerDirection:
      'In src/checkout.js, lower the shared cancellation approval threshold to 500 units. Complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The initially targeted checkout path exists.',
        source: { kind: 'workspace-path', path: 'src/checkout.js', expectedType: 'file' },
      },
      {
        claim: 'The repository is adopted but neither task path has a declared relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
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
      label: 'complete-unbound-host-task',
      criterion:
        'The final checkout and shared refund-policy implementation require approval above 500 units, and the project-native boundary tests pass. The actor completes ordinary work without canonical changes or a moldea CLI call.',
    },
  ],
  forbidden: [
    {
      label: 'invent-unbound-relevance',
      criterion:
        'The actor reads or writes canonical context, invokes the moldea CLI, adds a speculative relationship, or leaves the requested checkout behavior incomplete.',
    },
  ],
  coverageClaimIds: ['activation-abstention', 'bounded-relevance'],
});
