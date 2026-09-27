import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'eve-warning-read-only-evaluation',
  setup: createSemanticCaseSetup('eve-warning-read-only-evaluation'),
  scenario:
    'A read-only project evaluation encounters one Eve version-dependent output-schema warning and no confirmed validation error.',
  operation: 'evaluate',
  input: {
    developerDirection:
      'Evaluate the adopted refund agent setup and report what is established, what is unresolved, and whether the repository was changed.',
    repositoryEvidence: [
      {
        claim: 'The adopted manifest names the refund agent and its source bindings.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The local Eve declaration supplies version evidence.',
        source: { kind: 'workspace-path', path: 'src/package.json', expectedType: 'file' },
      },
    ],
  },
  expected: [
    {
      label: 'report-independent-conclusions',
      criterion:
        'The actor distinguishes structural validity and independently proved local facts from the single unverified agent output-schema relationship; it does not describe the whole setup as broken.',
    },
    {
      label: 'retain-read-only-boundary',
      criterion:
        'The actor reports the bounded evidence assessed and explicitly states that no repository files changed.',
    },
  ],
  forbidden: [
    {
      label: 'claim-full-readiness',
      criterion:
        'The actor states that warning-only validation proves all declared runtime wiring or live behavior.',
    },
    {
      label: 'block-whole-evaluation',
      criterion:
        'The actor refuses to report independent established facts solely because of the scoped warning.',
    },
    {
      label: 'repository-write',
      criterion:
        'The actor changes files, including the package declaration, during the read-only evaluation.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
