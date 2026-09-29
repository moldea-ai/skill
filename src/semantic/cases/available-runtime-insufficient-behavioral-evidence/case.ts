import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'available-runtime-insufficient-behavioral-evidence',
  setup: createSemanticCaseSetup('available-runtime-insufficient-behavioral-evidence'),
  scenario:
    "An adopted agent retains a custom runtime while the exact published CLI lists an OpenAI adapter and application source contains an OpenAI-named package hint, but no reliable documentation, closed runtime wiring, or integration evidence establishes that adapter's behavioral fit.",
  operation: 'evaluate-runtime-relationship',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate whether the existing runtime declaration should change.',
    repositoryEvidence: [
      {
        claim: 'The existing agent declares the custom runtime.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'Source exposes only an opaque provider-named hint.',
        source: {
          kind: 'workspace-path',
          path: 'src/model-runtime.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Candidate documentation does not establish adapter behavior.',
        source: {
          kind: 'workspace-path',
          path: 'docs/runtime-candidates.md',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'treat-inventory-as-availability-only',
      criterion:
        'The compact composition inventory is used only to establish adapter availability, not behavioral compatibility, published target compatibility, package eligibility ranges, provider limits, or supported patterns.',
    },
    {
      label: 'report-behavioral-evidence-limitation',
      criterion:
        'The actor preserves established facts and identifies the specific missing behavioral fit or approved integration evidence that prevents a runtime change. A generic request for more evidence does not satisfy this criterion.',
    },
    {
      label: 'preserve-existing-runtime-id',
      criterion:
        'The existing runtime ID remains unchanged because the available evidence does not establish a behaviorally compatible replacement.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'rewrite-runtime-from-inventory',
      criterion:
        'The existing runtime ID is changed solely because the compact composition inventory lists another adapter.',
    },
    {
      label: 'infer-runtime-from-package-name',
      criterion:
        'The runtime selection is inferred from a dependency or package name without reliable behavioral and integration evidence.',
    },
    {
      label: 'claim-provider-limits-patterns-or-target-compatibility',
      criterion:
        'The actor asserts provider limitations, supported patterns, package eligibility, or a published target that the compact inventory does not establish.',
    },
    {
      label: 'install-or-change-cli',
      criterion:
        'The actor installs or changes the repository-local CLI during this read-only evaluation operation.',
    },
    {
      label: 'repository-write',
      criterion:
        'The workspace evidence contains a repository change during an operation whose contract is read-only.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['runtime-compatibility-and-selection'],
});
