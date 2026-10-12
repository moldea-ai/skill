import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { executeProcess } from '../../process/index.ts';
import {
  COMMAND_TIMEOUT_MS,
  EXCLUDED_DIRECTORIES,
  MAXIMUM_ARCHIVE_BYTES,
  MAXIMUM_ARCHIVE_ENTRIES,
  MAXIMUM_ENTRY_BYTES,
} from '../index.ts';
import {
  JourneysBundleSchema,
  JourneysExportSchema,
  JourneyFileHashesSchema,
  JourneyStepRecordSchema,
  type IJourneysBundle,
  type IJourneysExport,
} from '../index.ts';

// state is private to a single extracted bundle and isolated sandbox workspace
export const HarnessStateSchema = z.strictObject({
  bundleDirectory: z.string(),
  bundleZip: z.string(),
  bundleSha256: z.string(),
  platform: z.enum(['chatgpt', 'claude']),
  trialId: JourneysExportSchema.shape.trialId,
  kind: JourneysExportSchema.shape.kind,
  selectedJourneys: JourneysExportSchema.shape.selectedJourneys,
  confirmationIndex: JourneysExportSchema.shape.confirmationIndex,
  environment: z.record(z.string(), z.string()),
  records: z.array(JourneyStepRecordSchema),
  completedJourneys: z.array(z.string()),
  checkpointedJourneys: z.array(z.string()),
  restartCounts: z.record(z.string(), z.number().int().nonnegative()),
  checkpoint: z.number().int().nonnegative(),
  pending: z
    .strictObject({
      journeyId: z.string(),
      stepId: z.string(),
      issuedAt: z.iso.datetime(),
      previousHead: z.string(),
    })
    .nullable(),
});
export type IHarnessState = z.infer<typeof HarnessStateSchema>;

/** Rejects nonportable or escaping logical paths before filesystem access. */
export const assertSafePath = (relativePath: string, allowNpmCache = false): void => {
  const isCacheContent =
    allowNpmCache &&
    /^(?:journeys-\d{8}-[a-f0-9]{6}\/)?(?:npm-cache\/)?(?:_cacache\/)?content-v2\/sha512\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{124}$/u.test(
      relativePath,
    );
  if (
    !relativePath ||
    relativePath.length > (isCacheContent ? 256 : 160) ||
    relativePath.includes('\\') ||
    relativePath.startsWith('/')
  )
    throw new Error(`Unsafe path: ${relativePath}`);
  for (const component of relativePath.split('/')) {
    if (
      !/^[a-zA-Z0-9_.@-]+$/u.test(component) ||
      component.length > (isCacheContent ? 124 : 64) ||
      component === '.' ||
      component === '..' ||
      /[. ]$/u.test(component) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(component) ||
      EXCLUDED_DIRECTORIES.includes(component)
    )
      throw new Error(`Unsafe path: ${relativePath}`);
  }
};

/** Resolves a validated logical path below a trusted directory. */
export const containedPath = (
  root: string,
  relativePath: string,
  allowNpmCache = false,
): string => {
  assertSafePath(relativePath, allowNpmCache);
  const candidate = path.resolve(root, ...relativePath.split('/'));
  const relative = path.relative(path.resolve(root), candidate);
  if (
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error(`Path escapes root: ${relativePath}`);
  return candidate;
};

/** Hashes exchange bytes without interpreting their contents. */
export const sha256 = (bytes: string | Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

/** Inventories bounded regular files; refuses links and special files before reading. */
export const treeHashes = async (
  root: string,
  ignored: string[] = [],
  allowNpmCache = false,
): Promise<Record<string, string>> => {
  const hashes = Object.create(null) as Record<string, string>;
  let bytes = 0;
  let count = 0;
  const seen = new Set<string>();
  const visit = async (directory: string, prefix: string): Promise<void> => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      if (ignored.includes(entry.name)) continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      assertSafePath(relativePath, allowNpmCache);
      if (++count > MAXIMUM_ARCHIVE_ENTRIES || seen.has(relativePath.toLowerCase()))
        throw new Error('Too many entries or case-insensitive path collision.');
      seen.add(relativePath.toLowerCase());
      const absolutePath = containedPath(root, relativePath, allowNpmCache);
      const stat = await lstat(absolutePath);
      if (stat.isDirectory()) await visit(absolutePath, relativePath);
      else if (stat.isFile()) {
        bytes += stat.size;
        if (stat.size > MAXIMUM_ENTRY_BYTES || bytes > MAXIMUM_ARCHIVE_BYTES)
          throw new Error('Tree exceeds exchange size limits.');
        hashes[relativePath] = sha256(await readFile(absolutePath));
      } else throw new Error(`Non-regular entry: ${relativePath}`);
    }
  };
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
    throw new Error('Tree root must be a real directory.');
  await visit(root, '');
  return Object.fromEntries(
    Object.entries(hashes).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  );
};

