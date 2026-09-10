// attempt-owned pnpm paths and environment shared by qualification installs
export type IQualificationPnpmInstallation = {
  cacheDirectory: string;
  configPath: string;
  environment: NodeJS.ProcessEnv;
  registryUrl: string;
  storeDirectory: string;
};

// package identity needed to create exact pnpm dependency contracts
export type IQualificationPnpmPackage = {
  name: string;
  version: string;
};
