import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import {
  CALIBRATION_ESTIMATED_UTF8_BYTES_PER_TOKEN,
  CALIBRATION_MINIMUM_HEADROOM_PERCENT,
  MOLDEA_SKILL_RESOURCE_PROFILES,
} from './profiles.ts';
import { validateModelStageCalibrationArtifact } from './model-stage-observations.ts';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const artifactPath = path.join(repositoryRoot, 'fixtures', 'resource-calibration.json');
const modelStageArtifactPath = path.join(
  repositoryRoot,
  'fixtures',
  'model-stage-resource-calibration.json',
);
const cliPackagePath = path.join(repositoryRoot, 'node_modules', '@moldea.ai', 'cli');
const cliManifestPath = path.join(cliPackagePath, 'package.json');
const cliExecutablePath = path.join(cliPackagePath, 'dist', 'moldea.js');
const requiredCaseIds = new Set([
  'binary-large-file',
  'broadly-relevant',
  'diagnostic-heavy',
  'large-remote-shape',
  'large-unicode',
  'medium-mostly-irrelevant',
  'small-ordinary',
]);
type ICalibrationResourceClass = 'attack' | 'largeTraversal' | 'ordinary';
const resourceClassByCaseId: Readonly<Record<string, ICalibrationResourceClass>> = Object.freeze({
  'binary-large-file': 'attack',
  'broadly-relevant': 'largeTraversal',
  'diagnostic-heavy': 'largeTraversal',
  'large-remote-shape': 'ordinary',
  'large-unicode': 'largeTraversal',
  'medium-mostly-irrelevant': 'ordinary',
  'small-ordinary': 'ordinary',
});
interface ICalibrationScenario {
  arguments: string[];
  input?: string;
  root: string;
}

interface ICalibrationPage {
  activeResourceCount: number;
  completionState: 'complete' | 'continuation';
  durationMs: number;
  exitCode: number | null;
  maxRssBytes: number;
  nextCursor: string | null;
  outputBytes: number;
  status: string;
}

interface ICalibrationSample {
  activeResourceCountPeak: number;
  commandCount: number;
  completionState: 'complete' | 'explicit-error';
  durationMs: number;
  estimatedModelTokens: number;
  maximumInvocationOutputBytes: number;
  modelVisibleOutputBytes: number;
  processMaxRssBytes: number;
  stdoutBytes: number;
  temporaryDiskBytesPeak: number;
}

type ICalibrationMeasure = Exclude<keyof ICalibrationSample, 'completionState'>;
type ICalibrationDistribution = {
  maximum: number;
  median: number;
  minimum: number;
  p95: number;
};

interface ICalibrationCase {
  completionStates: string[];
  fixture: { fileCount: number; totalBytes: number };
  id: string;
  observations: Record<ICalibrationMeasure, ICalibrationDistribution>;
  resourceClass: ICalibrationResourceClass;
  sampleCount: number;
}

interface ICalibrationArtifact {
  cases: ICalibrationCase[];
  profiles: typeof MOLDEA_SKILL_RESOURCE_PROFILES;
  schemaVersion: number;
  [key: string]: unknown;
}

const CliEnvelopeSchema = z.object({
  result: z
    .object({ page: z.object({ cursor: z.string().nullable().optional() }).optional() })
    .optional(),
  status: z.string(),
});
const ProcessMetricsSchema = z.object({
  activeResourceCount: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  maxRssBytes: z.number().nonnegative(),
});
const wrapperSource = String.raw`
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [executablePath, ...commandArguments] = process.argv.slice(1);
process.argv = [process.execPath, executablePath, ...commandArguments];
const startedAt = process.hrtime.bigint();
await import(pathToFileURL(executablePath).href);
const durationNs = process.hrtime.bigint() - startedAt;
const usage = process.resourceUsage();
writeFileSync(3, JSON.stringify({
  activeResourceCount: process.getActiveResourcesInfo().length,
  durationMs: Number(durationNs) / 1_000_000,
  maxRssBytes: usage.maxRSS * 1024,
}));
`;

