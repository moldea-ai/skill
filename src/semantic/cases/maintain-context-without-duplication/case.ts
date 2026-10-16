import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-context-without-duplication',
  setup: createSemanticCaseSetup('maintain-context-without-duplication'),
  scenario:
    'An adopted project receives an explicit correction to durable responsibility context whose established owner already exists alongside unrelated accumulated context.',
  operation: 'maintain-context',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Update: Customer Operations now owns the escalation policy, while Legal continues to approve retention exceptions. Keep the existing context organized without duplicating these responsibilities.',
    repositoryEvidence: [
      {
        claim: 'The manifest registers the established operations-context owner.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The operations context currently assigns escalation ownership to Support and retention-exception approval to Legal.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/operations.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'docs/operations-policy.md is an existing policy authority stating Support owns escalation and Legal approves retention exceptions. The registered operations context declares this exact implementation relationship. The correction may update that authority and link to it from the registered context instead of duplicating its policy.',
        source: {
          kind: 'workspace-path',
          path: 'docs/operations-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'Unrelated architecture context has its own established owner and remains outside the correction.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/architecture.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The developer explicitly corrects escalation ownership and confirms the retained Legal approval responsibility.',
        source: {
          kind: 'developer-direction',
        },
      },
    ],
  },
  expected: [
    {
      label: 'update-established-context-owner',
      criterion:
        'The registered operations context either states that Customer Operations owns escalation policy and Legal continues to approve retention exceptions, or links to the existing docs/operations-policy.md authority containing those corrected facts. Both representations satisfy this criterion.',
    },
    {
      label: 'avoid-duplicate-current-truth',
      criterion:
        'The resulting workspace keeps one authoritative statement of those responsibilities. The registered operations context and existing policy document may link to each other in either direction; independently maintained duplicate policy wording or another responsibility owner does not satisfy this criterion.',
    },
    {
      label: 'preserve-unrelated-context',
      criterion:
        'Workspace evidence shows that unrelated architecture context remains unchanged and the actor does not perform broad context compression beyond the authorized correction.',
    },
    {
      label: 'verify-maintained-context',
      criterion:
        'Runner-owned actor execution evidence contains a completed installed-skill launcher-backed `validate` invocation, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none.',
    },
  ],
  forbidden: [
    {
      label: 'create-parallel-responsibility-context',
      criterion:
        'The workspace changes create another context file or independently maintained wording for the same current responsibilities.',
    },
    {
      label: 'compress-unrelated-context',
      criterion:
        'The workspace changes reorganize, summarize, remove, or rewrite unrelated accumulated context without explicit broad compression authority.',
    },
    {
      label: 'retain-stale-escalation-owner',
      criterion:
        'The resulting canonical context still presents Support as the current escalation-policy owner.',
    },
    {
      label: 'invent-extra-project-status',
      criterion:
        'The actor invents an additional project status instead of reporting the binary adoption state and concrete maintenance findings.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
