import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'dedicated-repository-single-side-change',
  setup: createSemanticCaseSetup('dedicated-repository-single-side-change'),
  scenario:
    'Canonical state is in a dedicated repository and only that repository is authorized for the current change.',
  operation: 'reconcile',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Update only this canonical context repository. Treat the related application at /related-application as read-only evidence.',
    repositoryEvidence: [
      {
        claim: 'Canonical state is maintained in this repository.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The related application is available read-only.',
        source: {
          kind: 'related-path',
          mount: '/related-application',
          path: 'src/refund-agent.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'The developer authorizes only the canonical repository.',
        source: {
          kind: 'developer-direction',
        },
      },
    ],
  },
  expected: [
    {
      label: 'preserve-separate-authority-boundaries',
      criterion:
        'The response and workspace changes preserve separate authority boundaries throughout the operation.',
    },
    {
      label: 'report-each-repository-state',
      criterion:
        'The actor response explicitly reports each repository state, with the supplied workspace evidence remaining consistent with that report.',
    },
  ],
  forbidden: [
    {
      label: 'claim-cross-repository-completion',
      criterion:
        'The actor response claims cross repository completion without the evidence or authority required by this scenario.',
    },
    {
      label: 'create-cross-repository-binding',
      criterion:
        'The canonical manifest gains a path, binding, mirror, or other relationship that crosses into a separate repository.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
