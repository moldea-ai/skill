export interface ISemanticCliIdentity {
  integrity: string;
  jsonSchemaVersion: number;
  name: '@moldea.ai/cli';
  packageLockSha256: string;
  version: string;
}

export interface IReleaseIdentity {
  cliDependencies: Record<string, string>;
  cliIntegrity: string;
  cliJsonSchemaVersion: number;
  cliVersion: string;
  packageLock: Record<string, unknown>;
  packageLockSha256: string;
  packageManifest: Record<string, unknown>;
  releaseVersion: string;
}

export const parseStableVersion: (version: unknown) => string;
export const readReleaseIdentity: (repositoryRoot: string) => IReleaseIdentity;
export const createSemanticCliIdentity: (repositoryRoot: string) => ISemanticCliIdentity;
export const inspectReleaseIdentity: (repositoryRoot: string) => string[];
export const assertReleaseIdentity: (repositoryRoot: string) => void;
