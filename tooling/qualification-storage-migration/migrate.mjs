import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  QualificationProfileSchema,
} from '../../qualification/src/contracts/index.ts';
import {
  calculateQualificationEvaluatorDigest,
  calculateQualificationEvaluatorDigestAtCommit,
  calculateQualificationLogicalInputDigest,
  calculateQualificationLogicalInputDigestAtCommit,
  createQualificationCompatibilityIdentity,
  createQualificationCompatibilityIdentityAtCommit,
} from '../../qualification/src/evidence-identity/index.ts';
import { resolveContainedPath } from '../../qualification/src/filesystem/index.ts';
import {
  createQualificationAttemptKey,
  createQualificationAttemptStorage,
  QualificationProfileIndexSchema,
  resolveQualificationArtifactPath,
  verifyQualificationAttemptStorage,
} from '../../qualification/src/storage/index.ts';
import { validateQualificationAttemptEvidence } from '../../qualification/src/result/evidence.ts';
import { verifyQualificationResults } from '../../qualification/src/result/recorder.ts';

const executeFile = promisify(execFile);

export const QUALIFICATION_STORAGE_SOURCE_COMMIT = 'fcbc34f60b12b1b66cd9ebb28b1865979a259429';
export const QUALIFICATION_STORAGE_SOURCE_RELEASE = 'v4.0.0';
export const QUALIFICATION_STORAGE_TARGETS = [
  {
    key: 't1',
    adapterId: 'anthropic',
    implementationId: 'typescript-messages-api-0-117',
  },
  {
    key: 't2',
    adapterId: 'claude-agent-sdk',
    implementationId: 'typescript-query-subagents-0-3',
  },
  {
    key: 't3',
    adapterId: 'cloudflare-agents',
    implementationId: 'typescript-ai-chat-agent-0-10-ai-sdk-7',
  },
  {
    key: 't4',
    adapterId: 'cloudflare-agents',
    implementationId: 'typescript-think-0-16-ai-sdk-7',
  },
  { key: 't5', adapterId: 'custom', implementationId: 'custom' },
  {
    key: 't6',
    adapterId: 'eve',
    implementationId: 'typescript-filesystem-agent-0-39',
  },
  {
    key: 't7',
    adapterId: 'google-genai',
    implementationId: 'typescript-models-generate-content-2',
  },
  {
    key: 't8',
    adapterId: 'langchain',
    implementationId: 'typescript-create-agent-1-5',
  },
  {
    key: 't9',
    adapterId: 'langgraph',
    implementationId: 'typescript-functional-api-1-4',
  },
  {
    key: 't10',
    adapterId: 'langgraph',
    implementationId: 'typescript-state-graph-1-4',
  },
  { key: 't11', adapterId: 'openai', implementationId: 'typescript-responses-api-7' },
  {
    key: 't12',
    adapterId: 'openai-agents-sdk',
    implementationId: 'typescript-agent-handoffs-0-16',
  },
  {
    key: 't13',
    adapterId: 'vercel-ai-sdk',
    implementationId: 'typescript-generate-stream-text-7',
  },
  {
    key: 't14',
    adapterId: 'vercel-ai-sdk',
    implementationId: 'typescript-tool-loop-agent-7',
  },
];

const MAXIMUM_GIT_OUTPUT_BYTES = 32 * 1024 * 1024;

const calculateSha256 = (content) => createHash('sha256').update(content).digest('hex');

const pathExists = async (candidatePath) => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const runGit = async (repositoryRoot, arguments_) => {
  const { stdout } = await executeFile('git', arguments_, {
    cwd: repositoryRoot,
    encoding: 'buffer',
    maxBuffer: MAXIMUM_GIT_OUTPUT_BYTES,
  });
  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
};

const readGitBlob = (repositoryRoot, commit, relativePath) =>
  runGit(repositoryRoot, ['cat-file', 'blob', `${commit}:${relativePath}`]);

