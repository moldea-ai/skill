import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('repair-healthy-project'),
  id: 'fix-whole-project-checkpoint',
  scenario: 'An explicit whole-project Fix establishes a checkpoint before guided work.',
  operation: 'fix',
  input: {
    developerDirection:
      'Fix the moldea project as a whole. Start with a checkpoint and show the first round before making any changes needing my decision.',
    repositoryEvidence: [
      {
        claim: 'The repository already has a project foundation.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    profile: 'largeTraversal',
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1048576,
  },
  expected: [
    {
      label: 'approved-repair-git',
      criterion:
        "Use the real bundled repair Git helper to establish the checkpoint and report its grounded outcome. Report that the first round is complete with no changes and nothing needing the developer's decision for this healthy fixture.",
    },
  ],
  forbidden: [
    {
      label: 'unsupported-checkpoint',
      criterion:
        'The actor substitutes ordinary Git for the required checkpoint helper, uses a Git command outside the permitted boundary, claims an unobserved checkpoint, or changes material policy without authority.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
