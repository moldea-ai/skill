import type { IDeterministicVerification } from '../contracts/index.ts';

// public deterministic artifact combines the stable summary with safe diagnostic detail
export type IDeterministicVerificationArtifact = {
  summary: IDeterministicVerification;
  details: {
    direct: unknown;
    cliCompatibility: unknown;
    cliValidate: unknown;
    cliInspect: unknown;
    typecheck: {
      exitCode: number;
      stdout: string;
      stderr: string;
    };
  };
};
