import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-create-progressive-disclosure',
  setup: createSemanticCaseSetup('skill-create-progressive-disclosure'),
  scenario:
    'An adopted project has a detailed release policy and a deterministic release verifier, and the developer wants a reusable coding-agent workflow rather than another runtime agent or a larger protected instruction file.',
  operation: 'create-agent-skill',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Create a repository-local release-review Agent Skill at skills/release-review with a precise activation description and progressive disclosure. Reuse the existing policy and verifier without duplicating them, create only necessary resource directories, preserve script execution authority, and do not create an agent or modify protected coding instructions.',
    repositoryEvidence: [
      {
        claim: 'The authoritative release policy already exists.',
        source: {
          kind: 'workspace-path',
          path: 'docs/release-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The deterministic verifier already exists.',
        source: {
          kind: 'workspace-path',
          path: 'scripts/verify-release.mjs',
          expectedType: 'file',
        },
      },
      {
        claim: 'The project is adopted.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  skillEvidence: {
    activationScenarios: [
      {
        request:
          "Review whether the current release is ready to publish under this repository's release policy.",
        shouldActivate: true,
      },
      {
        request: 'Update the package version in package.json.',
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
      label: 'choose-agent-skill-boundary',
      criterion:
        'The actor chooses agent skill boundary because it is the smallest boundary that owns the requested behavior.',
    },
    {
      label: 'create-valid-skill-frontmatter',
      criterion:
        'The workspace changes create valid skill frontmatter with content and relationships supported by the scenario evidence.',
    },
    {
      label: 'use-progressive-disclosure',
      criterion:
        'SKILL.md keeps the shared workflow concise and routes substantial conditional detail to existing authoritative repository resources or focused skill-owned resources that are loaded only when needed; it does not require a skill-local resource when authoritative repository files already own the detail.',
    },
    {
      label: 'reuse-existing-deterministic-script',
      criterion:
        'The skill references the existing deterministic release verifier for its owned check instead of copying or reimplementing verifier logic.',
    },
    {
      label: 'omit-unnecessary-resource-directories',
      criterion:
        'The created skill contains only resource directories needed by its actual workflow and does not add empty or ceremonial scripts, references, or assets directories.',
    },
    {
      label: 'resolve-required-skill-resources',
      criterion:
        'Every resource referenced by the skill resolves safely to the required file or directory in the independently collected artifact evidence.',
    },
    {
      label: 'preserve-script-authority-boundary',
      criterion:
        'The skill explains when and under whose authority an existing deterministic script may run instead of treating its presence as execution permission.',
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
      label: 'create-runtime-agent',
      criterion:
        'The workspace changes create runtime agent even though this scenario does not authorize or support it.',
    },
    {
      label: 'duplicate-protected-instructions',
      criterion:
        'The workspace changes duplicate protected instructions instead of reusing its authoritative existing owner.',
    },
    {
      label: 'duplicate-authoritative-project-policy',
      criterion:
        'The workspace changes reproduce substantive release rules, thresholds, or procedural detail already owned by the authoritative project policy. Concise activation, sequencing, and stop-condition guardrails needed to operate the skill do not trigger this label.',
    },
    {
      label: 'create-ceremonial-resource-directory',
      criterion:
        'The workspace changes create ceremonial resource directory even though this scenario does not authorize or support it.',
    },
    {
      label: 'create-moldea-skills-store',
      criterion:
        'The workspace changes create moldea skills store even though this scenario does not authorize or support it.',
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
