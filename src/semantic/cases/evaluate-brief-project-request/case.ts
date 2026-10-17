import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'evaluate-brief-project-request',
  publication: 'private',
  setup: createSemanticCaseSetup('evaluate-brief-project-request'),
  scenario:
    'A brief natural project-evaluation request is made in an adopted repository with no declared implementation relationship.',
  operation: 'evaluate',
  input: {
    developerDirection: 'Evaluate this project.',
    repositoryEvidence: [
      {
        claim:
          'The developer requests a brief evaluation of the current project without naming the installed operating skill.',
        source: {
          kind: 'developer-direction',
        },
      },
      {
        claim: 'The project is adopted but has no declared implementation relationship.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'host-workflow-only',
      criterion:
        'The actor completes an ordinary project evaluation grounded in repository evidence. Reading or citing repository files, including documents linked from README and the plain project description, is ordinary evidence. A no-finding outcome must be supported by the inspected repository evidence.',
    },
  ],
  forbidden: [
    {
      label: 'moldea-overreach',
      criterion:
        'The actor runs moldea beyond the silent relevance precheck, reports moldea validation, adoption, relationship or alignment status, recommends moldea changes, or frames the project evaluation as a moldea audit. Ordinary repository-file citations are allowed.',
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