const parseArguments = (arguments_: string[]): { mode: 'check' | 'record'; samples: number } => {
  const mode = arguments_.includes('--record') ? 'record' : 'check';
  const sampleIndex = arguments_.indexOf('--samples');
  const samples = sampleIndex === -1 ? 1 : Number(arguments_[sampleIndex + 1]);
  if (!Number.isSafeInteger(samples) || samples < 1 || samples > 8) {
    throw new Error('--samples must be an integer from 1 through 8.');
  }
  return { mode, samples };
};

const execute = (
  executable: string,
  arguments_: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string } = {},
): string => {
  const result = spawnSync(executable, arguments_, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env,
    input: options.input,
    maxBuffer: MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxProcessOutputBytes,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${executable} ${arguments_.join(' ')} failed with status ${result.status}: ${result.stderr}`,
    );
  }
  return result.stdout;
};

const initializeRepository = (root: string): void => {
  execute('git', ['init', '--quiet'], { cwd: root });
  execute('git', ['config', 'user.name', 'moldea calibration'], { cwd: root });
  execute('git', ['config', 'user.email', 'calibration@moldea.ai'], {
    cwd: root,
  });
};

const createFile = async (
  root: string,
  relativePath: string,
  content: string | Uint8Array,
): Promise<void> => {
  const destination = path.join(root, ...relativePath.split('/'));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
};

/** Measures one generated repository without following symbolic links. */
const measureDirectoryShape = async (
  directory: string,
  excludeGitDirectory = false,
): Promise<{ fileCount: number; totalBytes: number }> => {
  let fileCount = 0;
  let totalBytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excludeGitDirectory && entry.name === '.git') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const childShape = await measureDirectoryShape(entryPath);
      fileCount += childShape.fileCount;
      totalBytes += childShape.totalBytes;
    } else if (entry.isFile()) {
      fileCount += 1;
      totalBytes += (await stat(entryPath)).size;
    }
  }
  return { fileCount, totalBytes };
};

const createManifest = (pattern = '/src/relevant.ts'): string => `version: 1
context:
  /moldea/context/policy.md:
    affectedBy:
      - ${pattern}
`;

const createBaseProject = async (root: string, pattern = '/src/relevant.ts'): Promise<void> => {
  await createFile(root, 'README.md', '# Calibration fixture\n');
  await createFile(root, 'moldea/moldea.yaml', createManifest(pattern));
  await createFile(root, 'moldea/project.md', '# Calibration project\n');
  await createFile(root, 'moldea/context/policy.md', '# Policy\n');
  await createFile(root, 'src/relevant.ts', 'export const relevant = true;\n');
};

const createScenario = async (parent: string, id: string): Promise<ICalibrationScenario> => {
  const root = path.join(parent, id);
  await mkdir(root, { recursive: true });
  initializeRepository(root);

  if (id === 'small-ordinary') {
    await createBaseProject(root);
    for (let index = 0; index < 8; index += 1) {
      await createFile(root, `src/module-${index}.ts`, `export const value = ${index};\n`);
    }
    return { arguments: ['inspect'], root };
  }

  if (id === 'medium-mostly-irrelevant') {
    await createBaseProject(root);
    for (let index = 0; index < 512; index += 1) {
      await createFile(
        root,
        `packages/p${String(index % 16).padStart(2, '0')}/src/module-${String(index).padStart(4, '0')}.ts`,
        `export const value = ${index};\n`,
      );
    }
    return {
      arguments: ['scope', '--paths-stdin'],
      input: '/src/relevant.ts\0',
      root,
    };
  }

  if (id === 'large-remote-shape') {
    await createBaseProject(root);
    const body = `export const payload = '${'x'.repeat(2_048)}';\n`;
    for (let index = 0; index < 1_024; index += 1) {
      await createFile(
        root,
        `src/generated-unrelated/g${String(index % 16).padStart(2, '0')}/record-${String(index).padStart(4, '0')}.ts`,
        body,
      );
    }
    return {
      arguments: ['scope', '--paths-stdin'],
      input: '/src/relevant.ts\0',
      root,
    };
  }

  if (id === 'large-unicode') {
    await createBaseProject(root);
    await createFile(
      root,
      'moldea/context/policy.md',
      `# Policy\n\n${'café 東京 🚀\n'.repeat(16_384)}`,
    );
    return {
      arguments: ['content', '--path', '/moldea/context/policy.md'],
      root,
    };
  }

  if (id === 'broadly-relevant') {
    await createBaseProject(root, '/src/**');
    const paths = [];
    for (let index = 0; index < 1_024; index += 1) {
      const relativePath = `src/change-${String(index).padStart(4, '0')}.ts`;
      await createFile(root, relativePath, `export const value = ${index};\n`);
      paths.push(`/${relativePath}`);
    }
    return {
      arguments: ['scope', '--paths-stdin'],
      input: `${paths.join('\0')}\0`,
      root,
    };
  }

  if (id === 'binary-large-file') {
    await createBaseProject(root);
    const bytes = new Uint8Array(1_048_576);
    bytes.fill(0xff);
    await createFile(root, 'moldea/context/policy.md', bytes);
    return {
      arguments: ['content', '--path', '/moldea/context/policy.md'],
      root,
    };
  }

  if (id === 'diagnostic-heavy') {
    await createBaseProject(root);
    const contexts = [];
    for (let index = 0; index < 1_024; index += 1) {
      contexts.push(`  /moldea/context/missing-${String(index).padStart(4, '0')}.md: {}`);
    }
    await createFile(root, 'moldea/moldea.yaml', `version: 1\ncontext:\n${contexts.join('\n')}\n`);
    return { arguments: ['validate'], root };
  }

  throw new Error(`Unknown calibration case: ${id}.`);
};

