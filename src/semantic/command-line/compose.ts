import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

import { readJsonFile, resolveContainedPath } from '../../filesystem/index.ts';
import { storeCompletedEvidenceRun } from '../../evidence/index.ts';
import { loadSemanticCases } from '../cases/index.ts';
import { createSemanticCoverageDigest } from '../coverage/index.ts';
import {
  createSemanticEvidenceBundle,
  type ISemanticAttemptRecord,
} from '../public-evidence/index.ts';
import {
  composeSemanticRecordedCases,
  createSemanticReplay,
  loadSemanticSourceRun,
  SemanticCompositionReviewSchema,
} from '../recording/index.ts';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..');
const CASES_ROOT = path.join(REPOSITORY_ROOT, 'src', 'semantic', 'cases');

const parseArguments = (arguments_: readonly string[]) => {
  const values = new Map<string, string>();
  let isPreview = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const option = arguments_[index];
    if (option === '--preview' && !isPreview) {
      isPreview = true;
      continue;
    }
    if (
      option === undefined ||
      !['--sources', '--review', '--cases'].includes(option) ||
      values.has(option)
    ) {
      throw new Error(`Unsupported or duplicate semantic composition option: ${String(option)}.`);
    }
    const value = arguments_[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${option} requires one value.`);
    }
    values.set(option, value);
    index += 1;
  }
  const sources = values.get('--sources')?.split(',') ?? [];
  if (
    sources.length === 0 ||
    new Set(sources).size !== sources.length ||
    sources.some((attemptId) => !/^sem-[a-z0-9-]+$/u.test(attemptId))
  ) {
    throw new Error('Semantic composition requires distinct attempt IDs in --sources.');
  }
  const caseIds = values.get('--cases')?.split(',') ?? null;
  if (
    caseIds !== null &&
    (caseIds.length === 0 ||
      new Set(caseIds).size !== caseIds.length ||
      caseIds.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)))
  ) {
    throw new Error('Semantic composition requires distinct case IDs in --cases.');
  }
  return { caseIds, isPreview, reviewPath: values.get('--review') ?? null, sources };
};

const createJsonSha256 = (input: unknown): string =>
  createHash('sha256')
    .update(`${JSON.stringify(input)}\n`)
    .digest('hex');

const createAttemptId = (): string =>
  `sem-${new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/gu, '')
    .slice(0, 17)}-${randomUUID().replaceAll('-', '').slice(0, 8)}`;

const run = async (): Promise<void> => {
  const arguments_ = parseArguments(process.argv.slice(2));
  const review =
    arguments_.reviewPath === null
      ? SemanticCompositionReviewSchema.parse({
          acceptedCriteria: [],
          caseSources: [],
          formatVersion: 1,
          inputReview: null,
          reassessments: [],
        })
      : await readJsonFile(
          resolveContainedPath(REPOSITORY_ROOT, arguments_.reviewPath),
          SemanticCompositionReviewSchema,
        );
  const catalog = await loadSemanticCases(CASES_ROOT);
  const definitions =
    arguments_.caseIds === null
      ? catalog
      : arguments_.caseIds.map((caseId) => {
          const definition = catalog.find(({ id }) => id === caseId);
          if (definition === undefined) throw new Error(`Unknown semantic case ${caseId}.`);
          return definition;
        });
  const sources = await Promise.all(
    arguments_.sources.map((attemptId) => loadSemanticSourceRun(REPOSITORY_ROOT, attemptId)),
  );
  const firstSource = sources[0];
  if (firstSource === undefined) throw new Error('Semantic composition has no source attempts.');
  const sourceVersions = [...new Set(sources.map(({ bundle }) => bundle.run.version))];
  const composed = composeSemanticRecordedCases({ definitions, review, sources });
  const carriedSources = new Map(
    composed.cases.map(({ id, trials }) => [id, trials[0]?.trial.carriedFrom]),
  );
  const caseSuiteDigest = createJsonSha256(
    [...composed.caseModels].map(([id, caseModel]) => ({
      developerDirection: caseModel.developerDirection,
      expectedCriteria: caseModel.expectedCriteria,
      forbiddenCriteria: caseModel.forbiddenCriteria,
      groupId: caseModel.groupId,
      id,
      scenario: caseModel.scenario,
      source: carriedSources.get(id),
    })),
  );
  const coverageDigest = createSemanticCoverageDigest({ claims: [], schemaVersion: 1 });
  if (arguments_.isPreview) {
    process.stdout.write(
      `${JSON.stringify({
        acceptedCriteria: review.acceptedCriteria.map(({ caseId }) => caseId),
        carriedCaseCount: composed.cases.length,
        currentCaseCount: definitions.length,
        failedCaseIds: composed.cases
          .filter(({ status }) => status === 'failed')
          .map(({ id }) => id),
        reassessed: review.reassessments.map(({ caseId }) => caseId),
        sourceAttemptIds: arguments_.sources,
        unresolvedCaseIds: composed.unresolvedCaseIds,
      })}\n`,
    );
    return;
  }
  if (composed.unresolvedCaseIds.length > 0 || composed.cases.length !== definitions.length) {
    throw new Error(
      `Semantic composition still has unresolved cases: ${composed.unresolvedCaseIds.join(', ')}.`,
    );
  }
  const attemptId = createAttemptId();
  const recordedAt = new Date().toISOString();
  const evidenceRecord = { cases: composed.cases, schemaVersion: 11 };
  const evidenceSha256 = createJsonSha256(evidenceRecord);
  const caseResults = composed.cases.map(({ confirmationStatus, id, status, trials }) => ({
    confirmationStatus,
    id,
    status,
    trials: trials.map(({ trial }) => trial),
  }));
  const result: ISemanticAttemptRecord = {
    ...firstSource.attempt,
    artifactDigest: firstSource.attempt.artifactDigest,
    attemptId,
    caseSuiteDigest,
    cases: caseResults,
    cli: firstSource.attempt.cli,
    composition: { basisAttemptId: firstSource.attempt.attemptId },
    coverageDigest,
    createdAt: recordedAt,
    evidence: {
      ...firstSource.attempt.evidence,
      path: `.evidence/semantic/results/attempts/${attemptId}/evidence.json`,
      sha256: evidenceSha256,
    },
    executedStageCount: 0,
    executedTrialCount: 0,
    failedCaseCount: caseResults.filter(({ status }) => status === 'failed').length,
    passedCaseCount: caseResults.filter(({ status }) => status === 'passed').length,
    pendingCaseCount: 0,
    recoveredCaseCount: caseResults.filter(({ status }) => status === 'recovered').length,
    reusedStageCount: 0,
    reusedTrialCount: 0,
    carriedTrialCount: composed.cases
      .flatMap(({ trials }) => trials)
      .filter(({ trial }) => trial.executionOrigin === 'carried').length,
    recordedAt,
    status: caseResults.some(({ status }) => status === 'failed') ? 'failed' : 'passed',
    stopReason: 'complete',
    totalCaseCount: caseResults.length,
    updatedAt: recordedAt,
  };
  const artifacts = [
    {
      content: Buffer.from(`${JSON.stringify(result, null, 2)}\n`),
      mediaType: 'application/json',
      path: result.evidence.path.replace(/evidence\.json$/u, 'attempt.json'),
    },
    {
      content: Buffer.from(`${JSON.stringify(evidenceRecord, null, 2)}\n`),
      mediaType: 'application/json',
      path: result.evidence.path,
    },
    {
      content: Buffer.from(
        `${JSON.stringify(
          {
            formatVersion: 1,
            review,
            sources: sources.map(({ attempt, bundle, evidenceSha256 }) => ({
              attemptId: attempt.attemptId,
              artifactDigest: attempt.artifactDigest,
              cliVersion: attempt.cli.version,
              evidenceSha256,
              version: bundle.run.version,
            })),
          },
          null,
          2,
        )}\n`,
      ),
      mediaType: 'application/json',
      path: `.evidence/semantic/results/attempts/${attemptId}/composition.json`,
    },
  ];
  const bundle = createSemanticEvidenceBundle({
    artifacts,
    caseModels: composed.caseModels,
    classification: 'official',
    definitions,
    evaluatedAt:
      composed.cases
        .flatMap(({ trials }) => trials.map(({ trial }) => trial.evaluatedAt))
        .sort()
        .at(-1) ?? recordedAt,
    replays: new Map(
      composed.cases.map((recordedCase) => [recordedCase.id, createSemanticReplay(recordedCase)]),
    ),
    result,
    presentationOnly: true,
    version: sourceVersions.length === 1 ? firstSource.bundle.run.version : 'multiple releases',
  });
  await storeCompletedEvidenceRun(REPOSITORY_ROOT, bundle);
  process.stdout.write(
    `${JSON.stringify({ attemptId, caseCount: result.totalCaseCount, status: result.status })}\n`,
  );
};

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
