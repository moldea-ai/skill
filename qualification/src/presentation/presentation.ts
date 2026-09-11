import type { IQualificationAttemptResult } from '../contracts/index.ts';
import type { IQualificationImplementation } from '../compatibility/index.ts';
import type { IQualificationResultVerification } from '../result/index.ts';
import type {
  IQualificationStatusAttempt,
  IQualificationStatusLatestResult,
  IQualificationStatusPage,
  IQualificationStatusUnavailableAttempt,
} from '../status/index.ts';

/** Writes one stable JSON document or concise human report to stdout. */
export const presentQualificationOutput = (
  output: unknown,
  isJson: boolean,
  humanOutput: string,
): void => {
  process.stdout.write(
    isJson ? `${JSON.stringify(output, null, 2)}\n` : `${humanOutput.trimEnd()}\n`,
  );
};

/** Formats adapter target availability for the local list command. */
export const formatImplementationList = (
  implementations: readonly IQualificationImplementation[],
): string =>
  implementations
    .map((implementation) => {
      const target = implementation.implementationId ?? '<no-target>';
      const availability = implementation.disabledReason ?? 'ready';
      return `${implementation.adapterId}/${target}  ${implementation.implementationStatus}  ${availability}`;
    })
    .join('\n');

/** Formats local checkpoints and committed latest pointers for status inspection. */
export const formatQualificationStatus = (page: IQualificationStatusPage): string => {
  const attempts = page.records.filter(
    (record): record is IQualificationStatusAttempt => record.kind === 'attempt',
  );
  const unavailableAttempts = page.records.filter(
    (record): record is IQualificationStatusUnavailableAttempt =>
      record.kind === 'unavailable-attempt',
  );
  const latestResults = page.records.filter(
    (record): record is IQualificationStatusLatestResult => record.kind === 'latest-result',
  );
  const lines = [
    `Status scope: ${page.scope}`,
    `Snapshot: ${page.snapshot}`,
    `Page records: ${page.records.length} of ${page.counts.total}`,
    'Local attempts:',
  ];

  if (attempts.length === 0) {
    lines.push('  none');
  } else {
    lines.push(
      ...attempts.map(
        (attempt) =>
          `  ${attempt.attemptId}  ${attempt.adapterId}/${attempt.implementationId}  ${attempt.status}`,
      ),
    );
  }

  lines.push('Unavailable local attempts:');

  if (unavailableAttempts.length === 0) {
    lines.push('  none');
  } else {
    lines.push(
      ...unavailableAttempts.map((attempt) => {
        const protocol = attempt.protocolVersion === null ? 'unknown' : attempt.protocolVersion;
        return `  ${attempt.attemptId}  protocol ${protocol}  ${attempt.reason}`;
      }),
    );
  }

  lines.push('Committed latest results:');

  if (latestResults.length === 0) {
    lines.push('  none');
  } else {
    lines.push(
      ...latestResults.map(
        (latest) =>
          `  ${latest.adapterId}/${latest.implementationId}  ${latest.latestStatus}  ${latest.latestAttemptId}`,
      ),
    );
  }

  lines.push(`Next cursor: ${page.nextCursor ?? 'none'}`);

  return lines.join('\n');
};

/** Formats one completed attempt with its evidence location and recording state. */
export const formatQualificationResult = (
  result: IQualificationAttemptResult,
  attemptDirectory: string,
  wasRecorded: boolean,
): string => {
  const recoveredCaseCount = result.cases.filter(({ status }) => status === 'recovered').length;
  const operationalRetryCount = result.stages.reduce(
    (total, stage) => total + stage.operationalRetries.length,
    0,
  );
  const unevaluatedRequirements = result.cases.flatMap((caseResult) =>
    caseResult.trials.flatMap((trial) =>
      trial.requirementAssessments.filter(({ verdict }) => verdict === 'not-evaluated'),
    ),
  );

  return [
    `${result.selection.adapterId}/${result.selection.implementationId} (${result.mode}): ${result.status}`,
    result.summary,
    ...(result.mode === 'dry-run'
      ? [
          `Preflight passed: ${result.status === 'passed' ? 'yes' : 'no'}`,
          `Semantic requirements not evaluated: ${unevaluatedRequirements.length}`,
        ]
      : []),
    `Recovered cases: ${recoveredCaseCount}`,
    `Operational retries: ${operationalRetryCount}`,
    `Attempt: ${result.attemptId}`,
    `Checkpoint: ${attemptDirectory}`,
    `Committed: ${wasRecorded ? 'yes' : 'no'}`,
  ].join('\n');
};

/** Formats committed evidence verification failures with their exact paths. */
export const formatVerificationResult = (
  verification: IQualificationResultVerification,
): string => {
  if (verification.passed) {
    return `Verified ${verification.attempts} committed qualification attempt(s).`;
  }

  return [
    `Qualification evidence verification failed with ${verification.issues.length} issue(s).`,
    ...verification.issues.map(({ message, path }) => `  ${path}: ${message}`),
  ].join('\n');
};