const readPageCursor = (stdout: string): string | null => {
  const envelope = CliEnvelopeSchema.parse(JSON.parse(stdout) as unknown);
  const cursor = envelope.result?.page?.cursor;
  return typeof cursor === 'string' && cursor.length > 0 ? cursor : null;
};

const runCliPage = (scenario: ICalibrationScenario, cursor: string | null): ICalibrationPage => {
  const commandArguments = [
    ...scenario.arguments,
    '--repository',
    scenario.root,
    '--json',
    '--max-output-bytes',
    String(MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxOutputPageBytes),
    ...(cursor === null ? [] : ['--cursor', cursor]),
  ];
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', wrapperSource, cliExecutablePath, ...commandArguments],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      input: scenario.input,
      maxBuffer: MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxProcessOutputBytes,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    },
  );
  if (result.error !== undefined) throw result.error;
  const metricText = String(result.output?.[3] ?? '');
  const metrics = ProcessMetricsSchema.parse(JSON.parse(metricText) as unknown);
  const stdout = result.stdout;
  if (typeof stdout !== 'string') throw new Error('The calibration command omitted stdout.');
  const envelope = CliEnvelopeSchema.parse(JSON.parse(stdout) as unknown);
  if (![0, 1, 2, 3].includes(result.status ?? -1)) {
    throw new Error(`The calibration CLI exited unexpectedly: ${result.status}.`);
  }
  return {
    activeResourceCount: metrics.activeResourceCount,
    completionState: readPageCursor(stdout) === null ? 'complete' : 'continuation',
    durationMs: metrics.durationMs,
    exitCode: result.status,
    maxRssBytes: metrics.maxRssBytes,
    nextCursor: readPageCursor(stdout),
    outputBytes: Buffer.byteLength(stdout, 'utf8'),
    status: envelope.status,
  };
};

