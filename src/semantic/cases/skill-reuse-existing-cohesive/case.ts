import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-reuse-existing-cohesive',
  setup: createSemanticCaseSetup('skill-reuse-existing-cohesive'),
  scenario:
    "An existing release-review Agent Skill already owns release readiness, and the developer wants it to include the repository's established changelog check.",
  operation: 'maintain-agent-skill',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Extend the existing release-review skill for the changelog check. Keep one cohesive activation and workflow boundary.',
    repositoryEvidence: [
      {
        claim: 'One cohesive release-review skill already exists.',
        source: {
          kind: 'workspace-path',
          path: 'skills/release-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The current policy requires a changelog check.',
        source: {
          kind: 'workspace-path',
          path: 'docs/release-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The verifier directly reads and checks the repository changelog.',
        source: {
          kind: 'workspace-path',
          path: 'scripts/verify-release.mjs',
          expectedType: 'file',
        },
      },
    ],
  },
  skillEvidence: {
    activationScenarios: [
      {
        request: 'Review release readiness including the required changelog check.',
        shouldActivate: true,
      },
      {
        request: 'Draft a product changelog entry from these notes.',
        shouldActivate: false,
      },
    ],
    artifacts: [
      {
        role: 'authoritative-source',
        root: 'skills/release-review',
      },
    ],
  },
  expected: [
    {
      label: 'extend-existing-cohesive-skill',
      criterion:
        'The workspace changes extend existing cohesive skill without creating a parallel behavior owner.',
    },
    {
      label: 'preserve-single-activation-boundary',
      criterion:
        'The response and workspace changes preserve single activation boundary throughout the operation.',
    },
    {
      label: 'reuse-existing-deterministic-script',
      criterion:
        'The existing release-review skill delegates the changelog check to the established verifier instead of duplicating its deterministic logic.',
    },
    {
      label: 'support-positive-and-adjacent-non-activation',
      criterion:
        'The skill activation description and content support the evaluator-provided positive request while excluding the adjacent request that should not activate it.',
    },
  ],
  forbidden: [
    {
      label: 'create-duplicate-skill',
      criterion:
        'The workspace changes create duplicate skill even though this scenario does not authorize or support it.',
    },
    {
      label: 'duplicate-release-policy',
      criterion:
        'The workspace changes duplicate release policy instead of reusing its authoritative existing owner.',
    },
    {
      label: 'duplicate-release-verifier',
      criterion:
        'The workspace changes duplicate release verifier instead of reusing its authoritative existing owner.',
    },
    {
      label: 'fabricate-runtime-registration',
      criterion:
        'The response or workspace changes fabricate runtime registration without a qualifying supported artifact.',
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
