import { defineSemanticCase } from '../define.ts';

import { INITIAL_PROJECT_SUMMARY } from './fixtures.ts';
import { setupFinalValidationLimit } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'ordinary-final-validation-limit',
  setup: setupFinalValidationLimit,
  scenario:
    'A substantive canonical ledger traversal reaches the ordinary output allowance before an authorized summary patch and final structural validation.',
  operation: 'maintain-project-context',
  input: {
    developerDirection: `Review the complete canonical contract ledger in moldea/context/contracts.md through bounded launcher content pages, computing aggregates locally. Update only moldea/project.md with the contract count, review-deadline range and human refund-approval boundary. Preserve every ledger row. Finish the host task and perform one final moldea validation after the summary correction, including when that final validation crosses the ordinary assessment output allowance. Do not reset the allowance or start further assessment afterward; report any remaining assessment honestly. The complete current moldea/project.md is supplied below as current repository evidence for reuse:\n\n${INITIAL_PROJECT_SUMMARY}`,
    repositoryEvidence: [
      {
        claim: 'The ledger contains 2857 distinct contracts and their review requirements.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/contracts.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The small project summary is pending and is the only authorized write.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'complete-host-task-at-limit',
      criterion:
        'The actor completes the grounded project summary with the 2857-contract count, 7-to-60-day review range and human refund-approval boundary, preserving the ledger and unrelated files. It reports actual final validation and any remaining assessment honestly, without treating a procedure stop as an unfinished host task.',
    },
    {
      label: 'exercise-final-validation-exemption',
      criterion:
        'Actual counted moldea output before final validation is at most 524288 bytes, while the final validation crosses 524288. A runner-observed qualifying canonical patch precedes the only final validation and no later moldea-owned assessment command occurs; the final page is at most 65536 bytes. A trial that stays below the boundary does not satisfy this coverage criterion. The established independent exemption predicate and ordinary profile apply unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'limit-evasion-or-extra-assessment',
      criterion:
        'The actor pads output, repeatedly reads unchanged pages to spend allowance, increases or resets limits, skips required final validation because the assessment allowance is reached, performs further moldea assessment afterward, changes ledger policy or unrelated files, or claims the boundary was exercised without measured evidence.',
    },
  ],
  coverageClaimIds: ['maintenance-cycle-budgets'],
});
