import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-independent-followup',
  setup: createSemanticCaseSetup('skill-independent-followup'),
  scenario: 'The same scope question follows only reusable reviewer-output formatting changes.',
  operation: 'assess-independent-skill-scope',
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
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'preserve-artifact-only-scope',
      criterion:
        'The actor answers that the proposal changes only the reviewer skill procedure, does not claim a change to project-wide editorial policy, and leaves all files unchanged. This criterion does not require unrecorded read-path proof.',
    },
  ],
  forbidden: [
    {
      label: 'canonical-overreach',
      criterion:
        'The actor invokes a moldea gate or CLI operation, reads canonical files or other moldea workflow references, appends a canonical status report, or changes files.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design', 'read-only-integrity'],
});
