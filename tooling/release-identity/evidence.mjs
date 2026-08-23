import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { parseDocument } from 'yaml';

import { QualificationBaselineCheckSchema } from '../../qualification/src/baseline/index.ts';
import { loadRuntimeCompatibilityMatrix } from '../../qualification/src/compatibility/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  QualificationProfileSchema,
  QualificationSourceStateResultSchema,
} from '../../qualification/src/contracts/index.ts';
import {
  calculateCompatibilityBehaviorDigest,
  calculateQualificationDigest,
} from '../../qualification/src/execution/fingerprints.ts';
import { calculateDirectoryFingerprint } from '../../qualification/src/filesystem/index.ts';
import { inspectGitRepositoryState } from '../../qualification/src/repository-state/index.ts';
import { verifyQualificationResults } from '../../qualification/src/result/index.ts';
import {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  hasValidPortableSkillSemanticCarryForward,
} from '../semantic-evaluation/index.mjs';
import {
  downloadPublishedPackageArtifact,
  downloadPublishedPackageClosure,
  resolvePublishedPackageClosure,
  resolvePublishedPackageManifest,
} from '../package-candidate/index.mjs';
import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  RELEASE_PATHS,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from './constants.mjs';
import { createSemanticCliIdentity, parseStableVersion } from './identity.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const listQualificationProfiles = (repositoryRoot) => {
  const profilesRoot = join(repositoryRoot, 'qualification', 'profiles');
  const profiles = [];

  for (const adapterEntry of readdirSync(profilesRoot, { withFileTypes: true })) {
    if (!adapterEntry.isDirectory()) continue;
    const adapterRoot = join(profilesRoot, adapterEntry.name);

    for (const implementationEntry of readdirSync(adapterRoot, { withFileTypes: true })) {
      if (!implementationEntry.isDirectory()) continue;
      const profilePath = join(adapterRoot, implementationEntry.name, 'profile.yaml');
      if (!existsSync(profilePath)) continue;

      const document = parseDocument(readFileSync(profilePath, 'utf8'), { uniqueKeys: true });
      if (document.errors.length > 0) {
        throw new Error(document.errors.map((error) => error.message).join('\n'));
      }
      const profile = QualificationProfileSchema.parse(document.toJS());
      profiles.push({
        adapterId: profile.adapterId,
        caseIds: profile.cases.map(({ id }) => id),
        implementationId: profile.implementationId,
        profileDirectory: join(adapterRoot, implementationEntry.name),
      });
    }
  }

  return profiles;
};

const createQualificationStageIds = (caseIds) => [
  'source-state',
  'coverage',
  'candidate',
  'baseline',
  ...caseIds.flatMap((caseId) => [
    `case:${caseId}:prepare`,
    `case:${caseId}:deterministic-before`,
    `case:${caseId}:actor`,
    `case:${caseId}:deterministic-after`,
    `case:${caseId}:assertions`,
    `case:${caseId}:judge`,
    `case:${caseId}:result`,
  ]),
];

const hasCompletePassingQualificationCases = (attempt, caseIds) =>
  attempt.cases.length === caseIds.length &&
  caseIds.every((caseId, index) => {
    const result = attempt.cases[index];
    if (
      result?.caseId !== caseId ||
      result.status !== 'passed' ||
      result.judgeStatus !== 'completed' ||
      result.judgeOutputPath === null ||
      result.judgeSkippedPath !== null ||
      result.failures.length > 0
    ) {
      return false;
    }

    return [
      result.deterministicBeforePath,
      result.deterministicAfterPath,
      result.actorOutputPath,
      result.judgeOutputPath,
      result.workspaceAssertionsPath,
      result.patchPath,
    ].every((artifactPath) => attempt.artifactDigests[artifactPath] !== undefined);
  });

const hasCompletePassingQualificationStages = (attempt, caseIds) => {
  const expectedStageIds = createQualificationStageIds(caseIds);
  return (
    attempt.stages.length === expectedStageIds.length &&
    expectedStageIds.every((stageId, index) => {
      const stage = attempt.stages[index];
      return stage?.id === stageId && (stage.status === 'cached' || stage.status === 'passed');
    })
  );
};

