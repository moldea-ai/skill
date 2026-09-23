import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-maintain-linked-resources',
  setup: createSemanticCaseSetup('skill-maintain-linked-resources'),
  scenario:
    'A repository-local release-review skill still describes an npm-only workflow while the authoritative release policy and supported verifier now cover npm and pnpm.',
  operation: 'maintain-agent-skill',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Update the release-review skill so its activation, workflow, and focused package-manager reference stay aligned with the current release policy.',
    repositoryEvidence: [
      {
        claim: 'The existing skill links its package-manager reference.',
        source: {
          kind: 'workspace-path',
          path: 'skills/release-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The linked reference is npm-only.',
        source: {
          kind: 'workspace-path',
          path: 'skills/release-review/references/package-managers.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The current policy covers npm and pnpm.',
        source: {
          kind: 'workspace-path',
          path: 'docs/release-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The verifier supports npm and pnpm.',
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
        request: 'Review an npm or pnpm release against the repository release policy.',
        shouldActivate: true,
      },
      {
        request: 'Explain how pnpm workspaces resolve dependencies.',
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
      label: 'synchronize-affected-skill-resources',
      criterion:
        'The workspace changes synchronize affected skill resources in the same coherent operation.',
    },
    {
      label: 'preserve-authoritative-project-source',
      criterion:
        'The response and workspace changes preserve authoritative project source throughout the operation.',
    },
    {
      label: 'produce-structurally-valid-updated-skill',
      criterion:
        'The updated release-review skill remains structurally valid after its activation, workflow, and focused package-manager reference are synchronized.',
    },
    {
      label: 'resolve-required-skill-resources',
      criterion:
        'Every resource referenced by the skill resolves safely to the required file or directory in the independently collected artifact evidence.',
    },
    {
      label: 'support-positive-and-adjacent-non-activation',
      criterion:
        'The skill activation description and content support the evaluator-provided positive request while excluding the adjacent request that should not activate it.',
    },
    {
      label: 'pass-independent-skill-structural-validation',
      criterion:
        'The independently collected skill-artifact evidence reports a valid structure with no validation errors; an actor claim by itself is insufficient.',
    },
  ],
  forbidden: [
    {
      label: 'rewrite-unrelated-project-state',
      criterion:
        'The workspace changes rewrite unrelated project state without authority or sufficient evidence.',
    },
    {
      label: 'duplicate-release-policy',
      criterion:
        'The workspace changes duplicate release policy instead of reusing its authoritative existing owner.',
    },
    {
      label: 'create-moldea-skills-store',
      criterion:
        'The workspace changes create moldea skills store even though this scenario does not authorize or support it.',
    },
    {
      label: 'leave-stale-linked-reference',
      criterion:
        'The workspace changes leave stale linked reference after the operation should have reconciled it.',
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
