import {
  createSemanticCaseSetup,
  hasCaseLink,
  listCaseChanges,
  readCaseFile,
  writeCaseFixture,
} from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

const guide = 'docs/delivery-retries.md';
const owner = 'moldea/context/delivery.md';
const oldGuide =
  '# Delivery retries\n\nCheck the delivery dashboard before contacting a customer. The worker submits up to two delivery attempts. Open the delivery detail to find the last response.\n';
const correctGuide = oldGuide.replace('two delivery attempts', 'three delivery attempts');

export const semanticCase = defineSemanticCase({
  id: 'repair-stale-linked-guide',
  scenario:
    'A delivery runbook linked from its owner misstates the retry worker’s observable number of attempts.',
  operation: 'fix',
  input: {
    developerDirection: 'fix moldea',
    repositoryEvidence: [
      {
        claim: 'The guide is linked from the delivery owner.',
        source: { kind: 'workspace-path', path: 'docs/delivery-retries.md', expectedType: 'file' },
      },
      {
        claim: 'The implementation defines the worker attempt limit.',
        source: { kind: 'workspace-path', path: 'src/delivery/retry.js', expectedType: 'file' },
      },
      {
        claim: 'The canonical owner states the current fact.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/delivery.md',
          expectedType: 'file',
        },
      },
    ],
  },
  setup: async (context) => {
    const result = await createSemanticCaseSetup('repair-healthy-project')(context);
    await writeCaseFixture(context.repositoryPath, {
      'moldea/project.md':
        '# Shop dispatch\n\nThe dispatch service schedules delivery notifications for customers. [Delivery](context/delivery.md) governs the worker behavior.\n',
      'moldea/moldea.yaml':
        'version: 1\ncontext:\n  /' +
        owner +
        ':\n    affectedBy:\n      - /src/delivery/retry.js\n',
      [owner]:
        '# Delivery retries\n\nThe delivery worker attempts submission at most three times per job. See [the runbook](/docs/delivery-retries.md) for the dashboard procedure.\n',
      [guide]: oldGuide,
      'src/delivery/retry.js':
        'export const deliveryAttemptLimit = 3;\nexport const canAttemptDelivery = (attempts) => attempts < deliveryAttemptLimit;\n',
    });
    return result;
  },
  verifyWorkspace: ({ snapshot, workspaceChanges }) => [
    {
      id: 'minimal-guide-correction',
      passed:
        JSON.stringify(listCaseChanges(workspaceChanges)) === JSON.stringify([guide]) &&
        readCaseFile(snapshot, guide) === correctGuide &&
        hasCaseLink(readCaseFile(snapshot, owner), owner, guide),
    },
  ],
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
        'Complete Git capture establishes permitted read-only orientation and the applicable installed repair-helper reads.',
    },
    {
      label: 'correct-the-linked-fact',
      criterion:
        'Change only the incorrect claim of two delivery attempts to three in docs/delivery-retries.md. Preserve the runbook structure and wording around it. The implementation, owner, manifest and Git controls remain unchanged.',
    },
    {
      label: 'record-the-fix-evidence',
      criterion:
        'Record cohesive owner verdicts and the kept retry implementation path. Under Fixed name the outside edit and its evidence in the worker or canonical owner. Required final validation succeeds.',
    },
  ],
  forbidden: [
    {
      label: 'rewrite-policy-or-code',
      criterion:
        'The actor changes worker behavior, reauthors the runbook, adds its Markdown as an impact path, or edits unrelated files.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
