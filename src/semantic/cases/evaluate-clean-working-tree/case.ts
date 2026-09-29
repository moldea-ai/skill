import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'evaluate-clean-working-tree',
  setup: createSemanticCaseSetup('evaluate-clean-working-tree'),
  scenario: 'Evaluate has no explicit scope, HEAD exists, and the working tree is clean.',
  operation: 'evaluate',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate the current project.',
    repositoryEvidence: [
      {
        claim: 'HEAD exists.',
        source: {
          kind: 'git-state',
          fact: 'head-exists',
        },
      },
      {
        claim: 'The working tree is clean.',
        source: {
          kind: 'git-state',
          fact: 'working-tree-clean',
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
      {
        claim:
          'The project context declares that source files implement represented canonical behavior.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The related implementation exports an active project state.',
        source: {
          kind: 'workspace-path',
          path: 'src/project-state.js',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'progressive-whole-system-assessment',
      criterion:
        'The actor assesses the adopted project and its related `src/project-state.js` implementation. It need not narrate the exact relationship pattern, reads, or commands when the substantive assessment and runner-owned scope result establish the expansion.',
    },
    {
      label: 'report-project-state-ambiguity',
      criterion:
        'The actor response preserves the established fact that the implementation exports `active`, while separately reporting that the available evidence does not establish whether `active` is intended durable canonical project truth. It treats that precise gap as a material ambiguity or evidence limitation rather than inventing context or declaring complete semantic alignment.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'unjustified-exhaustive-repository-read',
      criterion:
        'The actor reports or demonstrates exhaustive repository traversal without first using high-information evidence or establishing why broader inspection is material.',
    },
    {
      label: 'empty-scope-result',
      criterion:
        'The actor reports an empty or unavailable evaluation scope instead of performing a progressive assessment of the adopted clean repository.',
    },
    {
      label: 'substitute-installed-operating-skill-scope',
      criterion:
        'The actor response treats the installed `.agents/skills/moldea` operating artifact as the project evaluation target solely because it is present, instead of assessing the independently evidenced project-owned moldea system.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
