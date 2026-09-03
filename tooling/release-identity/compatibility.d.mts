// explicit release-compatibility identity
export interface ICompatibilityContract {
  skillVersion: string;
  cliVersion: string;
  cliJsonSchemaVersion: number;
  nodeRange: string;
  npmRange: string;
  pnpmRange: string;
  yarnRange: string;
}

export const COMPATIBILITY_401: Readonly<ICompatibilityContract>;
export const COMPATIBILITY_402: Readonly<ICompatibilityContract>;

export const validateCompatibilityContract: (input: unknown) => ICompatibilityContract;
export const parseCompatibility: (content: string) => ICompatibilityContract;
export const isCompatibilityVersionSupported: (range: string, version: string) => boolean;
export const assertCompatibility402Expansion: (
  source: ICompatibilityContract,
  candidate: ICompatibilityContract,
) => {
  source: ICompatibilityContract;
  candidate: ICompatibilityContract;
};
export const assertRepositoryCompatibility: (
  repositoryRoot: string,
  expected: ICompatibilityContract,
) => ICompatibilityContract;
