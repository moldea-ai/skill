import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'dedicated-repository-runtime-selection',
  setup: createSemanticCaseSetup('dedicated-repository-runtime-selection'),
  scenario:
    'Canonical moldea state is in a dedicated repository while a developer-identified related application repository directly uses a verified available OpenAI provider target as its primary runtime boundary.',
  operation: 'maintain-agent-runtime',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Align the canonical agent runtime using the read-only related application at /related-application as evidence.',
    repositoryEvidence: [
      {
        claim: 'Canonical state declares the current custom runtime.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The related application directly uses the OpenAI provider SDK.',
        source: {
          kind: 'related-path',
          mount: '/related-application',
          path: 'src/refund-agent.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'The related manifest declares the provider package.',
        source: {
          kind: 'related-path',
          mount: '/related-application',
          path: 'package.json',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'select-official-runtime-from-external-evidence',
      criterion:
        'Reliable read-only related-application evidence establishes the provider SDK as the primary runtime boundary and supports selecting the matching available official runtime.',
    },
    {
      label: 'update-canonical-runtime-id',
      criterion:
        'The canonical agent runtime ID is changed from the stale custom value to the official runtime established by reliable external evidence.',
    },
    {
      label: 'preserve-separate-repository-boundaries',
      criterion:
        'The canonical repository is the only writable scope, the related application remains read-only evidence, and no cross-repository manifest relationship is created.',
    },
    {
      label: 'treat-missing-local-evidence-as-limitation',
      criterion:
        'The actor keeps canonical inspection results separate from related-application evidence and does not claim that canonical inspection observes the external implementation.',
    },
    {
      label: 'represent-application-capabilities-semantically',
      criterion:
        'Reliable related-application evidence establishes provider-hosted web search, and the canonical instruction or runtime guidance preserves that model-visible behavior without fabricating a cross-repository manifest capability.',
    },
  ],
  forbidden: [
    {
      label: 'select-custom-because-implementation-is-external',
      criterion:
        'The actor selects custom solely because the implementation lives in a separate repository, despite reliable evidence for an available official provider boundary.',
    },
    {
      label: 'leave-stale-custom-runtime',
      criterion:
        'The workspace changes leave stale custom runtime after the operation should have reconciled it.',
    },
    {
      label: 'create-cross-repository-binding',
      criterion:
        'The canonical manifest gains a path, binding, mirror, or other relationship that crosses into a separate repository.',
    },
    {
      label: 'create-unresolved-requirement-for-established-external-behavior',
      criterion:
        'An unresolved requirement is created solely because established external behavior cannot be represented as a version 1 cross-repository manifest binding.',
    },
    {
      label: 'modify-related-read-only-repository',
      criterion:
        'The related application repository is changed even though it is supplied only as read-only evidence.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 5,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['runtime-compatibility-and-selection'],
});
