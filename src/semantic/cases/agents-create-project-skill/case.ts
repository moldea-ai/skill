import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('skill-create-progressive-disclosure'),
  id: 'agents-create-project-skill',
  scenario: 'A project-owned skill should reuse the existing release policy and verifier.',
  operation: 'agents',
  input: {
    developerDirection:
      'Use moldea Agents to create the repository-owned release-review Agent Skill. Link the existing release policy and verifier without duplicating them.',
    repositoryEvidence: [
      {
        claim: 'The governing release policy is in its existing owner.',
        source: {
          kind: 'workspace-path',
          path: 'docs/release-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'An existing deterministic verifier checks releases.',
        source: {
          kind: 'workspace-path',
          path: 'scripts/verify-release.mjs',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'ground-project-skill',
      criterion:
        'Create repository-grounded activation and guidance which route to the actual inspected policy and verifier, keeping their canonical ownership.',
    },
  ],
  forbidden: [
    {
      label: 'duplicate-or-unrelated-skill',
      criterion:
        'The actor creates generic or duplicate policy, changes protected instructions or invents an application agent.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design'],
});
