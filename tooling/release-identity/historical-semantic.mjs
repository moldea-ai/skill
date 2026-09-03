import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import {
  CARRY_FORWARD_401_PATH,
  CARRY_FORWARD_401_SOURCE_COMMIT,
  CARRY_FORWARD_401_SOURCE_RELEASE,
  readCarryForward401Attestation,
} from './carry-forward-4-0-1.mjs';
import {
  COMPATIBILITY_BRIDGE_402_PATH,
  COMPATIBILITY_BRIDGE_402_SCHEMA_VERSION,
  createFrozenCompatibilitySurface,
  PACKAGE_VERSION_MAP,
  PACKAGES_SOURCE_BASELINE_COMMIT,
  PACKAGES_SOURCE_BASELINE_TREE,
  SKILL_401_COMMIT,
  SKILL_402_CHANGED_PATHS,
} from './compatibility-bridge-4-0-2.mjs';
import {
  COMPATIBILITY_401,
  COMPATIBILITY_402,
  isCompatibilityVersionSupported,
} from './compatibility.mjs';

const FROZEN_COMPARATOR_COMMIT = '774f2b41f191dd6fb57d9265daa0881b7c352657';
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const COMPATIBILITY_DECISION_VERSIONS = Object.freeze({
  nodeRange: ['22.10.9', '22.11.0', '23.0.0', '24.11.0', '25.0.0', '26.8.1', '999.0.0'],
  npmRange: ['6.14.18', '7.0.0', '8.0.0', '9.0.0', '10.9.0', '11.19.0', '12.0.2', '999.0.0'],
  pnpmRange: ['8.3.0', '8.3.1', '9.0.0', '10.0.0', '11.20.0', '11.21.0', '12.3.1', '999.0.0'],
  yarnRange: ['4.14.0', '4.14.1', '4.18.0', '5.0.0', '999.0.0'],
});

// candidate identities produced by the exact compatibility-only 4.0.2 projection
export const COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY = Object.freeze({
  cliClosureDigest: 'd9e4e74bf7ea6da7da37964ce4d834404bcf14e0613c53250d14107ecfcb96e9',
  portableSkillBehaviorDigest: '6ef0ef694e71d21ad8bae5d825d5fcc4bada037466a92117d8a911518ac9fc88',
  semanticCompatibilityDigest: '0681c13496d20a71e2643979c9c7e113e514e76c2fc7f658d237959ef2e4a76a',
});

const sha256 = (input) => createHash('sha256').update(input).digest('hex');
const hasSameJsonIdentity = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sortPackages = (packages) =>
  [...packages].sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'));
const createEnvironment = (provenance) => ({
  model: provenance.model,
  reasoningEffort: provenance.reasoningEffort,
  codexVersion: provenance.codexVersion,
  nodeVersion: provenance.nodeVersion,
  pnpmVersion: provenance.pnpmVersion,
  gitVersion: provenance.gitVersion,
  allowedEgressHosts: provenance.allowedEgressHosts,
  hostTimeoutMs: provenance.hostTimeoutMs,
  modelEndpoint: provenance.modelEndpoint,
  sslCertificateFileSha256: provenance.sslCertificateFileSha256,
});

/** Recreates the frozen boundary-version decisions stored by the 4.0.2 bridge. */
const createCompatibilityDecisions = () => {
  const decisions = [];
  for (const [fieldName, versions] of Object.entries(COMPATIBILITY_DECISION_VERSIONS)) {
    for (const version of versions) {
      const sourceDeclared = isCompatibilityVersionSupported(COMPATIBILITY_401[fieldName], version);
      const sourceApplicable =
        sourceDeclared &&
        (fieldName !== 'yarnRange' || isCompatibilityVersionSupported('>=4.14.1', version));
      decisions.push({
        candidate: isCompatibilityVersionSupported(COMPATIBILITY_402[fieldName], version),
        fieldName,
        sourceApplicable,
        sourceDeclared,
        version,
      });
    }
  }
  return decisions;
};

