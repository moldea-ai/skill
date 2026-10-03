import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'assessed-owner-readonly',
  setup: createSemanticCaseSetup('assessed-owner-readonly'),
  scenario:
    'A direct read-only assessment compares accurate refund context and its relationships with the named caller and approval policy.',
  operation: 'evaluate-context-relationships',
  input: {
    developerDirection:
      'Review moldea/context/refunds.md and its implementation relationships against src/refund-request.js and src/refund-policy.js. Assess whether the context and routing reflect the current refund behavior. Do not change any files.',
    repositoryEvidence: [
      {
        claim: 'The named context describes the current approval behavior.',
        source: { kind: 'workspace-path', path: 'moldea/context/refunds.md', expectedType: 'file' },
      },
      {
        claim: 'The manifest declares the current implementation relationships.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The named implementation separates the request from its governing policy.',
        source: { kind: 'workspace-path', path: 'src/refund-policy.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'report-accurate-prose-and-missing-coverage',
      criterion:
        "The actor establishes that the refund context matches current behavior, identifies the governing policy's missing relationship to that owner using sufficient routing evidence, and reports that no repository files changed.",
    },
  ],
  forbidden: [
    {
      label: 'override-read-only-or-claim-unproven-absence',
      criterion:
        'The actor writes repository files, treats an incomplete metadata response as proof of missing coverage, claims complete alignment while overlooking the established relationship gap, or expands into unrelated context discovery.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'read-only-integrity'],
});
