// @vitest-environment node
import type * as crypto from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { writeFileAtomic, writeJsonFile } from 'jg-fs';

import {
  createSyntheticJourneysBundle,
  createSyntheticLegacyJourneysBundle,
} from '../../../website/scripts/evidence-fixture/journeys.ts';
import {
  createEvidenceBundle,
  decodeEvidenceBundle,
  encodeEvidenceBundle,
  getCompletedEvidenceRunPath,
  packCompletedEvidenceRun,
  readCompletedEvidenceRun,
  storeCompletedEvidenceRun,
  prepareSelectedEvidence,
  verifyPreparedReleaseEvidence,
  type IEvidenceBundle,
  type IEvidenceSelectionReference,
} from '../../evidence/index.ts';
import { calculateSha256 } from '../../filesystem/index.ts';
import type { IJourneyPlatform } from '../index.ts';
import {
  createJourneySnapshotEvidenceBundle,
  parseJourneysEvidenceRecord,
} from '../public-evidence/index.ts';

import { composeJourneySnapshot } from './index.ts';

vi.mock('node:crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof crypto>()),
  randomBytes: (size: number) => Buffer.alloc(size, 0xab),
}));

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('refuses an existing snapshot destination and preserves its exact bytes', async () => {
  const root = await temporaryRoot();
  const record = campaign();
  await storeCompletedEvidenceRun(root, record);
  vi.spyOn(Date, 'now').mockReturnValue(1767312000000);
  const destination = getCompletedEvidenceRunPath(
    root,
    'journeys',
    'journey-snapshot-1767312000000-abababab',
  );
  await writeFile(destination, 'existing snapshot');
  await expect(
    composeJourneySnapshot({ repositoryRoot: root, runId: record.run.attemptId }),
  ).rejects.toThrow('already exists');
  await expect(readFile(destination, 'utf8')).resolves.toBe('existing snapshot');
});

test.each(['count', 'bytes'] as const)(
  'rejects aggregate artifact %s overflow without mutating either input',
  (limit) => {
    const rich = (record: IEvidenceBundle, seed: number) =>
      createEvidenceBundle({
        kind: record.kind,
        classification: record.classification,
        payload: record.payload,
        run: record.run,
        artifacts: [
          ...record.artifacts.files.map((file) => ({
            path: file.path,
            mediaType: file.mediaType,
            content: Buffer.from(
              record.artifacts.blobs.find((blob) => blob.sha256 === file.sha256)!.contentBase64,
              'base64',
            ),
          })),
          ...Array.from({ length: limit === 'count' ? 4096 : 4 }, (_, index) => ({
            path: `extra-${index}.txt`,
            mediaType: 'text/plain',
            content: Buffer.alloc(limit === 'count' ? 1 : 8 * 1024 * 1024, seed + index),
          })),
        ],
      });
    const baseline = rich(campaign(), 1);
    const incoming = rich(campaign({ runId: '20260103-aabbcc' }), 8);
    const baselineHashes = baseline.artifacts.files.map(({ sha256 }) => sha256);
    const incomingHashes = incoming.artifacts.files.map(({ sha256 }) => sha256);
    expect(() => compose(incoming, baseline, { platform: 'chatgpt' })).toThrow(
      limit === 'count' ? 'count exceeds limit' : 'decoded artifacts exceed limit',
    );
    expect(baseline.artifacts.files.map(({ sha256 }) => sha256)).toStrictEqual(baselineHashes);
    expect(incoming.artifacts.files.map(({ sha256 }) => sha256)).toStrictEqual(incomingHashes);
  },
  30000,
);
const temporaryRoot = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'journey-snapshots-'));
  roots.push(root);
  return root;
};
const campaign = (
  input: {
    runId?: string;
    catalog?: string[];
    selected?: string[];
    providers?: IJourneyPlatform[];
    request?: string;
    skill?: string;
    method?: string;
    pending?: boolean;
  } = {},
): IEvidenceBundle =>
  createSyntheticJourneysBundle({
    transform: (assessment) => {
      assessment.runId = input.runId ?? '20260102-aabbcc';
      assessment.bundle.runId = assessment.runId;
      assessment.evaluatedAt = '2026-01-02T00:00:00.000Z';
      const catalog = input.catalog ?? ['initialize', 'additional-1'];
      const selected = input.selected ?? catalog;
      assessment.definitions = assessment.definitions.filter(({ id }) => catalog.includes(id));
      if (input.request) assessment.definitions[0]!.steps[0]!.request = input.request;
      if (input.skill) assessment.bundle.skill.version = input.skill;
      if (input.method) {
        assessment.assessor.sourceSha256 = input.method;
        assessment.bundle.assessorSourceSha256 = input.method;
      }
      assessment.platforms = assessment.platforms.filter(({ platform }) =>
        (input.providers ?? ['chatgpt', 'claude']).includes(platform),
      );
      for (const provider of assessment.platforms) {
        provider.trials = provider.trials.filter(
          (trial) => !input.pending || trial.kind === 'initial',
        );
        for (const trial of provider.trials) {
          trial.selectedJourneys = trial.selectedJourneys.filter((id) => selected.includes(id));
          trial.journeys = trial.journeys.filter(({ id }) => selected.includes(id));
          trial.restartCounts = Object.fromEntries(trial.selectedJourneys.map((id) => [id, 0]));
        }
        provider.trials = provider.trials.filter((trial) => trial.selectedJourneys.length > 0);
      }
    },
  });
