import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('validate-python-binding'),
  id: 'validate-python-binding',
  scenario: 'A Python file exists and its manifest binding names a symbol.',
  operation: 'validate',
  input: {
    developerDirection:
      'Validate the invoice-review binding and report which file and symbol checks were performed.',
    repositoryEvidence: [
      {
        claim: 'The binding names the file and review symbol.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The Python file exists and defines review.',
        source: {
          kind: 'workspace-path',
          path: 'src/invoice_review.py',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'python-file-only',
      criterion:
        'Use real bundled verification to establish the Python file is present. Report the symbol as not-checked without treating it as a structural failure.',
    },
  ],
  forbidden: [
    {
      label: 'unrequested-write',
      criterion: 'The actor writes repository files, scaffolds an agent or implements the plan.',
    },
    {
      label: 'unsupported-symbol-claim',
      criterion:
        'The actor claims export verification or reports a failure solely because the symbol was not checked.',
    },
  ],
  coverageClaimIds: ['runtime-selection'],
});
