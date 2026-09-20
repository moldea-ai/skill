import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-boundary-surface-selection',
  setup: createSemanticCaseSetup('skill-boundary-surface-selection'),
  scenario:
    'A developer proposes Agent Skills for a repository-wide naming rule already owned by protected coding instructions and for checksum generation already owned by deterministic software.',
  operation: 'evaluate-agent-skill-boundaries',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate whether either proposed Agent Skill under skills/javascript-naming and skills/checksum-generation is the correct behavior boundary. Explain the appropriate surfaces without changing files.',
    repositoryEvidence: [
      {
        claim: 'Applicable protected coding instructions own the naming rule.',
        source: {
          kind: 'host-instructions',
        },
      },
      {
        claim: 'Deterministic checksum generation already exists.',
        source: {
          kind: 'workspace-path',
          path: 'scripts/create-checksum.mjs',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'choose-protected-instruction-boundary',
      criterion:
        'The actor chooses protected instruction boundary because it is the smallest boundary that owns the requested behavior.',
    },
    {
      label: 'preserve-deterministic-software-boundary',
      criterion:
        'The response and workspace changes preserve deterministic software boundary throughout the operation.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'create-agent-skill',
      criterion:
        'The workspace changes create agent skill even though this scenario does not authorize or support it.',
    },
    {
      label: 'edit-protected-instructions',
      criterion:
        'The actor changes protected coding instructions even though the request is evaluation-only and those instructions already own the naming rule.',
    },
    {
      label: 'duplicate-deterministic-behavior',
      criterion:
        'The workspace changes duplicate deterministic behavior instead of reusing its authoritative existing owner.',
    },
    {
      label: 'repository-write',
      criterion:
        'The workspace evidence contains a repository change during an operation whose contract is read-only.',
    },
  ],
  hostInstructions:
    '# Evaluation coding instructions\n\nRepository-wide JavaScript naming uses camelCase. Protected coding instructions own this rule and must not be modified during evaluation.\n',
  skillEvidence: {
    activationScenarios: [],
    artifacts: [
      {
        role: 'authoritative-source',
        root: 'skills/javascript-naming',
      },
      {
        role: 'authoritative-source',
        root: 'skills/checksum-generation',
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['agent-and-skill-design'],
});
