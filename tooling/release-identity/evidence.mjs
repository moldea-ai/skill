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
  CODEX_EVALUATION_MODEL,
  CODEX_EVALUATION_REASONING_EFFORT,
} from '../codex-evaluation-host/index.mjs';
import {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  hasValidActorCommandPolicyEvidence,
  hasValidRepositoryControlEvidence,
  hasValidScenarioEvidence,
  hasValidPortableSkillSemanticCarryForward,
  loadVerifiedSemanticEvaluationAttempts,
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

const SEMANTIC_RESULTS_PATH = 'fixtures/semantic-evaluation-results';

const SEMANTIC_HOST_CONTRACT = {
  model: CODEX_EVALUATION_MODEL,
  name: 'codex',
  reasoningEffort: CODEX_EVALUATION_REASONING_EFFORT,
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const hasSemanticHostIdentity = (host) =>
  host?.model === SEMANTIC_HOST_CONTRACT.model &&
  host?.name === SEMANTIC_HOST_CONTRACT.name &&
  host?.reasoningEffort === SEMANTIC_HOST_CONTRACT.reasoningEffort &&
  typeof host?.version === 'string' &&
  host.version.trim().length > 0 &&
  host.version !== 'unavailable';

const createCanonicalTrialProvenance = (semanticResult) =>
  (Array.isArray(semanticResult.caseHistories) ? semanticResult.caseHistories : [])
    .map((history) => ({
      id: history.id,
      trials: [
        {
          actorCommandPolicyEvidence: history.initial?.actorCommandPolicyEvidence,
          actorHost: history.initial?.actorHost,
          confirmationIndex: null,
          evaluatedAt: history.initial?.evaluatedAt,
          judgeHost: history.initial?.judgeHost,
          kind: 'initial',
        },
        ...(Array.isArray(history.confirmations) ? history.confirmations : []).map(
          (confirmation) => ({
            actorCommandPolicyEvidence: confirmation.actorCommandPolicyEvidence,
            actorHost: confirmation.actorHost,
            confirmationIndex: confirmation.confirmationIndex,
            evaluatedAt: confirmation.evaluatedAt,
            judgeHost: confirmation.judgeHost,
            kind: 'confirmation',
          }),
        ),
      ],
    }))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));

const createAttemptTrialProvenance = (attempt) =>
  attempt.cases.map(({ id, trials }) => ({
    id,
    trials: trials.map(
      ({
        actorCommandPolicyEvidence,
        actorHost,
        confirmationIndex,
        evaluatedAt,
        judgeHost,
        kind,
      }) => ({
        actorCommandPolicyEvidence,
        actorHost,
        confirmationIndex,
        evaluatedAt,
        judgeHost,
        kind,
      }),
    ),
  }));

