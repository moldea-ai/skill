import type { IActorOutput, IJudgeOutput, IModelUsage } from '../contracts/index.ts';

// content-addressed model-cache metadata; original timestamps never change on reuse
export type IModelCacheMetadata = {
  protocolVersion: 1;
  cacheKey: string;
  role: 'actor' | 'judge';
  sourceAttemptId: string;
  createdAt: string;
  durationMs: number;
  usage: IModelUsage | null;
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
