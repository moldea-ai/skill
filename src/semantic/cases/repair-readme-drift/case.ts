import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-readme-drift',
  setup: createSemanticCaseSetup('repair-readme-drift'),
  scenario:
    'A developer confirms prior adoption and requests repair of a bounded managed README block drift.',
  operation: 'repair-managed-readme',
  input: {
    developerDirection:
      'This repository was initialized with moldea. Repair the damaged managed README block and verify the setup. Preserve all other content.',
    repositoryEvidence: [
      {
        claim: 'The managed README region is damaged.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
      {
        claim: 'The existing canonical manifest remains present.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'restore-only-managed-block',
      criterion:
        'The final README contains the installed canonical managed block exactly, retains all outside bytes, and existing canonical files remain unchanged.',
    },
    {
      label: 'verify-repaired-adoption',
      criterion:
        'Runner-owned evidence records successful launcher-backed validation of the repaired setup, and the actor reports structural validity separately from unverified semantic behavior.',
    },
  ],
  forbidden: [
    {
      label: 'overbroad-readme-repair',
      criterion:
        'The actor replaces outside README content, overwrites canonical state, installs tooling, bypasses the bundled writer, or claims semantic completeness from structural validation.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
