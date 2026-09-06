import { createHash } from 'node:crypto';

import {
  CALIBRATION_MINIMUM_HEADROOM_PERCENT,
  MOLDEA_SKILL_RESOURCE_PROFILES,
} from './profiles.mjs';

const ATTEMPT_ID_PATTERN = /^\d{8}T\d{9}Z-[a-z0-9][a-z0-9-]*-[a-f0-9]{8}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const hasExactKeys = (input, expectedKeys) => {
  const actualKeys = Object.keys(input).sort((left, right) => left.localeCompare(right, 'en'));
  return JSON.stringify(actualKeys) === JSON.stringify([...expectedKeys].sort());
};

const requireRecord = (input, expectedKeys, label) => {
  if (!isPlainRecord(input) || !hasExactKeys(input, expectedKeys)) {
    throw new Error(`${label} has an unsupported shape.`);
  }
  return input;
};

const requireSafeInteger = (input, label) => {
  if (!Number.isSafeInteger(input) || input < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
  return input;
};

const requireAttemptId = (input, label) => {
  if (typeof input !== 'string' || !ATTEMPT_ID_PATTERN.test(input)) {
    throw new Error(`${label} must be a qualification attempt id.`);
  }
  return input;
};

const requireSha256 = (input, label) => {
  if (typeof input !== 'string' || !SHA256_PATTERN.test(input)) {
    throw new Error(`${label} must be a SHA-256 digest.`);
  }
  return input;
};

const requireStageObservation = (input, expectedRole, label) => {
  const stage = requireRecord(
    input,
    [
      'cachedInputTokenCount',
      'completedCommandCount',
      'durationMs',
      'evidenceSha256',
      'inputTokenCount',
      'maximumCommandOutputByteCount',
      'modelVisibleToolOutputByteCount',
      'moldeaCommandCount',
      'moldeaOutputByteCount',
      'outputTokenCount',
      'role',
      'sourceAttemptId',
      'totalTokenCount',
    ],
    label,
  );

  if (stage.role !== expectedRole) {
    throw new Error(`${label}.role must be ${expectedRole}.`);
  }
  requireAttemptId(stage.sourceAttemptId, `${label}.sourceAttemptId`);
  requireSha256(stage.evidenceSha256, `${label}.evidenceSha256`);
  for (const field of [
    'cachedInputTokenCount',
    'completedCommandCount',
    'durationMs',
    'inputTokenCount',
    'maximumCommandOutputByteCount',
    'modelVisibleToolOutputByteCount',
    'moldeaCommandCount',
    'moldeaOutputByteCount',
    'outputTokenCount',
    'totalTokenCount',
  ]) {
    requireSafeInteger(stage[field], `${label}.${field}`);
  }

  if (
    stage.cachedInputTokenCount > stage.inputTokenCount ||
    stage.totalTokenCount !== stage.inputTokenCount + stage.outputTokenCount ||
    stage.maximumCommandOutputByteCount > stage.modelVisibleToolOutputByteCount ||
    stage.moldeaOutputByteCount > stage.modelVisibleToolOutputByteCount ||
    (stage.completedCommandCount === 0 && stage.maximumCommandOutputByteCount !== 0) ||
    (stage.moldeaCommandCount === 0 && stage.moldeaOutputByteCount !== 0)
  ) {
    throw new Error(`${label} has inconsistent aggregate resource counts.`);
  }

  const absolute = MOLDEA_SKILL_RESOURCE_PROFILES.absolute;
  if (
    stage.completedCommandCount > absolute.maxCompletedCommandCount ||
    stage.maximumCommandOutputByteCount > absolute.maxModelVisibleToolOutputBytes ||
    stage.modelVisibleToolOutputByteCount > absolute.maxModelVisibleToolOutputBytes ||
    stage.moldeaCommandCount > absolute.maxMoldeaCommandCount ||
    stage.moldeaOutputByteCount > absolute.maxMoldeaOutputBytes ||
    stage.totalTokenCount > absolute.maxHostTokenCount
  ) {
    throw new Error(`${label} exceeds an absolute containment ceiling.`);
  }

  return stage;
};

const requireObservation = (input, index) => {
  const label = `modelStageObservations[${index}]`;
  const observation = requireRecord(
    input,
    ['caseId', 'checks', 'evidence', 'resourceProfile', 'stages', 'trialId'],
    label,
  );
  if (typeof observation.caseId !== 'string' || !STABLE_ID_PATTERN.test(observation.caseId)) {
    throw new Error(`${label}.caseId must be a stable id.`);
  }
  if (!['ordinary', 'largeTraversal'].includes(observation.resourceProfile)) {
    throw new Error(`${label}.resourceProfile is unsupported.`);
  }
  if (!['initial', 'confirmation-1', 'confirmation-2'].includes(observation.trialId)) {
    throw new Error(`${label}.trialId is unsupported.`);
  }

  const checks = requireRecord(
    observation.checks,
    [
      'calibrationEligible',
      'commandPolicy',
      'deterministic',
      'outputBounds',
      'profile',
      'semantic',
      'workspace',
    ],
    `${label}.checks`,
  );
  if (
    checks.calibrationEligible !== true ||
    checks.commandPolicy !== 'pass' ||
    checks.deterministic !== 'pass' ||
    checks.outputBounds !== 'pass' ||
    checks.profile !== 'fail' ||
    checks.semantic !== 'pass' ||
    checks.workspace !== 'pass'
  ) {
    throw new Error(`${label} is not eligible calibration evidence.`);
  }

  const evidence = requireRecord(
    observation.evidence,
    ['deterministicSha256', 'judgeOutputSha256', 'trialResultSha256', 'workspaceAssertionsSha256'],
    `${label}.evidence`,
  );
  for (const field of Object.keys(evidence)) {
    requireSha256(evidence[field], `${label}.evidence.${field}`);
  }

  if (!Array.isArray(observation.stages) || observation.stages.length !== 2) {
    throw new Error(`${label}.stages must contain one actor and one judge observation.`);
  }
  const actor = requireStageObservation(observation.stages[0], 'actor', `${label}.stages[0]`);
  const judge = requireStageObservation(observation.stages[1], 'judge', `${label}.stages[1]`);
  const profile = MOLDEA_SKILL_RESOURCE_PROFILES[observation.resourceProfile];

  for (const [stageLabel, stage] of [
    ['actor', actor],
    ['judge', judge],
  ]) {
    if (
      stage.maximumCommandOutputByteCount > profile.maxCommandOutputBytes ||
      stage.modelVisibleToolOutputByteCount > profile.maxModelVisibleToolOutputBytes ||
      stage.moldeaOutputByteCount > profile.maxAggregateMoldeaOutputBytes
    ) {
      throw new Error(`${label}.${stageLabel} exceeds an output-volume operating limit.`);
    }
  }

  return observation;
};

const requireCommandOutputObservation = (
  input,
  expectedDisposition,
  qualificationAttemptId,
  label,
) => {
  const observation = requireRecord(
    input,
    ['caseId', 'checks', 'disposition', 'evidence', 'resourceProfile', 'stage', 'trialId'],
    label,
  );
  if (typeof observation.caseId !== 'string' || !STABLE_ID_PATTERN.test(observation.caseId)) {
    throw new Error(`${label}.caseId must be a stable id.`);
  }
  if (!['ordinary', 'largeTraversal'].includes(observation.resourceProfile)) {
    throw new Error(`${label}.resourceProfile is unsupported.`);
  }
  if (!['initial', 'confirmation-1', 'confirmation-2'].includes(observation.trialId)) {
    throw new Error(`${label}.trialId is unsupported.`);
  }
  if (observation.disposition !== expectedDisposition) {
    throw new Error(`${label}.disposition must be ${expectedDisposition}.`);
  }

  const checks = requireRecord(
    observation.checks,
    ['commandPolicy', 'deterministic', 'workspace'],
    `${label}.checks`,
  );
  if (
    checks.commandPolicy !== 'pass' ||
    checks.deterministic !== 'pass' ||
    checks.workspace !== 'pass'
  ) {
    throw new Error(`${label} is not eligible command-output calibration evidence.`);
  }

  const evidence = requireRecord(
    observation.evidence,
    ['deterministicSha256', 'trialResultSha256', 'workspaceAssertionsSha256'],
    `${label}.evidence`,
  );
  for (const field of Object.keys(evidence)) {
    requireSha256(evidence[field], `${label}.evidence.${field}`);
  }

  const stage = requireStageObservation(observation.stage, 'actor', `${label}.stage`);
  if (stage.sourceAttemptId !== qualificationAttemptId) {
    throw new Error(`${label}.stage is not bound to the declared qualification attempt.`);
  }

  const profile = MOLDEA_SKILL_RESOURCE_PROFILES[observation.resourceProfile];
  const isWithinProfile =
    stage.completedCommandCount <= profile.maxCompletedCommandCount &&
    stage.maximumCommandOutputByteCount <= profile.maxCommandOutputBytes &&
    stage.modelVisibleToolOutputByteCount <= profile.maxModelVisibleToolOutputBytes &&
    stage.moldeaCommandCount <= profile.maxMoldeaCommandCount &&
    stage.moldeaOutputByteCount <= profile.maxAggregateMoldeaOutputBytes &&
    stage.totalTokenCount <= profile.maxHostTokenCount;
  if (expectedDisposition === 'accepted' && !isWithinProfile) {
    throw new Error(`${label} exceeds the calibrated operating profile.`);
  }
  if (
    expectedDisposition === 'rejected' &&
    stage.maximumCommandOutputByteCount <= profile.maxCommandOutputBytes
  ) {
    throw new Error(`${label} does not exceed the calibrated command-output ceiling.`);
  }

  return observation;
};

/** Creates the deterministic digest for the privacy-safe model-stage observation list. */
export const calculateModelStageObservationsSha256 = (observations) =>
  createHash('sha256')
    .update(`${JSON.stringify(observations)}\n`)
    .digest('hex');

/** Creates the deterministic digest for privacy-safe command-output observations. */
export const calculateCommandOutputObservationsSha256 = (observations) =>
  createHash('sha256')
    .update(`${JSON.stringify(observations)}\n`)
    .digest('hex');

/** Returns the largest accepted cumulative stage observation for each calibrated profile. */
export const summarizeModelStageCalibrationMaxima = (observations) => {
  const summaries = {};
  for (const observation of observations) {
    const summary = summaries[observation.resourceProfile] ?? {
      completedCommandCount: 0,
      moldeaCommandCount: 0,
      totalTokenCount: 0,
    };
    for (const stage of observation.stages) {
      summary.completedCommandCount = Math.max(
        summary.completedCommandCount,
        stage.completedCommandCount,
      );
      summary.moldeaCommandCount = Math.max(summary.moldeaCommandCount, stage.moldeaCommandCount);
      summary.totalTokenCount = Math.max(summary.totalTokenCount, stage.totalTokenCount);
    }
    summaries[observation.resourceProfile] = summary;
  }
  return summaries;
};

/** Validates model-stage calibration identity, privacy shape, arithmetic, and profile headroom. */
export const validateModelStageCalibrationArtifact = (input) => {
  const artifact = requireRecord(
    input,
    [
      'commandOutputObservations',
      'commandOutputObservationsSha256',
      'commandOutputQualificationAttempt',
      'minimumHeadroomPercent',
      'modelStageObservations',
      'modelStageObservationsSha256',
      'qualificationAttempt',
      'schemaVersion',
    ],
    'model-stage calibration artifact',
  );
  if (
    artifact.schemaVersion !== 2 ||
    artifact.minimumHeadroomPercent !== CALIBRATION_MINIMUM_HEADROOM_PERCENT
  ) {
    throw new Error('The model-stage calibration contract version or headroom is unsupported.');
  }

  const qualificationAttempt = requireRecord(
    artifact.qualificationAttempt,
    ['id', 'sha256'],
    'model-stage calibration qualificationAttempt',
  );
  requireAttemptId(qualificationAttempt.id, 'model-stage calibration qualificationAttempt.id');
  requireSha256(qualificationAttempt.sha256, 'model-stage calibration qualificationAttempt.sha256');
  requireSha256(
    artifact.modelStageObservationsSha256,
    'model-stage calibration modelStageObservationsSha256',
  );
  const commandOutputQualificationAttempt = requireRecord(
    artifact.commandOutputQualificationAttempt,
    ['id', 'sha256', 'targetKey'],
    'model-stage calibration commandOutputQualificationAttempt',
  );
  requireAttemptId(
    commandOutputQualificationAttempt.id,
    'model-stage calibration commandOutputQualificationAttempt.id',
  );
  requireSha256(
    commandOutputQualificationAttempt.sha256,
    'model-stage calibration commandOutputQualificationAttempt.sha256',
  );
  if (!/^t[1-9][0-9]*$/u.test(commandOutputQualificationAttempt.targetKey)) {
    throw new Error(
      'model-stage calibration commandOutputQualificationAttempt.targetKey must be a qualification target key.',
    );
  }
  requireSha256(
    artifact.commandOutputObservationsSha256,
    'model-stage calibration commandOutputObservationsSha256',
  );
  if (
    !Array.isArray(artifact.modelStageObservations) ||
    artifact.modelStageObservations.length < 1
  ) {
    throw new Error('The model-stage calibration artifact requires accepted observations.');
  }

  artifact.modelStageObservations.forEach(requireObservation);
  const observationIds = artifact.modelStageObservations.map(
    ({ caseId, trialId }) => `${caseId}\0${trialId}`,
  );
  if (new Set(observationIds).size !== observationIds.length) {
    throw new Error('The model-stage calibration observations must be unique by case and trial.');
  }
  if (
    artifact.modelStageObservationsSha256 !==
    calculateModelStageObservationsSha256(artifact.modelStageObservations)
  ) {
    throw new Error('The model-stage calibration observation digest does not match.');
  }
  if (!Array.isArray(artifact.commandOutputObservations)) {
    throw new Error('The model-stage calibration artifact requires command-output observations.');
  }
  const commandOutputObservations = ['accepted', 'rejected'].map((disposition) => {
    const matchingObservations = artifact.commandOutputObservations.filter(
      (observation) => observation?.disposition === disposition,
    );
    if (matchingObservations.length !== 1) {
      throw new Error(
        `The model-stage calibration artifact requires one ${disposition} command-output observation.`,
      );
    }
    return requireCommandOutputObservation(
      matchingObservations[0],
      disposition,
      commandOutputQualificationAttempt.id,
      `commandOutputObservations.${disposition}`,
    );
  });
  if (
    artifact.commandOutputObservationsSha256 !==
    calculateCommandOutputObservationsSha256(artifact.commandOutputObservations)
  ) {
    throw new Error('The command-output calibration observation digest does not match.');
  }

  const minimumMultiplier = 1 + CALIBRATION_MINIMUM_HEADROOM_PERCENT / 100;
  const maxima = summarizeModelStageCalibrationMaxima(artifact.modelStageObservations);
  for (const [resourceProfile, summary] of Object.entries(maxima)) {
    const profile = MOLDEA_SKILL_RESOURCE_PROFILES[resourceProfile];
    if (
      profile.maxCompletedCommandCount <
        Math.ceil(summary.completedCommandCount * minimumMultiplier) ||
      profile.maxMoldeaCommandCount < Math.ceil(summary.moldeaCommandCount * minimumMultiplier) ||
      profile.maxHostTokenCount < Math.ceil(summary.totalTokenCount * minimumMultiplier)
    ) {
      throw new Error(
        `The ${resourceProfile} profile lacks required model-stage cumulative headroom.`,
      );
    }
  }

  const acceptedCommandOutputObservation = commandOutputObservations.find(
    ({ disposition }) => disposition === 'accepted',
  );
  const acceptedCommandOutputProfile =
    MOLDEA_SKILL_RESOURCE_PROFILES[acceptedCommandOutputObservation.resourceProfile];
  if (
    acceptedCommandOutputProfile.maxCommandOutputBytes <
    Math.ceil(
      acceptedCommandOutputObservation.stage.maximumCommandOutputByteCount * minimumMultiplier,
    )
  ) {
    throw new Error('The command-output profile lacks required model-stage headroom.');
  }

  const { absolute, largeTraversal, ordinary } = MOLDEA_SKILL_RESOURCE_PROFILES;
  if (
    largeTraversal.maxCompletedCommandCount < ordinary.maxCompletedCommandCount ||
    largeTraversal.maxMoldeaCommandCount < ordinary.maxMoldeaCommandCount ||
    largeTraversal.maxHostTokenCount < ordinary.maxHostTokenCount ||
    largeTraversal.maxCommandOutputBytes < ordinary.maxCommandOutputBytes ||
    ordinary.maxCompletedCommandCount > absolute.maxCompletedCommandCount ||
    ordinary.maxMoldeaCommandCount > absolute.maxMoldeaCommandCount ||
    ordinary.maxHostTokenCount > absolute.maxHostTokenCount ||
    largeTraversal.maxCompletedCommandCount > absolute.maxCompletedCommandCount ||
    largeTraversal.maxMoldeaCommandCount > absolute.maxMoldeaCommandCount ||
    largeTraversal.maxHostTokenCount > absolute.maxHostTokenCount
  ) {
    throw new Error('The calibrated operating profiles do not preserve containment ordering.');
  }

  return artifact;
};
