import type {
  IQualificationAttemptCheckpoint,
  IQualificationAttemptResult,
  IQualificationLatestResult,
} from '../contracts/index.ts';
import type { IQualificationImplementation } from '../compatibility/index.ts';
import type { IUnavailableLocalAttempt } from '../execution/index.ts';
import type { IQualificationResultVerification } from '../result/index.ts';

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
export const formatQualificationStatus = (options: {
  attempts: readonly IQualificationAttemptCheckpoint[];
  unavailableAttempts: readonly IUnavailableLocalAttempt[];
  latestResults: readonly IQualificationLatestResult[];
}): string => {
  const lines = ['Local attempts:'];

  if (options.attempts.length === 0) {
    lines.push('  none');
  } else {
    lines.push(
      ...options.attempts.map(
        (attempt) =>
          `  ${attempt.attemptId}  ${attempt.selection.adapterId}/${attempt.selection.implementationId}  ${attempt.status}`,
      ),
    );
  }

  lines.push('Unavailable local attempts:');

  if (options.unavailableAttempts.length === 0) {
    lines.push('  none');
  } else {
    lines.push(
      ...options.unavailableAttempts.map((attempt) => {
        const protocol = attempt.protocolVersion === null ? 'unknown' : attempt.protocolVersion;
        return `  ${attempt.attemptId}  protocol ${protocol}  ${attempt.kind}`;
      }),
    );
  }

  lines.push('Committed latest results:');

  if (options.latestResults.length === 0) {
    lines.push('  none');
  } else {
    lines.push(
      ...options.latestResults.map(
        (latest) =>
          `  ${latest.adapterId}/${latest.implementationId}  ${latest.latestStatus}  ${latest.latestAttemptId}`,
      ),
    );
  }

  return lines.join('\n');
};

/** Formats one completed attempt with its evidence location and recording state. */
export const formatQualificationResult = (
  result: IQualificationAttemptResult,
  attemptDirectory: string,
  wasRecorded: boolean,
): string =>
  [
    `${result.selection.adapterId}/${result.selection.implementationId}: ${result.status}`,
    result.summary,
    `Attempt: ${result.attemptId}`,
    `Checkpoint: ${attemptDirectory}`,
    `Committed: ${wasRecorded ? 'yes' : 'no'}`,
  ].join('\n');

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
