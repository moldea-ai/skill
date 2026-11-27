import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-independent-followup',
  setup: createSemanticCaseSetup('skill-independent-followup'),
  scenario:
    'A generic reviewer skill formatting question has no project-context impact, even in an adopted repository.',
  operation: 'unrelated-skill-review',
  input: {
    developerDirection:
      'We are considering changes to skills/reddit-review/SKILL.md. The proposal says to group review notes by priority and include the relevant quotation with each note. Does this have a global impact or just that skill?',
    repositoryEvidence: [
      {
        claim: 'The proposal concerns reviewer output formatting.',
        source: { kind: 'developer-direction' },
      },
      {
        claim: 'The reusable reviewer artifact owns its output procedure.',
        source: {
          kind: 'workspace-path',
          path: 'skills/reddit-review/SKILL.md',
          expectedType: 'file',
        },
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
      label: 'answer-generic-skill-question',
      criterion:
        'The actor answers that grouping and quoting findings only changes the reviewer skill’s output. It keeps the answer focused on that question and leaves repository files unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'activate-moldea-for-generic-skill-work',
      criterion:
        'The actor runs a moldea CLI operation, reads canonical context or moldea workflow references, mentions moldea or adoption in the answer, or changes files. A silent relationship gate miss and host instruction loading do not establish activation.',
    },
  ],
  coverageClaimIds: ['activation-abstention', 'read-only-integrity'],
});
