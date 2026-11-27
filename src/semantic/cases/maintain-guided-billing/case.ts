import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('maintain-guided-billing'),
  id: 'maintain-guided-billing',
  publication: 'private',
  scenario: 'An adopted project asks moldea to learn one named area.',
  operation: 'maintain-context',
  input: {
    developerDirection: 'Help moldea learn the billing area.',
    followUpDeveloperRequests: ['yes'],
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
        claim: 'The adopted foundation states the purpose and users.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
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
      label: 'one-area-round',
      criterion:
        'Run one guided Billing round with a proposed governing rule and exact path. Show established context material to Billing, Billing coverage, agent status, changed files, and remaining gaps in the requested area.',
    },
    {
      label: 'save-confirmed-billing',
      criterion:
        'After yes, save the confirmed Billing guidance and exact affectedBy and route to it from project.md. Leave Refunds uncovered and verify the authorized change.',
    },
  ],
  forbidden: [
    {
      label: 'premature-write-or-validation',
      criterion:
        'The actor writes an unconfirmed proposal, registers an unapproved agent, or runs final validation while the requested round remains open.',
    },
    {
      label: 'broader-audit',
      criterion: 'The actor starts another round or writes unrelated Refunds context.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'initialization-and-tooling-safety'],
});
