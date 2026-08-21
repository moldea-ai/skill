import { identifyCodexEvaluationHostConfiguration } from '../../../tooling/codex-evaluation-host/index.mjs';

import { QUALIFICATION_MODEL, QUALIFICATION_REASONING_EFFORT } from '../constants/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import type { IQualificationExecutionEnvironment } from '../contracts/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
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
  const hostConfiguration = identifyCodexEvaluationHostConfiguration();
  const [codexVersion, pnpmVersion, gitVersion] = await Promise.all([
    readVersion('Codex', () => host.getVersion()),
    readVersion('pnpm', () =>
      executeProcess({ command: 'pnpm', args: ['--version'], cwd: process.cwd() }).then(
        ({ stdout }) => stdout,
      ),
    ),
    readVersion('Git', () =>
      executeProcess({ command: 'git', args: ['--version'], cwd: process.cwd() }).then(
        ({ stdout }) => stdout,
      ),
    ),
  ]);

  return {
    model: QUALIFICATION_MODEL,
    reasoningEffort: QUALIFICATION_REASONING_EFFORT,
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
  packagesState: IGitRepositoryState;
  profileDigest: string;
  qualificationDigest: string;
  qualificationState: IGitRepositoryState;
  skillState: IGitRepositoryState;
  targetSupportLevel: string;
}): IQualificationExecutionProvenance => {
  return {
    ...options.executionEnvironment,
    packagesRepositoryCommit: options.packagesState.commit,
    packagesRepositoryFingerprint: options.packagesState.fingerprint,
    packagesRepositoryDirty: options.packagesState.isDirty,
    targetSupportLevel: options.targetSupportLevel,
    qualificationRepositoryCommit: options.qualificationState.commit,
    qualificationRepositoryDirty: options.qualificationState.isDirty,
    skillRepositoryCommit: options.skillState.commit,
    skillRepositoryFingerprint: options.skillState.fingerprint,
    skillRepositoryDirty: options.skillState.isDirty,
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
  };
};
