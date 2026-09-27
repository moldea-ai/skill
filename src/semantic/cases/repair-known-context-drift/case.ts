import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-known-context-drift',
  setup: createSemanticCaseSetup('repair-known-context-drift'),
  scenario:
    'An explicit repair request supplies the current invoice boundary that contradicts two existing context owners.',
  operation: 'repair-known-context',
  input: {
    developerDirection:
      'Repair moldea project guidance: this service now extracts and validates invoice data for accounting systems and never authorizes payments. The application already implements that behavior. Keep the application unchanged.',
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
    maximumMoldeaCommands: 5,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'correct-both-known-owners',
      criterion:
        'Both existing context owners describe current invoice extraction and validation without payment authorization; the project summary retains its link to detailed processing context, while application and unrelated context remain unchanged.',
    },
    {
      label: 'report-real-repair-verification',
      criterion:
        'Runner-owned evidence records successful launcher-backed validation, and the actor reports that result without claiming live runtime behavior or unsupported write order.',
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
