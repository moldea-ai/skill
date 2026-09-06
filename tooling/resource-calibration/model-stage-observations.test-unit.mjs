import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  calculateCommandOutputObservationsSha256,
  calculateModelStageObservationsSha256,
  summarizeModelStageCalibrationMaxima,
  validateModelStageCalibrationArtifact,
} from './model-stage-observations.mjs';
import {
  CALIBRATION_MINIMUM_HEADROOM_PERCENT,
  MOLDEA_SKILL_RESOURCE_PROFILES,
} from './profiles.mjs';

const artifactPath = new URL(
  '../../fixtures/model-stage-resource-calibration.json',
  import.meta.url,
);
const readArtifact = async () => JSON.parse(await readFile(artifactPath, 'utf8'));

test('validates the committed privacy-safe model-stage observations', async () => {
  const artifact = await readArtifact();

  assert.equal(validateModelStageCalibrationArtifact(artifact), artifact);
  assert.deepEqual(summarizeModelStageCalibrationMaxima(artifact.modelStageObservations), {
    ordinary: {
      completedCommandCount: 47,
      moldeaCommandCount: 8,
      totalTokenCount: 969_914,
    },
  });
  assert.deepEqual(
    artifact.commandOutputObservations.map(({ disposition, stage }) => ({
      disposition,
      maximumCommandOutputByteCount: stage.maximumCommandOutputByteCount,
    })),
    [
      { disposition: 'accepted', maximumCommandOutputByteCount: 76_312 },
      { disposition: 'rejected', maximumCommandOutputByteCount: 449_948 },
    ],
  );
});

test('binds model-stage observations to a deterministic digest', async () => {
  const artifact = await readArtifact();
  const firstDigest = calculateModelStageObservationsSha256(artifact.modelStageObservations);
  const secondDigest = calculateModelStageObservationsSha256(
    structuredClone(artifact.modelStageObservations),
  );

  assert.equal(firstDigest, artifact.modelStageObservationsSha256);
  assert.equal(secondDigest, firstDigest);

  artifact.modelStageObservations[0].stages[0].durationMs += 1;
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifact),
    /observation digest does not match/u,
  );
});

test('binds command-output observations to a deterministic digest', async () => {
  const artifact = await readArtifact();
  const firstDigest = calculateCommandOutputObservationsSha256(artifact.commandOutputObservations);
  const secondDigest = calculateCommandOutputObservationsSha256(
    structuredClone(artifact.commandOutputObservations),
  );

  assert.equal(firstDigest, artifact.commandOutputObservationsSha256);
  assert.equal(secondDigest, firstDigest);

  artifact.commandOutputObservations[0].stage.durationMs += 1;
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifact),
    /command-output calibration observation digest does not match/u,
  );
});

test('rejects unapproved content fields and invalid evidence identity', async () => {
  const artifactWithContent = await readArtifact();
  artifactWithContent.modelStageObservations[0].stages[0].commandText = 'forbidden';
  artifactWithContent.modelStageObservationsSha256 = calculateModelStageObservationsSha256(
    artifactWithContent.modelStageObservations,
  );
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifactWithContent),
    /stages\[0\] has an unsupported shape/u,
  );

  const commandOutputArtifactWithContent = await readArtifact();
  commandOutputArtifactWithContent.commandOutputObservations[0].stage.commandText = 'forbidden';
  commandOutputArtifactWithContent.commandOutputObservationsSha256 =
    calculateCommandOutputObservationsSha256(
      commandOutputArtifactWithContent.commandOutputObservations,
    );
  assert.throws(
    () => validateModelStageCalibrationArtifact(commandOutputArtifactWithContent),
    /commandOutputObservations\.accepted\.stage has an unsupported shape/u,
  );

  const artifactWithInvalidIdentity = await readArtifact();
  artifactWithInvalidIdentity.qualificationAttempt.sha256 = 'invalid';
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifactWithInvalidIdentity),
    /must be a SHA-256 digest/u,
  );

  const artifactWithInvalidCommandOutputIdentity = await readArtifact();
  artifactWithInvalidCommandOutputIdentity.commandOutputQualificationAttempt.sha256 = 'invalid';
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifactWithInvalidCommandOutputIdentity),
    /must be a SHA-256 digest/u,
  );

  const artifactWithInvalidCommandOutputTarget = await readArtifact();
  artifactWithInvalidCommandOutputTarget.commandOutputQualificationAttempt.targetKey = '../t5';
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifactWithInvalidCommandOutputTarget),
    /must be a qualification target key/u,
  );
});

