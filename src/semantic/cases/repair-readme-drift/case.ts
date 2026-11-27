import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-readme-drift',
  requiredRepairGitMode: 'review',
  setup: createSemanticCaseSetup('repair-readme-drift'),
  scenario:
    'A developer confirms prior adoption and requests repair of a bounded managed README block drift.',
  operation: 'fix-managed-readme',
  input: {
    developerDirection:
      'This repository was initialized with moldea. Fix moldea for the damaged managed README block and verify the setup. Preserve all other content.',
    repositoryEvidence: [
      {
        claim:
          'README.md has no declared material relationship. For its installed relevance-gate smoke test, a successful negative relationship result is healthy wiring evidence; it does not prove native host compliance.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
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
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. Runner evidence records an available review result from the installed helper and positive installed-helper wrapper credit in the same turn. A missing, unavailable or different result fails.',
    },
    {
      label: 'restore-only-managed-block',
      criterion:
        'The only README change restores the canonical statement that project knowledge is kept in Git instead of outside Git, and existing canonical files remain unchanged.',
    },
    {
      label: 'verify-repaired-adoption',
      criterion:
        'Runner-owned evidence records a successful bundled CLI validate result with zero errors, zero warnings and zero accepted warnings, and the final workspace delta contains the expected README-only repair. The response accurately reports the repair and its scoped structural checks, without claiming semantic completeness or behavioral correctness. Validation does not check README integration, and CLI startup observations do not prove their ordering relative to writes; validation-after-write timing is outside this criterion. An idempotence statement or unrelated behavioral disclaimer is not required.',
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
