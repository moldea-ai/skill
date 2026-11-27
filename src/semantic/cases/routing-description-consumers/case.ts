import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-consumers',
  setup: createSemanticCaseSetup('routing-description-consumers'),
  scenario:
    'A routing selector and a display directory share the registration description, while a separate summary is display-only.',
  operation: 'check-routing-description',
  input: {
    developerDirection:
      'Check moldea for the triage agent metadata. Trace which fields the router and directory actually consume, verify the routing source, and leave files unchanged.',
    repositoryEvidence: [
      {
        claim:
          'The router selects targets from description. The directory displays that same description and uses summary only as its title.',
        source: { kind: 'workspace-path', path: 'src/triage-agent.mjs', expectedType: 'file' },
      },
      {
        claim:
          'The routing contract distinguishes shared description from the display-only summary.',
        source: { kind: 'workspace-path', path: 'docs/routing.md', expectedType: 'file' },
      },
      {
        claim: 'The shared description is loaded from the canonical agent description.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/triage-agent/description.md',
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
      label: 'classify-by-consumer',
      criterion:
        'The actor traces the router and directory consumers. It identifies description as shared routing and display metadata and summary as display-only, grounded in the consumer code.',
    },
    {
      label: 'verify-canonical-routing-source',
      criterion:
        'The actor verifies that the router consumes description.md through the shared description field. It recognizes the current mapping as aligned and leaves the display-only summary independent.',
    },
    {
      label: 'report-read-only-result',
      criterion: 'The actor reports its findings and the workspace remains unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'misclassify-routing-source',
      criterion:
        'The actor classifies metadata by field name alone, treats summary as routing input, or proposes a second canonical routing source.',
    },
    {
      label: 'repository-write',
      criterion: 'The workspace contains a repository change during this read-only check.',
    },
  ],
  coverageClaimIds: ['routing-description-ownership', 'read-only-integrity'],
});
