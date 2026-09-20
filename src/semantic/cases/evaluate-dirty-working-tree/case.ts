import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'evaluate-dirty-working-tree',
  setup: createSemanticCaseSetup('evaluate-dirty-working-tree'),
  scenario:
    'The developer names no path scope, and the host establishes staged, unstaged, untracked, renamed, and deleted paths relative to HEAD.',
  operation: 'evaluate',
  input: {
    developerDirection:
      'Use moldea to evaluate the current uncommitted project changes. The host-established scope contains staged /src/staged.js, unstaged /src/unstaged.js, untracked /src/untracked.js, renamed /src/renamed-before.js to /src/renamed-after.js, and deleted /src/deleted.js.',
    repositoryEvidence: [
      {
        claim: 'HEAD exists.',
        source: {
          kind: 'git-state',
          fact: 'head-exists',
        },
      },
      {
        claim: 'The working tree is dirty.',
        source: {
          kind: 'git-state',
          fact: 'working-tree-dirty',
        },
      },
      {
        claim: 'Staged changes exist.',
        source: {
          kind: 'git-state',
          fact: 'has-staged-changes',
        },
      },
      {
        claim: 'Unstaged changes exist.',
        source: {
          kind: 'git-state',
          fact: 'has-unstaged-changes',
        },
      },
      {
        claim: 'Untracked paths exist.',
        source: {
          kind: 'git-state',
          fact: 'has-untracked-paths',
        },
      },
      {
        claim: 'Renamed paths exist.',
        source: {
          kind: 'git-state',
          fact: 'has-renamed-paths',
        },
      },
      {
        claim: 'Deleted paths exist.',
        source: {
          kind: 'git-state',
          fact: 'has-deleted-paths',
        },
      },
      {
        claim: 'Canonical context declares that source changes can affect project context.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'Canonical project context describes the semantic role of the source tree.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The staged path contains an isolated source constant change.',
        source: {
          kind: 'workspace-path',
          path: 'src/staged.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The unstaged path contains an isolated source constant change.',
        source: {
          kind: 'workspace-path',
          path: 'src/unstaged.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The untracked path contains an isolated source constant.',
        source: {
          kind: 'workspace-path',
          path: 'src/untracked.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The rename removes the original isolated source path.',
        source: {
          kind: 'workspace-path',
          path: 'src/renamed-before.js',
          expectedType: 'missing',
        },
      },
      {
        claim: 'The rename preserves the isolated source content at its destination.',
        source: {
          kind: 'workspace-path',
          path: 'src/renamed-after.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The deleted isolated source path is absent.',
        source: {
          kind: 'workspace-path',
          path: 'src/deleted.js',
          expectedType: 'missing',
        },
      },
    ],
  },
  expected: [
    {
      label: 'scope-from-all-head-relative-changes',
      criterion:
        'The actor accounts for the complete independently evidenced staged, unstaged, untracked, renamed, and deleted HEAD-relative scope.',
    },
    {
      label: 'expand-semantically',
      criterion:
        'The actor follows the independently evidenced `/src/**` canonical relationship, assesses the relevant project context, and does not invent unrelated semantic expansion.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'repository-write',
      criterion:
        'The workspace evidence contains a repository change during an operation whose contract is read-only.',
    },
    {
      label: 'ignore-untracked-or-deleted-paths',
      criterion:
        'The actor ignores untracked or deleted paths even though it is material to the requested assessment.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