const inspectQualificationControlEvidence = (
  attemptDirectory,
  attempt,
  adapterId,
  relativeLatestPath,
) => {
  const requiredControlPaths = ['baseline.json', 'coverage.json', 'source-state.json'];
  if (
    !requiredControlPaths.every(
      (artifactPath) => attempt.artifactDigests[artifactPath] !== undefined,
    )
  ) {
    return {
      baseline: null,
      issue: `${relativeLatestPath} does not include every release-gate control artifact.`,
    };
  }

  const baseline = QualificationBaselineCheckSchema.parse(
    readJson(join(attemptDirectory, 'baseline.json')),
  );
  const sourceState = QualificationSourceStateResultSchema.parse(
    readJson(join(attemptDirectory, 'source-state.json')),
  );
  const coverage = readJson(join(attemptDirectory, 'coverage.json'));
  const hasCleanTrustedSource =
    sourceState.passed &&
    sourceState.requiresCleanInputs &&
    sourceState.isExecutionHostTrusted &&
    !sourceState.packagesRepositoryDirty &&
    !sourceState.qualificationRepositoryDirty &&
    !sourceState.skillRepositoryDirty &&
    sourceState.failures.length === 0;
  const hasCompleteCoverage =
    coverage.passed === true &&
    Array.isArray(coverage.missingClaims) &&
    coverage.missingClaims.length === 0 &&
    Array.isArray(coverage.unknownClaims) &&
    coverage.unknownClaims.length === 0 &&
    Array.isArray(coverage.uncoveredCaseIds) &&
    coverage.uncoveredCaseIds.length === 0;
  const hasCompatibleBaseline =
    adapterId === 'custom'
      ? !baseline.required &&
        baseline.passed &&
        baseline.status === 'not-required' &&
        baseline.baselineAttemptId === null &&
        baseline.failures.length === 0
      : baseline.required &&
        baseline.passed &&
        baseline.status === 'passed' &&
        baseline.baselineAttemptId === attempt.provenance.baselineAttemptId &&
        baseline.failures.length === 0;

  if (!hasCleanTrustedSource || !hasCompleteCoverage || !hasCompatibleBaseline) {
    return {
      baseline,
      issue: `${relativeLatestPath} does not contain passing source, coverage, and baseline controls.`,
    };
  }

  return { baseline, issue: null };
};

const createRecordedPackageIdentity = (candidatePackage) => ({
  name: candidatePackage.name,
  version: candidatePackage.version,
  registryIntegrity: candidatePackage.registryIntegrity,
  registryShasum: candidatePackage.registryShasum,
  registryTarballUrl: candidatePackage.registryTarballUrl,
  tarballName: candidatePackage.tarballName,
  sha256: candidatePackage.sha256,
});

const sortPackageIdentities = (packages) =>
  [...packages].sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'));

const readQualificationTypeScriptVersion = (repositoryRoot) => {
  const qualificationManifest = readJson(join(repositoryRoot, 'qualification', 'package.json'));
  return parseStableVersion(qualificationManifest.devDependencies?.typescript);
};

/** Resolves the current package source and independently verifies every published archive. */
const resolveCurrentQualificationInputs = async ({
  downloadPublishedArtifact,
  downloadPublishedClosure,
  packagesRepository,
  repositoryRoot,
  releaseCli,
  resolvePublishedManifest,
  resolvePublishedClosure,
}) => {
  const [matrix, packagesState, publishedManifests, typeScriptManifest] = await Promise.all([
    loadRuntimeCompatibilityMatrix(packagesRepository),
    inspectGitRepositoryState(packagesRepository),
    resolvePublishedClosure({
      cliVersion: releaseCli.version,
      selectedPackageName: '@moldea.ai/cli',
    }),
    resolvePublishedManifest({
      packageName: 'typescript',
      version: readQualificationTypeScriptVersion(repositoryRoot),
    }),
  ]);

  const artifactDirectory = mkdtempSync(join(tmpdir(), 'moldea-release-packages-'));

  try {
    const publishedPackages = await downloadPublishedClosure({
      artifactDirectory,
      manifests: publishedManifests,
      selectedPackageName: '@moldea.ai/cli',
    });
    const typeScriptPackage = await downloadPublishedArtifact({
      artifactDirectory: join(artifactDirectory, 'fixture-tools'),
      manifest: typeScriptManifest,
    });

    return {
      matrix,
      packagesState,
      publishedPackages: sortPackageIdentities(
        [...publishedPackages, typeScriptPackage].map(createRecordedPackageIdentity),
      ),
    };
  } finally {
    rmSync(artifactDirectory, { force: true, recursive: true });
  }
};

