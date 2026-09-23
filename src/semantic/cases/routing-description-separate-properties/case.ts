import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-separate-properties',
  setup: createSemanticCaseSetup('routing-description-separate-properties'),
  scenario:
    'An adopted custom runtime exposes separate general-only summary metadata and routing-facing handoff metadata for a target that owns both canonical descriptions.',
  operation: 'evaluate-routing-description',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate both runtime description consumers.',
    repositoryEvidence: [
      {
        claim: 'Runtime guidance distinguishes general and routing consumers.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/runtimes/custom.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Implementation maps both properties to their distinct canonical sources.',
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
      label: 'keep-general-metadata-on-agent-description',
      criterion:
        'The proposed or implemented design keeps general metadata on agent description instead of moving that responsibility into an unsupported boundary.',
    },
    {
      label: 'keep-routing-metadata-on-handoff-description',
      criterion:
        'The proposed or implemented design keeps routing metadata on handoff description instead of moving that responsibility into an unsupported boundary.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'force-one-description-into-both-properties',
      criterion:
        'The actor forces one description into both properties across consumers with materially different semantic roles.',
    },
    {
      label: 'classify-by-property-name-alone',
      criterion:
        'The actor classifies either runtime property from its name alone instead of using the established general-purpose and routing-facing consumer semantics.',
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
