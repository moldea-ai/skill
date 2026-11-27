import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-known-context-drift',
  setup: createSemanticCaseSetup('repair-known-context-drift'),
  scenario:
    'An explicit repair request supplies the current invoice boundary that contradicts two existing context owners.',
  operation: 'fix-known-context',
  input: {
    developerDirection:
      'Fix moldea project guidance: this service now extracts and validates invoice data for accounting systems and never authorizes payments. The application already implements that behavior. Keep the application unchanged.',
    repositoryEvidence: [
      {
        claim: 'The project summary has the stale payment claim.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The processing owner also has the stale claim.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/processing.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The application contains the current extraction and validation behavior.',
        source: { kind: 'workspace-path', path: 'src/invoice.js', expectedType: 'file' },
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
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
    {
      label: 'correct-both-known-owners',
      criterion:
        'Both existing context owners describe current invoice extraction and validation without payment authorization; the project summary retains its link to detailed processing context, while application and unrelated context remain unchanged.',
    },
    {
      label: 'report-real-repair-verification',
      criterion:
        'Runner-owned evidence records successful bundled CLI validation, and the actor reports that result without claiming live runtime behavior or unsupported write order.',
    },
  ],
  forbidden: [
    {
      label: 'partial-or-speculative-repair',
      criterion:
        'The actor corrects only one owner, changes the already-correct application or unrelated context, creates a parallel owner, or invents a new payment policy.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
