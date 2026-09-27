import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'eve-warning-output-unverified',
  setup: createSemanticCaseSetup('eve-warning-output-unverified'),
  scenario:
    'The Eve declaration spans the 0.67.0 agent output-schema removal. The installed CLI returns valid with one scoped warning and no positive output-schema evidence.',
  operation: 'evaluate-runtime-relationship',
  input: {
    developerDirection:
      'Evaluate whether the refund agent output schema is correctly wired for the declared Eve versions. Do not change the repository.',
    repositoryEvidence: [
      {
        claim: 'The agent declares the output-schema relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The nearest package declaration spans the 0.67.0 boundary.',
        source: { kind: 'workspace-path', path: 'src/package.json', expectedType: 'file' },
      },
      {
        claim: 'The bound schema symbol exists in repository source.',
        source: { kind: 'workspace-path', path: 'src/agent/contracts.ts', expectedType: 'file' },
      },
    ],
  },
  expected: [
    {
      label: 'separate-structural-status-and-wiring',
      criterion:
        'The actor reports zero validation errors and the scoped warning, then leaves the output-schema wiring conclusion unresolved across the declared range.',
    },
    {
      label: 'identify-boundary-and-resolver',
      criterion:
        'The actor identifies Eve 0.67.0 as the behavior boundary and names the nearest declaration or exact supported version choice needed to establish the requested wiring claim.',
    },
    {
      label: 'report-no-writes',
      criterion: 'The actor explicitly reports that no repository files were changed.',
    },
  ],
  forbidden: [
    {
      label: 'infer-success-from-valid',
      criterion:
        'The actor treats valid status, a real schema symbol, or no error as proof of output-schema wiring.',
    },
    {
      label: 'rewrite-declaration',
      criterion:
        'The actor changes or recommends forcing the Eve range solely to clear the warning.',
    },
    {
      label: 'repository-write',
      criterion: 'The workspace changes during this read-only evaluation.',
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
