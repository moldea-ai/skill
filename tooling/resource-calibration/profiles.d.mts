export interface IMoldeaSkillResourceProfile {
  maxAggregateMoldeaOutputBytes: number;
  maxMoldeaCommandCount: number;
  maxOutputPageBytes: number;
}

export interface IMoldeaSkillAbsoluteResourceProfile {
  maxActorExecutionEvidenceItemBytes: number;
  maxActorExecutionEvidenceItems: number;
  maxCompletedCommandCount: number;
  maxHostOutputBytes: number;
  maxHostTokenCount: number;
  maxModelVisibleToolOutputBytes: number;
  maxMoldeaCommandCount: number;
  maxMoldeaInvocationOutputBytes: number;
  maxMoldeaOutputBytes: number;
  maxOtherCommandOutputBytes: number;
  maxProcessOutputBytes: number;
}

export const MOLDEA_SKILL_RESOURCE_PROFILES: Readonly<{
  absolute: Readonly<IMoldeaSkillAbsoluteResourceProfile>;
  largeTraversal: Readonly<IMoldeaSkillResourceProfile>;
  ordinary: Readonly<IMoldeaSkillResourceProfile>;
}>;

export const CALIBRATION_ESTIMATED_UTF8_BYTES_PER_TOKEN: number;
export const CALIBRATION_MINIMUM_HEADROOM_PERCENT: number;
