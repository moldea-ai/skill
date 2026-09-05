import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CALIBRATION_ESTIMATED_UTF8_BYTES_PER_TOKEN,
  CALIBRATION_MINIMUM_HEADROOM_PERCENT,
  MOLDEA_SKILL_RESOURCE_PROFILES,
} from './profiles.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const artifactPath = path.join(repositoryRoot, 'fixtures', 'resource-calibration.json');
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
const resourceClassByCaseId = Object.freeze({
  'binary-large-file': 'attack',
  'broadly-relevant': 'largeTraversal',
  'diagnostic-heavy': 'largeTraversal',
  'large-remote-shape': 'ordinary',
  'large-unicode': 'largeTraversal',
  'medium-mostly-irrelevant': 'ordinary',
  'small-ordinary': 'ordinary',
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

const parseArguments = (arguments_) => {
  const mode = arguments_.includes('--record') ? 'record' : 'check';
  const sampleIndex = arguments_.indexOf('--samples');
  const samples = sampleIndex === -1 ? 1 : Number(arguments_[sampleIndex + 1]);
  if (!Number.isSafeInteger(samples) || samples < 1 || samples > 8) {
    throw new Error('--samples must be an integer from 1 through 8.');
  }
  return { mode, samples };
};

const execute = (executable, arguments_, options = {}) => {
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

const initializeRepository = (root) => {
  execute('git', ['init', '--quiet'], { cwd: root });
  execute('git', ['config', 'user.name', 'moldea calibration'], { cwd: root });
  execute('git', ['config', 'user.email', 'calibration@moldea.ai'], {
    cwd: root,
  });
};

const createFile = async (root, relativePath, content) => {
  const destination = path.join(root, ...relativePath.split('/'));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
};

/** Measures one generated repository without following symbolic links. */
const measureDirectoryShape = async (directory, excludeGitDirectory = false) => {
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

const createManifest = (pattern = '/src/relevant.ts') => `version: 1
context:
  /moldea/context/policy.md:
    affectedBy:
      - ${pattern}
`;

const createBaseProject = async (root, pattern) => {
  await createFile(root, 'README.md', '# Calibration fixture\n');
  await createFile(root, 'moldea/moldea.yaml', createManifest(pattern));
  await createFile(root, 'moldea/project.md', '# Calibration project\n');
  await createFile(root, 'moldea/context/policy.md', '# Policy\n');
  await createFile(root, 'src/relevant.ts', 'export const relevant = true;\n');
};

const createScenario = async (parent, id) => {
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

const readPageCursor = (stdout) => {
  const envelope = JSON.parse(stdout);
  const cursor = envelope?.result?.page?.cursor;
  return typeof cursor === 'string' && cursor.length > 0 ? cursor : null;
};

const runCliPage = (scenario, cursor) => {
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
  const metricText = result.output?.[3]?.toString('utf8') ?? '';
  const metrics = JSON.parse(metricText);
  const stdout = result.stdout;
  if (typeof stdout !== 'string') throw new Error('The calibration command omitted stdout.');
  const envelope = JSON.parse(stdout);
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

const runSample = (scenario) => {
  const pages = [];
  let cursor = null;
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

const percentile = (values, fraction) => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
};

const summarizeSamples = (samples) => {
  const measures = [
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
  );
};

const collectCalibration = async (sampleCount) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-resource-calibration-'));
  try {
    const cases = [];
    for (const id of requiredCaseIds) {
      const scenario = await createScenario(temporaryRoot, id);
      const fixture = await measureDirectoryShape(scenario.root, true);
      const temporaryDiskBytesPeak = (await measureDirectoryShape(scenario.root)).totalBytes;
      const samples = [];
      for (let sample = 0; sample < sampleCount; sample += 1) {
        samples.push({ ...runSample(scenario), temporaryDiskBytesPeak });
      }
      cases.push({
        fixture,
        id,
        resourceClass: resourceClassByCaseId[id],
        sampleCount,
        completionStates: [...new Set(samples.map((sample) => sample.completionState))].sort(),
        observations: summarizeSamples(samples),
      });
    }
    const cliManifest = JSON.parse(readFileSync(cliManifestPath, 'utf8'));
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
          'Temporary fixture trees are deleted after every run.',
          'Output limits apply to one encoded CLI page and never to repository size.',
        ],
      },
      cases: cases.sort((left, right) => left.id.localeCompare(right.id)),
    };
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
};

const validateCalibration = (artifact) => {
  if (artifact?.schemaVersion !== 1 || !Array.isArray(artifact.cases)) {
    throw new Error('The resource calibration artifact has an unsupported shape.');
  }
  const ids = new Set(artifact.cases.map(({ id }) => id));
  if (ids.size !== requiredCaseIds.size || [...requiredCaseIds].some((id) => !ids.has(id))) {
    throw new Error('The resource calibration artifact does not cover the complete corpus.');
  }
  if (JSON.stringify(artifact.profiles) !== JSON.stringify(MOLDEA_SKILL_RESOURCE_PROFILES)) {
    throw new Error('The resource calibration artifact does not match the active profiles.');
  }
  for (const calibrationCase of artifact.cases) {
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
    if (
      profile.maxMoldeaCommandCount < Math.ceil(observedCommandCount * minimumMultiplier) ||
      profile.maxAggregateMoldeaOutputBytes < Math.ceil(observedOutputBytes * minimumMultiplier)
    ) {
      throw new Error(`Calibration case ${calibrationCase.id} lacks required cumulative headroom.`);
    }
  }
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  if (options.mode === 'record') {
    const artifact = await collectCalibration(options.samples);
    validateCalibration(artifact);
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  }
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
  validateCalibration(artifact);
  process.stdout.write(
    `${JSON.stringify({ cases: artifact.cases.length, profiles: Object.keys(artifact.profiles), status: 'valid' })}\n`,
  );
};

await main();
