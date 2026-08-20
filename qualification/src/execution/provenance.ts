import { QUALIFICATION_MODEL, QUALIFICATION_REASONING_EFFORT } from '../constants/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import type { IQualificationExecutionProvenance } from './types.ts';

const readVersion = async (read: () => Promise<string>): Promise<string> => {
  try {
    const version = (await read()).trim();
    return version === '' ? 'unavailable' : version;
  } catch {
    return 'unavailable';
  }
};

/** Captures exact local tool versions and immutable repository fingerprints for public provenance. */
export const createQualificationExecutionProvenance = async (options: {
  host: ICodexHost;
  packagesState: IGitRepositoryState;
  profileDigest: string;
  qualificationDigest: string;
  qualificationState: IGitRepositoryState;
  skillState: IGitRepositoryState;
}): Promise<IQualificationExecutionProvenance> => {
  const [codexVersion, pnpmVersion, gitVersion] = await Promise.all([
    readVersion(() => options.host.getVersion()),
    readVersion(() =>
      executeProcess({ command: 'pnpm', args: ['--version'], cwd: process.cwd() }).then(
        ({ stdout }) => stdout,
      ),
    ),
    readVersion(() =>
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
    packagesRepositoryCommit: options.packagesState.commit,
    packagesRepositoryFingerprint: options.packagesState.fingerprint,
    packagesRepositoryDirty: options.packagesState.isDirty,
    qualificationRepositoryCommit: options.qualificationState.commit,
    qualificationRepositoryDirty: options.qualificationState.isDirty,
    skillRepositoryCommit: options.skillState.commit,
    skillRepositoryFingerprint: options.skillState.fingerprint,
    skillRepositoryDirty: options.skillState.isDirty,
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
  };
};
