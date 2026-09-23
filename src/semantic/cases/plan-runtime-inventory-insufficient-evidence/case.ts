import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'plan-runtime-inventory-insufficient-evidence',
  setup: createSemanticCaseSetup('plan-runtime-inventory-insufficient-evidence'),
  scenario:
    "An adopted project needs an agent-system plan and the exact published CLI lists possible runtime adapters, but the repository contains only an opaque application-owned model client and no reliable evidence for one adapter's behavioral fit.",
  operation: 'plan-agent-system',
  input: {
    developerDirection:
      'Plan the smallest agent system and identify the runtime only if current evidence supports that decision.',
    repositoryEvidence: [
      {
        claim: 'The README routes runtime planning to the exact repository evidence.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The package manifest declares only the repository-local moldea CLI as development tooling and no runtime adapter dependency.',
        source: {
          kind: 'workspace-path',
          path: 'package.json',
          expectedType: 'file',
        },
      },
      {
        claim: 'Source invokes an opaque injected model client.',
        source: {
          kind: 'workspace-path',
          path: 'src/model-runtime.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Provider-named documentation is explicitly only a candidate.',
        source: {
          kind: 'workspace-path',
          path: 'docs/runtime-candidates.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The project is adopted and its manifest declares no agents or runtimes.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'Canonical project context describes only the bounded synthetic evaluation project.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The adopted baseline source exposes deterministic project state and no agent behavior.',
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
      label: 'treat-inventory-as-availability-only',
      criterion:
        'The compact composition inventory is used only to establish adapter availability, not behavioral compatibility, published target compatibility, package eligibility ranges, provider limits, or supported patterns.',
    },
    {
      label: 'leave-runtime-selection-evidence-gated',
      criterion:
        'The plan leaves the runtime undecided and names the behavioral or integration evidence needed before selecting an available adapter.',
    },
    {
      label: 'avoid-unsupported-target-claims',
      criterion:
        'The response and workspace changes avoid unsupported target claims while still completing the requested outcome.',
    },
    {
      label: 'produce-actionable-plan-with-runtime-prerequisite',
      criterion:
        'The plan defines the smallest supported agent-system architecture and makes reliable runtime evidence an explicit prerequisite for implementation.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'select-runtime-from-inventory-alone',
      criterion:
        'The actor chooses a runtime solely because the compact composition inventory lists it as available.',
    },
    {
      label: 'default-runtime-to-custom',
      criterion:
        'The actor defaults runtime to custom without reliable evidence that it is the correct resulting state.',
    },
    {
      label: 'infer-runtime-from-package-name',
      criterion:
        'The runtime selection is inferred from a dependency or package name without reliable behavioral and integration evidence.',
    },
    {
      label: 'invent-provider-limits-patterns-or-target-compatibility',
      criterion:
        'The plan invents provider limitations, supported patterns, package eligibility, or a published target that no reliable evidence establishes.',
    },
    {
      label: 'install-or-change-cli',
      criterion:
        'The actor installs or changes the repository-local CLI during this read-only planning operation.',
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
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['agent-system-planning'],
});