const runSample = (
  scenario: ICalibrationScenario,
): Omit<ICalibrationSample, 'temporaryDiskBytesPeak'> => {
  const pages: ICalibrationPage[] = [];
  let cursor: string | null = null;
  do {
    const page = runCliPage(scenario, cursor);
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return {
    activeResourceCountPeak: Math.max(...pages.map((page) => page.activeResourceCount)),
    commandCount: pages.length,
    completionState: pages.at(-1)?.status === 'error' ? 'explicit-error' : 'complete',
    durationMs: pages.reduce((total, page) => total + page.durationMs, 0),
    estimatedModelTokens: Math.ceil(
      pages.reduce((total, page) => total + page.outputBytes, 0) /
        CALIBRATION_ESTIMATED_UTF8_BYTES_PER_TOKEN,
    ),
    maximumInvocationOutputBytes: Math.max(...pages.map((page) => page.outputBytes)),
    modelVisibleOutputBytes: pages.reduce((total, page) => total + page.outputBytes, 0),
    processMaxRssBytes: Math.max(...pages.map((page) => page.maxRssBytes)),
    stdoutBytes: pages.reduce((total, page) => total + page.outputBytes, 0),
  };
};

const percentile = (values: number[], fraction: number): number => {
  const ordered = [...values].sort((left, right) => left - right);
  const percentileValue =
    ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
  if (percentileValue === undefined) {
    throw new Error('Calibration percentiles require at least one sample.');
  }
  return percentileValue;
};

const summarizeSamples = (
  samples: ICalibrationSample[],
): Record<ICalibrationMeasure, ICalibrationDistribution> => {
  const measures: ICalibrationMeasure[] = [
    'activeResourceCountPeak',
    'commandCount',
    'durationMs',
    'estimatedModelTokens',
    'maximumInvocationOutputBytes',
    'modelVisibleOutputBytes',
    'processMaxRssBytes',
    'stdoutBytes',
    'temporaryDiskBytesPeak',
  ];
  return Object.fromEntries(
    measures.map((measure) => {
      const values = samples.map((sample) => sample[measure]);
      return [
        measure,
        {
          maximum: Math.max(...values),
          median: percentile(values, 0.5),
          minimum: Math.min(...values),
          p95: percentile(values, 0.95),
        },
      ];
    }),
  ) as Record<ICalibrationMeasure, ICalibrationDistribution>;
};

const collectCalibration = async (sampleCount: number): Promise<ICalibrationArtifact> => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-resource-calibration-'));
  try {
    const cases: ICalibrationCase[] = [];
    for (const id of requiredCaseIds) {
      const scenario = await createScenario(temporaryRoot, id);
      const fixture = await measureDirectoryShape(scenario.root, true);
      const temporaryDiskBytesPeak = (await measureDirectoryShape(scenario.root)).totalBytes;
      const samples: ICalibrationSample[] = [];
      for (let sample = 0; sample < sampleCount; sample += 1) {
        samples.push({ ...runSample(scenario), temporaryDiskBytesPeak });
      }
      cases.push({
        fixture,
        id,
        resourceClass: resourceClassByCaseId[id] ?? 'ordinary',
        sampleCount,
        completionStates: [...new Set(samples.map((sample) => sample.completionState))].sort(),
        observations: summarizeSamples(samples),
      });
    }
    const cliManifest = z
      .object({ version: z.string().min(1) })
      .parse(JSON.parse(readFileSync(cliManifestPath, 'utf8')) as unknown);
    return {
      schemaVersion: 1,
      environment: {
        cliVersion: cliManifest.version,
        gitVersion: execute('git', ['--version']).trim(),
        nodeVersion: process.version,
        platform: `${process.platform}-${process.arch}`,
      },
      profiles: MOLDEA_SKILL_RESOURCE_PROFILES,
      method: {
        estimatedUtf8BytesPerToken: CALIBRATION_ESTIMATED_UTF8_BYTES_PER_TOKEN,
        minimumHeadroomPercent: CALIBRATION_MINIMUM_HEADROOM_PERCENT,
        notes: [
          'Duration and process RSS are recorded distributions, not pass/fail thresholds.',
          'The host token ceiling bounds cumulative input plus output for one completed Codex stage.',
          'Temporary fixture trees are deleted after every run.',
          'CLI page limits apply to one encoded response and never to repository size.',
          'Deterministic calibration does not substitute for complete model-stage evidence.',
        ],
      },
      cases: cases.sort((left, right) => left.id.localeCompare(right.id)),
    };
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
};

const validateCalibration: (artifact: unknown) => asserts artifact is ICalibrationArtifact = (
  artifact,
) => {
  if (typeof artifact !== 'object' || artifact === null) {
    throw new Error('The resource calibration artifact has an unsupported shape.');
  }
  const calibrationArtifact = artifact as Partial<ICalibrationArtifact>;
  if (calibrationArtifact.schemaVersion !== 1 || !Array.isArray(calibrationArtifact.cases)) {
    throw new Error('The resource calibration artifact has an unsupported shape.');
  }
  const cases = calibrationArtifact.cases;
  const ids = new Set(cases.map(({ id }) => id));
  if (ids.size !== requiredCaseIds.size || [...requiredCaseIds].some((id) => !ids.has(id))) {
    throw new Error('The resource calibration artifact does not cover the complete corpus.');
  }
  if (
    JSON.stringify(calibrationArtifact.profiles) !== JSON.stringify(MOLDEA_SKILL_RESOURCE_PROFILES)
  ) {
    throw new Error('The resource calibration artifact does not match the active profiles.');
  }
  for (const calibrationCase of cases) {
    if (
      !calibrationCase.completionStates.every((state) =>
        ['complete', 'explicit-error'].includes(state),
      )
    ) {
      throw new Error(`Calibration case ${calibrationCase.id} did not terminate explicitly.`);
    }
    const maximumPage = calibrationCase.observations.maximumInvocationOutputBytes.maximum;
    if (maximumPage > MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxOutputPageBytes) {
      throw new Error(`Calibration case ${calibrationCase.id} exceeded the ordinary page limit.`);
    }
    if (calibrationCase.resourceClass === 'attack') continue;
    const profile = MOLDEA_SKILL_RESOURCE_PROFILES[calibrationCase.resourceClass];
    if (profile === undefined) {
      throw new Error(`Calibration case ${calibrationCase.id} has an unknown resource class.`);
    }
    const minimumMultiplier = 1 + CALIBRATION_MINIMUM_HEADROOM_PERCENT / 100;
    const observedCommandCount = calibrationCase.observations.commandCount.maximum;
    const observedOutputBytes = calibrationCase.observations.modelVisibleOutputBytes.maximum;
    const observedTokenCount = calibrationCase.observations.estimatedModelTokens.maximum;
    if (
      profile.maxCompletedCommandCount < Math.ceil(observedCommandCount * minimumMultiplier) ||
      profile.maxHostTokenCount < Math.ceil(observedTokenCount * minimumMultiplier) ||
      profile.maxModelVisibleToolOutputBytes < Math.ceil(observedOutputBytes * minimumMultiplier) ||
      profile.maxMoldeaCommandCount < Math.ceil(observedCommandCount * minimumMultiplier) ||
      profile.maxAggregateMoldeaOutputBytes < Math.ceil(observedOutputBytes * minimumMultiplier)
    ) {
      throw new Error(`Calibration case ${calibrationCase.id} lacks required cumulative headroom.`);
    }
  }
};

const main = async (): Promise<void> => {
  const options = parseArguments(process.argv.slice(2));
  if (options.mode === 'record') {
    const artifact = await collectCalibration(options.samples);
    validateCalibration(artifact);
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  }
  const artifact: unknown = JSON.parse(readFileSync(artifactPath, 'utf8'));
  validateCalibration(artifact);
  const modelStageArtifact = validateModelStageCalibrationArtifact(
    JSON.parse(readFileSync(modelStageArtifactPath, 'utf8')) as unknown,
  );
  process.stdout.write(
    `${JSON.stringify({ cases: artifact.cases.length, commandOutputObservations: modelStageArtifact.commandOutputObservations.length, modelStageObservations: modelStageArtifact.modelStageObservations.length, profiles: Object.keys(artifact.profiles), status: 'valid' })}\n`,
  );
};

await main();
