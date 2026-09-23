import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-maintain-host-invocation-policy',
  setup: createSemanticCaseSetup('skill-maintain-host-invocation-policy'),
  scenario:
    'A deployment-review Agent Skill has supported OpenAI host metadata with implicit invocation disabled, and the portable activation wording now needs a focused update.',
  operation: 'maintain-agent-skill',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Update the portable description and default prompt for the Agent Skill under skills/deployment-review. Preserve every unrelated supported host field and do not change invocation policy.',
    repositoryEvidence: [
      {
        claim: 'The authoritative deployment skill exists.',
        source: {
          kind: 'workspace-path',
          path: 'skills/deployment-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Supported host metadata disables implicit invocation.',
        source: {
          kind: 'workspace-path',
          path: 'skills/deployment-review/agents/openai.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  skillEvidence: {
    activationScenarios: [
      {
        request: 'Use the deployment review skill to assess production readiness.',
        shouldActivate: true,
      },
      {
        request: 'Deploy this change to production now.',
        shouldActivate: false,
      },
    ],
    artifacts: [
      {
        role: 'authoritative-source',
        root: 'skills/deployment-review',
      },
    ],
  },
  expected: [
    {
      label: 'align-host-metadata-with-portable-skill',
      criterion:
        'The workspace changes align host metadata with portable skill with the established portable contract.',
    },
    {
      label: 'preserve-existing-invocation-policy',
      criterion:
        'The response and workspace changes preserve existing invocation policy throughout the operation.',
    },
    {
      label: 'preserve-unrelated-host-metadata',
      criterion:
        'The response and workspace changes preserve unrelated host metadata throughout the operation.',
    },
    {
      label: 'support-positive-and-adjacent-non-activation',
      criterion:
        'The skill activation description and content support the evaluator-provided positive request while excluding the adjacent request that should not activate it.',
    },
  ],
  forbidden: [
    {
      label: 'enable-implicit-invocation',
      criterion:
        'The workspace changes enable implicit invocation contrary to the established policy.',
    },
    {
      label: 'remove-unrelated-host-metadata',
      criterion:
        'The workspace changes remove unrelated host metadata even though it remains outside the requested change.',
    },
    {
      label: 'make-host-metadata-portable-dependency',
      criterion:
        'The portable skill is changed to require OpenAI-specific host metadata for activation or operation instead of keeping that metadata an optional host integration.',
    },
    {
      label: 'claim-deployment-authority',
      criterion:
        'The actor response claims deployment authority without the evidence or authority required by this scenario.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['agent-and-skill-design'],
});
