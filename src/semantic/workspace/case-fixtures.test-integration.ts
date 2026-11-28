import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';

import {
  loadSemanticCases,
  selectSemanticRecordingCases,
  type ISemanticCase,
} from '../cases/index.ts';
import {
  BULLETIN_GUIDE,
  BULLETIN_SOURCE,
  DISPATCH_CODE,
  DISPATCH_GUIDE,
  EDITORIAL_INSTRUCTION,
  semanticCase as initialization,
} from '../cases/initialize-with-human-guides/case.ts';
import { semanticCase as convergence } from '../cases/repair-converged-owners/case.ts';
import { semanticCase as durableRule } from '../cases/maintain-durable-rule-with-guide/case.ts';
import { semanticCase as docOnlyRule } from '../cases/repair-doc-only-rule/case.ts';
import { semanticCase as disputedPolicy } from '../cases/repair-doc-policy-disagreement/case.ts';
import { semanticCase as staleGuide } from '../cases/repair-stale-linked-guide/case.ts';
import {
  APPROVAL_GATE_PATH,
  DELIVERY_PATHS,
  EDITION_COLLECTION_PATH,
  GOVERNED_EDITION_PATH,
  HUMAN_GUIDES,
  LOCKFILE_PATH,
  MISSING_RELATIONSHIPS,
  MIXED_OWNER,
  REMOVED_PATHS,
  RETAINED_PATHS,
  REVIEW_NOTES_PATH,
  SUMMER_EDITION_PATH,
  UNREFERENCED_SELECTION_PATH,
} from '../cases/repair-mixed-context-owners/setup.ts';

import {
  createActorRepository,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
} from './setup.ts';
import {
  checkCaseScope,
  readCaseFile,
  readCaseImpactPaths,
  writeCaseFixture,
} from './case-fixtures.ts';

const materializeCase = async (root: string, definition: ISemanticCase) =>
  createActorRepository(root, definition, path.join(root, 'home'), path.join(root, 'tools'));
const manifestWithPaths = (entries: Record<string, readonly string[]>): string =>
  'version: 1\ncontext:\n' +
  Object.entries(entries)
    .map(
      ([owner, paths]) =>
        '  /' +
        owner +
        ':\n    affectedBy:\n' +
        paths.map((file) => '      - ' + file + '\n').join(''),
    )
    .join('');
const assertValidFixture = (repositoryPath: string): void => {
  const bundledCli = path.resolve(
    import.meta.dirname,
    '../../../moldea/scripts/moldea-cli/moldea.mjs',
  );
  const result = spawnSync(
    process.execPath,
    [
      bundledCli,
      'validate',
      '--repository',
      repositoryPath,
      '--json',
      '--max-output-bytes',
      '65536',
    ],
    { encoding: 'utf8', timeout: 5_000, maxBuffer: 65_536 },
  );
  expect(result.status, result.stderr).toBe(0);
  const output: unknown = JSON.parse(result.stdout);
  expect(output).toMatchObject({ status: 'valid' });
};