const listQualificationProfiles = (repositoryRoot) => {
  const profilesRoot = join(repositoryRoot, 'qualification', 'profiles');
  const profiles = [];

  for (const adapterEntry of readdirSync(profilesRoot, {
    withFileTypes: true,
  })) {
    if (!adapterEntry.isDirectory()) continue;
    const adapterRoot = join(profilesRoot, adapterEntry.name);

    for (const implementationEntry of readdirSync(adapterRoot, {
      withFileTypes: true,
    })) {
      if (!implementationEntry.isDirectory()) continue;
      const profilePath = join(adapterRoot, implementationEntry.name, 'profile.yaml');
      if (!existsSync(profilePath)) continue;

      const document = parseDocument(readFileSync(profilePath, 'utf8'), {
        uniqueKeys: true,
      });
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
  const semanticCoveragePath = join(repositoryRoot, RELEASE_PATHS.semanticCoverage);
  let expectedCoverageDigest = null;
  if (!existsSync(semanticCoveragePath)) {
    issues.push(`${RELEASE_PATHS.semanticCoverage} is missing.`);
  } else {
    try {
      expectedCoverageDigest = createSemanticCoverageDigest(
        readJson(semanticCoveragePath),
        semanticCases,
      );
    } catch (error) {
      issues.push(
        `${RELEASE_PATHS.semanticCoverage} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (semanticResult.schemaVersion !== 6) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not use semantic result schema 6.`);
  }
  if (JSON.stringify(semanticResult.hostContract) !== JSON.stringify(SEMANTIC_HOST_CONTRACT)) {
    issues.push(
      `${RELEASE_PATHS.semanticResult} does not use the official semantic host contract.`,
    );
  }
  if (
    semanticResult.confirmationPolicy?.version !== 1 ||
    semanticResult.confirmationPolicy?.requiredPassingConfirmations !== 2
  ) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not use confirmation policy 1.`);
  }
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
  if (expectedCoverageDigest === null || semanticResult.coverageDigest !== expectedCoverageDigest) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not match the semantic coverage contract.`);
  }

  try {
    const history = loadVerifiedSemanticEvaluationAttempts(
      join(repositoryRoot, SEMANTIC_RESULTS_PATH),
    );
    const latestAttempt = history.attempts.find(
      ({ attemptId }) => attemptId === history.latest?.latestAttemptId,
    );
    const hasMatchingLatestPass =
      latestAttempt?.status === 'passed' &&
      semanticResult.semanticAttemptId === latestAttempt.attemptId &&
      history.latest?.lastPassingAttemptId === latestAttempt.attemptId &&
      latestAttempt.artifactDigest === semanticResult.skillDigest &&
      latestAttempt.caseSuiteDigest === semanticResult.caseSuiteDigest &&
      latestAttempt.coverageDigest === semanticResult.coverageDigest &&
      JSON.stringify(latestAttempt.cli) === JSON.stringify(semanticResult.cli) &&
      latestAttempt.schemaVersion === 4 &&
      JSON.stringify(latestAttempt.hostContract) === JSON.stringify(semanticResult.hostContract) &&
      JSON.stringify(createAttemptTrialProvenance(latestAttempt)) ===
        JSON.stringify(createCanonicalTrialProvenance(semanticResult));
    if (!hasMatchingLatestPass) {
      issues.push(
        `${RELEASE_PATHS.semanticResult} does not match the newest immutable passing semantic attempt.`,
      );
    }
  } catch (error) {
    issues.push(
      `${SEMANTIC_RESULTS_PATH} is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const results = Array.isArray(semanticResult.results) ? semanticResult.results : [];
  const resultsById = new Map(results.map((result) => [result.id, result]));
  const publicCases = Array.isArray(semanticResult.cases) ? semanticResult.cases : [];
  const publicCasesById = new Map(publicCases.map((result) => [result.id, result]));
  const caseHistories = Array.isArray(semanticResult.caseHistories)
    ? semanticResult.caseHistories
    : [];
  const caseHistoriesById = new Map(caseHistories.map((history) => [history.id, history]));
  const hasCompletePassingCases =
    results.length === semanticCases.length &&
    publicCases.length === semanticCases.length &&
    caseHistories.length === semanticCases.length &&
    semanticCases.every((caseDefinition) => {
      const result = resultsById.get(caseDefinition.id);
      const publicCase = publicCasesById.get(caseDefinition.id);
      const history = caseHistoriesById.get(caseDefinition.id);
      const hasPassingInitial =
        history?.resolution === 'passed' &&
        history.initial?.passed === true &&
        hasValidActorCommandPolicyEvidence(history.initial?.actorCommandPolicyEvidence) &&
        hasSemanticHostIdentity(history.initial?.actorHost) &&
        hasSemanticHostIdentity(history.initial?.judgeHost) &&
        Array.isArray(history.confirmations) &&
        history.confirmations.length === 0;
      const hasRecoveredFailure =
        history?.resolution === 'recovered' &&
        history.initial?.passed === false &&
        hasValidActorCommandPolicyEvidence(history.initial?.actorCommandPolicyEvidence) &&
        hasSemanticHostIdentity(history.initial?.actorHost) &&
        hasSemanticHostIdentity(history.initial?.judgeHost) &&
        Array.isArray(history.confirmations) &&
        history.confirmations.length === 2 &&
        history.confirmations.every(
          (confirmation, index) =>
            confirmation.confirmationIndex === index + 1 &&
            confirmation.passed === true &&
            hasValidActorCommandPolicyEvidence(confirmation.actorCommandPolicyEvidence) &&
            hasSemanticHostIdentity(confirmation.actorHost) &&
            hasSemanticHostIdentity(confirmation.judgeHost),
        );
      const selectedHistoryTrial = hasPassingInitial
        ? history.initial
        : hasRecoveredFailure
          ? history.confirmations.at(-1)
          : null;
      return (
        result?.passed === true &&
        hasValidActorCommandPolicyEvidence(result.actorCommandPolicyEvidence) &&
        hasSemanticHostIdentity(result.actorHost) &&
        hasSemanticHostIdentity(result.judgeHost) &&
        JSON.stringify(result.actorHost) === JSON.stringify(selectedHistoryTrial?.actorHost) &&
        JSON.stringify(result.judgeHost) === JSON.stringify(selectedHistoryTrial?.judgeHost) &&
        result.evaluatedAt === selectedHistoryTrial?.evaluatedAt &&
        JSON.stringify(result.actorCommandPolicyEvidence) ===
          JSON.stringify(selectedHistoryTrial?.actorCommandPolicyEvidence) &&
        result.caseDefinitionDigest === createSemanticCaseDefinitionDigest(caseDefinition) &&
        hasValidScenarioEvidence(result.scenarioEvidence, caseDefinition) &&
        hasValidRepositoryControlEvidence(result.repositoryControlEvidence) &&
        result.repositoryControlEvidence.violations.length === 0 &&
        publicCase?.passed === true &&
        hasValidActorCommandPolicyEvidence(publicCase.actorCommandPolicyEvidence) &&
        JSON.stringify(publicCase.actorHost) === JSON.stringify(result.actorHost) &&
        JSON.stringify(publicCase.judgeHost) === JSON.stringify(result.judgeHost) &&
        publicCase.evaluatedAt === result.evaluatedAt &&
        publicCase.caseDefinitionDigest === result.caseDefinitionDigest &&
        JSON.stringify(publicCase.actorCommandPolicyEvidence) ===
          JSON.stringify(result.actorCommandPolicyEvidence) &&
        (hasPassingInitial || hasRecoveredFailure) &&
        JSON.stringify(publicCase.scenarioEvidence) === JSON.stringify(result.scenarioEvidence) &&
        JSON.stringify(publicCase.repositoryControlEvidence) ===
          JSON.stringify(result.repositoryControlEvidence)
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
      attempt.provenance?.model !== CODEX_EVALUATION_MODEL ||
      attempt.provenance?.reasoningEffort !== CODEX_EVALUATION_REASONING_EFFORT ||
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
