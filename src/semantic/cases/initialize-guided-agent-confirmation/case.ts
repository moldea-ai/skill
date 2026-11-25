import { createInitializationOnboardingSetup } from '../../workspace/initialization-onboarding/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createInitializationOnboardingSetup('confirmation'),
  id: 'initialize-guided-agent-confirmation',
  scenario: 'Discovered model responsibilities are one item in the first round.',
  operation: 'initialize',
  input: {
    developerDirection: 'Initialize moldea.',
    repositoryEvidence: [
      {
        claim: 'The repository names its purpose and existing model responsibilities.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Support Triage has material instruction-consuming calls.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Invoice Review is a cohesive inline model workflow.',
        source: {
          kind: 'workspace-path',
          path: 'src/invoice-workflow.js',
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
      label: 'agent-item',
      criterion:
        'Round 1 contains one numbered registration item covering Support Triage and Invoice Review, within the five-question limit. Both registrations remain pending.',
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