test('requires internally consistent token categories', async () => {
  const artifact = await readArtifact();
  artifact.modelStageObservations[0].stages[0].totalTokenCount += 1;
  artifact.modelStageObservationsSha256 = calculateModelStageObservationsSha256(
    artifact.modelStageObservations,
  );

  assert.throws(
    () => validateModelStageCalibrationArtifact(artifact),
    /inconsistent aggregate resource counts/u,
  );
});

test('requires calibrated cumulative headroom after internally consistent tampering', async () => {
  const artifact = await readArtifact();
  artifact.modelStageObservations[0].stages[0].completedCommandCount = 65;
  artifact.modelStageObservationsSha256 = calculateModelStageObservationsSha256(
    artifact.modelStageObservations,
  );

  assert.throws(
    () => validateModelStageCalibrationArtifact(artifact),
    /lacks required model-stage cumulative headroom/u,
  );
});

test('requires command-output headroom and a rejected over-limit observation', async () => {
  const artifactWithoutHeadroom = await readArtifact();
  artifactWithoutHeadroom.commandOutputObservations[0].stage.maximumCommandOutputByteCount = 104_858;
  artifactWithoutHeadroom.commandOutputObservationsSha256 =
    calculateCommandOutputObservationsSha256(artifactWithoutHeadroom.commandOutputObservations);
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifactWithoutHeadroom),
    /command-output profile lacks required model-stage headroom/u,
  );

  const artifactWithoutRejectedOverage = await readArtifact();
  artifactWithoutRejectedOverage.commandOutputObservations[1].stage.maximumCommandOutputByteCount =
    MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxCommandOutputBytes;
  artifactWithoutRejectedOverage.commandOutputObservationsSha256 =
    calculateCommandOutputObservationsSha256(
      artifactWithoutRejectedOverage.commandOutputObservations,
    );
  assert.throws(
    () => validateModelStageCalibrationArtifact(artifactWithoutRejectedOverage),
    /does not exceed the calibrated command-output ceiling/u,
  );
});

test('keeps every calibrated value above accepted observations and below containment', async () => {
  const artifact = await readArtifact();
  const maxima = summarizeModelStageCalibrationMaxima(artifact.modelStageObservations).ordinary;
  const minimumMultiplier = 1 + CALIBRATION_MINIMUM_HEADROOM_PERCENT / 100;
  const { absolute, largeTraversal, ordinary } = MOLDEA_SKILL_RESOURCE_PROFILES;
  const acceptedCommandOutput = artifact.commandOutputObservations.find(
    ({ disposition }) => disposition === 'accepted',
  ).stage.maximumCommandOutputByteCount;

  assert.ok(
    ordinary.maxCompletedCommandCount >=
      Math.ceil(maxima.completedCommandCount * minimumMultiplier),
  );
  assert.ok(
    ordinary.maxMoldeaCommandCount >= Math.ceil(maxima.moldeaCommandCount * minimumMultiplier),
  );
  assert.ok(ordinary.maxHostTokenCount >= Math.ceil(maxima.totalTokenCount * minimumMultiplier));
  assert.ok(ordinary.maxCommandOutputBytes >= Math.ceil(acceptedCommandOutput * minimumMultiplier));
  assert.ok(largeTraversal.maxCompletedCommandCount >= ordinary.maxCompletedCommandCount);
  assert.ok(largeTraversal.maxMoldeaCommandCount >= ordinary.maxMoldeaCommandCount);
  assert.ok(largeTraversal.maxHostTokenCount >= ordinary.maxHostTokenCount);
  assert.ok(largeTraversal.maxCommandOutputBytes >= ordinary.maxCommandOutputBytes);
  assert.ok(ordinary.maxCompletedCommandCount <= absolute.maxCompletedCommandCount);
  assert.ok(ordinary.maxMoldeaCommandCount <= absolute.maxMoldeaCommandCount);
  assert.ok(ordinary.maxHostTokenCount <= absolute.maxHostTokenCount);
});
