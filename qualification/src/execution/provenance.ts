import { identifyCodexEvaluationHostConfiguration } from '../../../src/execution/host/index.ts';

import {
  QUALIFICATION_ACTOR_REASONING_EFFORT,
  QUALIFICATION_DEFAULT_HOST_TIMEOUT_MS,
  QUALIFICATION_JUDGE_REASONING_EFFORT,
  QUALIFICATION_MODEL,
} from '../constants/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import type { IQualificationExecutionEnvironment } from '../contracts/index.ts';
import { getQualificationPnpmVersion } from '../pnpm-installation/index.ts';
import { executeProcess } from '../../../src/process/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import type { IRuntimeCompatibilitySnapshot } from '../compatibility/index.ts';
import type { IQualificationExecutionProvenance } from './types.ts';

const readVersion = async (toolName: string, read: () => Promise<string>): Promise<string> => {
  try {
    const version = (await read()).trim();
    if (version === '' || version === 'unavailable') {
      throw new Error(`${toolName} did not report a version.`);
    }
    return version;
  } catch (error) {
    throw new Error(`Unable to establish the exact ${toolName} version.`, { cause: error });
  }
};

/** Captures the model host and local tool identity that must remain exact during resume. */
export const inspectQualificationExecutionEnvironment = async (
  host: ICodexHost,
): Promise<IQualificationExecutionEnvironment> => {
  const hostConfiguration = identifyCodexEvaluationHostConfiguration({
    defaultHostTimeoutMs: QUALIFICATION_DEFAULT_HOST_TIMEOUT_MS,
  });
  const [codexVersion, pnpmVersion, gitVersion] = await Promise.all([
    readVersion('Codex', () => host.getVersion()),
    readVersion('pnpm', getQualificationPnpmVersion),
    readVersion('Git', () =>
      executeProcess({ command: 'git', args: ['--version'], cwd: process.cwd() }).then(
        ({ stdout }) => stdout,
      ),
    ),
  ]);

  return {
    actorReasoningEffort: QUALIFICATION_ACTOR_REASONING_EFFORT,
    judgeReasoningEffort: QUALIFICATION_JUDGE_REASONING_EFFORT,
    model: QUALIFICATION_MODEL,
    codexVersion,
    nodeVersion: process.version,
    pnpmVersion,
    gitVersion,
    ...hostConfiguration,
  };
};

/** Combines exact execution and repository identities for public provenance. */
export const createQualificationExecutionProvenance = (options: {
  executionEnvironment: IQualificationExecutionEnvironment;
  compatibilitySnapshot: Pick<IRuntimeCompatibilitySnapshot, 'sourceUrl' | 'sha256'>;
  profileDigest: string;
  qualificationDigest: string;
  targetDigest: string;
  qualificationState: IGitRepositoryState;
  skillState: IGitRepositoryState;
}): IQualificationExecutionProvenance => {
  return {
    ...options.executionEnvironment,
    candidateFingerprint: null,
    compatibilitySnapshot: {
      sourceUrl: options.compatibilitySnapshot.sourceUrl,
      sha256: options.compatibilitySnapshot.sha256,
    },
    qualificationRepositoryCommit: options.qualificationState.commit,
    qualificationRepositoryDirty: options.qualificationState.isDirty,
    skillRepositoryCommit: options.skillState.commit,
    skillRepositoryFingerprint: options.skillState.fingerprint,
    skillRepositoryDirty: options.skillState.isDirty,
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
    targetDigest: options.targetDigest,
    baselineAttemptId: null,
  };
};
