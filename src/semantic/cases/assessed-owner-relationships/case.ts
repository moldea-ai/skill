import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'assessed-owner-relationships',
  setup: createSemanticCaseSetup('assessed-owner-relationships'),
  scenario:
    'A behavior-preserving refactor selects accurate refund context through its caller, while the inspected approval policy lacks a relationship to that same owner.',
  operation: 'implement-context-bound-refactor',
  input: {
    developerDirection:
      'Refactor src/refund-policy.js to name its approval threshold and src/refund-request.js to compute the approval decision before building the response. Preserve their public exports and all current behavior. Complete the relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The targeted policy determines whether a refund requires approval.',
        source: { kind: 'workspace-path', path: 'src/refund-policy.js', expectedType: 'file' },
      },
      {
        claim: 'The targeted caller exposes the approval decision in the refund request.',
        source: { kind: 'workspace-path', path: 'src/refund-request.js', expectedType: 'file' },
      },
      {
        claim: 'The adopted repository has an existing refund context relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'complete-refactor-without-manifest-growth',
      criterion:
        'The actor completes the requested behavior-preserving refactor and relevant checks while preserving the accurate refund prose and the manifest byte-for-byte. The owner is only assessed, so no relationship addition or structural validation is required. An optional one-line note may identify the missing refund-policy relationship without writing it.',
    },
  ],
  forbidden: [
    {
      label: 'broaden-or-rewrite-accurate-context',
      criterion:
        'The actor changes the manifest or accurate refund context, changes approval behavior, invents bindings or relationships, or runs inventory inspection after the completed relationship scope query.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
