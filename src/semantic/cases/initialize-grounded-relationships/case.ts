import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'initialize-grounded-relationships',
  setup: createSemanticCaseSetup('initialize-grounded-relationships'),
  scenario:
    'Explicit initialization finds a specific source file that materially implements the documented invoice-intake foundation.',
  operation: 'initialize',
  input: {
    developerDirection: 'Initialize moldea for this invoice-intake service.',
    repositoryEvidence: [
      {
        claim:
          'README establishes invoice intake, accounting consumers, and the no-payment boundary.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
      {
        claim: 'The exact invoice implementation corroborates the project foundation.',
        source: { kind: 'workspace-path', path: 'src/invoice.js', expectedType: 'file' },
      },
      {
        claim: 'Canonical moldea state does not yet exist.',
        source: { kind: 'workspace-path', path: 'moldea', expectedType: 'missing' },
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
      label: 'record-exact-grounded-relationship',
      criterion:
        'The initialized foundation describes the evidenced invoice-intake purpose and records an exact affectedBy relationship to /src/invoice.js for the governing project fact.',
    },
    {
      label: 'validate-complete-foundation',
      criterion:
        'The actor preserves unrelated README content, creates no agent, and completes launcher-backed validation after the canonical and managed README writes.',
    },
  ],
  forbidden: [
    {
      label: 'speculative-relationship-backfill',
      criterion:
        'The actor adds catch-all source globs, unrelated bindings, or placeholder agents not established by the inspected project evidence.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'context-maintenance-and-compression'],
});
