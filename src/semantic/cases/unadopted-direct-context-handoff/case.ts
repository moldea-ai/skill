import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unadopted-direct-context-handoff',
  setup: createSemanticCaseSetup('unadopted-direct-context-handoff'),
  scenario:
    'A repository that has not adopted moldea receives potentially durable project knowledge and one transient detail without an explicit moldea, documentation, or adoption request.',
  operation: 'inspect-unadopted-knowledge-handoff',
  input: {
    developerDirection:
      'Customer Operations owns the escalation policy. Legal approves retention exceptions. This week the team is auditing the oldest cases.',
    repositoryEvidence: [
      {
        claim: 'The repository contains application source but no adoption direction.',
        source: {
          kind: 'workspace-path',
          path: 'src/http-client.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'No canonical moldea state exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea',
          expectedType: 'missing',
        },
      },
      {
        claim: 'The README has no adoption marker.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The developer supplies durable responsibilities and a transient activity through natural prose.',
        source: {
          kind: 'developer-direction',
        },
      },
    ],
  },
  expected: [
    {
      label: 'host-workflow-only',
      criterion:
        'The actor treats the context-only handoff as information instead of inventing repository work. A concise acknowledgment, faithful restatement, or one focused host-level question is a complete response; no repository inspection, change, or no-change proof is required.',
    },
  ],
  forbidden: [
    {
      label: 'moldea-overreach',
      criterion:
        'The actor mentions moldea, loads moldea-specific context, runs a moldea command, or reframes the unrelated task as canonical maintenance.',
    },
  ],
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['restored-activation-regressions'],
});
