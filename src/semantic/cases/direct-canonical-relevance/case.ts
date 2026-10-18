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
          'The uncommitted project.md edit removes its sentence naming /src/project-state.js and clarifies that the synthetic project exercises bounded local moldea validation after a canonical documentation clarification. The manifest still declares /src/project-state.js as affecting /moldea/project.md, but the edited text states no material fact that path governs. The edit alone establishes no implementation behavior change.',
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
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'assess-direct-canonical-change',
      criterion:
        'The actor reviews the changed /moldea/project.md owner directly and completes a successful launcher-backed structural validation. A concise no-findings response naming the reviewed owner is sufficient; it need not restate the clarification. The report does not present structural validity as proof of runtime or semantic alignment. A gate miss or empty scope result must not suppress the requested direct assessment and validation. Repository files remain unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor requires a whole-project inventory for the direct canonical owner, emits canonical bodies through inspect, changes repository files or controls, or claims that structural validation proves semantic alignment. A bounded scope query alone is not a failure; successful structural validation and the read-only review outcome remain required.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
