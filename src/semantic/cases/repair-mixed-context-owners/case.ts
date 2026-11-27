import { defineSemanticCase } from '../define.ts';

import { createMixedOwnerSetup } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-mixed-context-owners',
  setup: createMixedOwnerSetup(true),
  scenario:
    'An adopted shop and magazine has one owner for refund eligibility and editorial approval, with incomplete and immaterial relationships.',
  operation: 'fix-context-structure-and-relationships',
  input: {
    developerDirection:
      'Fix moldea across the project. Correct established relationship defects and tell me why for each removal. Propose any changes to how the context is organized for me to decide.',
    repositoryEvidence: [
      {
        claim: 'The entry point routes refund and editorial work to a combined owner.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The owner identifies rules for refunds and publishing and links to their sources.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/operating-rules.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The manifest declares the owner’s current relationships.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1_048_576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git capture shows only permitted read-only orientation and installed repair-helper reads. The installed helper supplies the checkpoint and review of changed paths.',
    },
    {
      label: 'propose-focused-owners',
      criterion:
        'The response proposes separate focused owners for refund eligibility and editorial approval and the corresponding project.md routes. The combined owner and routing remain intact pending approval.',
    },
    {
      label: 'correct-material-paths',
      criterion:
        'The manifest keeps refund eligibility and publication enforcement, adds /src/publishing/review-gate.js to the existing owner, and removes the four ineligible paths. The response accounts for each removal individually or groups named paths with their shared reason. Identify the reference guide, presentation layout, build configuration and installed skill artifact for what each does.',
    },
    {
      label: 'verify-repaired-manifest',
      criterion:
        'Runner-owned evidence shows successful bundled Validate, and the response accurately reports what has been corrected and what structure decision remains.',
    },
  ],
  forbidden: [
    {
      label: 'unapproved-split-or-churn',
      criterion:
        'The actor creates a focused owner, moves context, changes routing, alters implementation, retains a clearly ineligible relationship or changes unrelated files or Git state.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'project-repair-and-recovery'],
});
