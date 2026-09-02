import { createHash } from 'node:crypto';

interface IQualificationDuplicateSource {
  adapterId: string;
  artifactSources: ReadonlyMap<string, Buffer>;
  attemptId: string;
  attemptSource: Buffer;
  implementationId: string;
}

interface ICurrentQualificationDuplicateSource extends IQualificationDuplicateSource {
  carryForward:
    | {
        sourceAttemptDigest: string;
        sourceCommit: string;
        sourceRelease: string;
      }
    | undefined;
}

interface IHistoricalQualificationDuplicateSource extends IQualificationDuplicateSource {
  sourceCommit: string;
  sourceRelease: string;
}

/**
 * Allows only the byte-identical Custom attempt intentionally migrated from immutable history.
 * @param current Current short-storage evidence for the duplicate attempt id.
 * @param historical Immutable release evidence for the duplicate attempt id.
 * @throws If the duplicate is not the exact carried Custom attempt and all of its artifacts.
 */
export const assertMigratedCustomDuplicate = (
  current: ICurrentQualificationDuplicateSource,
  historical: IHistoricalQualificationDuplicateSource,
): void => {
  const carryForward = current.carryForward;

  if (
    current.attemptId !== historical.attemptId ||
    current.adapterId !== 'custom' ||
    current.implementationId !== 'custom' ||
    historical.adapterId !== 'custom' ||
    historical.implementationId !== 'custom' ||
    carryForward === undefined ||
    carryForward.sourceCommit !== historical.sourceCommit ||
    carryForward.sourceRelease !== historical.sourceRelease ||
    carryForward.sourceAttemptDigest !==
      createHash('sha256').update(historical.attemptSource).digest('hex') ||
    !current.attemptSource.equals(historical.attemptSource)
  ) {
    throw new Error(
      `Duplicate qualification attempt ${current.attemptId} is not the byte-identical migrated Custom attempt.`,
    );
  }

  if (current.artifactSources.size !== historical.artifactSources.size) {
    throw new Error(`Migrated Custom attempt ${current.attemptId} has different artifact bytes.`);
  }

  for (const [logicalPath, currentSource] of current.artifactSources) {
    const historicalSource = historical.artifactSources.get(logicalPath);

    if (historicalSource === undefined || !currentSource.equals(historicalSource)) {
      throw new Error(
        `Migrated Custom attempt ${current.attemptId} changed artifact ${logicalPath}.`,
      );
    }
  }
};
