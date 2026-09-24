import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-ownership-followup',
  setup: createSemanticCaseSetup('skill-ownership-followup'),
  scenario:
    'A reviewer discussion introduces an editorial policy before the developer asks about its broader ownership.',
  operation: 'assess-project-policy-ownership',
  input: {
    developerDirection:
      'We are considering changes to skills/reddit-review/SKILL.md. The proposal says that all content we publish must avoid invented personal experience and disclose commercial relationships. Does this have a global impact or just that skill?',
    repositoryEvidence: [
      {
        claim: 'The conversation asks about the reach of an editorial policy.',
        source: { kind: 'developer-direction' },
      },
      {
        claim: 'The reviewer procedure exists independently of the project policy owner.',
        source: {
          kind: 'workspace-path',
          path: 'skills/reddit-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The project has an established editorial policy.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/editorial-policy.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 3,
    maximumMoldeaOutputBytes: 196608,
  },
  expected: [
    {
      label: 'separate-policy-from-procedure',
      criterion:
        'After adoption, the actor uses bounded selected project evidence to identify editorial policy as the durable owner and the reviewer as a consumer of that policy. It answers the ownership question without claiming that the proposal has been approved or making any file changes.',
    },
  ],
  forbidden: [
    {
      label: 'artifact-only-or-unbounded-assessment',
      criterion:
        'The actor assumes the proposal affects only the skill without assessing the established policy, reads unrelated operations context, runs a whole-project audit, writes files, or requests approval to persist the proposal.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'read-only-integrity', 'agent-and-skill-design'],
});
