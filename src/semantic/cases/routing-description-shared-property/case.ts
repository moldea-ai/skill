import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-shared-property',
  setup: createSemanticCaseSetup('routing-description-shared-property'),
  scenario:
    'An adopted custom runtime uses one metadata property for both general display and routing selection, and the target owns a dedicated canonical handoff description.',
  operation: 'evaluate-routing-description',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate the shared runtime metadata mapping.',
    repositoryEvidence: [
      {
        claim: 'Runtime guidance defines one shared routing-facing property.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/runtimes/custom.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Implementation consumes the handoff description.',
        source: {
          kind: 'workspace-path',
          path: 'src/triage-agent.mjs',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'classify-shared-property-as-routing-facing',
      criterion:
        'A runtime property serving both display and routing purposes is treated as routing-facing and receives the effective routing description.',
    },
    {
      label: 'use-effective-handoff-description',
      criterion:
        'A routing-facing runtime consumer receives the valid handoff description when one exists.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'prefer-general-description-for-shared-property',
      criterion:
        'The actor prefers general description for shared property despite the established semantic consumer contract.',
    },
    {
      label: 'duplicate-runtime-property',
      criterion:
        'The workspace changes duplicate runtime property instead of reusing its authoritative existing owner.',
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
  coverageClaimIds: ['routing-description-ownership'],
});
