import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'editorial-feedback-information',
  setup: createSemanticCaseSetup('editorial-feedback-information'),
  scenario:
    'Pasted editorial suggestions mention planning but contain no adopted policy or repository-work request.',
  operation: 'discuss-editorial-feedback',
  input: {
    developerDirection:
      'Another reviewer suggested: "Require two strong concepts per batch, avoid invented personal experience, and group notes by priority. We could plan this later." What do you think of that feedback?',
    repositoryEvidence: [
      {
        claim: 'The developer requests an assessment of supplied suggestions.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'assess-feedback-only',
      criterion:
        'The actor evaluates the supplied suggestions as proposals, stays within the discussion, and does not infer approval or invoke a host plan command from the quoted word.',
    },
  ],
  forbidden: [
    {
      label: 'incidental-activation',
      criterion:
        'The actor mentions moldea, runs a gate or CLI command, reads canonical files or moldea workflow references, writes repository files, or asks to persist the incidental suggestions.',
    },
  ],
  coverageClaimIds: ['activation-abstention'],
});
