import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-marker-ambiguity',
  setup: createSemanticCaseSetup('repair-marker-ambiguity'),
  scenario:
    'A previously adopted README now has two conflicting managed regions separated by outside guidance, which the bundled writer cannot safely normalize.',
  operation: 'fix-ambiguous-markers',
  input: {
    developerDirection:
      'Fix the moldea setup in the README. This repository was initialized with moldea.',
    repositoryEvidence: [
      {
        claim: 'README contains two conflicting managed regions and outside guidance between them.',
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
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 131072,
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
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
