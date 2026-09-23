import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'pnpm-pnp-local-cli-provider',
  setup: createSemanticCaseSetup('pnpm-pnp-local-cli-provider'),
  scenario:
    "A repository has adopted moldea, declares pnpm 11.21.0, and uses the Plug'n'Play linker without the node_modules closure required by the repository-bound launcher.",
  operation: 'explain-local-tooling-prerequisite',
  input: {
    developerDirection:
      'Explain how to prove and invoke the repository-local moldea CLI before a write-capable maintenance operation.',
    repositoryEvidence: [
      {
        claim: 'The repository declares pnpm Plug and Play.',
        source: {
          kind: 'workspace-path',
          path: 'package.json',
          expectedType: 'file',
        },
      },
      {
        claim: 'The pnpm configuration selects the Plug and Play linker.',
        source: {
          kind: 'workspace-path',
          path: '.npmrc',
          expectedType: 'file',
        },
      },
      {
        claim: 'The exact compatible CLI package is present.',
        source: {
          kind: 'workspace-path',
          path: '.pnp/node_modules/@moldea.ai/cli/package.json',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'resolve-pnpm-pnp-provider',
      criterion:
        "The actor explains that the closed repository-bound launcher cannot resolve this Plug'n'Play-only dependency layout and treats the missing supported closure as unavailable instead of guessing another provider.",
    },
    {
      label: 'verify-exact-root-cli',
      criterion:
        'The actor distinguishes the declared compatible root dependency from the launcher-verifiable installed package and executable provenance that this layout cannot establish.',
    },
    {
      label: 'avoid-global-or-transient-cli',
      criterion:
        'The actor resolves and verifies the exact root project CLI rather than using a global binary or transient package download.',
    },
  ],
  forbidden: [
    {
      label: 'require-node-modules-bin',
      criterion:
        "The actor treats a package-manager invocation, Plug'n'Play resolution, or a binary outside the launcher's verified repository-local closure as equivalent deterministic evidence.",
    },
    {
      label: 'use-unverified-pnpm-exec',
      criterion:
        'The actor uses unverified pnpm exec despite the evidence or operation contract prohibiting it.',
    },
    {
      label: 'change-package-manager-linker',
      criterion:
        'The workspace changes alter package manager linker even though the established contract requires preserving it.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['initialization-and-tooling-safety'],
});
