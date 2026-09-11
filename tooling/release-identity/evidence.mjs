import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createPortableSkillDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  hasPassingMoldeaResourceBudget,
  validateSemanticCoverage,
  verifySemanticEvaluationAttempts,
} from '../semantic-evaluation/index.mjs';
import { verifyQualificationResults } from '../../qualification/src/result/index.ts';
import { createQualificationAttemptKey } from '../../qualification/src/storage/index.ts';

import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from './constants.mjs';
import { createSemanticCliIdentity } from './identity.mjs';
import { readReleaseIdentity } from './identity.mjs';
import {
  createCurrentQualificationReleaseEvidence,
  createCurrentReleaseEvidenceTarget,
  createCurrentSemanticReleaseEvidence,
  createDependencyClosureSha256,
  createFreshEvidenceSectionSha256,
  createFreshReleaseEvidenceEnvelope,
} from './release-evidence-current.mjs';
import {
  parseReleaseEvidenceEnvelope,
  readReleaseEvidenceEnvelope,
  serializeReleaseEvidenceEnvelope,
  validateReleaseEvidenceReason,
} from './release-evidence-envelope.mjs';
import {
  assertPinnedReleaseEvidenceSection,
  resolveReleaseEvidenceSectionSource,
} from './release-evidence-source.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** Inspects current semantic evidence against the exact skill, suite, coverage, and CLI identity. */
export const inspectSemanticEvidence = async (repositoryRoot) => {
  const issues = [];
  const casesPath = join(repositoryRoot, 'fixtures', 'conformance-cases.json');
  const coveragePath = join(repositoryRoot, 'fixtures', 'semantic-evaluation-coverage.json');
  const resultPath = join(repositoryRoot, 'fixtures', 'semantic-evaluation-result.json');
  const resultsRoot = join(repositoryRoot, 'fixtures', 'semantic-evaluation-results');
  if (!existsSync(resultPath)) return ['Current semantic evaluation result is missing.'];

  const caseDefinitions = readJson(casesPath).semanticCases;
  const coverage = readJson(coveragePath);
  const result = readJson(resultPath);
  try {
    validateSemanticCoverage(coverage, caseDefinitions);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
  const expectedArtifactDigest = createPortableSkillDigest(repositoryRoot);
  const expectedCaseSuiteDigest = createSemanticCaseSuiteDigest(caseDefinitions);
  const expectedCoverageDigest = createSemanticCoverageDigest(coverage, caseDefinitions);
  const expectedCli = createSemanticCliIdentity(repositoryRoot);
  if (result.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION) {
    issues.push('Semantic evidence does not use the current protocol.');
  }
  if (
    result.artifactDigest !== expectedArtifactDigest ||
    result.artifactSha256 !== expectedArtifactDigest
  ) {
    issues.push('Semantic evidence does not match the current portable skill bytes.');
  }
  if (
    result.caseSuiteDigest !== expectedCaseSuiteDigest ||
    result.coverageDigest !== expectedCoverageDigest
  ) {
    issues.push('Semantic evidence does not match the current suite and coverage map.');
  }
  if (JSON.stringify(result.cli) !== JSON.stringify(expectedCli)) {
    issues.push('Semantic evidence does not match the current CLI closure.');
  }
  const resultsById = new Map((result.cases ?? []).map((entry) => [entry.id, entry]));
  for (const caseDefinition of caseDefinitions) {
    const caseResult = resultsById.get(caseDefinition.id);
    if (
      caseResult?.passed !== true ||
      !hasPassingMoldeaResourceBudget(
        caseResult.actorResourceEvidence,
        caseDefinition.resourceBudget,
      )
    ) {
      issues.push(`Semantic case ${caseDefinition.id} lacks passing current resource evidence.`);
    }
  }
  if (resultsById.size !== caseDefinitions.length) {
    issues.push('Semantic result case inventory does not match the current suite.');
  }
  const history = await verifySemanticEvaluationAttempts(resultsRoot);
  if (!history.passed) {
    issues.push(...history.issues.map((issue) => `Semantic history: ${issue}`));
  }
  const latestPath = join(resultsRoot, 'latest.json');
  if (!existsSync(latestPath)) {
    issues.push('Semantic latest pointer is missing.');
  } else {
    const latest = readJson(latestPath);
    if (
      latest.latestStatus !== 'passed' ||
      latest.latestAttemptId !== result.semanticAttemptId ||
      latest.lastPassingAttemptId !== result.semanticAttemptId
    ) {
      issues.push('Semantic result does not match the current passing attempt pointer.');
    }
  }
  return issues;
};

/** Inspects current qualification evidence for every declared target. */
export const inspectQualificationEvidence = async (repositoryRoot) => {
  const issues = [];
  const resultsRoot = join(repositoryRoot, 'qualification', 'results');
  const { parse } = await import('yaml');
  const index = parse(
    readFileSync(join(repositoryRoot, 'qualification', 'profiles', 'index.yaml'), 'utf8'),
  );
  const verification = await verifyQualificationResults(resultsRoot);
  if (!verification.passed) {
    issues.push(
      ...verification.issues.map(({ path, message }) => `Qualification ${path}: ${message}`),
    );
  }
  for (const target of index.targets) {
    const latestPath = join(resultsRoot, target.key, 'latest.json');
    if (!existsSync(latestPath)) {
      issues.push(`Qualification target ${target.key} has no current result.`);
      continue;
    }
    const latest = readJson(latestPath);
    if (
      latest.latestStatus !== 'passed' ||
      latest.latestAttemptId !== latest.lastPassingAttemptId
    ) {
      issues.push(`Qualification target ${target.key} is not currently passing.`);
      continue;
    }
    const attemptKey = createQualificationAttemptKey(latest.latestAttemptId);
    const attemptsRoot = join(resultsRoot, target.key, 'attempts');
    const attemptDirectory = existsSync(join(attemptsRoot, attemptKey))
      ? join(attemptsRoot, attemptKey)
      : null;
    if (attemptDirectory !== null) {
      const attempt = readJson(join(attemptDirectory, 'attempt.json'));
      if (attempt.protocolVersion !== QUALIFICATION_EVIDENCE_PROTOCOL_VERSION) {
        issues.push(`Qualification target ${target.key} does not use the current protocol.`);
      }
    }
  }
  return issues;
};

/** Inspects all exact-current model-derived evidence required for a fresh release. */
export const inspectCurrentReleaseEvidence = async (repositoryRoot) => [
  ...(await inspectSemanticEvidence(repositoryRoot)),
  ...(await inspectQualificationEvidence(repositoryRoot)),
];

/** Requires exact current semantic and qualification evidence for fresh recording. */
export const assertCurrentReleaseEvidence = async (repositoryRoot) => {
  const issues = await inspectCurrentReleaseEvidence(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
};

const writeEnvelopeAtomically = (repositoryRoot, envelope) => {
  const path = join(repositoryRoot, 'fixtures', 'release-evidence.json');
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, serializeReleaseEvidenceEnvelope(envelope), {
      encoding: 'utf8',
      flag: 'wx',
    });
    renameSync(temporaryPath, path);
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
  return path;
};

const inspectTargetIdentity = (repositoryRoot, envelope) => {
  const identity = readReleaseIdentity(repositoryRoot);
  const portableSkillSha256 = createPortableSkillDigest(repositoryRoot);
  const dependencyClosureSha256 = createDependencyClosureSha256(repositoryRoot);
  const issues = [];
  if (envelope.target.version !== identity.releaseVersion) {
    issues.push('Release evidence target version does not match the current release.');
  }
  if (envelope.target.portableSkillSha256 !== portableSkillSha256) {
    issues.push('Release evidence target does not match the current portable skill bytes.');
  }
  if (envelope.target.dependencyClosureSha256 !== dependencyClosureSha256) {
    issues.push('Release evidence target does not match the current dependency closure.');
  }
  return issues;
};

/** Records one canonical fresh envelope after every current evidence verifier passes. */
export const recordFreshReleaseEvidence = async (
  repositoryRoot,
  { assertEvidence = assertCurrentReleaseEvidence } = {},
) => {
  const selectedEnvelope = readReleaseEvidenceEnvelope(repositoryRoot);
  if (
    selectedEnvelope?.semantic.mode === 'pinned' ||
    selectedEnvelope?.qualification.mode === 'pinned'
  ) {
    throw new Error('Clear pinned release evidence before recording fresh evidence.');
  }
  await assertEvidence(repositoryRoot);
  const envelope = createFreshReleaseEvidenceEnvelope(repositoryRoot);
  writeEnvelopeAtomically(repositoryRoot, envelope);
  return envelope;
};

const RELEASE_EVIDENCE_SCOPES = new Set(['all', 'qualification', 'semantic']);

const createFreshSection = async (repositoryRoot, kind) => {
  const issues =
    kind === 'semantic'
      ? await inspectSemanticEvidence(repositoryRoot)
      : await inspectQualificationEvidence(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
  return {
    evidence:
      kind === 'semantic'
        ? createCurrentSemanticReleaseEvidence(repositoryRoot)
        : createCurrentQualificationReleaseEvidence(repositoryRoot),
    mode: 'fresh',
  };
};

const createPinnedSection = (repositoryRoot, kind, sourceOptions, reason) => ({
  mode: 'pinned',
  reason,
  source: resolveReleaseEvidenceSectionSource(repositoryRoot, {
    ...sourceOptions,
    kind,
  }),
});

/** Selects immutable prior evidence for one explicit release-evidence section. */
export const pinReleaseEvidence = async (
  repositoryRoot,
  { from = null, fromCommit = null, reason, scope },
) => {
  const identity = readReleaseIdentity(repositoryRoot);
  const validatedReason = validateReleaseEvidenceReason(reason);
  if (!RELEASE_EVIDENCE_SCOPES.has(scope)) {
    throw new Error('Release evidence scope must be semantic, qualification, or all.');
  }
  if ((from === null) === (fromCommit === null)) {
    throw new Error('Select exactly one evidence source with --from or --from-commit.');
  }
  if (from === `v${identity.releaseVersion}`) {
    throw new Error('Release evidence cannot pin the target release to itself.');
  }
  const sourceOptions = { commit: fromCommit, tag: from };
  const pinsSemantic = scope === 'all' || scope === 'semantic';
  const pinsQualification = scope === 'all' || scope === 'qualification';
  const envelope = {
    qualification: pinsQualification
      ? createPinnedSection(repositoryRoot, 'qualification', sourceOptions, validatedReason)
      : await createFreshSection(repositoryRoot, 'qualification'),
    schemaVersion: 2,
    semantic: pinsSemantic
      ? createPinnedSection(repositoryRoot, 'semantic', sourceOptions, validatedReason)
      : await createFreshSection(repositoryRoot, 'semantic'),
    target: createCurrentReleaseEvidenceTarget(repositoryRoot),
  };
  const validated = parseReleaseEvidenceEnvelope(serializeReleaseEvidenceEnvelope(envelope));
  writeEnvelopeAtomically(repositoryRoot, validated);
  return validated;
};

/** Removes only an explicitly prepared pinned envelope. */
export const clearPinnedReleaseEvidence = (repositoryRoot) => {
  const path = join(repositoryRoot, 'fixtures', 'release-evidence.json');
  if (!existsSync(path)) return false;
  const envelope = readReleaseEvidenceEnvelope(repositoryRoot);
  if (envelope.semantic.mode !== 'pinned' && envelope.qualification.mode !== 'pinned') {
    throw new Error('Only pinned release evidence can be cleared with the pin command.');
  }
  unlinkSync(path);
  return true;
};

/** Inspects the selected fresh or pinned release evidence without changing repository state. */
export const inspectReleaseEvidence = async (repositoryRoot) => {
  const envelope = readReleaseEvidenceEnvelope(repositoryRoot);
  if (envelope === null) {
    return ['Release evidence is not recorded. Record fresh evidence or select an explicit pin.'];
  }
  const identityIssues = inspectTargetIdentity(repositoryRoot, envelope);
  if (identityIssues.length > 0) return identityIssues;
  const issues = [];
  for (const kind of ['semantic', 'qualification']) {
    const section = envelope[kind];
    if (section.mode === 'pinned') {
      try {
        assertPinnedReleaseEvidenceSection(repositoryRoot, section, kind);
      } catch (error) {
        issues.push(error instanceof Error ? error.message : String(error));
      }
      continue;
    }
    const currentIssues =
      kind === 'semantic'
        ? await inspectSemanticEvidence(repositoryRoot)
        : await inspectQualificationEvidence(repositoryRoot);
    issues.push(...currentIssues);
    if (currentIssues.length > 0) continue;
    const expectedEvidence =
      kind === 'semantic'
        ? createCurrentSemanticReleaseEvidence(repositoryRoot)
        : createCurrentQualificationReleaseEvidence(repositoryRoot);
    if (
      createFreshEvidenceSectionSha256(expectedEvidence) !==
      createFreshEvidenceSectionSha256(section.evidence)
    ) {
      issues.push(
        `${kind === 'semantic' ? 'Semantic' : 'Qualification'} release evidence does not exactly match current verified evidence.`,
      );
    }
  }
  return issues;
};

/** Requires the selected fresh or pinned release evidence to be valid. */
export const assertReleaseEvidence = async (repositoryRoot) => {
  const issues = await inspectReleaseEvidence(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
  return readReleaseEvidenceEnvelope(repositoryRoot);
};