/** Computes a portable directory digest from sorted logical paths and file hashes. */
export const treeDigest = async (
  root: string,
  ignored: string[] = [],
  allowNpmCache = false,
): Promise<string> => sha256(JSON.stringify(await treeHashes(root, ignored, allowNpmCache)));

/** Compares exact file inventories, including unexpected files and deletions. */
export const assertHashes = (
  actual: Record<string, string>,
  expected: Record<string, string>,
  label: string,
): void => {
  const paths = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  for (const relativePath of paths)
    if (actual[relativePath] !== expected[relativePath])
      throw new Error(`${label} hash mismatch: ${relativePath}`);
};

/** Reads one JSON document as unknown for schema validation at the boundary. */
export const readJson = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(file, 'utf8')) as unknown;

/** Executes a bounded command without a shell or inherited package-manager configuration. */
export const runCommand = async (
  command: string,
  args: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env,
  accepted = [0],
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  return await executeProcess({
    command,
    args,
    cwd,
    environment,
    expectedExitCodes: accepted,
    signal: AbortSignal.timeout(COMMAND_TIMEOUT_MS),
  });
};

/** Copies only already-scanned regular files, excluding sandbox tooling when requested. */
export const copyTree = async (
  source: string,
  destination: string,
  ignored: string[] = [],
  allowNpmCache = false,
): Promise<void> => {
  const hashes = await treeHashes(source, ignored, allowNpmCache);
  await mkdir(destination, { recursive: true });
  for (const relativePath of Object.keys(hashes)) {
    const target = containedPath(destination, relativePath, allowNpmCache);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(containedPath(source, relativePath, allowNpmCache), target, { dereference: false });
  }
};

