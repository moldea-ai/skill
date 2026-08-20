import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { DeterministicVerificationSchema, type ICandidateClosure } from '../contracts/index.ts';
import { collectDirectoryFingerprintEntries, copyFileWithParents } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IDeterministicVerificationArtifact } from './types.ts';

const DirectVerificationSchema = z.strictObject({
  equivalent: z.boolean(),
  filesystem: z.strictObject({
    valid: z.boolean(),
    formatVersion: z.number().int().nullable(),
    diagnosticCodes: z.array(z.string()),
    evidenceCount: z.number().int().nonnegative(),
    agentCount: z.number().int().nonnegative(),
  }),
  memory: z.strictObject({
    valid: z.boolean(),
    formatVersion: z.number().int().nullable(),
    diagnosticCodes: z.array(z.string()),
    evidenceCount: z.number().int().nonnegative(),
    agentCount: z.number().int().nonnegative(),
  }),
});

const CliEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  command: z.enum(['compatibility', 'inspect', 'validate']),
  status: z.enum(['error', 'invalid', 'valid']),
  result: z.unknown().nullable(),
  error: z.unknown().nullable(),
});

const parseCliOutput = (output: string): z.infer<typeof CliEnvelopeSchema> =>
  CliEnvelopeSchema.parse(JSON.parse(output) as unknown);

/** Exercises Repository FS, Repository memory, Core, installed CLI commands, and project typecheck. */
export const verifyDeterministicProject = async (options: {
  candidate: ICandidateClosure;
  expectedInspectionStatus: 'invalid' | 'valid';
  packagesRepository: string;
  signal?: AbortSignal | undefined;
  workspaceDirectory: string;
}): Promise<IDeterministicVerificationArtifact> => {
  const startedAt = performance.now();
  const projectStateBefore = await collectDirectoryFingerprintEntries(options.workspaceDirectory, {
    excludedDirectoryNames: new Set(['.git', '.moldea-qualification', 'node_modules']),
  });
  const directVerifierSourcePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'direct-verifier.mjs',
  );
  const directVerifierPath = path.join(
    options.candidate.runtimeDirectory,
    'qualification-direct-verifier.mjs',
  );
  await copyFileWithParents(directVerifierSourcePath, directVerifierPath);
  const directResult = await executeProcess({
    command: process.execPath,
    args: [directVerifierPath, options.workspaceDirectory],
    cwd: options.candidate.runtimeDirectory,
    signal: options.signal,
  });
  const direct = DirectVerificationSchema.parse(JSON.parse(directResult.stdout) as unknown);
  const cliExecutablePath = path.join(
    options.workspaceDirectory,
    'node_modules',
    '@moldea.ai',
    'cli',
    'dist',
    'moldea.js',
  );
  const [compatibilityResult, validateResult, inspectResult, typecheckResult] = await Promise.all([
    executeProcess({
      command: process.execPath,
      args: [cliExecutablePath, 'compatibility', '--json', '--no-color'],
      cwd: options.workspaceDirectory,
      signal: options.signal,
    }),
    executeProcess({
      command: process.execPath,
      args: [
        cliExecutablePath,
        'validate',
        '--repository',
        options.workspaceDirectory,
        '--json',
        '--no-color',
      ],
      cwd: options.workspaceDirectory,
      expectedExitCodes: [0, 1],
      signal: options.signal,
    }),
    executeProcess({
      command: process.execPath,
      args: [
        cliExecutablePath,
        'inspect',
        '--repository',
        options.workspaceDirectory,
        '--json',
        '--no-color',
      ],
      cwd: options.workspaceDirectory,
      expectedExitCodes: [0, 1],
      signal: options.signal,
    }),
    executeProcess({
      command: process.execPath,
      args: [
        path.join(options.packagesRepository, 'node_modules', 'typescript', 'bin', 'tsc'),
        '--project',
        path.join(options.workspaceDirectory, 'tsconfig.json'),
        '--noEmit',
      ],
      cwd: options.workspaceDirectory,
      expectedExitCodes: [0, 2],
      signal: options.signal,
    }),
  ]);
  const cliCompatibility = parseCliOutput(compatibilityResult.stdout);
  const cliValidate = parseCliOutput(validateResult.stdout);
  const cliInspect = parseCliOutput(inspectResult.stdout);
  const expectedCoreValidity = options.expectedInspectionStatus === 'valid';
  const failures: string[] = [];
  const typecheckPassed = typecheckResult.exitCode === 0;
  const projectStateAfter = await collectDirectoryFingerprintEntries(options.workspaceDirectory, {
    excludedDirectoryNames: new Set(['.git', '.moldea-qualification', 'node_modules']),
  });
  const repositoryUnchanged =
    JSON.stringify(projectStateBefore) === JSON.stringify(projectStateAfter);

  if (direct.filesystem.valid !== expectedCoreValidity) {
    failures.push(
      `Repository FS inspection was ${direct.filesystem.valid ? 'valid' : 'invalid'}; expected ${options.expectedInspectionStatus}.`,
    );
  }

  if (!direct.equivalent) {
    failures.push('Repository FS and reconstructed Repository memory inspection results differ.');
  }

  if (cliCompatibility.status !== 'valid') {
    failures.push('Installed CLI compatibility did not report valid.');
  }

  if (cliValidate.status !== options.expectedInspectionStatus) {
    failures.push(`Installed CLI validate reported ${cliValidate.status}.`);
  }

  if (cliInspect.status !== options.expectedInspectionStatus) {
    failures.push(`Installed CLI inspect reported ${cliInspect.status}.`);
  }

  if (!typecheckPassed) {
    failures.push(
      'The mock project did not typecheck with the repository-pinned TypeScript compiler.',
    );
  }

  if (!repositoryUnchanged) {
    failures.push('Deterministic read-only verification changed project files.');
  }

  const summary = DeterministicVerificationSchema.parse({
    passed: failures.length === 0,
    inspectionStatus: direct.filesystem.valid ? 'valid' : 'invalid',
    repositoryFilesystemValid: direct.filesystem.valid === expectedCoreValidity,
    memoryRepositoryEquivalent: direct.equivalent,
    coreValid: direct.filesystem.valid === expectedCoreValidity,
    cliCompatibilityValid: cliCompatibility.status === 'valid',
    cliValidateStatus: cliValidate.status,
    cliInspectStatus: cliInspect.status,
    typecheckPassed,
    repositoryUnchanged,
    failures,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  });

  return {
    summary,
    details: {
      direct,
      cliCompatibility,
      cliValidate,
      cliInspect,
      typecheck: {
        exitCode: typecheckResult.exitCode,
        stdout: typecheckResult.stdout,
        stderr: typecheckResult.stderr,
      },
    },
  };
};
