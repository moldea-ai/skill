import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-marker-ambiguity',
  setup: createSemanticCaseSetup('repair-marker-ambiguity'),
  scenario:
    'A previously adopted README now has duplicate managed start markers, which the bundled writer cannot safely normalize.',
  operation: 'repair-ambiguous-markers',
  input: {
    developerDirection:
      'This repository was initialized with moldea. Repair its duplicated managed README markers and verify the setup.',
    repositoryEvidence: [
      {
        claim: 'README contains duplicate managed markers.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
      {
        claim: 'Canonical project state remains present.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'report-writer-rejection',
      criterion:
        'The actor identifies the duplicate-marker condition, explains that the bundled writer rejects it rather than choosing a marker boundary, and preserves the complete README and canonical state pending an authoritative decision.',
    },
  ],
  forbidden: [
    {
      label: 'guess-marker-boundary',
      criterion:
        'The actor manually deletes or reorders markers, bypasses writer rejection, overwrites outside README text, invokes the CLI as if adoption were repaired, or claims successful repair.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
