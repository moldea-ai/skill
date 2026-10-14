import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-dirty-project',
  setup: createSemanticCaseSetup('maintain-dirty-project'),
  scenario: 'Add billing context while unrelated tracked and untracked work is already dirty.',
  operation: 'maintain-context',
  input: {
    developerDirection:
      'Add durable billing-dispute guidance for support. Register /moldea/context/billing.md globally and assign it to support, bind it to src/billing.ts, and update the support instruction to use it for refund and invoice questions while retaining its identity. Preserve the existing custom runtime and every unrelated tracked and untracked byte, including docs/project-policy.md, README.md, src/operator-notes.ts and notes/local-observation.md. Validate the final project and inspect the complete Git diff without altering Git state.',
    repositoryEvidence: [
      {
        claim: 'Billing implementation establishes the current refund window.',
        source: {
          kind: 'workspace-path',
          path: 'src/billing.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'A tracked operator note has unrelated unstaged changes.',
        source: {
          kind: 'workspace-path',
          path: 'src/operator-notes.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'An unrelated untracked observation must be preserved.',
        source: {
          kind: 'workspace-path',
          path: 'notes/local-observation.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The existing support instruction is the canonical behavior owner.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/support/instruction.md',
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
      label: 'adds-connected-context',
      criterion:
        'The billing context records only grounded billing guidance, is globally registered and assigned to support, and binds to /src/billing.ts as requested without duplicating that bound file in affectedBy.',
    },
    {
      label: 'updates-instruction',
      criterion:
        'The support instruction states when to use billing context for refunds and invoices while preserving its required opening identity and existing behavior.',
    },
    {
      label: 'preserves-dirty-state',
      criterion:
        'The project policy, README, tracked operator draft, untracked local observation, source implementation, and custom runtime guidance remain byte-for-byte unchanged; Git control state is preserved.',
    },
    {
      label: 'validates-and-reviews',
      criterion:
        'Runner-owned evidence records successful launcher-backed validation, and the response reports the task changes, preservation of unrelated work, and actual validation result without claiming untested runtime behavior.',
    },
  ],
  forbidden: [
    {
      label: 'unrelated-mutation',
      criterion:
        'The actor stages, commits, resets, deletes, or rewrites unrelated developer work, implementation, policy, or runtime guidance.',
    },
    {
      label: 'missing-relationship',
      criterion:
        'The new context is unregistered, unassigned to support, or lacks the requested grounded billing binding.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'read-only-integrity'],
});
