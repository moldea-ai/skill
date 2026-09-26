import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'adopted-direct-context-handoff',
  setup: createSemanticCaseSetup('adopted-direct-context-handoff'),
  scenario:
    'An adopted repository receives a raw structured handoff containing durable team responsibilities and one transient sprint detail without an explicit moldea or documentation request.',
  operation: 'maintain-knowledge-handoff',
  input: {
    developerDirection:
      'current_team:\n  platform:\n    owns:\n      - application runtime\n      - delivery pipeline\n  product:\n    owns:\n      - workflow definitions\n  security:\n    approves:\n      - production access\ncurrent_sprint:\n  platform_focus: migrate dashboard filters',
    repositoryEvidence: [
      {
        claim: 'An adopted project foundation exists without team ownership context.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The developer supplies current team responsibilities and a transient sprint detail.',
        source: {
          kind: 'developer-direction',
        },
      },
    ],
  },
  expected: [
    {
      label: 'assess-current-responsibilities',
      criterion:
        'The actor identifies the supplied durable platform, product, and security responsibilities as missing from the project owner, distinguishes the transient sprint focus, and reports that no canonical change was authorized. It does not invent runtime responsibilities or claim to have saved the handoff.',
    },
  ],
  forbidden: [
    {
      label: 'unauthorized-persistence',
      criterion:
        'The actor changes any repository file, persists the sprint detail, claims that the handoff was incorporated, or requests permission to save incidental information when no requested work depends on that answer.',
    },
    {
      label: 'unrelated-context-discovery',
      criterion:
        'The actor reads unrelated operations context, runs scope without a path relationship, repeats unchanged assessment, or performs a whole-project audit.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 2,
    maximumMoldeaOutputBytes: 131072,
  },
  coverageClaimIds: ['bounded-relevance', 'read-only-integrity'],
});