const resolveSourceCommit = async (repositoryRoot, sourceRelease) =>
  (
    await runGit(repositoryRoot, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${sourceRelease}^{commit}`,
    ])
  )
    .toString('utf8')
    .trim();

const assertUnmodifiedExpandedSource = async (repositoryRoot, expectedSourceCommit) => {
  const committedChanges = await runGit(repositoryRoot, [
    'diff',
    '--name-only',
    '-z',
    expectedSourceCommit,
    'HEAD',
    '--',
    'qualification/profiles',
    'qualification/results',
  ]);
  const worktreeChanges = await runGit(repositoryRoot, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
    '--',
    'qualification/profiles',
    'qualification/results',
  ]);

  if (committedChanges.byteLength !== 0 || worktreeChanges.byteLength !== 0) {
    throw new Error(
      'Expanded qualification profiles and results do not match the immutable source release.',
    );
  }
};

const listTreePaths = async (rootDirectory) => {
  const entries = [];

  const visit = async (directoryPath, relativeDirectory) => {
    const directoryEntries = await readdir(directoryPath, { withFileTypes: true });
    directoryEntries.sort((left, right) => left.name.localeCompare(right.name, 'en'));

    for (const entry of directoryEntries) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        entries.push(relativePath);
      } else {
        throw new Error(`Unsupported qualification source entry: ${relativePath}`);
      }
    }
  };

  await visit(rootDirectory, '');
  return entries;
};

const copyEntry = async (sourcePath, destinationPath) => {
  const stats = await lstat(sourcePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });

  if (stats.isSymbolicLink()) {
    await symlink(await readlink(sourcePath), destinationPath);
    return;
  }
  if (!stats.isFile()) {
    throw new Error(`Qualification migration source is not a file: ${sourcePath}`);
  }

  await copyFile(sourcePath, destinationPath);
  await chmod(destinationPath, stats.mode & 0o777);
};

const writeProfileIndex = async (profilesRoot, targets) => {
  await mkdir(profilesRoot, { recursive: true });
  const index = QualificationProfileIndexSchema.parse({ version: 1, targets });
  const source = stringifyYaml(index, { lineWidth: 0 });
  await writeFile(path.join(profilesRoot, 'index.yaml'), source, 'utf8');
};

const migrateProfile = async (options) => {
  const sourceProfileDirectory = resolveContainedPath(
    options.sourceProfilesRoot,
    path.posix.join(options.target.adapterId, options.target.implementationId),
  );
  const destinationProfileDirectory = resolveContainedPath(
    options.destinationProfilesRoot,
    options.target.key,
  );
  const profilePath = path.join(sourceProfileDirectory, 'profile.yaml');
  const profileSource = await readFile(profilePath, 'utf8');
  const profile = QualificationProfileSchema.parse(parseYaml(profileSource));
  const sourcePaths = await listTreePaths(sourceProfileDirectory);
  const mappedPaths = new Map();

  if (
    profile.adapterId !== options.target.adapterId ||
    profile.implementationId !== options.target.implementationId
  ) {
    throw new Error(`Qualification profile ${options.target.key} has the wrong logical identity.`);
  }

  const projectMappings = profile.cases.map((profileCase, caseIndex) => ({
    sourceDirectory: profileCase.projectDirectory,
    destinationDirectory: `cases/c${caseIndex + 1}`,
  }));

  for (const relativePath of sourcePaths) {
    const owningMappings = projectMappings.filter(
      ({ sourceDirectory }) =>
        relativePath === sourceDirectory || relativePath.startsWith(`${sourceDirectory}/`),
    );
    if (owningMappings.length > 1) {
      throw new Error(`Profile path has overlapping case ownership: ${relativePath}`);
    }

    const owningMapping = owningMappings[0];
    const destinationRelativePath =
      owningMapping === undefined
        ? relativePath
        : path.posix.join(
            owningMapping.destinationDirectory,
            relativePath.slice(owningMapping.sourceDirectory.length + 1),
          );

    if ([...mappedPaths.values()].includes(destinationRelativePath)) {
      throw new Error(`Profile migration path collision: ${destinationRelativePath}`);
    }
    mappedPaths.set(relativePath, destinationRelativePath);
  }

  for (const [sourceRelativePath, destinationRelativePath] of mappedPaths) {
    const sourcePath = path.join(sourceProfileDirectory, sourceRelativePath);
    const destinationPath = path.join(destinationProfileDirectory, destinationRelativePath);

    if (sourceRelativePath !== 'profile.yaml') {
      await copyEntry(sourcePath, destinationPath);
      continue;
    }

    let migratedProfileSource = profileSource;
    for (const [caseIndex, profileCase] of profile.cases.entries()) {
      const sourceLine = `    projectDirectory: ${profileCase.projectDirectory}`;
      const destinationLine = `    projectDirectory: cases/c${caseIndex + 1}`;
      if (migratedProfileSource.split(sourceLine).length !== 2) {
        throw new Error(
          `Profile ${options.target.key} must contain one exact projectDirectory line for ${profileCase.id}.`,
        );
      }
      migratedProfileSource = migratedProfileSource.replace(sourceLine, destinationLine);
    }

    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, migratedProfileSource, 'utf8');
    const sourceStats = await lstat(sourcePath);
    await chmod(destinationPath, sourceStats.mode & 0o777);
  }
};

const assertProfileLogicalEquality = async (options) => {
  for (const target of options.targets) {
    const selection = {
      adapterId: target.adapterId,
      implementationId: target.implementationId,
    };
    const [sourceDigest, destinationDigest] = await Promise.all([
      calculateQualificationLogicalInputDigestAtCommit({
        commit: options.sourceCommit,
        repositoryRoot: options.repositoryRoot,
        selection,
      }),
      calculateQualificationLogicalInputDigest({
        qualificationRoot: options.destinationQualificationRoot,
        selection,
      }),
    ]);

    if (sourceDigest !== destinationDigest) {
      throw new Error(`Qualification profile ${target.key} changed its logical input digest.`);
    }
  }
};

const createCarryForwardSource = (sourceCommit, attemptDigest) => ({
  attestationId: `v4.0.0-custom-${attemptDigest}`,
  sourceRelease: 'v4.0.0',
  sourceCommit,
  sourceAttemptDigest: attemptDigest,
});

const migrateCustomResult = async (options) => {
  const customTarget = options.targets.find(
    ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
  );
  if (customTarget === undefined) {
    throw new Error('Qualification storage migration requires the Custom target.');
  }

  const sourceTargetRoot = path.join(options.sourceResultsRoot, 'custom', 'custom');
  const latestSource = await readFile(path.join(sourceTargetRoot, 'latest.json'));
  const latest = QualificationLatestResultSchema.parse(JSON.parse(latestSource.toString('utf8')));
  if (latest.lastPassingAttemptId === null) {
    throw new Error('The immutable Custom result has no passing attempt.');
  }

  const attemptId = latest.lastPassingAttemptId;
  const sourceAttemptDirectory = path.join(sourceTargetRoot, 'attempts', attemptId);
  const attemptSource = await readFile(path.join(sourceAttemptDirectory, 'attempt.json'));
  const result = QualificationAttemptResultSchema.parse(JSON.parse(attemptSource.toString('utf8')));

  if (
    result.attemptId !== attemptId ||
    result.status !== 'passed' ||
    result.selection.adapterId !== 'custom' ||
    result.selection.implementationId !== 'custom'
  ) {
    throw new Error('The immutable Custom passing attempt has contradictory identity.');
  }

  const compatibility = await createQualificationCompatibilityIdentityAtCommit({
    commit: options.sourceCommit,
    repositoryRoot: options.repositoryRoot,
    selection: result.selection,
  });
  const attemptDigest = calculateSha256(attemptSource);
  const attemptKey = createQualificationAttemptKey(attemptId);
  const destinationAttemptDirectory = path.join(
    options.destinationResultsRoot,
    customTarget.key,
    'attempts',
    attemptKey,
  );
  const storage = createQualificationAttemptStorage({
    attemptDigest,
    compatibility,
    result,
    carryForward: createCarryForwardSource(options.sourceCommit, attemptDigest),
  });

  await mkdir(destinationAttemptDirectory, { recursive: true });
  await writeFile(path.join(destinationAttemptDirectory, 'attempt.json'), attemptSource);

  for (const artifact of storage.artifacts) {
    const sourceArtifactPath = path.join(sourceAttemptDirectory, artifact.logicalPath);
    const sourceArtifact = await readFile(sourceArtifactPath);
    if (calculateSha256(sourceArtifact) !== artifact.sha256) {
      throw new Error(`Source Custom artifact digest does not match ${artifact.logicalPath}.`);
    }
    const destinationArtifactPath = resolveQualificationArtifactPath(
      destinationAttemptDirectory,
      storage,
      artifact.logicalPath,
    );
    await mkdir(path.dirname(destinationArtifactPath), { recursive: true });
    await writeFile(destinationArtifactPath, sourceArtifact);
    const sourceStats = await lstat(sourceArtifactPath);
    await chmod(destinationArtifactPath, sourceStats.mode & 0o777);
  }

  await writeFile(
    path.join(destinationAttemptDirectory, 'storage.json'),
    `${JSON.stringify(storage, null, 2)}\n`,
    'utf8',
  );
  await mkdir(path.join(options.destinationResultsRoot, customTarget.key), { recursive: true });
  await writeFile(
    path.join(options.destinationResultsRoot, customTarget.key, 'latest.json'),
    latestSource,
  );
  await verifyQualificationAttemptStorage({
    attemptDirectory: destinationAttemptDirectory,
    result,
    storage,
  });
  await validateQualificationAttemptEvidence({
    attemptDirectory: destinationAttemptDirectory,
    result,
    resultsRoot: options.destinationResultsRoot,
  });
};

const verifySourceArtifactEquality = async (options) => {
  const customTarget = options.targets.find(
    ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
  );
  if (customTarget === undefined) {
    throw new Error('Qualification storage migration requires the Custom target.');
  }

  const sourceLatestPath = 'qualification/results/custom/custom/latest.json';
  const sourceLatest = await readGitBlob(
    options.repositoryRoot,
    options.sourceCommit,
    sourceLatestPath,
  );
  const latest = QualificationLatestResultSchema.parse(JSON.parse(sourceLatest.toString('utf8')));
  if (latest.lastPassingAttemptId === null) {
    throw new Error('The immutable Custom result has no passing attempt.');
  }

  const attemptId = latest.lastPassingAttemptId;
  const sourceAttemptRoot = `qualification/results/custom/custom/attempts/${attemptId}`;
  const sourceAttempt = await readGitBlob(
    options.repositoryRoot,
    options.sourceCommit,
    `${sourceAttemptRoot}/attempt.json`,
  );
  const result = QualificationAttemptResultSchema.parse(JSON.parse(sourceAttempt.toString('utf8')));
  const attemptKey = createQualificationAttemptKey(attemptId);
  const currentTargetRoot = path.join(
    options.repositoryRoot,
    'qualification',
    'results',
    customTarget.key,
  );
  const currentAttemptDirectory = path.join(currentTargetRoot, 'attempts', attemptKey);
  const currentAttempt = await readFile(path.join(currentAttemptDirectory, 'attempt.json'));
  const currentLatest = await readFile(path.join(currentTargetRoot, 'latest.json'));
  const storage = await verifyQualificationAttemptStorage({
    attemptDirectory: currentAttemptDirectory,
    result,
  });
  const sourceCompatibility = await createQualificationCompatibilityIdentityAtCommit({
    commit: options.sourceCommit,
    repositoryRoot: options.repositoryRoot,
    selection: result.selection,
  });

  if (!sourceAttempt.equals(currentAttempt) || !sourceLatest.equals(currentLatest)) {
    throw new Error('Migrated Custom logical attempt or latest pointer changed bytes.');
  }

  const attemptDigest = calculateSha256(sourceAttempt);
  if (
    JSON.stringify(storage.compatibility) !== JSON.stringify(sourceCompatibility) ||
    storage.carryForward?.attestationId !== `v4.0.0-custom-${attemptDigest}` ||
    storage.carryForward.sourceRelease !== 'v4.0.0' ||
    storage.carryForward.sourceCommit !== options.sourceCommit ||
    storage.carryForward.sourceAttemptDigest !== attemptDigest
  ) {
    throw new Error('Migrated Custom storage lacks its exact carry-forward source binding.');
  }

  for (const artifact of storage.artifacts) {
    const sourceArtifact = await readGitBlob(
      options.repositoryRoot,
      options.sourceCommit,
      `${sourceAttemptRoot}/${artifact.logicalPath}`,
    );
    const currentArtifact = await readFile(
      resolveQualificationArtifactPath(currentAttemptDirectory, storage, artifact.logicalPath),
    );
    if (
      !sourceArtifact.equals(currentArtifact) ||
      calculateSha256(sourceArtifact) !== artifact.sha256
    ) {
      throw new Error(`Migrated Custom artifact changed bytes: ${artifact.logicalPath}`);
    }
  }

  await validateQualificationAttemptEvidence({
    attemptDirectory: currentAttemptDirectory,
    result,
    resultsRoot: path.join(options.repositoryRoot, 'qualification', 'results'),
  });
};

const assertCurrentLayout = async (options) => {
  const qualificationRoot = path.join(options.repositoryRoot, 'qualification');
  const profilesRoot = path.join(qualificationRoot, 'profiles');
  const resultsRoot = path.join(qualificationRoot, 'results');
  const profileEntries = await readdir(profilesRoot, { withFileTypes: true });
  const resultEntries = await readdir(resultsRoot, { withFileTypes: true });
  const expectedProfileEntries = new Set(['index.yaml', ...options.targets.map(({ key }) => key)]);
  const customTarget = options.targets.find(
    ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
  );
  const actualProfileEntries = new Set(profileEntries.map(({ name }) => name));

  if (
    actualProfileEntries.size !== expectedProfileEntries.size ||
    [...expectedProfileEntries].some((entryName) => !actualProfileEntries.has(entryName)) ||
    customTarget === undefined ||
    resultEntries.length !== 1 ||
    resultEntries[0]?.name !== customTarget.key ||
    !resultEntries[0].isDirectory()
  ) {
    throw new Error('Qualification storage does not have the exact current short layout.');
  }
};

const verifyMigratedState = async (options) => {
  const qualificationRoot = path.join(options.repositoryRoot, 'qualification');
  const sourceEvaluatorDigest = await calculateQualificationEvaluatorDigestAtCommit(
    options.sourceCommit,
    options.repositoryRoot,
  );
  const currentEvaluatorDigest = await calculateQualificationEvaluatorDigest(
    options.repositoryRoot,
  );
  if (sourceEvaluatorDigest !== currentEvaluatorDigest) {
    throw new Error('Evaluator-bearing qualification source changed during storage migration.');
  }

  await assertCurrentLayout(options);
  await assertProfileLogicalEquality({
    destinationQualificationRoot: qualificationRoot,
    repositoryRoot: options.repositoryRoot,
    sourceCommit: options.sourceCommit,
    targets: options.targets,
  });
  await verifySourceArtifactEquality(options);

  const resultVerification = await verifyQualificationResults(
    path.join(qualificationRoot, 'results'),
    options.repositoryRoot,
  );
  if (!resultVerification.passed || resultVerification.attempts !== 1) {
    throw new Error(
      `Migrated qualification result verification failed: ${JSON.stringify(resultVerification.issues)}`,
    );
  }

  const [sourceCompatibility, currentCompatibility] = await Promise.all([
    createQualificationCompatibilityIdentityAtCommit({
      commit: options.sourceCommit,
      repositoryRoot: options.repositoryRoot,
      selection: { adapterId: 'custom', implementationId: 'custom' },
    }),
    createQualificationCompatibilityIdentity({
      repositoryRoot: options.repositoryRoot,
      selection: { adapterId: 'custom', implementationId: 'custom' },
    }),
  ]);
  if (JSON.stringify(sourceCompatibility) !== JSON.stringify(currentCompatibility)) {
    throw new Error('Migrated Custom compatibility identity does not match its source.');
  }
};

const swapMigratedTrees = async (options) => {
  const qualificationRoot = path.join(options.repositoryRoot, 'qualification');
  const profilesRoot = path.join(qualificationRoot, 'profiles');
  const resultsRoot = path.join(qualificationRoot, 'results');
  const backupProfilesRoot = path.join(
    qualificationRoot,
    `.profiles-expanded.${process.pid}.${randomUUID()}`,
  );
  const backupResultsRoot = path.join(
    qualificationRoot,
    `.results-expanded.${process.pid}.${randomUUID()}`,
  );
  let profilesBackedUp = false;
  let profilesInstalled = false;
  let resultsBackedUp = false;
  let resultsInstalled = false;

  try {
    await rename(profilesRoot, backupProfilesRoot);
    profilesBackedUp = true;
    await rename(options.stagedProfilesRoot, profilesRoot);
    profilesInstalled = true;
    await rename(resultsRoot, backupResultsRoot);
    resultsBackedUp = true;
    await rename(options.stagedResultsRoot, resultsRoot);
    resultsInstalled = true;
    await verifyMigratedState(options);
  } catch (error) {
    if (resultsInstalled) {
      await rm(resultsRoot, { force: true, recursive: true });
    }
    if (resultsBackedUp) {
      await rename(backupResultsRoot, resultsRoot);
    }
    if (profilesInstalled) {
      await rm(profilesRoot, { force: true, recursive: true });
    }
    if (profilesBackedUp) {
      await rename(backupProfilesRoot, profilesRoot);
    }
    throw error;
  }

  await rm(backupProfilesRoot, { recursive: true });
  await rm(backupResultsRoot, { recursive: true });
};

/**
 * Migrates immutable v4.0.0 qualification profiles and the latest passing Custom result.
 * @returns The completed or exact no-op migration status.
 */
export const migrateQualificationStorage = async (options = {}) => {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
  const sourceRelease = options.sourceRelease ?? QUALIFICATION_STORAGE_SOURCE_RELEASE;
  const expectedSourceCommit = options.expectedSourceCommit ?? QUALIFICATION_STORAGE_SOURCE_COMMIT;
  const targets = QualificationProfileIndexSchema.parse({
    version: 1,
    targets: options.targets ?? QUALIFICATION_STORAGE_TARGETS,
  }).targets;
  const resolvedSourceCommit = await resolveSourceCommit(repositoryRoot, sourceRelease);

  if (resolvedSourceCommit !== expectedSourceCommit) {
    throw new Error(
      `${sourceRelease} resolves to ${resolvedSourceCommit}, expected ${expectedSourceCommit}.`,
    );
  }

  const qualificationRoot = path.join(repositoryRoot, 'qualification');
  const profilesRoot = path.join(qualificationRoot, 'profiles');
  const resultsRoot = path.join(qualificationRoot, 'results');

  if (await pathExists(path.join(profilesRoot, 'index.yaml'))) {
    await verifyMigratedState({
      repositoryRoot,
      sourceCommit: expectedSourceCommit,
      targets,
    });
    return { sourceCommit: expectedSourceCommit, status: 'already-migrated' };
  }

  await assertUnmodifiedExpandedSource(repositoryRoot, expectedSourceCommit);
  const sourceEvaluatorDigest = await calculateQualificationEvaluatorDigestAtCommit(
    expectedSourceCommit,
    repositoryRoot,
  );
  const currentEvaluatorDigest = await calculateQualificationEvaluatorDigest(repositoryRoot);
  if (sourceEvaluatorDigest !== currentEvaluatorDigest) {
    throw new Error('Current evaluator-bearing qualification source differs from v4.0.0.');
  }

  const stagingRoot = path.join(
    qualificationRoot,
    `.storage-migration.${process.pid}.${randomUUID()}`,
  );
  const stagedQualificationRoot = path.join(stagingRoot, 'qualification');
  const stagedProfilesRoot = path.join(stagedQualificationRoot, 'profiles');
  const stagedResultsRoot = path.join(stagedQualificationRoot, 'results');

  try {
    await mkdir(path.join(stagedQualificationRoot, 'cases'), { recursive: true });
    await copyFile(
      path.join(qualificationRoot, 'cases', 'cases.yaml'),
      path.join(stagedQualificationRoot, 'cases', 'cases.yaml'),
    );
    await writeProfileIndex(stagedProfilesRoot, targets);
    for (const target of targets) {
      await migrateProfile({
        destinationProfilesRoot: stagedProfilesRoot,
        sourceProfilesRoot: profilesRoot,
        target,
      });
    }
    await assertProfileLogicalEquality({
      destinationQualificationRoot: stagedQualificationRoot,
      repositoryRoot,
      sourceCommit: expectedSourceCommit,
      targets,
    });
    await migrateCustomResult({
      destinationResultsRoot: stagedResultsRoot,
      repositoryRoot,
      sourceCommit: expectedSourceCommit,
      sourceResultsRoot: resultsRoot,
      targets,
    });

    const stagedVerification = await verifyQualificationResults(stagedResultsRoot, repositoryRoot);
    if (!stagedVerification.passed || stagedVerification.attempts !== 1) {
      throw new Error(
        `Staged qualification result verification failed: ${JSON.stringify(stagedVerification.issues)}`,
      );
    }

    await swapMigratedTrees({
      repositoryRoot,
      sourceCommit: expectedSourceCommit,
      stagedProfilesRoot,
      stagedResultsRoot,
      targets,
    });
  } finally {
    await rm(stagingRoot, { force: true, recursive: true });
  }

  return { sourceCommit: expectedSourceCommit, status: 'migrated' };
};
