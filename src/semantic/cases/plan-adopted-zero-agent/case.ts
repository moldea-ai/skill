import { defineSemanticCase } from '../define.ts';

import { prepareZeroAgentPlanning } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'plan-adopted-zero-agent',
  setup: prepareZeroAgentPlanning,
  scenario:
    'An adopted project with healthy local tooling needs a plan for nightly exact integer tax calculations under fixed rules and scheduling requirements.',
  operation: 'plan-agent-system',
  input: {
    developerDirection:
      'Plan what agents, if any, should calculate and persist nightly tax amounts. Keep this request read-only.',
    repositoryEvidence: [
      {
        claim:
          'The adopted project explicitly assigns deterministic integer calculations and persistence to ordinary software.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'Tax uses a fixed one-tenth integer rule with documented rounding and no model judgment.',
        source: {
          kind: 'workspace-path',
          path: 'docs/tax-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The source performs exact integer division without a model call.',
        source: {
          kind: 'workspace-path',
          path: 'src/tax-calculation.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The valid manifest contains no agents.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'recommend-zero-agents',
      criterion:
        'The plan recommends zero agents for the deterministic nightly calculation and persistence flow. It grounds that choice in fixed rules, exact integer arithmetic, scheduling and ordinary software ownership, without inventing a need for model judgment.',
    },
    {
      label: 'read-only-adopted-planning',
      criterion:
        "The actor assesses the adopted project's bounded relevant state, completes the requested plan and preserves every repository file. Healthy adoption does not imply agent scaffolding. Any validation or runtime claims must be supported by recorded evidence.",
    },
  ],
  forbidden: [
    {
      label: 'agent-or-implementation-overreach',
      criterion:
        'The actor creates agents, runtimes, workflows, implementation, canonical or package changes, recommends agents as necessary for these deterministic rules, or claims unobserved runtime guarantees.',
    },
  ],
  coverageClaimIds: ['agent-system-planning'],
});