const inspectSemanticEvidence = (repositoryRoot) => {
  const issues = [];
  const semanticResultPath = join(repositoryRoot, RELEASE_PATHS.semanticResult);

  if (!existsSync(semanticResultPath)) {
    return [`${RELEASE_PATHS.semanticResult} is missing fresh semantic evidence.`];
  }

  const semanticResult = readJson(semanticResultPath);
  const expectedCli = createSemanticCliIdentity(repositoryRoot);
  const conformanceCases = readJson(join(repositoryRoot, RELEASE_PATHS.conformanceCases));
  const semanticCases = conformanceCases.semanticCases ?? [];
  const expectedCaseSuiteDigest = createSemanticCaseSuiteDigest(semanticCases);
  const expectedSkillDigest = createPortableSkillDigest(repositoryRoot);

  if (semanticResult.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION) {
    issues.push(
      `${RELEASE_PATHS.semanticResult} does not use semantic protocol ${SEMANTIC_EVALUATION_PROTOCOL_VERSION}.`,
    );
  }
  if (JSON.stringify(semanticResult.cli) !== JSON.stringify(expectedCli)) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not match the exact release CLI identity.`);
  }
  const hasConsistentRecordedArtifact =
    semanticResult.artifact?.sha256 === semanticResult.skillDigest &&
    semanticResult.artifactDigest === semanticResult.skillDigest &&
    semanticResult.artifactSha256 === semanticResult.skillDigest;
  const hasCurrentArtifact = semanticResult.skillDigest === expectedSkillDigest;
  const hasValidCarryForward = hasValidPortableSkillSemanticCarryForward(
    semanticResult.releaseEvidenceCarryForward,
    semanticResult.skillDigest,
    repositoryRoot,
  );
  if (
    !hasConsistentRecordedArtifact ||
    (!hasCurrentArtifact && !hasValidCarryForward) ||
    (hasCurrentArtifact && semanticResult.releaseEvidenceCarryForward !== undefined)
  ) {
    issues.push(
      `${RELEASE_PATHS.semanticResult} does not match the exact portable skill artifact.`,
    );
  }
  if (semanticResult.caseSuiteDigest !== expectedCaseSuiteDigest) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not match the current semantic case suite.`);
  }

  const results = Array.isArray(semanticResult.results) ? semanticResult.results : [];
  const resultsById = new Map(results.map((result) => [result.id, result]));
  const hasCompletePassingCases =
    results.length === semanticCases.length &&
    semanticCases.every((caseDefinition) => {
      const result = resultsById.get(caseDefinition.id);
      return (
        result?.passed === true &&
        result.caseDefinitionDigest === createSemanticCaseDefinitionDigest(caseDefinition)
      );
    });

  if (!hasCompletePassingCases) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not contain every current passing case.`);
  }

  return issues;
};

const createQualificationDigestRoots = (repositoryRoot) => [
  {
    pathPrefix: 'qualification',
    rootDirectory: join(repositoryRoot, 'qualification'),
    excludedDirectoryNames: new Set(['node_modules']),
    excludedRelativePathPrefixes: ['results'],
  },
  {
    pathPrefix: 'tooling/codex-evaluation-host',
    rootDirectory: join(repositoryRoot, 'tooling', 'codex-evaluation-host'),
  },
  {
    pathPrefix: 'tooling/package-candidate',
    rootDirectory: join(repositoryRoot, 'tooling', 'package-candidate'),
  },
];

/**
 * Inspects whether fresh semantic and qualification evidence completes the release gate.
 * @param repositoryRoot The skill repository whose release is being checked.
 * @param options Optional release-input overrides used by isolated verification.
 * @returns A promise resolving to every blocking release-evidence issue.
 */
export const inspectReleaseEvidence = async (
  repositoryRoot,
  {
    downloadPublishedArtifact = downloadPublishedPackageArtifact,
    downloadPublishedClosure = downloadPublishedPackageClosure,
    packagesRepository = resolve(repositoryRoot, '..', 'packages'),
    resolvePublishedManifest = resolvePublishedPackageManifest,
    resolvePublishedClosure = resolvePublishedPackageClosure,
  } = {},
) => {
  const issues = inspectSemanticEvidence(repositoryRoot);
  const resultsRoot = join(repositoryRoot, 'qualification', 'results');
  const resultVerification = await verifyQualificationResults(resultsRoot);

  for (const verificationIssue of resultVerification.issues) {
    issues.push(
      `qualification/results/${verificationIssue.path} is invalid: ${verificationIssue.message}`,
    );
  }

  const qualificationDigest = await calculateQualificationDigest(
    createQualificationDigestRoots(repositoryRoot),
  );
  const skillDigest = await calculateDirectoryFingerprint(join(repositoryRoot, 'moldea'));
  const releaseCli = createSemanticCliIdentity(repositoryRoot);
  let currentInputs = null;

  try {
    currentInputs = await resolveCurrentQualificationInputs({
      downloadPublishedArtifact,
      downloadPublishedClosure,
      packagesRepository,
      repositoryRoot,
      releaseCli,
      resolvePublishedManifest,
      resolvePublishedClosure,
    });
    const publishedCli = currentInputs.publishedPackages.find(
      ({ name }) => name === '@moldea.ai/cli',
    );
    if (
      publishedCli?.version !== releaseCli.version ||
      publishedCli.registryIntegrity !== releaseCli.integrity
    ) {
      issues.push('The root release CLI identity does not match the published npm package.');
    }
    if (currentInputs.packagesState.isDirty) {
      issues.push('The packages repository used for release evidence has uncommitted changes.');
    }
  } catch (error) {
    issues.push(
      `Unable to resolve current qualification release inputs: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const passingEvidence = new Map();

  for (const {
    adapterId,
    caseIds,
    implementationId,
    profileDirectory,
  } of listQualificationProfiles(repositoryRoot)) {
    const relativeLatestPath = join(
      'qualification',
      'results',
      adapterId,
      implementationId,
      'latest.json',
    );
    const latestPath = join(repositoryRoot, relativeLatestPath);
    if (!existsSync(latestPath)) {
      issues.push(`${relativeLatestPath} is missing qualification evidence.`);
      continue;
    }

    let latest;
    try {
      latest = QualificationLatestResultSchema.parse(readJson(latestPath));
    } catch (error) {
      issues.push(
        `${relativeLatestPath} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    if (
      latest.protocolVersion !== QUALIFICATION_EVIDENCE_PROTOCOL_VERSION ||
      latest.latestStatus !== 'passed' ||
      latest.lastPassingAttemptId !== latest.latestAttemptId
    ) {
      issues.push(
        `${relativeLatestPath} must point to a latest passing protocol ${QUALIFICATION_EVIDENCE_PROTOCOL_VERSION} attempt.`,
      );
      continue;
    }

    const attemptDirectory = join(
      repositoryRoot,
      'qualification',
      'results',
      adapterId,
      implementationId,
      'attempts',
      latest.latestAttemptId,
    );
    const attemptPath = join(attemptDirectory, 'attempt.json');
    if (!existsSync(attemptPath)) {
      issues.push(`${relativeLatestPath} points to a missing attempt.`);
      continue;
    }

    let attempt;
    try {
      attempt = QualificationAttemptResultSchema.parse(readJson(attemptPath));
    } catch (error) {
      issues.push(
        `${relativeLatestPath} points to an invalid attempt: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const profileDigest = await calculateDirectoryFingerprint(profileDirectory);
    const adapter = currentInputs?.matrix.adapters[adapterId];
    const target = adapter?.targets?.find(({ id }) => id === implementationId);
    const hasCurrentTarget =
      adapter !== undefined && adapter.implementationStatus === 'available' && target !== undefined;
    const targetDigest = hasCurrentTarget
      ? calculateCompatibilityBehaviorDigest({ adapter, target })
      : null;
    const recordedPackages = sortPackageIdentities(
      attempt.provenance.packages.map(createRecordedPackageIdentity),
    );
    const hasExactPublishedClosure =
      currentInputs !== null &&
      JSON.stringify(recordedPackages) === JSON.stringify(currentInputs.publishedPackages);
    const hasSelectedPackage =
      adapter !== undefined &&
      currentInputs?.publishedPackages.some(
        ({ name }) => name === adapter.implementation.package,
      ) === true;
    if (
      attempt.protocolVersion !== QUALIFICATION_EVIDENCE_PROTOCOL_VERSION ||
      attempt.status !== 'passed' ||
      attempt.selection?.adapterId !== adapterId ||
      attempt.selection?.implementationId !== implementationId ||
      attempt.provenance?.qualificationDigest !== qualificationDigest ||
      attempt.provenance?.skillRepositoryFingerprint !== skillDigest ||
      attempt.provenance?.profileDigest !== profileDigest ||
      currentInputs === null ||
      attempt.provenance?.packagesRepositoryCommit !== currentInputs.packagesState.commit ||
      attempt.provenance?.packagesRepositoryFingerprint !==
        currentInputs.packagesState.fingerprint ||
      attempt.provenance?.packagesRepositoryDirty ||
      targetDigest === null ||
      attempt.provenance?.targetDigest !== targetDigest ||
      !hasExactPublishedClosure ||
      !hasSelectedPackage
    ) {
      issues.push(`${relativeLatestPath} does not match the current release inputs.`);
      continue;
    }

    const hasPassingStages = hasCompletePassingQualificationStages(attempt, caseIds);
    const hasPassingCases = hasCompletePassingQualificationCases(attempt, caseIds);
    if (!hasPassingStages) {
      issues.push(`${relativeLatestPath} does not contain every current passing stage.`);
    }
    if (!hasPassingCases) {
      issues.push(`${relativeLatestPath} does not contain every current passing case artifact.`);
    }

    try {
      const controlEvidence = inspectQualificationControlEvidence(
        attemptDirectory,
        attempt,
        adapterId,
        relativeLatestPath,
      );
      if (controlEvidence.issue !== null) issues.push(controlEvidence.issue);
      if (hasPassingStages && hasPassingCases && controlEvidence.issue === null) {
        passingEvidence.set(`${adapterId}/${implementationId}`, {
          attempt,
          baseline: controlEvidence.baseline,
          relativeLatestPath,
        });
      }
    } catch (error) {
      issues.push(
        `${relativeLatestPath} contains invalid release-gate control evidence: ${error.message}`,
      );
    }
  }

  const customEvidence = passingEvidence.get('custom/custom');
  const customBaselineAttemptId = customEvidence?.attempt.attemptId ?? null;
  for (const [selectionKey, evidence] of passingEvidence) {
    if (selectionKey === 'custom/custom') continue;
    if (
      customBaselineAttemptId === null ||
      evidence.attempt.provenance.baselineAttemptId !== customBaselineAttemptId ||
      evidence.baseline?.baselineAttemptId !== customBaselineAttemptId
    ) {
      issues.push(
        `${evidence.relativeLatestPath} does not reference the current passing Custom baseline.`,
      );
    }
  }

  return issues;
};

/** Requires complete fresh semantic and qualification evidence for release. */
export const assertReleaseEvidence = async (repositoryRoot) => {
  const issues = await inspectReleaseEvidence(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
};
