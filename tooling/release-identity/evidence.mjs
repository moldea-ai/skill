import { existsSync, readFileSync } from 'node:fs';
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
  if (result.artifactDigest !== expectedArtifactDigest || result.artifactSha256 !== expectedArtifactDigest) {
    issues.push('Semantic evidence does not match the current portable skill bytes.');
  }
  if (result.caseSuiteDigest !== expectedCaseSuiteDigest || result.coverageDigest !== expectedCoverageDigest) {
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
      !hasPassingMoldeaResourceBudget(caseResult.actorResourceEvidence, caseDefinition.resourceBudget)
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

/** Inspects all model-derived evidence required for the current release. */
export const inspectReleaseEvidence = async (repositoryRoot) => [
  ...(await inspectSemanticEvidence(repositoryRoot)),
  ...(await inspectQualificationEvidence(repositoryRoot)),
];

/** Requires exact current semantic and qualification evidence. */
export const assertReleaseEvidence = async (repositoryRoot) => {
  const issues = await inspectReleaseEvidence(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
};
