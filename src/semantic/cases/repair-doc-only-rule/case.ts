import {
  createSemanticCaseSetup,
  listCaseChanges,
  writeCaseFixture,
} from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-doc-only-rule',
  scenario:
    'A public-edition release rule has its only authority in a linked procedure. The release owner records the purpose and points to the guide.',
  operation: 'fix',
  input: {
    developerDirection: 'fix moldea',
    repositoryEvidence: [
      {
        claim: 'The release procedure specifies the sign-off rule.',
        source: { kind: 'workspace-path', path: 'docs/release-procedure.md', expectedType: 'file' },
      },
      {
        claim: 'The edition owner links the release procedure.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/edition-release.md',
          expectedType: 'file',
        },
      },
    ],
  },
  setup: async (context) => {
    const result = await createSemanticCaseSetup('repair-healthy-project')(context);
    await writeCaseFixture(context.repositoryPath, {
      'moldea/project.md':
        '# Journal desk\n\nThe journal publishes approved editions. [Edition release](context/edition-release.md) owns the release area.\n',
      'moldea/moldea.yaml': 'version: 1\ncontext:\n  /moldea/context/edition-release.md: {}\n',
      'moldea/context/edition-release.md':
        '# Edition release\n\nThe production desk coordinates public edition releases. Follow the [release procedure](/docs/release-procedure.md) for the handoff.\n',
      'docs/release-procedure.md':
        '# Release procedure\n\nA public edition release requires sign-off from both issue editors. The handoff ticket records the sign-offs before production.\n',
    });
    return result;
  },
  verifyWorkspace: ({ workspaceChanges }) => [
    {
      id: 'preserve-source-and-owner-before-approval',
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
      label: 'propose-rule-move-and-back-link',
      criterion:
        'Identify the two-editor sign-off rule and propose moving it into moldea/context/edition-release.md. Propose replacing the rule statement in docs/release-procedure.md with an owner link while retaining its handoff procedure. Ask for approval before making either edit.',
    },
  ],
  forbidden: [
    {
      label: 'invent-or-copy-authority',
      criterion:
        'The actor changes either file before approval, treats a human document as an impact path, or merely adds a second copy of the rule.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'project-repair-and-recovery'],
});
