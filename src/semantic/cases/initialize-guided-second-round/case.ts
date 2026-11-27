import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('initialize-guided-yes'),
  id: 'initialize-guided-second-round',
  scenario: 'The developer elects to cover Refunds after Billing.',
  operation: 'initialize',
  input: {
    developerDirection:
      'Initialize moldea. Start with Billing and offer Refunds after the first answers.',
    followUpDeveloperRequests: ['yes', 'Continue with the Refunds round.', 'yes', 'Stop here.'],
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
      label: 'complete-second-round',
      criterion:
        'Round 2 focuses on the remaining Refunds area and writes the accepted policy and mapping only after its yes. The Billing files and approval stay in force.',
    },
    {
      label: 'progress',
      criterion:
        'Every round shows Round N, a one-line established summary, main-area coverage out of the identified total, registered or pending agents, files changed by the preceding round, and gaps. After the Billing answers, offer numbered next choices naming Refunds. When the Refunds answers exhaust the evidence-backed proposals, the finish report closes the round.',
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
