import type { ISemanticAttemptTrialModel } from './types.ts';

type ISourceTrial = {
  actorHost: Pick<ISemanticAttemptTrialModel['actorHost'], 'model' | 'reasoningEffort'>;
  carriedFrom?: ISemanticAttemptTrialModel['carriedFrom'];
  judgeHost: Pick<ISemanticAttemptTrialModel['judgeHost'], 'model' | 'reasoningEffort'>;
};

/** Collects the actual source identities of a selected semantic result. */
export const getSemanticSourceIdentities = (attempt: {
  cases: readonly { trials: readonly ISourceTrial[] }[];
}) => {
  const sources = new Map<
    string,
    {
      attemptId: string;
      artifactDigest: string | null;
      cliVersion: string | null;
      evidenceSha256: string;
      actorConfigurations: Set<string>;
      judgeConfigurations: Set<string>;
      version: string | null;
    }
  >();
  for (const semanticCase of attempt.cases) {
    for (const trial of semanticCase.trials) {
      const source = trial.carriedFrom;
      if (source === undefined) continue;
      const key = `${source.attemptId}/${source.evidenceSha256}`;
      const identity = sources.get(key) ?? {
        attemptId: source.attemptId,
        artifactDigest: source.artifactDigest ?? null,
        cliVersion: source.cliVersion ?? null,
        evidenceSha256: source.evidenceSha256,
        actorConfigurations: new Set<string>(),
        judgeConfigurations: new Set<string>(),
        version: source.version ?? null,
      };
      identity.actorConfigurations.add(
        `${trial.actorHost.model}, ${trial.actorHost.reasoningEffort}`,
      );
      identity.judgeConfigurations.add(
        `${trial.judgeHost.model}, ${trial.judgeHost.reasoningEffort}`,
      );
      sources.set(key, identity);
    }
  }
  return [...sources.values()].map(({ actorConfigurations, judgeConfigurations, ...identity }) => ({
    ...identity,
    actorConfigurations: [...actorConfigurations].sort(),
    judgeConfigurations: [...judgeConfigurations].sort(),
  }));
};