const compose = (
  incoming: IEvidenceBundle,
  previous?: IEvidenceBundle,
  selectors: { platform?: IJourneyPlatform; journeys?: string[] } = {},
) =>
  createJourneySnapshotEvidenceBundle({
    incoming,
    ...(previous ? { previous } : {}),
    runId: 'journey-snapshot-1767312000000-abcdef01',
    evaluatedAt: '2026-01-02T00:00:00.000Z',
    ...selectors,
  });
const cellSource = (bundle: IEvidenceBundle, provider: IJourneyPlatform, journey: string) => {
  const { model } = parseJourneysEvidenceRecord(bundle);
  const cell = model.cells.find(
    (cell) => cell.platform === provider && cell.journeyId === journey,
  )!;
  return model.sources.find(({ id }) => id === cell.sourceId)!;
};

test('retains historical evidence with exact original downloads and no fabricated confirmation identity', () => {
  const legacy = createSyntheticLegacyJourneysBundle();
  const legacyBytes = encodeEvidenceBundle(legacy);
  expect(parseJourneysEvidenceRecord(legacy).model.status).toBe('failed');
  const snapshot = compose(campaign(), legacy, { platform: 'chatgpt' });
  const retained = cellSource(snapshot, 'claude', 'initialize');
  expect(retained.kind).toBe('legacy');
  expect(retained).not.toHaveProperty('assessment');
  expect(snapshot.run.status).toBe('incomplete');
  expect(encodeEvidenceBundle(legacy)).toStrictEqual(legacyBytes);
  const raw = legacy.artifacts.files.find(({ path }) => path === 'assessment.json')!;
  expect(
    snapshot.artifacts.files.find(
      ({ path }) => path === `sources/${raw.sha256.slice(0, 16)}/assessment.json`,
    )?.sha256,
  ).toBe(raw.sha256);
  const forged = structuredClone(legacy);
  (
    forged.payload as { websiteModel: { journeys: { steps: { request: string }[] }[] } }
  ).websiteModel.journeys[0]!.steps[0]!.request = 'Forged historical request';
  expect(() => compose(campaign(), forged)).toThrow('Historical request association mismatch');
});

