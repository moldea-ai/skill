import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-provider-registration-boundary',
  setup: createSemanticCaseSetup('skill-provider-registration-boundary'),
  scenario:
    'A runtime agent can use a provider-hosted knowledge-search skill, but the repository has no qualifying local Agent Skill implementation or runtime registration artifact that repository format version 1 can bind.',
  operation: 'maintain-agent-skill-capability',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Teach the refund agent when to use provider knowledge search without fabricating a local skill implementation.',
    repositoryEvidence: [
      {
        claim: 'Provider configuration enables hosted knowledge search.',
        source: {
          kind: 'workspace-path',
          path: 'runtime/provider.json',
          expectedType: 'file',
        },
      },
      {
        claim: 'The agent has no repository-local skill registration.',
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
      label: 'describe-supported-runtime-skill-without-manifest-entry',
      criterion:
        'The refund agent instruction or runtime guidance describes when to use provider-hosted knowledge search while leaving the version 1 manifest without a fabricated local skill relationship.',
    },
    {
      label: 'keep-agent-use-conditions-concise',
      criterion:
        'The proposed or implemented design keeps agent use conditions concise instead of moving that responsibility into an unsupported boundary.',
    },
    {
      label: 'preserve-runtime-registration-boundary',
      criterion:
        'The response and workspace changes preserve runtime registration boundary throughout the operation.',
    },
  ],
  forbidden: [
    {
      label: 'create-placeholder-skill-directory',
      criterion:
        'The workspace changes create placeholder skill directory even though this scenario does not authorize or support it.',
    },
    {
      label: 'fabricate-manifest-skill-entry',
      criterion:
        'The manifest registers a skill capability without a qualifying repository-local implementation artifact and supported binding.',
    },
    {
      label: 'copy-provider-skill-into-agent-instruction',
      criterion:
        'The workspace changes copy provider skill into agent instruction into a surface that does not own it.',
    },
    {
      label: 'invent-local-registration',
      criterion:
        'The response or workspace changes invent local registration without reliable supporting evidence.',
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
