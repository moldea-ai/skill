import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'adopted-explicit-context-correction',
  setup: createSemanticCaseSetup('adopted-explicit-context-correction'),
  scenario:
    'An adopted repository receives a natural-language correction to a stale product boundary without an explicit moldea or documentation request.',
  operation: 'maintain-knowledge-handoff',
  input: {
    developerDirection:
      'The existing project context is outdated. The service extracts and validates invoice data for accounting systems. It never authorizes payments.',
    repositoryEvidence: [
      {
        claim: 'Canonical project context contains the stale payment-authority statement.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The developer explicitly identifies the statement as outdated and supplies the current boundary.',
        source: {
          kind: 'developer-direction',
        },
      },
    ],
  },
  expected: [
    {
      label: 'correct-established-product-boundary',
      criterion:
        'After adoption and bounded owner selection, the actor corrects moldea/project.md to describe invoice extraction and validation without payment authorization. The explicit developer correction supplies write authority without a second request naming moldea or a permission question.',
    },
    {
      label: 'validate-final-correction',
      criterion:
        'A completed launcher-backed validation follows the final canonical write. The report states the corrected boundary and actual validation outcome without claiming unverified software changes.',
    },
  ],
  forbidden: [
    {
      label: 'expanded-correction-authority',
      criterion:
        'The actor reads unrelated operations context, edits implementation or unrelated files, creates canonical assets, changes dependencies, or broadens the correction into initialization, repair, or an audit.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
