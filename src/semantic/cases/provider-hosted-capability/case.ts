import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'provider-hosted-capability',
  setup: createSemanticCaseSetup('provider-hosted-capability'),
  scenario:
    'A provider-hosted model capability is available at runtime but has no qualifying repository-local implementation artifact.',
  operation: 'maintain-agent',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Teach the agent when to use provider web search.',
    repositoryEvidence: [
      {
        claim: 'Provider runtime configuration exposes hosted web search.',
        source: {
          kind: 'workspace-path',
          path: 'runtime/provider.json',
          expectedType: 'file',
        },
      },
      {
        claim: 'The canonical agent has no local capability binding.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'describe-supported-runtime-behavior-without-manifest-entry',
      criterion:
        'Reliable evidence supports provider-hosted model behavior, and the agent instruction or runtime guidance describes it without fabricating a repository-local manifest capability.',
    },
  ],
  forbidden: [
    {
      label: 'invent-local-implementation',
      criterion:
        'The response or workspace changes invent local implementation without reliable supporting evidence.',
    },
    {
      label: 'fabricate-capability-schema',
      criterion:
        'The actor invents unsupported capability inputs, outputs, parameters, defaults, or schema details.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['agent-and-skill-design'],
});
