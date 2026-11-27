import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('unrelated-documentation-review'),
  id: 'check-unscoped-review',
  scenario: 'An ordinary host review does not request a full project audit.',
  operation: 'unscoped-review',
  input: {
    developerDirection:
      'Review the current change. The only intended change is a wording edit in docs/branding.md.',
    repositoryEvidence: [
      {
        claim: 'The repository already has a project foundation.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
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
      label: 'bounded-review',
      criterion:
        'Stay within the stated host review and report concrete evidence or review limitations.',
    },
  ],
  forbidden: [
    {
      label: 'unrequested-write',
      criterion: 'The actor writes repository files, scaffolds an agent or implements the plan.',
    },
    {
      label: 'whole-project-audit',
      criterion:
        'The actor starts a whole-project moldea audit or claims it checked the entire project.',
    },
  ],
  coverageClaimIds: ['activation-abstention', 'project-evaluation-and-reconciliation'],
});
