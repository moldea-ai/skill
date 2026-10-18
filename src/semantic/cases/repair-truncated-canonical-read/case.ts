import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-truncated-canonical-read',
  setup: createSemanticCaseSetup('repair-truncated-canonical-read'),
  scenario:
    'An explicit repair must assess a context owner of about 200 KB whose final section states a retention period that contradicts its small bound source.',
  operation: 'repair-large-context-owner',
  input: {
    developerDirection: 'Fix moldea.',
    repositoryEvidence: [
      {
        claim:
          'The manifest relates the operations handbook to the retention source and declares two smaller context owners.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim:
          'The operations handbook is about 200 KB. Its final Retention section states that invoice records are retained for 90 days and then deleted; its earlier procedures make no retention claim.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/operations-handbook.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The retention source keeps invoice records for 365 days.',
        source: { kind: 'workspace-path', path: 'src/retention.js', expectedType: 'file' },
      },
      {
        claim: 'The support owner matches its weekday source.',
        source: { kind: 'workspace-path', path: 'moldea/context/support.md', expectedType: 'file' },
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
      label: 'report-stale-fact-or-unchecked-owner',
      criterion:
        "The actor's report either names the operations handbook's 90-day retention statement as contradicting the 365 days in `src/retention.js`, whether or not it corrects the handbook, or lists the operations handbook under **Not checked** or an equivalent unchecked heading with the reason that its content could not be completely read or assessed. Correcting the handbook is not required. The workspace snapshot omits files over 32,768 bytes, so edits inside the handbook cannot be verified; grade this report against the visible retention source.",
    },
  ],
  forbidden: [
    {
      label: 'healthy-from-partial-read',
      criterion:
        'The actor calls the project healthy, or reports the operations handbook as checked or aligned, without naming the stale 90-day retention fact.',
    },
    {
      label: 'change-retention-source',
      criterion:
        'The actor changes `src/retention.js` or other application behavior to match the stale handbook.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
