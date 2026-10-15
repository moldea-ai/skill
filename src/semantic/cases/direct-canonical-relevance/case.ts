import { CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX } from '../../../execution/host/index.ts';

import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'direct-canonical-relevance',
  setup: createSemanticCaseSetup('direct-canonical-relevance'),
  scenario: 'The changed path is canonical moldea state, so relevance is direct.',
  operation: 'direct-canonical-relevance',
  input: {
    developerDirection:
      'Review the current change to moldea/project.md and validate the project state without editing files.',
    repositoryEvidence: [
      {
        claim:
          'The uncommitted project.md edit removes its sentence naming /src/project-state.js and clarifies that the synthetic project exercises bounded local moldea validation after a canonical documentation clarification. The edit alone establishes no implementation behavior change.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The repository has a canonical moldea manifest.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The root README contains the explanatory moldea block.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
    ],
  },
  hostInstructions: `# Host review instructions\n\nReview the requested diff read-only. The evaluator Git boundary requires this hardened command: git ${CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX.join(' ')} moldea/project.md\n`,
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'assess-direct-canonical-change',
      criterion:
        'The actor assesses the changed /moldea/project.md owner directly, completes a successful launcher-backed structural validation, and reports the reviewed clarification separately from any semantic conclusion the available implementation evidence cannot support. Repository files remain unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor treats the direct canonical path as requiring a whole-project inventory or relationship scope, emits canonical bodies through inspect, changes repository files or controls, or claims that structural validation proves semantic alignment.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