test('stores immutable snapshots, replaces ChatGPT alone, packs exact artifacts, then adds a ChatGPT-only test', async () => {
  const root = await temporaryRoot();
  const baseline = campaign();
  const update = campaign({ runId: '20260103-aabbcc' });
  await storeCompletedEvidenceRun(root, baseline);
  await storeCompletedEvidenceRun(root, update);
  const originalBytes = await readFile(
    getCompletedEvidenceRunPath(root, 'journeys', baseline.run.attemptId),
  );
  const first = await composeJourneySnapshot({
    repositoryRoot: root,
    runId: baseline.run.attemptId,
  });
  const firstRecord = await readCompletedEvidenceRun(root, 'journeys', first.runId);
  expect(firstRecord.run.status).toBe('passed');
  expect(firstRecord.classification).toBe('fixture');
  const firstBytes = await readFile(first.recordPath);
  const second = await composeJourneySnapshot({
    repositoryRoot: root,
    runId: update.run.attemptId,
    from: first.runId,
    platform: 'chatgpt',
  });
  const secondRecord = await readCompletedEvidenceRun(root, 'journeys', second.runId);
  const before = cellSource(firstRecord, 'claude', 'initialize');
  expect(cellSource(secondRecord, 'claude', 'initialize')).toStrictEqual(before);
  expect(cellSource(secondRecord, 'chatgpt', 'initialize').id).not.toBe(before.id);
  expect(parseJourneysEvidenceRecord(secondRecord).model.sources).toHaveLength(2);
  for (const artifact of firstRecord.artifacts.files) {
    expect(secondRecord.artifacts.files.find(({ path }) => path === artifact.path)).toStrictEqual(
      artifact,
    );
  }
  await expect(readFile(first.recordPath)).resolves.toStrictEqual(firstBytes);
  await expect(
    readFile(getCompletedEvidenceRunPath(root, 'journeys', baseline.run.attemptId)),
  ).resolves.toStrictEqual(originalBytes);
  const packed = path.join(root, 'snapshot.json.gz');
  await packCompletedEvidenceRun(root, 'journeys', second.runId, packed);
  expect(decodeEvidenceBundle(await readFile(packed))).toStrictEqual(secondRecord);
  const added = campaign({
    runId: '20260104-aabbcc',
    catalog: ['initialize', 'additional-1', 'additional-2'],
    selected: ['additional-2'],
    providers: ['chatgpt'],
  });
  const third = compose(added, secondRecord);
  const model = parseJourneysEvidenceRecord(third).model;
  expect(
    model.cells.some((cell) => cell.platform === 'claude' && cell.journeyId === 'additional-2'),
  ).toBe(false);
  expect(cellSource(third, 'claude', 'initialize')).toStrictEqual(before);
  expect(model.coverage.map(({ current, total }) => [current, total])).toStrictEqual([
    [3, 3],
    [2, 3],
  ]);
  expect(third.run.status).toBe('incomplete');
  expect(model.journeys.map(({ id }) => id)).toStrictEqual([
    'initialize',
    'additional-1',
    'additional-2',
  ]);
});

test('selects whole failed groups and replaces pending evidence without combining votes or hiding the baseline', () => {
  const pending = campaign({ catalog: ['recovered'], providers: ['chatgpt'], pending: true });
  const resolved = campaign({
    runId: '20260103-aabbcc',
    catalog: ['recovered'],
    providers: ['chatgpt'],
  });
  const original = compose(pending);
  const next = compose(resolved, original, { journeys: ['recovered'] });
  const source = cellSource(next, 'chatgpt', 'recovered');
  if (source.kind !== 'campaign') throw new Error('Expected campaign.');
  expect(
    source.assessment.platforms[0]!.trials.map((trial) => trial.journeys[0]!.status),
  ).toStrictEqual(['failed', 'passed', 'passed']);
  expect(source.assessment.platforms[0]!.resolutions[0]!.status).toBe('recovered');
  expect(parseJourneysEvidenceRecord(next).model.sources).toHaveLength(1);
  expect(parseJourneysEvidenceRecord(original).model.sources[0]!.id).not.toBe(source.id);
  expect(next.run.status).toBe('incomplete');
});