/** Parses the exact self-contained fields consumed from a 4.0.2 bridge attestation. */
export const parseCompatibilityBridge402Attestation = (input) => {
  assert.ok(input !== null && typeof input === 'object' && !Array.isArray(input));
  assert.equal(input.schemaVersion, COMPATIBILITY_BRIDGE_402_SCHEMA_VERSION);
  assert.equal(input.sourceRelease, COMPATIBILITY_401.skillVersion);
  assert.equal(input.sourceCommit, SKILL_401_COMMIT);
  assert.equal(input.targetRelease, COMPATIBILITY_402.skillVersion);
  assert.equal(input.modelRunsPerformed, false);
  assert.deepEqual(input.compatibility?.source, COMPATIBILITY_401);
  assert.deepEqual(input.compatibility?.candidate, COMPATIBILITY_402);

  const decisions = createCompatibilityDecisions();
  assert.deepEqual(input.compatibility?.decisions, decisions);
  assert.equal(input.compatibility?.decisionDigest, sha256(`${JSON.stringify(decisions)}\n`));
  assert.equal(
    input.compatibility?.digest,
    sha256(
      `${JSON.stringify({ source: COMPATIBILITY_401, candidate: COMPATIBILITY_402, decisions })}\n`,
    ),
  );
  assert.equal(input.carryForward401?.sourceCommit, SKILL_401_COMMIT);
  assert.equal(input.carryForward401?.originalSourceCommit, CARRY_FORWARD_401_SOURCE_COMMIT);
  assert.equal(input.gate?.pinnedSkillCommit, FROZEN_COMPARATOR_COMMIT);
  assert.equal(input.packages?.sourceState?.baselineCommit, PACKAGES_SOURCE_BASELINE_COMMIT);
  assert.equal(input.packages?.sourceState?.baselineTree, PACKAGES_SOURCE_BASELINE_TREE);
  assert.match(input.packages?.sourceState?.candidateCommit ?? '', COMMIT_PATTERN);
  assert.match(input.skill?.candidateCommit ?? '', COMMIT_PATTERN);
  assert.deepEqual(input.skill?.changedPaths, SKILL_402_CHANGED_PATHS);
  assert.deepEqual(
    input.retainedAttempts?.semantic?.candidate,
    input.retainedAttempts?.semantic?.source,
  );
  assert.deepEqual(
    input.retainedAttempts?.qualification?.candidate,
    input.retainedAttempts?.qualification?.source,
  );

  const packageDigests = input.packages?.packageDigests;
  assert.ok(Array.isArray(packageDigests));
  assert.deepEqual(
    packageDigests.map(({ name }) => name),
    Object.keys(PACKAGE_VERSION_MAP).sort((left, right) => left.localeCompare(right, 'en')),
  );
  for (const packageDigest of packageDigests) {
    assert.match(packageDigest.sourceSha256 ?? '', SHA256_PATTERN);
    assert.match(packageDigest.candidateSha256 ?? '', SHA256_PATTERN);
    for (const registry of [packageDigest.registry?.source, packageDigest.registry?.candidate]) {
      assert.equal(typeof registry?.integrity, 'string');
      assert.match(registry?.shasum ?? '', /^[a-f0-9]{40}$/u);
      assert.equal(typeof registry?.tarball, 'string');
    }
  }
  return input;
};

/** Reads and validates the optional chained bridge plus its immutable local inputs. */
export const readCompatibilityBridge402Attestation = (repositoryRoot) => {
  const path = join(repositoryRoot, ...COMPATIBILITY_BRIDGE_402_PATH.split('/'));
  if (!existsSync(path)) return null;
  const attestation = parseCompatibilityBridge402Attestation(
    JSON.parse(readFileSync(path, 'utf8')),
  );
  assert.deepEqual(attestation.frozenSurface, createFrozenCompatibilitySurface(repositoryRoot));
  for (const file of attestation.carryForward401.files) {
    assert.match(file.sha256, SHA256_PATTERN);
    assert.equal(sha256(readFileSync(join(repositoryRoot, ...file.path.split('/')))), file.sha256);
  }
  assert.ok(
    attestation.carryForward401.files.some(
      ({ path: recordedPath }) => recordedPath === CARRY_FORWARD_401_PATH,
    ),
  );
  return attestation;
};

/** Maps source qualification package identities through the attested 4.0.2 registry closure. */
export const mapCompatibilityBridge402Packages = (attestation, sourcePackages) =>
  sortPackages(sourcePackages).map((sourcePackage) => {
    const versions = PACKAGE_VERSION_MAP[sourcePackage.name];
    if (versions === undefined) return sourcePackage;
    const packageDigest = attestation.packages.packageDigests.find(
      ({ name }) => name === sourcePackage.name,
    );
    if (packageDigest === undefined || sourcePackage.version !== versions.source) return null;
    const sourceRegistry = packageDigest.registry.source;
    const candidateRegistry = packageDigest.registry.candidate;
    if (
      sourcePackage.sha256 !== packageDigest.sourceSha256 ||
      sourcePackage.registryIntegrity !== sourceRegistry.integrity ||
      sourcePackage.registryShasum !== sourceRegistry.shasum ||
      sourcePackage.registryTarballUrl !== sourceRegistry.tarball
    ) {
      return null;
    }
    return {
      name: sourcePackage.name,
      version: versions.candidate,
      registryIntegrity: candidateRegistry.integrity,
      registryShasum: candidateRegistry.shasum,
      registryTarballUrl: candidateRegistry.tarball,
      tarballName: basename(new URL(candidateRegistry.tarball).pathname),
      sha256: packageDigest.candidateSha256,
    };
  });

