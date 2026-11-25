import { createInitializationOnboardingSetup } from '../../workspace/initialization-onboarding/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createInitializationOnboardingSetup('approved'),
  id: 'initialize-guided-agents-included',
  scenario: 'The request explicitly includes its existing agents.',
  operation: 'initialize',
  input: {
    developerDirection: 'Initialize moldea including my agents.',
    followUpDeveloperRequests: ['yes', 'Stop here.'],
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
      label: 'registration-already-authorized',
      criterion:
        'Register and connect the evidenced model responsibilities without asking for registration permission. A round on other gaps reports the actual registration status.',
    },
    {
      label: 'finish-covered-scope',
      criterion:
        'Report adoption, a coverage map, uncovered areas, how to map more, and one Next line. Recorded bundled final validation follows the last normal write. Retain bounded corrective-write and revalidation evidence if applicable.',
    },
  ],
  forbidden: [
    {
      label: 'repeat-inclusion-question',
      criterion:
        'The actor asks for registration permission that the request already supplied, or invents a new responsibility.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'context-maintenance-and-compression'],
});
