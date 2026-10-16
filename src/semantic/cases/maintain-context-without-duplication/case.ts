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
          'docs/operations-policy.md is the existing declared policy source for the registered operations context. The fixture already states Support escalation ownership and Legal retention-exception approval in both existing files.',
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
        'The registered operations context remains the sole focused canonical owner, and project.md does not repeat the detailed responsibilities; a navigation link is acceptable but not required. Updating the existing canonical owner and its existing declared policy source consistently is permitted controlled repetition; a link to the corrected source is also acceptable. Similar wording in that existing pair alone does not prove duplication. The actor creates no additional responsibility owner or copy in another canonical asset.',
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
        'The workspace changes create an additional responsibility-context file or copy the policy into another canonical asset outside its established owner. In-place corrections to the existing operations context and its existing declared policy source do not establish this forbidden behavior.',
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
