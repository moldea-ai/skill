import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'create-grounded-agent',
  setup: createSemanticCaseSetup('create-grounded-agent'),
  scenario: 'Create a grounded order-triage agent from an existing immutable factory contract.',
  operation: 'create-agent',
  input: {
    developerDirection:
      'Complete order-triage using createOrderTriageAgent in src/order-triage-agent.ts. It classifies orders for human review and cannot approve refunds. Preserve that source and moldea/project.md. Use the existing custom runtime, maintain canonical behavior and its real implementation binding, document the runtime-owned canonical instruction loader, and verify the result. Do not invent tools, providers, or authority.',
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
    maximumMoldeaOutputBytes: 262144,
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
      label: 'defines-runtime-guidance',
      criterion:
        'The manifest references focused runtime guidance explaining that the runtime-owned loader supplies the canonical instruction path and content to the existing factory, without inventing provider behavior.',
    },
    {
      label: 'preserves-contract',
      criterion:
        'The original factory and project context remain byte-for-byte unchanged. Runner-owned evidence records successful final launcher-backed validation; the report distinguishes it from untested runtime consumption.',
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
