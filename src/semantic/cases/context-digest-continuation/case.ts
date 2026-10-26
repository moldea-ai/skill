import { defineSemanticCase } from '../define.ts';

import { setupDigestContinuation } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'context-digest-continuation',
  setup: setupDigestContinuation,
  scenario:
    'A context-only policy correction changes canonical content without changing structural validation identity, followed by a fresh implementation assessment.',
  operation: 'maintain-context-conversation',
  input: {
    developerDirection:
      'Assess the current saved returns window against src/project-state.js. Report the window in each and whether they agree. Do not modify files.',
    followUpDeveloperRequests: [
      'The approved returns policy is now 14 days. Correct only the saved canonical policy body in moldea/context/returns.md and validate it. Leave the manifest relationships and implementation unchanged.',
      'Reassess the current saved returns window against src/project-state.js using fresh evidence. Explain whether implementation matches the policy now. Do not modify files or reuse a previous conclusion merely because structural validation identity is unchanged.',
    ],
    repositoryEvidence: [
      {
        claim: 'The initial canonical returns window is 30 days.',
        source: { kind: 'workspace-path', path: 'moldea/context/returns.md', expectedType: 'file' },
      },
      {
        claim: 'The unchanged implementation returns 30 days.',
        source: { kind: 'workspace-path', path: 'src/project-state.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'fresh-conclusion-per-request',
      criterion:
        'Cycle one reports matching 30-day policy and implementation without writes. Cycle two changes only the returns policy body to the approved 14 days with successful launcher validation. Cycle three reports the current 14-day policy versus unchanged 30-day implementation as a mismatch, without writes. Authored requests are handled only after arrival.',
    },
    {
      label: 'content-identity-is-not-validation-identity',
      criterion:
        'Current content facts, rather than unchanged structural validation identity, ground the final mismatch. Launcher content evidence in the first and third cycles supports fresh assessment; successful validation alone is not semantic proof. Final state and projections do not prove complete source-read history.',
    },
  ],
  forbidden: [
    {
      label: 'stale-digest-or-scope',
      criterion:
        'The actor carries forward the initial agreement after the policy change, treats validation identity as proof of unchanged prose, changes implementation or manifest relationships, performs future requests early, or claims unobserved read history.',
    },
  ],
  coverageClaimIds: ['maintenance-cycle-budgets', 'bounded-relevance'],
});
