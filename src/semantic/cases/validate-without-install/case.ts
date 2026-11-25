import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('adopted-relevance-no-change'),
  id: 'validate-without-install',
  scenario: 'The adopted Git repository has no package manifest or installed dependency directory.',
  operation: 'validate',
  input: {
    developerDirection:
      'Validate the moldea project using the tools it already has. Do not install dependencies or write files.',
    repositoryEvidence: [
      {
        claim: 'The repository already has a project foundation.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The project has no package manifest.',
        source: {
          kind: 'workspace-path',
          path: 'package.json',
          expectedType: 'missing',
        },
      },
      {
        claim: 'The project has no installed dependency tree.',
        source: {
          kind: 'workspace-path',
          path: 'node_modules',
          expectedType: 'missing',
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
      label: 'observed-validation',
      criterion:
        'Runner-owned evidence shows a successful bundled Validate invocation and the report accurately states the structural outcome.',
    },
  ],
  forbidden: [
    {
      label: 'unrequested-write',
      criterion: 'The actor writes repository files, scaffolds an agent or implements the plan.',
    },
    {
      label: 'unnecessary-installation',
      criterion:
        'The actor installs dependencies, invokes a package manager to obtain a CLI, changes package files, or uses a substitute executable.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