/** Returns whether the chained bridge authorizes one migrated Custom baseline. */
export const hasCompatibilityBridge402Qualification = ({
  attestation,
  candidateCliClosureDigest,
  candidatePackages,
  candidatePortableSkillBehaviorDigest,
  result,
  sourceAttestation,
  storage,
}) => {
  if (attestation === null || sourceAttestation === null || storage.carryForward === undefined) {
    return false;
  }
  const envelope = sourceAttestation.qualification.envelopes.find(
    ({ attemptId }) => attemptId === result.attemptId,
  );
  if (envelope === undefined) return false;
  const mappedPackages = mapCompatibilityBridge402Packages(attestation, envelope.packages);
  if (mappedPackages.some((candidatePackage) => candidatePackage === null)) return false;
  return (
    result.status === 'passed' &&
    result.selection.adapterId === 'custom' &&
    result.selection.implementationId === 'custom' &&
    envelope.status === result.status &&
    hasSameJsonIdentity(envelope.selection, result.selection) &&
    envelope.attestationId === storage.carryForward.attestationId &&
    envelope.attemptSha256 === storage.carryForward.sourceAttemptDigest &&
    storage.attemptDigest === envelope.attemptSha256 &&
    storage.carryForward.sourceRelease === CARRY_FORWARD_401_SOURCE_RELEASE &&
    storage.carryForward.sourceCommit === CARRY_FORWARD_401_SOURCE_COMMIT &&
    envelope.qualificationRepositoryCommit === result.provenance.qualificationRepositoryCommit &&
    envelope.skillRepositoryCommit === result.provenance.skillRepositoryCommit &&
    envelope.skillRepositoryFingerprint === result.provenance.skillRepositoryFingerprint &&
    envelope.targetDigest === result.provenance.targetDigest &&
    envelope.packagesDigest ===
      sha256(`${JSON.stringify(sortPackages(result.provenance.packages))}\n`) &&
    hasSameJsonIdentity(envelope.packages, sortPackages(result.provenance.packages)) &&
    hasSameJsonIdentity(envelope.environment, createEnvironment(result.provenance)) &&
    envelope.isCompatible === true &&
    hasSameJsonIdentity(envelope.compatibility, storage.compatibility) &&
    hasSameJsonIdentity(envelope.candidateCompatibility, storage.compatibility) &&
    envelope.targetCompatibilityDigest === envelope.candidateTargetCompatibilityDigest &&
    storage.portableSkillBehaviorDigest === envelope.portableSkillBehaviorDigest &&
    storage.cliClosureDigest === envelope.cliClosureDigest &&
    sourceAttestation.candidate.portableSkillBehaviorDigest ===
      envelope.portableSkillBehaviorDigest &&
    sourceAttestation.candidate.cliClosureDigest === envelope.cliClosureDigest &&
    candidatePortableSkillBehaviorDigest ===
      COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.portableSkillBehaviorDigest &&
    candidateCliClosureDigest === COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.cliClosureDigest &&
    hasSameJsonIdentity(mappedPackages, sortPackages(candidatePackages))
  );
};

/** Reads both chained attestations before authorizing one local Custom baseline. */
export const hasLocalCompatibilityBridge402Qualification = (options) => {
  try {
    return hasCompatibilityBridge402Qualification({
      ...options,
      attestation: readCompatibilityBridge402Attestation(options.repositoryRoot),
      sourceAttestation: readCarryForward401Attestation(options.repositoryRoot),
    });
  } catch {
    return false;
  }
};

/** Selects source-attested semantic evidence only when it matches current behavior inputs. */
export const resolveCompatibleHistoricalSemanticAttemptId = ({
  attestation,
  compatibilityBridge402 = null,
  candidateCliClosureDigest,
  candidatePortableSkillBehaviorDigest,
  candidateSemanticCompatibilityDigest,
  semanticResultSha256,
}) => {
  if (
    attestation === null ||
    (semanticResultSha256 !== null && attestation.semantic.resultSha256 !== semanticResultSha256)
  ) {
    return null;
  }
  const hasExactSourceIdentity =
    attestation.semantic.cliClosureDigest === candidateCliClosureDigest &&
    attestation.semantic.portableSkillBehaviorDigest === candidatePortableSkillBehaviorDigest &&
    attestation.semantic.semanticCompatibilityDigest === candidateSemanticCompatibilityDigest;
  const hasMappedCandidateIdentity =
    compatibilityBridge402 !== null &&
    candidateCliClosureDigest === COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.cliClosureDigest &&
    candidatePortableSkillBehaviorDigest ===
      COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.portableSkillBehaviorDigest &&
    candidateSemanticCompatibilityDigest ===
      COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.semanticCompatibilityDigest;
  return hasExactSourceIdentity || hasMappedCandidateIdentity
    ? attestation.semantic.attemptId
    : null;
};