test.each(['request', 'skill', 'method'] as const)(
  'retains original requests and marks mixed %s inputs incomplete',
  (changed) => {
    const old = campaign();
    const fresh = campaign({
      runId: '20260103-aabbcc',
      ...(changed === 'request'
        ? { request: 'Initialize using the revised request.' }
        : changed === 'skill'
          ? { skill: '0.0.1-fixture' }
          : { method: '1'.repeat(64) }),
    });
    const snapshot = compose(fresh, old, { platform: 'chatgpt' });
    expect(snapshot.run.status).toBe('incomplete');
    const earlier = cellSource(snapshot, 'claude', 'initialize');
    if (earlier.kind !== 'campaign') throw new Error('Expected campaign.');
    expect(earlier.assessment.definitions[0]!.steps[0]!.request).toBe('Initialize moldea.');
  },
);

test('retains earlier-only catalog rows, including unrun requests, and prunes only genuinely unreferenced sources', () => {
  const old = campaign({ catalog: ['initialize', 'additional-1'], selected: ['additional-1'] });
  const incoming = campaign({ runId: '20260103-aabbcc', catalog: ['additional-1'] });
  const snapshot = compose(incoming, old);
  const model = parseJourneysEvidenceRecord(snapshot).model;
  expect(model.journeys.map(({ id, current }) => [id, current])).toStrictEqual([
    ['additional-1', true],
    ['initialize', false],
  ]);
  expect(model.sources).toHaveLength(2);
  expect(model.journeys[1]!.catalogSourceId).toBe(
    parseJourneysEvidenceRecord(old).model.currentSourceId,
  );
  expect(model.coverage.map(({ current, total }) => [current, total])).toStrictEqual([
    [1, 1],
    [1, 1],
  ]);
  const replaced = compose(campaign({ runId: '20260104-aabbcc' }), campaign());
  expect(parseJourneysEvidenceRecord(replaced).model.sources).toHaveLength(1);
  const repeated = compose(campaign(), compose(campaign()));
  expect(parseJourneysEvidenceRecord(repeated).model.sources).toHaveLength(1);
  expect(repeated.artifacts.files.every(({ path }) => !path.includes('/sources/'))).toBe(true);
});

test.each([
  [{ platform: 'claude' as const }],
  [{ journeys: ['unknown'] }],
  [{ journeys: ['additional-1'] }],
  [{ journeys: ['initialize', 'initialize'] }],
  [{ journeys: [] }],
])('rejects absent or ambiguous explicit selectors %o', (selectors) => {
  const incoming = campaign({
    catalog: ['initialize', 'additional-1'],
    selected: ['initialize'],
    providers: ['chatgpt'],
  });
  expect(() => compose(incoming, undefined, selectors)).toThrow();
});

test('rejects snapshot input as an incoming campaign and never upgrades fixture sources', () => {
  const fixture = campaign();
  const official = { ...fixture, classification: 'official' as const };
  expect(compose(official).classification).toBe('official');
  expect(compose(official, compose(fixture)).classification).toBe('fixture');
  expect(() => compose(compose(fixture))).toThrow('direct admitted version 2 campaign');
});

test.each([
  'resolution',
  'raw-source',
  'capture',
  'missing-artifact',
  'namespace',
  'row-source',
  'envelope',
] as const)('rejects forged %s associations before composition', (kind) => {
  const record = compose(campaign());
  const payload = record.payload as {
    websiteModel: ReturnType<typeof parseJourneysEvidenceRecord>['model'];
  };
  const model = payload.websiteModel;
  const source = model.sources[0]!;
  if (source.kind !== 'campaign') throw new Error('Expected campaign.');
  if (kind === 'resolution')
    source.assessment.platforms[0]!.resolutions[0]!.status = 'confirmed-failure';
  if (kind === 'raw-source')
    source.assessment.platforms[0]!.trials[0]!.observation!.observedAt = null;
  if (kind === 'capture')
    source.captures['chatgpt/initialize/initial/initialize']!.patch = 'forged';
  if (kind === 'missing-artifact') record.artifacts.files.pop();
  if (kind === 'namespace') source.artifactRoot = '/evidence-assets/journeys/sources/../../';
  if (kind === 'row-source') model.journeys[0]!.catalogSourceId = '0'.repeat(64);
  if (kind === 'envelope') record.run.status = 'incomplete';
  expect(() => compose(campaign({ runId: '20260103-aabbcc' }), record)).toThrow();
});

