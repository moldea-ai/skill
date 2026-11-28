import { defineSemanticCase } from '../define.ts';
import { semanticCase as healthyProject } from '../repair-healthy-project/case.ts';

export const semanticCase = defineSemanticCase({
  setup: healthyProject.setup,
  verifyWorkspace: healthyProject.verifyWorkspace,
  id: 'fix-whole-project-checkpoint',
  scenario: 'An explicit whole-project Fix establishes a checkpoint before guided work.',
  operation: 'fix',
  input: {
    developerDirection: 'fix moldea',
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
        'The installed repair Git helper establishes the checkpoint. The foundation, packing and returns owners are cohesive. Each keeps 1 of 1 declarations for its stated behavior, with zero removed and unchecked. Nothing changes or needs a decision in the healthy fixture.',
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
