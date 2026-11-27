import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'create-grounded-agent',
  publication: 'private',
  setup: createSemanticCaseSetup('create-grounded-agent'),
  scenario: 'Create a grounded order-triage agent from an existing immutable factory contract.',
  operation: 'create-agent',
  input: {
    developerDirection:
      'Complete order-triage using createOrderTriageAgent in src/order-triage-agent.ts. It classifies orders for human review and cannot approve refunds. Preserve that source and moldea/project.md. Preserve the existing implementation and instruction-loading contract, register the proven binding, and verify the result. Do not invent tools, providers, or authority.',
    repositoryEvidence: [
      {
        claim:
          'The existing factory loads the canonical instruction path and cannot approve refunds.',
        source: {
          kind: 'workspace-path',
          path: 'src/order-triage-agent.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'Project context establishes the order-classification boundary.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
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
      label: 'grounds-behavior',
      criterion:
        'Canonical description and instruction establish order classification for human review and explicitly withhold refund authority; the instruction begins with the required order-triage identity.',
    },
    {
      label: 'binds-implementation',
      criterion:
        'The order-triage manifest entry binds /src/order-triage-agent.ts at createOrderTriageAgent without duplicating that bound file as an exact affectedBy entry for the same agent.',
    },
    {
      label: 'explains-instruction-loading',
      criterion:
        'The report explains the actual instruction-loading path that supplies the existing factory. It records a loader relationship only when backed by an actual exposed implementation and invents no provider behavior.',
    },
    {
      label: 'preserves-contract',
      criterion:
        'The original factory and project context remain byte-for-byte unchanged. Runner-owned evidence records successful final bundled CLI validation; the report distinguishes it from untested runtime consumption.',
    },
  ],
  forbidden: [
    {
      label: 'invented-behavior',
      criterion:
        'The actor invents tools, provider features, refund authority, or an independently maintained instruction source.',
    },
    {
      label: 'changes-existing-contract',
      criterion:
        'The actor modifies the existing factory or project context, or claims runtime consumption solely from structural validation.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design'],
});
