/** Operating limits applied to an ordinary or large-traversal model stage. */
export type IMoldeaSkillResourceProfile = {
  maxCompletedCommandCount: number;
  maxCommandOutputBytes: number;
  maxHostTokenCount: number;
  maxModelVisibleToolOutputBytes: number;
  maxAggregateMoldeaOutputBytes: number;
  maxMoldeaCommandCount: number;
  maxOutputPageBytes: number;
};

/** Absolute failure-containment limits applied to every model stage. */
export type IMoldeaSkillAbsoluteResourceProfile = {
  maxActorExecutionEvidenceItemBytes: number;
  maxActorExecutionEvidenceItems: number;
  maxCompletedCommandCount: number;
  maxHostOutputBytes: number;
  maxHostTokenCount: number;
  maxModelVisibleToolOutputBytes: number;
  maxMoldeaCommandCount: number;
  maxMoldeaInvocationOutputBytes: number;
  maxMoldeaOutputBytes: number;
  maxCommandTextBytes: number;
  maxProcessOutputBytes: number;
};

/** Complete calibrated resource limits shared by both evaluators. */
export type IMoldeaSkillResourceProfiles = {
  absolute: Readonly<IMoldeaSkillAbsoluteResourceProfile>;
  largeTraversal: Readonly<IMoldeaSkillResourceProfile>;
  ordinary: Readonly<IMoldeaSkillResourceProfile>;
};
