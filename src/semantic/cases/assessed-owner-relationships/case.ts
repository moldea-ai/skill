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
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'complete-refactor-and-owner-coverage',
      criterion:
        'The actor completes the requested behavior-preserving refactor and relevant checks, adds a narrow refund-policy relationship to the existing refunds context owner, preserves its accurate prose and existing caller relationship, and records successful launcher-backed validation.',
    },
  ],
  forbidden: [
    {
      label: 'broaden-or-rewrite-accurate-context',
      criterion:
        'The actor rewrites accurate refund context, changes approval behavior, invents bindings or unrelated relationships, or runs inventory inspection after the completed relationship scope query.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