test('convergence fixture exercises approved relocation, the no-edit cycle, and both actual scope probes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-convergence-fixture-'));
  try {
    const { repositoryPath, developerDirection } = await materializeCase(root, convergence);
    const verify = convergence.verifyWorkspace;
    expect(developerDirection).toBe('fix moldea');
    expect(convergence.input.followUpDeveloperRequests).toStrictEqual([
      'Yes, apply that split.',
      'fix moldea',
    ]);
    const before = await snapshotSemanticWorkspace(repositoryPath);
    expect(Buffer.byteLength(readCaseFile(before, MIXED_OWNER))).toBeGreaterThan(8_192);
    expect(readCaseImpactPaths(before).get('/' + MIXED_OWNER)).toStrictEqual([
      ...RETAINED_PATHS,
      GOVERNED_EDITION_PATH,
      ...REMOVED_PATHS,
      LOCKFILE_PATH,
    ]);
    expect(checkCaseScope(repositoryPath, HUMAN_GUIDES[0])?.relevant).toBe(true);
    for (const file of [
      APPROVAL_GATE_PATH,
      REVIEW_NOTES_PATH,
      SUMMER_EDITION_PATH,
      UNREFERENCED_SELECTION_PATH,
    ]) {
      expect(readCaseFile(before, file.slice(1))).not.toBe('');
      expect(checkCaseScope(repositoryPath, file)?.relevant).toBe(false);
    }
    const requestResult = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        'const { prepareReviewNotesRequest } = await import(process.argv[1]); ' +
          'console.log(JSON.stringify(await prepareReviewNotesRequest("Draft")));',
        pathToFileURL(path.join(repositoryPath, 'src/publishing/publish.js')).href,
      ],
      { encoding: 'utf8', timeout: 5_000, maxBuffer: 8_192 },
    );
    expect(requestResult.status, requestResult.stderr).toBe(0);
    expect(JSON.parse(requestResult.stdout)).toStrictEqual({
      instructions: readCaseFile(before, REVIEW_NOTES_PATH.slice(1)),
      input: 'Draft',
    });

    await writeCaseFixture(repositoryPath, {
      [MIXED_OWNER]: readCaseFile(before, MIXED_OWNER).replace(
        'The publishing procedure describes',
        'The [publishing procedure](/docs/publishing-policy.md) describes',
      ),
      'moldea/moldea.yaml': manifestWithPaths({
        [MIXED_OWNER]: [...RETAINED_PATHS, ...MISSING_RELATIONSHIPS, LOCKFILE_PATH],
      }),
    });
    const cleaned = await snapshotSemanticWorkspace(repositoryPath);
    expect(
      verify({
        repositoryPath,
        requestIndex: 0,
        snapshot: cleaned,
        workspaceChanges: diffSemanticWorkspaceSnapshots(before, cleaned),
      }),
    ).toStrictEqual([
      { id: 'pending-split-and-relationship-cleanup', passed: true },
      { id: 'human-doc-links-retained', passed: true },
    ]);

    const refund = 'moldea/context/returns-policy.md';
    const editorial = 'moldea/context/issues.md';
    const web = 'moldea/context/delivery.md';
    await rm(path.join(repositoryPath, MIXED_OWNER));
    await writeCaseFixture(repositoryPath, {
      'moldea/project.md':
        '# Shop and journal\n\n[Refunds](context/returns-policy.md) for returns. [Editorial](context/issues.md) for issues. [Delivery](context/delivery.md) for the public site.\n',
      [refund]:
        '# Refunds\n\nRefunds are permitted within 14 days. See the [desk guide](/docs/refund-desk.md).\n',
      [editorial]:
        '# Editorial\n\nAn editor must approve articles before publication. The [review gate](/src/publishing/review-gate.js) checks the reviewer and [publication](/src/publishing/publish.js) checks approval. The [review notes prompt](/prompts/review-notes.md) summarizes open questions for the editor. Sources under `content/editions` govern each edition’s articles and order. See the [review guide](/docs/editorial-review.md) and [release handoff](/docs/publishing-policy.md).\n',
      [web]:
        '# Delivery\n\nThe layout renders sponsor names. Canonical URLs end in a slash. Production builds are manually dispatched.\n',
      'moldea/moldea.yaml': manifestWithPaths({
        [refund]: [RETAINED_PATHS[0]],
        [editorial]: [...MISSING_RELATIONSHIPS, RETAINED_PATHS[1]],
        [web]: [...DELIVERY_PATHS, LOCKFILE_PATH],
      }),
    });
    const split = await snapshotSemanticWorkspace(repositoryPath);
    expect(
      verify({
        repositoryPath,
        requestIndex: 1,
        snapshot: split,
        workspaceChanges: diffSemanticWorkspaceSnapshots(cleaned, split),
      }),
    ).toStrictEqual([{ id: 'approved-split-applied', passed: true }]);
    const final = {
      repositoryPath,
      requestIndex: 2,
      snapshot: split,
      workspaceChanges: diffSemanticWorkspaceSnapshots(split, split),
    };
    expect(verify(final)).toStrictEqual([
      { id: 'plain-fix-byte-identical', passed: true },
      { id: 'guide-path-selects-no-owner', passed: true },
      { id: 'edition-selects-editorial-owner', passed: true },
    ]);
    assertValidFixture(repositoryPath);
    expect(
      verify({ ...final, workspaceChanges: diffSemanticWorkspaceSnapshots(cleaned, split) })[0]
        ?.passed,
    ).toBe(false);
    expect(checkCaseScope(repositoryPath, UNREFERENCED_SELECTION_PATH)?.relevant).toBe(false);
    await writeCaseFixture(repositoryPath, {
      'moldea/moldea.yaml': manifestWithPaths({
        [refund]: [RETAINED_PATHS[0]],
        [editorial]: [APPROVAL_GATE_PATH, REVIEW_NOTES_PATH, RETAINED_PATHS[1]],
        [web]: [...DELIVERY_PATHS, LOCKFILE_PATH, EDITION_COLLECTION_PATH],
      }),
    });
    const misrouted = await snapshotSemanticWorkspace(repositoryPath);
    const misroutedEdition = verify({ ...final, snapshot: misrouted }).find(
      ({ id }) => id === 'edition-selects-editorial-owner',
    );
    expect(misroutedEdition?.passed).toBe(false);

    await writeCaseFixture(repositoryPath, {
      'moldea/moldea.yaml': manifestWithPaths({
        [refund]: [RETAINED_PATHS[0]],
        [editorial]: [
          APPROVAL_GATE_PATH,
          REVIEW_NOTES_PATH,
          RETAINED_PATHS[1],
          GOVERNED_EDITION_PATH,
          SUMMER_EDITION_PATH,
        ],
        [web]: [...DELIVERY_PATHS, LOCKFILE_PATH],
      }),
    });
    const enumerated = await snapshotSemanticWorkspace(repositoryPath);
    const enumeratedEditions = verify({ ...final, snapshot: enumerated }).find(
      ({ id }) => id === 'edition-selects-editorial-owner',
    );
    expect(enumeratedEditions?.passed).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('confirmed initialization checks the actual routes, source-doc replacements, and only eligible path roles', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-init-guides-fixture-'));
  try {
    const { repositoryPath, developerDirection } = await materializeCase(root, initialization);
    const snapshot = await snapshotSemanticWorkspace(repositoryPath);
    expect(developerDirection).toBe('initialize moldea');
    expect(initialization.input.followUpDeveloperRequests).toStrictEqual(['Yes.', 'Stop here.']);
    expect(snapshot.has('moldea/moldea.yaml')).toBe(false);
    expect(
      initialization.verifyWorkspace({
        repositoryPath,
        requestIndex: 0,
        snapshot,
        workspaceChanges: diffSemanticWorkspaceSnapshots(snapshot, snapshot),
      }),
    ).toStrictEqual([{ id: 'human-rules-unaltered-before-confirmation', passed: true }]);
    const dispatch = 'moldea/context/order-handoff.md';
    const bulletin = 'moldea/context/community-bulletin.md';
    await writeCaseFixture(repositoryPath, {
      'moldea/project.md':
        '# Cooperative\n\n[Order handoff](context/order-handoff.md) governs dispatch. [Community bulletin](context/community-bulletin.md) governs publication.\n',
      'moldea/moldea.yaml': manifestWithPaths({
        [dispatch]: [DISPATCH_CODE],
        [bulletin]: [EDITORIAL_INSTRUCTION, BULLETIN_SOURCE],
      }),
      [dispatch]:
        '# Order handoff\n\nSame-day dispatch ends at 16:00 local time. See [dispatch procedure](/docs/dispatch-procedure.md).\n',
      [bulletin]:
        '# Community bulletin\n\nThe bulletin editor must approve each edition before publishing. See [bulletin policy](/docs/bulletin-policy.md).\n',
      [DISPATCH_GUIDE]:
        '# Dispatch procedure\n\nSee [order handoff](/moldea/context/order-handoff.md). Use the packing list to sort orders into collection and delivery. Report a missed collection in shift notes.\n',
      [BULLETIN_GUIDE]:
        '# Bulletin policy\n\nSee [community bulletin](/moldea/context/community-bulletin.md). Use the checklist to compile questions into one message for the editor. Record the approved edition in the issue log.\n',
    });
    const after = await snapshotSemanticWorkspace(repositoryPath);
    const final = {
      repositoryPath,
      requestIndex: 1,
      snapshot: after,
      workspaceChanges: diffSemanticWorkspaceSnapshots(snapshot, after),
    };
    expect(initialization.verifyWorkspace(final)).toStrictEqual([
      { id: 'focused-canonical-rules-linked-and-routed', passed: true },
      { id: 'source-doc-statements-replaced', passed: true },
      { id: 'eligible-relationships-only', passed: true },
    ]);
    assertValidFixture(repositoryPath);
    expect(initialization.verifyWorkspace({ ...final, snapshot })[1]?.passed).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the official selection contains the plain requests and keeps the answer key out of them', async () => {
  const cases = await loadSemanticCases(path.resolve(import.meta.dirname, '../cases'));
  const publicCases = selectSemanticRecordingCases(cases);
  const byId = new Map(publicCases.map((definition) => [definition.id, definition]));
  for (const id of [
    'repair-mixed-context-owners',
    'repair-converged-owners',
    'repair-healthy-project',
    'repair-stale-linked-guide',
    'repair-doc-policy-disagreement',
    'repair-doc-only-rule',
    'repair-mixed-strict-scope',
  ]) {
    expect(byId.get(id)?.input.developerDirection).toBe('fix moldea');
    expect(typeof byId.get(id)?.verifyWorkspace).toBe('function');
  }
  expect(byId.get('initialize-with-human-guides')?.input.developerDirection).toBe(
    'initialize moldea',
  );
  expect(byId.get('maintain-durable-rule-with-guide')?.input.developerDirection).not.toContain(
    'canonical',
  );
  expect(byId.has('exact-binding-relevance')).toBe(true);
  expect(publicCases.every(({ publication }) => publication !== 'private')).toBe(true);
});

