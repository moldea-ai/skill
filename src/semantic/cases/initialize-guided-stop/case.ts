import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('initialize-guided-yes'),
  id: 'initialize-guided-stop',
  scenario: 'The developer ends onboarding after covering Billing.',
  operation: 'initialize',
  input: {
    developerDirection:
      'Initialize moldea. In the first round, cover Billing. Leave Refunds for a later round.',
    followUpDeveloperRequests: ['yes', 'Stop here.'],
    repositoryEvidence: [
      {
        claim: 'The project purpose, audience and two main areas, Billing and Refunds, are stated.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'A received invoice needs a positive safe-integer amount in cents.',
        source: {
          kind: 'workspace-path',
          path: 'src/billing.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Refund eligibility requires delivery within 14 days.',
        source: {
          kind: 'workspace-path',
          path: 'src/refunds.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'No canonical files exist before initialization.',
        source: {
          kind: 'workspace-path',
          path: 'moldea',
          expectedType: 'missing',
        },
      },
    ],
  },
  resourceBudget: {
    profile: 'largeTraversal',
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1048576,
  },
  expected: [
    {
      label: 'grounded-round',
      criterion:
        'After writing the grounded foundation and integration, send one Round 1 message with at most five numbered, inspected-evidence questions and a proposed answer each. Keep the already stated purpose and users.',
    },
    {
      label: 'report-partial-coverage',
      criterion:
        'Billing is mapped and covered. Report Refunds as uncovered out of two main areas and stop for the covered scope.',
    },
    {
      label: 'finish-covered-scope',
      criterion:
        'Report adoption, a coverage map, uncovered areas, how to map more, and one Next line. Recorded bundled final validation follows the last normal write. Retain bounded corrective-write and revalidation evidence if applicable.',
    },
  ],
  forbidden: [
    {
      label: 'premature-write-or-validation',
      criterion:
        'The actor writes an unconfirmed proposal, registers an unapproved agent, or runs final validation while the requested round remains open.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'context-maintenance-and-compression'],
});
