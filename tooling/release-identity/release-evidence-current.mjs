import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

import { createPortableSkillDigest } from '../semantic-evaluation/index.mjs';
import { createQualificationAttemptKey } from '../../qualification/src/storage/index.ts';

import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  RELEASE_PATHS,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from './constants.mjs';
import { createSemanticCliIdentity, readReleaseIdentity } from './identity.mjs';
import {
  createReleaseEvidenceSha256,
  RELEASE_EVIDENCE_SCHEMA_VERSION,
} from './release-evidence-envelope.mjs';

const readText = (repositoryRoot, relativePath) =>
  readFileSync(join(repositoryRoot, relativePath), 'utf8');

const readJson = (repositoryRoot, relativePath) =>
  JSON.parse(readText(repositoryRoot, relativePath));

const hashFile = (repositoryRoot, relativePath) =>
  createReleaseEvidenceSha256(readFileSync(join(repositoryRoot, relativePath)));

/** Creates the stable dependency closure identity recorded by fresh evidence. */
export const createDependencyClosureSha256 = (repositoryRoot) =>
  createReleaseEvidenceSha256(
    JSON.stringify({
      cli: createSemanticCliIdentity(repositoryRoot),
      qualificationProtocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      semanticProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
    }),
  );

/** Builds the exact fresh envelope from already verified current evidence without writing it. */
export const createFreshReleaseEvidenceEnvelope = (repositoryRoot) => {
  const identity = readReleaseIdentity(repositoryRoot);
  const semanticResult = readJson(repositoryRoot, RELEASE_PATHS.semanticResult);
  const semanticLatestPath = 'fixtures/semantic-evaluation-results/latest.json';
  const semanticLatest = readJson(repositoryRoot, semanticLatestPath);
  const semanticAttemptId = semanticResult.semanticAttemptId;
  if (
    typeof semanticAttemptId !== 'string' ||
    semanticLatest.latestStatus !== 'passed' ||
    semanticLatest.latestAttemptId !== semanticAttemptId ||
    semanticLatest.lastPassingAttemptId !== semanticAttemptId
  ) {
    throw new Error('Semantic evidence does not identify one current passing attempt.');
  }
  const semanticAttemptPath = `fixtures/semantic-evaluation-results/attempts/${semanticAttemptId}/attempt.json`;
  const semanticAttempt = readJson(repositoryRoot, semanticAttemptPath);
  if (
    semanticAttempt.attemptId !== semanticAttemptId ||
    semanticAttempt.status !== 'passed' ||
    typeof semanticAttempt.evidence?.sha256 !== 'string'
  ) {
    throw new Error('Semantic attempt record is not passing or self-consistent.');
  }

  const qualificationIndex = parse(readText(repositoryRoot, 'qualification/profiles/index.yaml'));
  const qualificationTargets = qualificationIndex.targets
    .map((target) => {
      const targetRoot = `qualification/results/${target.key}`;
      const latestPath = `${targetRoot}/latest.json`;
      const latest = readJson(repositoryRoot, latestPath);
      if (
        latest.latestStatus !== 'passed' ||
        latest.latestAttemptId !== latest.lastPassingAttemptId
      ) {
        throw new Error(`Qualification target ${target.key} is not currently passing.`);
      }
      const attemptKey = createQualificationAttemptKey(latest.latestAttemptId);
      const attemptPath = `${targetRoot}/attempts/${attemptKey}/attempt.json`;
      const storagePath = `${targetRoot}/attempts/${attemptKey}/storage.json`;
      const attempt = readJson(repositoryRoot, attemptPath);
      if (
        attempt.attemptId !== latest.latestAttemptId ||
        attempt.protocolVersion !== QUALIFICATION_EVIDENCE_PROTOCOL_VERSION ||
        attempt.status !== 'passed' ||
        attempt.mode !== 'official'
      ) {
        throw new Error(`Qualification target ${target.key} has invalid passing evidence.`);
      }
      return {
        adapterId: target.adapterId,
        attemptId: attempt.attemptId,
        attemptKey,
        attemptSha256: hashFile(repositoryRoot, attemptPath),
        implementationId: target.implementationId,
        key: target.key,
        latestSha256: hashFile(repositoryRoot, latestPath),
        storageSha256: hashFile(repositoryRoot, storagePath),
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key, 'en'));

  return {
    mode: 'fresh',
    qualification: {
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      resourceStatus: 'passed',
      targets: qualificationTargets,
    },
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    semantic: {
      attemptId: semanticAttemptId,
      attemptSha256: hashFile(repositoryRoot, semanticAttemptPath),
      evidenceSha256: semanticAttempt.evidence.sha256,
      latestSha256: hashFile(repositoryRoot, semanticLatestPath),
      protocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
      resourceStatus: 'passed',
      resultSha256: hashFile(repositoryRoot, RELEASE_PATHS.semanticResult),
    },
    target: {
      dependencyClosureSha256: createDependencyClosureSha256(repositoryRoot),
      portableSkillSha256: createPortableSkillDigest(repositoryRoot),
      version: identity.releaseVersion,
    },
  };
};

/** Hashes one fresh semantic or qualification descriptor for compact pin provenance. */
export const createFreshEvidenceSectionSha256 = (section) =>
  createHash('sha256').update(JSON.stringify(section)).digest('hex');
