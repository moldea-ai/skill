import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';

import { createEvidenceBundle, type IEvidenceBundle } from '../../../src/evidence/index.ts';
import { listDirectoryFiles, resolveContainedPath } from '../../../src/filesystem/index.ts';
import {
  QUALIFICATION_PROFILES_ROOT,
  QUALIFICATION_RESULTS_ROOT,
  SKILL_REPOSITORY_ROOT,
} from '../constants/index.ts';
import { createQualificationAttemptKey, loadQualificationProfileIndex } from '../storage/index.ts';
import { assertPublishableQualificationEvidence, loadQualificationWebsiteModel } from './loader.ts';

export type IQualificationEvidenceTarget = {
  adapterId: string;
  attemptId: string;
  implementationId: string;
};

const getMediaType = (relativePath: string): string => {
  if (relativePath.endsWith('.json')) return 'application/json';
  if (relativePath.endsWith('.yaml') || relativePath.endsWith('.yml')) {
    return 'application/yaml';
  }
  if (relativePath.endsWith('.patch') || relativePath.endsWith('.diff')) {
    return 'application/patch+text';
  }
  return 'text/plain';
};

const collectArtifacts = async (
  sourceDirectory: string,
  repositoryPrefix: string,
): Promise<Array<{ content: Uint8Array; mediaType: string; path: string }>> => {
  const relativePaths = await listDirectoryFiles(sourceDirectory);

  return Promise.all(
    relativePaths.map(async (relativePath) => {
      const sourcePath = resolveContainedPath(sourceDirectory, relativePath);
      const statistics = await lstat(sourcePath);
      if (!statistics.isFile()) {
        throw new Error(`Qualification evidence artifact must be a regular file: ${relativePath}`);
      }
      const artifactPath = path.posix.join(repositoryPrefix, relativePath);
      return {
        content: await readFile(sourcePath),
        mediaType: getMediaType(relativePath),
        path: artifactPath,
      };
    }),
  );
};

/** Rewrites repository file links to prepared assets while preserving immutable directory links. */
export const rewriteQualificationSourceUrls = (input: unknown): unknown => {
  if (Array.isArray(input)) return input.map(rewriteQualificationSourceUrls);
  if (input === null || typeof input !== 'object') {
    if (typeof input !== 'string') return input;
    const githubMatch =
      /github\.com\/moldea-ai\/skill\/(?<kind>blob|tree)\/[^/]+\/(?<path>.+)$/u.exec(input);
    const rawMatch = /raw\.githubusercontent\.com\/moldea-ai\/skill\/[^/]+\/(?<path>.+)$/u.exec(
      input,
    );
    if (githubMatch?.groups?.['kind'] === 'tree') return input;
    const relativePath = githubMatch?.groups?.['path'] ?? rawMatch?.groups?.['path'];
    return relativePath === undefined ? input : `/evidence-assets/qualification/${relativePath}`;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, propertyValue]) => [
      key,
      rewriteQualificationSourceUrls(propertyValue),
    ]),
  );
};

const createTargetId = (
  target: Pick<IQualificationEvidenceTarget, 'adapterId' | 'implementationId'>,
) => `${target.adapterId}/${target.implementationId}`;

/** Projects one completed all-profile batch into a self-contained public bundle. */
export const createQualificationEvidenceBundle = async (options: {
  attemptId: string;
  evaluatedAt: string;
  targets: readonly IQualificationEvidenceTarget[];
  version: string;
}): Promise<IEvidenceBundle> => {
  const profileIndex = await loadQualificationProfileIndex();
  const indexedTargetById = new Map(
    profileIndex.targets.map((target) => [createTargetId(target), target]),
  );
  const selectedAttemptIds = new Map<string, string>();
  for (const target of options.targets) {
    const indexedTarget = indexedTargetById.get(createTargetId(target));
    if (indexedTarget === undefined) {
      throw new Error(`Qualification evidence target is not indexed: ${createTargetId(target)}.`);
    }
    if (selectedAttemptIds.has(indexedTarget.key)) {
      throw new Error(`Qualification evidence target is duplicated: ${createTargetId(target)}.`);
    }
    selectedAttemptIds.set(indexedTarget.key, target.attemptId);
  }
  const websiteModel = loadQualificationWebsiteModel(SKILL_REPOSITORY_ROOT, {
    selectedAttemptIds,
  });
  assertPublishableQualificationEvidence(websiteModel);
  const statuses = websiteModel.profiles.map(({ currentStatus }) => currentStatus);
  const status = statuses.every((profileStatus) => profileStatus === 'passed')
    ? 'passed'
    : statuses.some((profileStatus) => profileStatus === 'failed')
      ? 'failed'
      : 'incomplete';
  const selectedResultArtifacts = (
    await Promise.all(
      profileIndex.targets.map(async (target) => {
        const attemptId = selectedAttemptIds.get(target.key);
        if (attemptId === undefined) {
          throw new Error(`Qualification evidence has no selected attempt for ${target.key}.`);
        }
        const profile = websiteModel.profiles.find(
          ({ adapterId, implementationId }) =>
            adapterId === target.adapterId && implementationId === target.implementationId,
        );
        if (profile?.latest === null || profile?.latest === undefined) {
          throw new Error(`Qualification evidence has no latest pointer for ${target.key}.`);
        }
        const attemptPrefix = path.posix.join(
          '.evidence/qualification/results',
          target.key,
          'attempts',
          createQualificationAttemptKey(attemptId),
        );
        const attemptDirectory = resolveContainedPath(
          QUALIFICATION_RESULTS_ROOT,
          path.posix.join(target.key, 'attempts', createQualificationAttemptKey(attemptId)),
        );
        return [
          ...(await collectArtifacts(attemptDirectory, attemptPrefix)),
          {
            content: Buffer.from(`${JSON.stringify(profile.latest, null, 2)}\n`),
            mediaType: 'application/json',
            path: path.posix.join('.evidence/qualification/results', target.key, 'latest.json'),
          },
        ];
      }),
    )
  ).flat();
  const artifacts = [
    ...(await collectArtifacts(QUALIFICATION_PROFILES_ROOT, 'qualification/profiles')),
    ...selectedResultArtifacts,
  ];

  return createEvidenceBundle({
    artifacts,
    classification: 'official',
    kind: 'qualification',
    payload: { websiteModel: rewriteQualificationSourceUrls(websiteModel) },
    run: {
      attemptId: options.attemptId,
      evaluatedAt: options.evaluatedAt,
      status,
      version: options.version,
      provenance: {
        sourceUrl: 'https://github.com/moldea-ai/skill',
      },
    },
  });
};