test('same-repository doc correction and authorized Maintain moves require actual workspace deltas', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-rule-moves-fixture-'));
  try {
    for (const [definition, fix] of [
      [
        staleGuide,
        (snapshot: Awaited<ReturnType<typeof snapshotSemanticWorkspace>>) => ({
          'docs/delivery-retries.md': readCaseFile(snapshot, 'docs/delivery-retries.md').replace(
            'two delivery attempts',
            'three delivery attempts',
          ),
        }),
      ],
      [
        durableRule,
        (snapshot: Awaited<ReturnType<typeof snapshotSemanticWorkspace>>) => ({
          'moldea/context/dispatch.md':
            readCaseFile(snapshot, 'moldea/context/dispatch.md') +
            '\nSame-day dispatch closes at 16:00 local time.\n',
          'docs/warehouse-dispatch.md': readCaseFile(
            snapshot,
            'docs/warehouse-dispatch.md',
          ).replace(
            'Same-day dispatch closes at 16:00 local time.',
            'See [the dispatch cutoff](/moldea/context/dispatch.md).',
          ),
        }),
      ],
    ] as const) {
      const { repositoryPath } = await materializeCase(path.join(root, definition.id), definition);
      const before = await snapshotSemanticWorkspace(repositoryPath);
      const verify = (snapshot: typeof before) =>
        definition.verifyWorkspace({
          repositoryPath,
          requestIndex: 0,
          snapshot,
          workspaceChanges: diffSemanticWorkspaceSnapshots(before, snapshot),
        });
      expect(verify(before).every(({ passed }) => passed)).toBe(false);
      await writeCaseFixture(repositoryPath, fix(before));
      expect(
        verify(await snapshotSemanticWorkspace(repositoryPath)).every(({ passed }) => passed),
      ).toBe(true);
      assertValidFixture(repositoryPath);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each([docOnlyRule, disputedPolicy])(
  'approval-only case $id detects any premature workspace edit',
  async (definition) => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-rule-pause-fixture-'));
    try {
      const { repositoryPath } = await materializeCase(root, definition);
      const before = await snapshotSemanticWorkspace(repositoryPath);
      const verify = (snapshot: typeof before) =>
        definition.verifyWorkspace({
          repositoryPath,
          requestIndex: 0,
          snapshot,
          workspaceChanges: diffSemanticWorkspaceSnapshots(before, snapshot),
        });
      expect(verify(before).every(({ passed }) => passed)).toBe(true);
      await writeCaseFixture(repositoryPath, {
        'moldea/project.md': '# Changed before the developer’s decision\n',
      });
      expect(
        verify(await snapshotSemanticWorkspace(repositoryPath)).every(({ passed }) => passed),
      ).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
