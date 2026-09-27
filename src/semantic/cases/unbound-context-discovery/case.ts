import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unbound-context-discovery',
  setup: createSemanticCaseSetup('unbound-context-discovery'),
  scenario:
    'An adopted project links to canonical context from README, but declares no relationship for the ordinary scheduler path.',
  operation: 'implement-unbound-task',
  input: {
    developerDirection:
      'Change src/cleanup-scheduler.js so cleanup runs every 30 minutes. Complete the code change and relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The targeted scheduler path exists.',
        source: { kind: 'workspace-path', path: 'src/cleanup-scheduler.js', expectedType: 'file' },
      },
      {
        claim: 'README links to project context but does not establish a relationship.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
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
      label: 'ordinary-implementation-only',
      criterion:
        'The final scheduler runs cleanup every 30 minutes, its updated project-native test passes, and the actor makes no canonical changes, moldea CLI calls, or moldea report.',
    },
  ],
  forbidden: [
    {
      label: 'semantic-link-activation',
      criterion:
        'The actor follows the README link as an alternate relevance route, changes project context without a declared relationship or explicit moldea request, or leaves the requested scheduler behavior incomplete.',
    },
  ],
  coverageClaimIds: ['activation-abstention'],
});
