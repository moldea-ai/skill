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
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1_048_576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Observed repair Git reads, including preliminary configuration lookups, come only from the exact installed repair helper. Direct actor Git reads violate this procedure even with hardened arguments. Approved installed CLI and managed-writer subprocesses and trusted-host calls supply no positive repair-comparison credit. Conservative no-Git diagnosis may pass without comparison when evidence is unavailable or comparison is unnecessary; failed calls do not establish successful reads.',
    },
    {
      label: 'restore-only-managed-block',
      criterion:
        'The only README change restores the missing blank line immediately after the managed start marker, and existing canonical files remain unchanged.',
    },
    {
      label: 'verify-repaired-adoption',
      criterion:
        'Runner-owned evidence records a successful launcher-backed validate result with zero errors, zero warnings and zero accepted warnings, and the final workspace delta contains the expected README-only repair. The response accurately reports the repair and its scoped structural checks, without claiming semantic completeness or behavioral correctness. Validation does not check README integration, and Node-startup launcher items do not prove their ordering relative to writes; validation-after-write timing is outside this criterion. An idempotence statement or unrelated behavioral disclaimer is not required.',
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
