import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseDocument } from 'yaml';

import { RELEASE_PATHS, SEMANTIC_EVALUATION_PROTOCOL_VERSION } from './constants.mjs';
import { createSemanticCliIdentity } from './identity.mjs';

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
      const profile = document.toJS();
      profiles.push({ adapterId: profile.adapterId, implementationId: profile.implementationId });
    }
  }

  return profiles;
};

/** Inspects whether fresh semantic and qualification evidence completes the release gate. */
export const inspectReleaseEvidence = (repositoryRoot) => {
  const issues = [];
  const semanticResultPath = join(repositoryRoot, RELEASE_PATHS.semanticResult);

  if (!existsSync(semanticResultPath)) {
    issues.push(`${RELEASE_PATHS.semanticResult} is missing fresh semantic evidence.`);
  } else {
    const semanticResult = readJson(semanticResultPath);
    const expectedCli = createSemanticCliIdentity(repositoryRoot);

    if (semanticResult.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION) {
      issues.push(
        `${RELEASE_PATHS.semanticResult} does not use semantic protocol ${SEMANTIC_EVALUATION_PROTOCOL_VERSION}.`,
      );
    }
    if (JSON.stringify(semanticResult.cli) !== JSON.stringify(expectedCli)) {
      issues.push(`${RELEASE_PATHS.semanticResult} does not match the exact release CLI identity.`);
    }
  }

  for (const { adapterId, implementationId } of listQualificationProfiles(repositoryRoot)) {
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

    const latest = readJson(latestPath);
    if (latest.latestStatus !== 'passed') {
      issues.push(`${relativeLatestPath} is ${String(latest.latestStatus)}, expected passed.`);
    }
  }

  return issues;
};

/** Requires complete fresh semantic and qualification evidence for release. */
export const assertReleaseEvidence = (repositoryRoot) => {
  const issues = inspectReleaseEvidence(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
};
