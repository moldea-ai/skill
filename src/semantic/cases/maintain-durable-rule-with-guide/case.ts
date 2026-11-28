import {
  createSemanticCaseSetup,
  hasCaseLink,
  listCaseChanges,
  readCaseFile,
  writeCaseFixture,
} from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

const owner = 'moldea/context/dispatch.md';
const guide = 'docs/warehouse-dispatch.md';
const cutoff = /\b16:00\b|\b4(?::00)?\s*p\.?m\b/iu;

export const semanticCase = defineSemanticCase({
  id: 'maintain-durable-rule-with-guide',
  scenario:
    'In an adopted seasonal shop, a warehouse guide states a dispatch deadline that the focused canonical owner does not yet carry.',
  operation: 'maintain-canonical-rule',
  input: {
    developerDirection:
      'Record the 16:00 local cutoff for same-day warehouse dispatch. Update the dispatch guide if needed.',
    repositoryEvidence: [
      {
        claim: 'The warehouse guide states the cutoff and the handoff steps.',
        source: {
          kind: 'workspace-path',
          path: 'docs/warehouse-dispatch.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'A focused dispatch owner is routed from the project.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/dispatch.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The implementation enforces the cutoff.',
        source: { kind: 'workspace-path', path: 'src/dispatch.js', expectedType: 'file' },
      },
    ],
  },
  setup: async (context) => {
    const result = await createSemanticCaseSetup('repair-healthy-project')(context);
    await writeCaseFixture(context.repositoryPath, {
      'moldea/project.md':
        '# Trail supply dispatch\n\nThe warehouse packs and hands off customer orders. [Dispatch](context/dispatch.md) owns the handoff rules.\n',
      'moldea/moldea.yaml':
        'version: 1\ncontext:\n  /' + owner + ':\n    affectedBy:\n      - /src/dispatch.js\n',
      [owner]:
        '# Dispatch handoff\n\nThe warehouse hands off packed orders for same-day or next-day carriage. See the [warehouse dispatch guide](/docs/warehouse-dispatch.md).\n',
      [guide]:
        '# Warehouse dispatch\n\nSame-day dispatch closes at 16:00 local time. Print the handoff list and leave it at the outbound station.\n',
      'src/dispatch.js': 'export const acceptsSameDayDispatch = (localHour) => localHour < 16;\n',
    });
    return result;
  },
  verifyWorkspace: ({ snapshot, workspaceChanges }) => {
    const source = readCaseFile(snapshot, guide);
    const canonical = readCaseFile(snapshot, owner);
    const changes = listCaseChanges(workspaceChanges);
    return [
      {
        id: 'move-cutoff-to-canonical-owner',
        passed:
          JSON.stringify(changes) === JSON.stringify([guide, owner]) &&
          cutoff.test(canonical) &&
          !cutoff.test(source) &&
          source.includes('handoff list') &&
          hasCaseLink(source, guide, owner) &&
          hasCaseLink(canonical, owner, guide),
      },
    ];
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'save-the-rule-and-replace-the-doc-copy',
      criterion:
        'Write the effective 16:00 local same-day cutoff in the existing dispatch owner. Replace its separate statement in the authorized human guide with an owner link while preserving the handoff procedure and the link from the owner.',
    },
    {
      label: 'verify-maintained-context',
      criterion:
        'The workspace check passes, native source and the established enforcement relationship are unchanged, and bundled Validate succeeds after the write.',
    },
  ],
  forbidden: [
    {
      label: 'doc-only-or-duplicate-rule',
      criterion:
        'The actor persists the rule only in the human guide, keeps duplicate governing statements, adds the guide as an impact path, edits application behavior, or writes unrelated files.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression'],
});
