export type ISemanticStageName = 'actor' | 'judge';

export type ISemanticStageTrialIdentity = {
  caseId: string;
  confirmationIndex: 1 | 2 | 3 | null;
  kind: 'confirmation' | 'initial';
};

export type ISemanticStageReuseRecord = {
  identitySha256: string;
  origin: 'reused';
  schemaVersion: 1;
  source: {
    attemptId: string;
    evidenceSha256: string;
    trial: ISemanticStageTrialIdentity;
  };
  stage: ISemanticStageName;
};

export type ISemanticStageReuseExpectation = {
  identitySha256: string;
  sourceAttemptId?: string;
  sourceEvidenceSha256?: string;
  stage: ISemanticStageName;
  trial: ISemanticStageTrialIdentity;
};

export type ISemanticStageIdentity = {
  contract: Record<string, unknown>;
  sha256: string;
};

export type ISemanticModelHostIdentity = {
  developerInstructionsSha256: string;
  model: string;
  name: string;
  reasoningEffort: string;
  role: ISemanticStageName;
  version: string;
};
