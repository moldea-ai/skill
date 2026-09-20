import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-property-name',
  setup: createSemanticCaseSetup('routing-description-property-name'),
  scenario:
    'An adopted custom-runtime target has a dedicated handoff description and exposes routing-facing metadata through a runtime property literally named description.',
  operation: 'evaluate-routing-description',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate whether the runtime description property uses the correct canonical source.',
    repositoryEvidence: [
      {
        claim: 'Runtime guidance defines the property as routing-facing.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/runtimes/custom.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Closed registration consumes the handoff description.',
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
      label: 'classify-consumer-by-semantic-purpose',
      criterion:
        'The actor determines whether runtime metadata is routing-facing or general-purpose from its actual consumer semantics rather than its property name.',
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
      label: 'use-agent-description-because-property-is-named-description',
      criterion:
        'The actor uses agent description because property is named description despite the evidence or operation contract prohibiting it.',
    },
    {
      label: 'report-aligned-mapping-as-defect',
      criterion:
        'The actor reports the runtime mapping as defective even though the routing-facing property consumes the valid handoff description.',
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
