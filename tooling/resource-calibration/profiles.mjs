// calibrated operating targets and failure-containment ceilings for skill execution
export const MOLDEA_SKILL_RESOURCE_PROFILES = Object.freeze({
  ordinary: Object.freeze({
    maxAggregateMoldeaOutputBytes: 262_144,
    maxMoldeaCommandCount: 4,
    maxOutputPageBytes: 65_536,
  }),
  largeTraversal: Object.freeze({
    maxAggregateMoldeaOutputBytes: 1_048_576,
    maxMoldeaCommandCount: 16,
    maxOutputPageBytes: 65_536,
  }),
  absolute: Object.freeze({
    maxActorExecutionEvidenceItemBytes: 32_768,
    maxActorExecutionEvidenceItems: 128,
    maxCompletedCommandCount: 128,
    maxHostOutputBytes: 16_777_216,
    maxHostTokenCount: 2_097_152,
    maxModelVisibleToolOutputBytes: 16_777_216,
    maxMoldeaCommandCount: 32,
    maxMoldeaInvocationOutputBytes: 1_048_576,
    maxMoldeaOutputBytes: 8_388_608,
    maxOtherCommandOutputBytes: 32_768,
    maxProcessOutputBytes: 16_777_216,
  }),
});

// deterministic conversion used only for conservative calibration comparisons
export const CALIBRATION_ESTIMATED_UTF8_BYTES_PER_TOKEN = 4;

// headroom required above the largest ordinary measured byte or count observation
export const CALIBRATION_MINIMUM_HEADROOM_PERCENT = 25;
