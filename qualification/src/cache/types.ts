import type { QUALIFICATION_EVIDENCE_PROTOCOL_VERSION } from '../constants/index.ts';
import type { IActorOutput, IJudgeOutput, IModelUsage } from '../contracts/index.ts';

// content-addressed model-cache metadata; original timestamps never change on reuse
export type IModelCacheMetadata = {
  protocolVersion: typeof QUALIFICATION_EVIDENCE_PROTOCOL_VERSION;
  cacheKey: string;
  role: 'actor' | 'judge';
  sourceAttemptId: string;
  createdAt: string;
  durationMs: number;
  eventsSha256: string;
  outputSha256: string;
  usage: IModelUsage | null;
  workspaceFingerprint: string | null;
};

export type IActorCacheHit = {
  metadata: IModelCacheMetadata & { role: 'actor' };
  output: IActorOutput;
  events: string;
};

export type IJudgeCacheHit = {
  metadata: IModelCacheMetadata & { role: 'judge' };
  output: IJudgeOutput;
  events: string;
};
