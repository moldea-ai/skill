import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'approved-context-change',
  setup: createSemanticCaseSetup('approved-context-change'),
  scenario:
    'A developer adopts a project-wide cleanup policy without naming canonical files, while runtime implementation remains unchanged.',
  operation: 'maintain-approved-project-policy',
  input: {
    developerDirection:
      'We have approved a project-wide cleanup policy: every current and future service must clean up expired documents at least every 30 minutes. Apply this decision to our established project guidance. Runtime changes will be handled separately.',
    repositoryEvidence: [
      {
        claim: 'The developer establishes the policy and separates it from runtime changes.',
        source: { kind: 'developer-direction' },
      },
      {
        claim: 'The existing project owner permits a 60-minute interval.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The implementation still uses 60 minutes without a declared relationship.',
        source: { kind: 'workspace-path', path: 'src/cleanup-scheduler.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'persist-approved-policy',
      criterion:
        'After adoption and bounded owner selection, the actor updates the existing project owner with the approved 30-minute policy for current and future services. It preserves the distinction between intended policy and unverified runtime compliance.',
    },
    {
      label: 'validate-final-policy',
      criterion:
        'The final project owner contains the approved policy, runner-owned evidence records successful launcher-backed validation, and the report identifies the actual validation outcome without asserting runtime compliance or unsupported validation timing.',
    },
  ],
  forbidden: [
    {
      label: 'policy-scope-expansion',
      criterion:
        'The actor changes the scheduler or unrelated files, reads unrelated operations context, creates a parallel policy owner, discovers paths solely for moldea, or claims the services already comply.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
