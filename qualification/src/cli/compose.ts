import { randomUUID } from 'node:crypto';
import path from 'node:path';

import {
  readCompletedEvidenceRun,
  storeCompletedEvidenceRun,
} from '../../../src/evidence/index.ts';
import { readJsonFile, resolveContainedPath } from '../../../src/filesystem/index.ts';
import {
  composeQualificationEvidenceBundle,
  QualificationCompositionReviewSchema,
} from '../public-evidence/composition.ts';
import { parseQualificationWebsiteModel } from '../public-evidence/validation.ts';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..');

const parseArguments = (arguments_: readonly string[]) => {
  const values = new Map<string, string>();
  let isPreview = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const option = arguments_[index];
    if (option === '--preview' && !isPreview) {
      isPreview = true;
      continue;
    }
    if (option === undefined || !['--sources', '--review'].includes(option) || values.has(option)) {
      throw new Error(
        `Unsupported or duplicate qualification composition option: ${String(option)}.`,
      );
    }
    const value = arguments_[index + 1];
    if (value === undefined || value.startsWith('--'))
      throw new Error(`${option} requires one value.`);
    values.set(option, value);
    index += 1;
  }
  const sources = values.get('--sources')?.split(',') ?? [];
  if (
    sources.length === 0 ||
    new Set(sources).size !== sources.length ||
    sources.some((runId) => !/^[a-z0-9][a-z0-9-]*$/u.test(runId))
  ) {
    throw new Error('Qualification composition requires distinct run IDs in --sources.');
  }
  return { isPreview, reviewPath: values.get('--review') ?? null, sources };
};

const createAttemptId = (): string =>
  `qual-selected-${new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/gu, '')
    .slice(0, 17)}-${randomUUID().replaceAll('-', '').slice(0, 8)}`;

const run = async (): Promise<void> => {
  const arguments_ = parseArguments(process.argv.slice(2));
  const review =
    arguments_.reviewPath === null
      ? QualificationCompositionReviewSchema.parse({ formatVersion: 1 })
      : await readJsonFile(
          resolveContainedPath(REPOSITORY_ROOT, arguments_.reviewPath),
          QualificationCompositionReviewSchema,
        );
  const sources = await Promise.all(
    arguments_.sources.map((runId) =>
      readCompletedEvidenceRun(REPOSITORY_ROOT, 'qualification', runId),
    ),
  );
  const bundle = composeQualificationEvidenceBundle({
    attemptId: createAttemptId(),
    review,
    sources,
  });
  const websiteModel = parseQualificationWebsiteModel(
    (bundle.payload as { websiteModel: unknown }).websiteModel,
  );
  if (!arguments_.isPreview) await storeCompletedEvidenceRun(REPOSITORY_ROOT, bundle);
  process.stdout.write(
    `${JSON.stringify({
      attemptId: bundle.run.attemptId,
      caseCount: websiteModel.uniqueJourneyCount,
      failedCases: websiteModel.profiles.flatMap(
        ({ adapterId, implementationId, selectedJourneys }) =>
          (selectedJourneys ?? [])
            .filter(
              ({ evidence, origin }) =>
                origin !== 'Shared foundation' &&
                !['passed', 'recovered'].includes(evidence.result.status),
            )
            .map(({ evidence }) => `${adapterId}/${implementationId}/${evidence.result.caseId}`),
      ),
      preview: arguments_.isPreview,
      sourceRunIds: arguments_.sources,
      status: bundle.run.status,
    })}\n`,
  );
};

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
