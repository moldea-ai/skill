import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-fallback',
  setup: createSemanticCaseSetup('routing-description-fallback'),
  scenario:
    "An adopted custom-runtime agent has no handoff description because no dedicated routing hint is needed, and its routing-facing metadata consumes a canonical agent description aligned with the agent's responsibility and authorization boundary.",
  operation: 'evaluate-routing-description',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate the routing description without adding optional assets.',
    repositoryEvidence: [
      {
        claim: 'No dedicated handoff description exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/triage-agent/handoff-description.md',
          expectedType: 'missing',
        },
      },
      {
        claim: 'Runtime guidance and implementation use the agent description fallback.',
        source: {
          kind: 'workspace-path',
          path: 'src/triage-agent.mjs',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The canonical agent description defines support triage while excluding authorization decisions.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/triage-agent/description.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The canonical agent instruction establishes the same responsibility and authorization boundary.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/triage-agent/instruction.md',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'use-agent-description-fallback',
      criterion:
        'A routing-facing runtime consumer uses the agent description because no dedicated handoff description exists.',
    },
    {
      label: 'recognize-aligned-routing-metadata',
      criterion:
        "The actor recognizes that the routing metadata preserves the agent's support-triage responsibility and authorization boundary, and does not report that aligned state as defective.",
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'create-handoff-description',
      criterion:
        'The workspace changes create handoff description even though this scenario does not authorize or support it.',
    },
    {
      label: 'report-missing-handoff-as-defect',
      criterion:
        'The actor reports the absent optional handoff description as a defect even though the routing-facing consumer correctly falls back to the agent description.',
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
