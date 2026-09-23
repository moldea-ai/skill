import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unresolved-related-file-changed',
  setup: createSemanticCaseSetup('unresolved-related-file-changed'),
  scenario:
    "A file referenced by an unresolved requirement changes but the requirement's explicit resolution criteria are not all satisfied.",
  operation: 'maintain-relevant-change',
  input: {
    developerDirection:
      'Enable the provider support flag in src/pending-capability.js. Leave integration coverage for a separate change.',
    repositoryEvidence: [
      {
        claim: 'An unresolved requirement names the related implementation path.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The related implementation remains incomplete.',
        source: {
          kind: 'workspace-path',
          path: 'src/pending-capability.js',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'recheck-resolution-criteria',
      criterion:
        'The workspace changes re-evaluate the unresolved requirement against its authoritative resolution criteria by removing only the satisfied provider support condition and retaining the unsatisfied integration coverage condition.',
    },
    {
      label: 'complete-authorized-partial-implementation',
      criterion:
        'The workspace changes enable the provider support flag without adding the integration coverage that the developer explicitly left for a separate change.',
    },
    {
      label: 'preserve-unresolved-requirement',
      criterion:
        'The response and workspace changes preserve unresolved requirement throughout the operation.',
    },
  ],
  forbidden: [
    {
      label: 'automatic-resolution',
      criterion:
        'The actor removes the unresolved requirement or adds integration coverage outside the authorized partial change instead of preserving the remaining criterion.',
    },
    {
      label: 'treat-requirement-as-backlog',
      criterion:
        'The actor reclassifies the unresolved requirement as ordinary backlog instead of preserving and rechecking its explicit resolution criteria.',
    },
  ],
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
