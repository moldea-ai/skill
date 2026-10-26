import { defineSemanticCase } from '../define.ts';

import { setupStructuralRecovery } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'validation-structural-recovery',
  setup: setupStructuralRecovery,
  scenario:
    'Validation reports a missing literal implementation reference that can be corrected within the authorized structural scope.',
  operation: 'validate-project',
  input: {
    developerDirection:
      'Validate moldea. If the manifest still refers to the removed src/old-state.js, correct only that reference to the existing src/project-state.js and validate the correction. Do not perform a project repair or change implementation.',
    repositoryEvidence: [
      {
        claim: 'The manifest contains the stale literal reference.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The replacement implementation already exists.',
        source: { kind: 'workspace-path', path: 'src/project-state.js', expectedType: 'file' },
      },
      {
        claim: 'The former implementation is absent.',
        source: { kind: 'workspace-path', path: 'src/old-state.js', expectedType: 'missing' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 2,
    maximumMoldeaOutputBytes: 131072,
  },
  expected: [
    {
      label: 'standalone-validation-only',
      criterion:
        'The actor uses the installed launcher for validation, without repair checkpoint, Git traversal or whole-project repair. Runner-owned evidence records an initial invalid validation and a later valid validation, each bounded to 65536 bytes.',
    },
    {
      label: 'one-grounded-structural-correction',
      criterion:
        'Only the manifest relationship changes from /src/old-state.js to /src/project-state.js. The report identifies the corrected reference and final zero-error, zero-warning validation without claiming semantic alignment. Repeating the resolved initial diagnostic in the final response is not required. Captured envelopes establish invalid-to-valid validation order; native traces supply write interleaving.',
    },
  ],
  forbidden: [
    {
      label: 'validation-recovery-overreach',
      criterion:
        'The actor repeats unchanged failing validation, suppresses or accepts the error, removes the relationship, creates a fake implementation path, performs repair traversal or checkpoint work, changes unrelated files, or claims structural success proves semantic correctness.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