test('prepares partial composed records while full matching official observations satisfy the existing gate', async () => {
  const root = await temporaryRoot();
  const semantic = createEvidenceBundle({
    kind: 'semantic',
    classification: 'official',
    payload: {},
    run: {
      attemptId: 'semantic-fixture',
      evaluatedAt: '2026-01-02T00:00:00.000Z',
      status: 'passed',
      version: 'fixture',
      provenance: {},
    },
  });
  for (const isPartial of [false, true]) {
    const incoming = campaign({ ...(isPartial ? { providers: ['chatgpt'] } : {}) });
    incoming.classification = 'official';
    const snapshot = compose(incoming);
    const bytes = new Map(
      [semantic, snapshot].map((record) => [record.kind, encodeEvidenceBundle(record)]),
    );
    const reference = (kind: 'semantic' | 'journeys'): IEvidenceSelectionReference => ({
      assetName: `${kind}-fixture.json.gz`,
      classification: 'official',
      repository: 'moldea-ai/skill',
      tag: `evidence-${kind}-fixture`,
      sha256: calculateSha256(bytes.get(kind)!),
    });
    const selectionPath = path.join(root, 'selection.json');
    await writeJsonFile(selectionPath, {
      formatVersion: 1,
      semantic: reference('semantic'),
      journeys: reference('journeys'),
    });
    const options = {
      selectionPath,
      cacheDirectory: path.join(root, 'cache'),
      preparedDirectory: path.join(root, 'prepared'),
      downloadAsset: async (ref: IEvidenceSelectionReference, destination: string) => {
        await writeFileAtomic(
          destination,
          bytes.get(ref.assetName.startsWith('semantic') ? 'semantic' : 'journeys')!,
        );
      },
    };
    const manifest = await prepareSelectedEvidence(options);
    expect(manifest.journeys).not.toBeNull();
    if (isPartial)
      await expect(verifyPreparedReleaseEvidence(options)).rejects.toThrow(
        'requires passing official journeys',
      );
    else await expect(verifyPreparedReleaseEvidence(options)).resolves.toStrictEqual(manifest);
  }
});

test('reads only explicit portable local IDs and rejects invalid selections without writes', async () => {
  const root = await temporaryRoot();
  const record = campaign();
  const sourcePath = await storeCompletedEvidenceRun(root, record);
  const before = await readdir(path.dirname(sourcePath));
  await expect(
    composeJourneySnapshot({ repositoryRoot: root, runId: '../outside' }),
  ).rejects.toThrow('portable');
  await expect(
    composeJourneySnapshot({
      repositoryRoot: root,
      runId: record.run.attemptId,
      journeys: ['absent'],
    }),
  ).rejects.toThrow();
  expect(await readdir(path.dirname(sourcePath))).toStrictEqual(before);
});

test.skipIf(process.platform === 'win32')(
  'refuses linked source records without writes',
  async () => {
    const root = await temporaryRoot();
    const record = campaign();
    const sourcePath = await storeCompletedEvidenceRun(root, record);
    const before = await readdir(path.dirname(sourcePath));
    await writeFile(path.join(root, 'outside.json'), JSON.stringify(record));
    await symlink(
      path.join(root, 'outside.json'),
      getCompletedEvidenceRunPath(root, 'journeys', 'linked'),
    );
    await expect(composeJourneySnapshot({ repositoryRoot: root, runId: 'linked' })).rejects.toThrow(
      'symlink',
    );
    expect(await readdir(path.dirname(sourcePath))).toStrictEqual(
      [...before, 'linked.json'].sort(),
    );
  },
);
