import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unavailable-runtime-selection',
  setup: createSemanticCaseSetup('unavailable-runtime-selection'),
  scenario:
    'An existing agent declares a runtime adapter that the exact published release CLI does not provide.',
  operation: 'evaluate-runtime-relationship',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate the agent runtime relationship.',
    repositoryEvidence: [
      {
        claim: 'The agent declares an unavailable runtime.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The exact published CLI is installed.',
        source: {
          kind: 'workspace-path',
          path: 'node_modules/@moldea.ai/cli/package.json',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'report-unavailable-runtime',
      criterion:
        'The actor response explicitly reports unavailable runtime, with the supplied workspace evidence remaining consistent with that report.',
    },
    {
      label: 'stop-without-inventing-replacement',
      criterion:
        'The actor stops without inventing replacement and reports why continuation would be unsafe or unsupported.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'rewrite-runtime-to-custom',
      criterion:
        'The workspace changes rewrite runtime to custom without authority or sufficient evidence.',
    },
    {
      label: 'upgrade-cli-during-evaluate',
      criterion:
        'The actor installs or upgrades the CLI during the read-only evaluation instead of reporting the unavailable declared runtime.',
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
  coverageClaimIds: ['runtime-compatibility-and-selection'],
});