/** Verifies extracted bundle identity, exact file set, skill bytes, and offline cache. */
export const verifyBundle = async (directory: string): Promise<IJourneysBundle> => {
  const all = await treeHashes(directory, [], true);
  const manifest = JourneysBundleSchema.parse(
    await readJson(path.join(directory, 'manifest.json')),
  );
  const actual = Object.fromEntries(
    Object.entries(all).filter(
      ([name]) => name !== 'manifest.json' && !name.startsWith('npm-cache/'),
    ),
  );
  assertHashes(actual, manifest.files, 'Bundle');
  if ((await treeDigest(path.join(directory, 'npm-cache'), [], true)) !== manifest.npmCache.sha256)
    throw new Error('Bundle npm cache digest mismatch.');
  if ((await treeDigest(path.join(directory, 'skill/moldea'))) !== manifest.skill.treeSha256)
    throw new Error('Bundle skill tree digest mismatch.');
  const ids = manifest.journeys.map((journey) => journey.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate bundled journey.');
  return manifest;
};

/** Verifies a checkpoint's complete hash list before reading its recorded outputs. */
export const verifyExport = async (
  directory: string,
): Promise<z.infer<typeof JourneysExportSchema>> => {
  const all = await treeHashes(directory);
  const files = JourneyFileHashesSchema.parse(await readJson(path.join(directory, 'files.json')));
  assertHashes(
    Object.fromEntries(Object.entries(all).filter(([name]) => name !== 'files.json')),
    files,
    'Export',
  );
  const manifest = JourneysExportSchema.parse(
    await readJson(path.join(directory, 'manifest.json')),
  );
  const captures = new Set(
    manifest.steps.flatMap((step) =>
      ['changes.patch', 'reply.md', 'activity.json', 'changes.json'].map(
        (name) => `steps/${step.journeyId}/${step.stepId}/${name}`,
      ),
    ),
  );
  if (
    Object.keys(all).some(
      (name) =>
        name !== 'manifest.json' &&
        name !== 'files.json' &&
        !captures.has(name) &&
        !manifest.completedJourneys.some((id) => name.startsWith(`journeys/${id}/final/`)),
    )
  )
    throw new Error('Unexpected export entry outside selected captures.');
  return manifest;
};

/** Validates checkpoint identity and exact ordered step coverage before reconstruction. */
export const assertCheckpointIdentity = (
  bundle: IJourneysBundle,
  exported: IJourneysExport,
  definitions: { id: string; steps: { id: string }[] }[],
): void => {
  if (
    exported.runId !== bundle.runId ||
    exported.skillTreeSha256 !== bundle.skill.treeSha256 ||
    exported.instructionsSha256 !== bundle.instructions.sha256
  )
    throw new Error('Export bundle identity mismatch.');
  assertHashes(
    exported.harnessHashes,
    Object.fromEntries(
      Object.entries(bundle.files).filter(([name]) => name.startsWith('harness/')),
    ),
    'Export harness',
  );
  const selected = selectJourneys(
    bundle.journeys,
    exported.selectedJourneys,
    exported.confirmationIndex,
  );
  if (
    JSON.stringify(selected) !== JSON.stringify(exported.selectedJourneys) ||
    (exported.kind === 'initial') !== (exported.confirmationIndex === null)
  )
    throw new Error('Export trial selection or kind mismatch.');
  definitions = definitions.filter((journey) => selected.includes(journey.id));
  const expected = definitions.flatMap((journey) =>
    journey.steps.map((step) => `${journey.id}/${step.id}`),
  );
  const records = exported.steps.map((step) => `${step.journeyId}/${step.stepId}`);
  if (
    records.some((key, index) => key !== expected[index]) ||
    new Set(records).size !== records.length
  )
    throw new Error('Export steps must be a unique ordered prefix of the suite.');
  const recorded = new Set(records);
  const completed = definitions
    .filter((journey) => journey.steps.every((step) => recorded.has(`${journey.id}/${step.id}`)))
    .map((journey) => journey.id);
  if (
    records.length !==
      definitions
        .filter((journey) => completed.includes(journey.id))
        .reduce((count, journey) => count + journey.steps.length, 0) ||
    JSON.stringify(exported.completedJourneys) !== JSON.stringify(completed) ||
    exported.complete !== (records.length === expected.length) ||
    Object.keys(exported.restartCounts).sort().join() !==
      definitions
        .map((journey) => journey.id)
        .sort()
        .join()
  )
    throw new Error('Export completion or restart-count inventory mismatch.');
};

/** Validates whole-journey selection and returns canonical bundle order. */
export const selectJourneys = (
  inventory: { id: string }[],
  requested?: string[],
  confirmationIndex: number | null = null,
): string[] => {
  const ids = requested ?? inventory.map((journey) => journey.id);
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !inventory.some((journey) => journey.id === id))
  )
    throw new Error('Journey selection must contain unique known IDs.');
  if (
    confirmationIndex !== null &&
    (!Number.isInteger(confirmationIndex) ||
      confirmationIndex < 1 ||
      confirmationIndex > 3 ||
      ids.length !== 1)
  )
    throw new Error('Confirmation requires index 1, 2, or 3 and exactly one journey.');
  return inventory.filter((journey) => ids.includes(journey.id)).map((journey) => journey.id);
};

/** Parses strict name/value flags, rejecting duplicates and unknown inputs. */
export const parseFlags = (
  argv: string[],
  names: string[],
  booleans: string[] = [],
): Record<string, string> => {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === undefined || !names.includes(flag) || flags[flag] !== undefined)
      throw new Error(`Unsupported or duplicate argument: ${flag}`);
    if (booleans.includes(flag)) flags[flag] = 'true';
    else {
      const argument = argv[++index];
      if (!argument || argument.startsWith('--')) throw new Error(`Missing value: ${flag}`);
      flags[flag] = argument;
    }
  }
  return flags;
};

/** Reads the workspace state with its strict schema. */
export const readState = async (workspace: string): Promise<IHarnessState> =>
  HarnessStateSchema.parse(await readJson(path.join(workspace, 'state.json')));

/** Isolates npm and Git configuration under a task-owned HOME. */
export const isolatedEnvironment = async (
  home: string,
  cache: string,
): Promise<NodeJS.ProcessEnv> => {
  await mkdir(home, { recursive: true });
  const npmrc = path.join(home, '.npmrc');
  await writeFile(
    npmrc,
    `cache=${cache}\noffline=true\nignore-scripts=true\naudit=false\nfund=false\n`,
  );
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^npm_config_|^git_config|^git_dir$|^git_work_tree$/iu.test(key),
    ),
  );
  return {
    ...environment,
    HOME: home,
    USERPROFILE: home,
    NPM_CONFIG_USERCONFIG: npmrc,
    NPM_CONFIG_GLOBALCONFIG: path.join(home, 'global-npmrc'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'),
    GIT_AUTHOR_NAME: 'Scripted Journeys',
    GIT_AUTHOR_EMAIL: 'journeys@moldea.invalid',
    GIT_COMMITTER_NAME: 'Scripted Journeys',
    GIT_COMMITTER_EMAIL: 'journeys@moldea.invalid',
  };
};
