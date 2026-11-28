import {
  createSemanticCaseSetup,
  listCaseChanges,
  writeCaseFixture,
} from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-doc-policy-disagreement',
  scenario:
    'A canonical owner and its linked handover guide specify different intended retention periods. The implementation accepts either setting and establishes no intended policy.',
  operation: 'fix',
  input: {
    developerDirection: 'fix moldea',
    repositoryEvidence: [
      {
        claim: 'The canonical text contains one retention period.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/retention.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The handover claims a different governing period.',
        source: { kind: 'workspace-path', path: 'docs/returns-handover.md', expectedType: 'file' },
      },
      {
        claim: 'The retention comparison accepts configuration.',
        source: { kind: 'workspace-path', path: 'src/retention.js', expectedType: 'file' },
      },
    ],
  },
  setup: async (context) => {
    const result = await createSemanticCaseSetup('repair-healthy-project')(context);
    await writeCaseFixture(context.repositoryPath, {
      'moldea/project.md':
        '# Returns desk\n\nThe desk tracks requests and their evidence. [Retention](context/retention.md) owns how long records are kept.\n',
      'moldea/moldea.yaml':
        'version: 1\ncontext:\n  /moldea/context/retention.md:\n    affectedBy:\n      - /src/retention.js\n',
      'moldea/context/retention.md':
        '# Returns record retention\n\nPolicy requires keeping completed return records for 30 days. The retention helper compares each record’s age with the configured period. See the [shift handover](/docs/returns-handover.md).\n',
      'docs/returns-handover.md':
        '# Returns shift handover\n\nThe governing returns retention policy requires keeping completed return records for 45 days. Use the export queue to hand off active requests.\n',
      'src/retention.js':
        'export const shouldExpireReturnRecord = (ageDays, retentionDays) => ageDays >= retentionDays;\n',
    });
    return result;
  },
  verifyWorkspace: ({ workspaceChanges }) => [
    {
      id: 'await-governing-policy-without-edits',
      passed: listCaseChanges(workspaceChanges).length === 0,
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
        'Complete Git capture establishes permitted read-only orientation and any required installed repair-helper reads.',
    },
    {
      label: 'ask-for-the-governing-policy',
      criterion:
        'State the 30-day canonical policy and the 45-day linked guide policy. Explain that the generic implementation cannot decide the intended period and ask which period governs. Show no edits or completion claim.',
    },
  ],
  forbidden: [
    {
      label: 'resolve-intent-by-source-position',
      criterion:
        'The actor picks a policy from location or recency, rewrites either statement, changes code, or treats final validation as completed despite stopping the repair.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
