import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('routing-description-reconciliation'),
  id: 'check-description-routing-drift',
  scenario: 'Routing metadata consumes the instruction body instead of the canonical description.',
  operation: 'check',
  input: {
    developerDirection:
      "Check moldea for the triage agent's routing description. Read only and report the drift you can establish.",
    repositoryEvidence: [
      {
        claim: 'The canonical description states the routing contract.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/triage-agent/description.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The registration incorrectly supplies the instruction body as routing metadata.',
        source: {
          kind: 'workspace-path',
          path: 'src/triage-agent.mjs',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'describe-routing-drift',
      criterion:
        'Identify the actual routing consumer and report that it supplies the instruction body instead of description.md. Any suggested correction preserves the canonical texts and uses description.md as the only routing source.',
    },
  ],
  forbidden: [
    {
      label: 'unrequested-write',
      criterion: 'The actor writes repository files, scaffolds an agent or implements the plan.',
    },
  ],
  coverageClaimIds: ['routing-description-ownership', 'read-only-integrity'],
});
