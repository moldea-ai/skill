import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { DeterministicVerificationSchema, type ICandidateClosure } from '../contracts/index.ts';
import { collectDirectoryFingerprintEntries, copyFileWithParents } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { inspectProjectTypeScriptInstallation } from '../project-fixture/index.ts';
import type { IDeterministicVerificationArtifact } from './types.ts';

const DirectVerificationSchema = z.strictObject({
  equivalent: z.boolean(),
  filesystem: z.strictObject({
    valid: z.boolean(),
    formatVersion: z.number().int().nullable(),
    diagnosticCodes: z.array(z.string()),
    evidenceKinds: z.array(z.string()),
    evidenceCount: z.number().int().nonnegative(),
    agentCount: z.number().int().nonnegative(),
  }),
  memory: z.strictObject({
    valid: z.boolean(),
    formatVersion: z.number().int().nullable(),
    diagnosticCodes: z.array(z.string()),
    evidenceKinds: z.array(z.string()),
    evidenceCount: z.number().int().nonnegative(),
    agentCount: z.number().int().nonnegative(),
  }),
});

const CliEnvelopeSchema = z.strictObject({
  schemaVersion: z.number().int().positive(),
  cliVersion: z.string(),
  command: z.enum(['composition', 'inspect', 'validate']),
  status: z.enum(['error', 'invalid', 'valid']),
  result: z.unknown().nullable(),
  error: z.unknown().nullable(),
});

const parseCliOutput = (output: string): z.infer<typeof CliEnvelopeSchema> =>
  CliEnvelopeSchema.parse(JSON.parse(output) as unknown);

const CompositionResultSchema = z.object({
  adapters: z.array(
    z.object({
      id: z.string(),
      repositoryFormatVersions: z.array(z.number().int().positive()),
    }),
  ),
  packages: z.array(z.object({ name: z.string(), version: z.string() })),
  repositoryFormatVersions: z.array(z.number().int().positive()),
});

const hasValidEnvelope = (options: {
  candidate: ICandidateClosure;
  command: 'composition' | 'inspect' | 'validate';
  envelope: z.infer<typeof CliEnvelopeSchema>;
  exitCode: number;
}): boolean => {
  const expectedExitCode = options.envelope.status === 'valid' ? 0 : 1;
  return (
    options.envelope.schemaVersion === options.candidate.cliJsonSchemaVersion &&
    options.envelope.cliVersion === options.candidate.cliVersion &&
    options.envelope.command === options.command &&
    options.envelope.status !== 'error' &&
    options.envelope.result !== null &&
    options.envelope.error === null &&
    options.exitCode === expectedExitCode &&
    (options.command !== 'composition' || options.envelope.status === 'valid')
  );
};

const inspectDeclaredEvidence = (options: {
  actual: readonly string[];
  forbidden: readonly string[];
  label: string;
  required: readonly string[];
}): string[] => {
  const actual = new Set(options.actual);
  return [
    ...options.required
      .filter((requiredValue) => !actual.has(requiredValue))
      .map((requiredValue) => `Required ${options.label} was not observed: ${requiredValue}.`),
    ...options.forbidden
      .filter((forbiddenValue) => actual.has(forbiddenValue))
      .map((forbiddenValue) => `Forbidden ${options.label} was observed: ${forbiddenValue}.`),
  ];
};

/** Exercises Repository FS, Repository memory, Core, installed CLI commands, and project typecheck. */
export const verifyDeterministicProject = async (options: {
  adapterId: string;
  adapterPackage: string;
  candidate: ICandidateClosure;
  expectedEvidence: {
    requiredDiagnosticCodes: readonly string[];
    forbiddenDiagnosticCodes: readonly string[];
    requiredEvidenceKinds: readonly string[];
    forbiddenEvidenceKinds: readonly string[];
  };
  expectedInspectionStatus: 'invalid' | 'valid';
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
    args: [
      directVerifierPath,
      options.workspaceDirectory,
      options.adapterId,
      options.adapterPackage,
    ],
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
  const typeScriptInstallation = await inspectProjectTypeScriptInstallation(
    options.workspaceDirectory,
  );
  const [compositionResult, validateResult, inspectResult, typecheckResult] = await Promise.all([
    executeProcess({
      command: process.execPath,
      args: [cliExecutablePath, 'composition', '--json', '--no-color'],
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
        typeScriptInstallation.executablePath,
        '--project',
        path.join(options.workspaceDirectory, 'tsconfig.json'),
        '--noEmit',
      ],
      cwd: options.workspaceDirectory,
      expectedExitCodes: [0, 2],
      signal: options.signal,
    }),
  ]);
  const cliComposition = parseCliOutput(compositionResult.stdout);
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
  const compositionResultPayload = CompositionResultSchema.safeParse(cliComposition.result);
  const cliIdentityValid = [
    ['composition', cliComposition, compositionResult.exitCode],
    ['validate', cliValidate, validateResult.exitCode],
    ['inspect', cliInspect, inspectResult.exitCode],
  ].every(([command, envelope, exitCode]) =>
    hasValidEnvelope({
      candidate: options.candidate,
      command: command as 'composition' | 'inspect' | 'validate',
      envelope: envelope as z.infer<typeof CliEnvelopeSchema>,
      exitCode: exitCode as number,
    }),
  );
  const expectedPackages = options.candidate.packages
    .filter(({ name }) => name !== '@moldea.ai/cli')
    .map(({ name, version }) => ({ name, version }))
    .sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'));
  const actualPackages = compositionResultPayload.success
    ? [...compositionResultPayload.data.packages].sort(({ name: left }, { name: right }) =>
        left.localeCompare(right, 'en'),
      )
    : [];
  const cliPackageInventoryValid =
    compositionResultPayload.success &&
    JSON.stringify(actualPackages) === JSON.stringify(expectedPackages);
  const selectedAdapter = compositionResultPayload.success
    ? compositionResultPayload.data.adapters.find(({ id }) => id === options.adapterId)
    : undefined;
  const expectedRepositoryFormatVersions =
    direct.filesystem.formatVersion === null
      ? compositionResultPayload.success
        ? compositionResultPayload.data.repositoryFormatVersions
        : []
      : [direct.filesystem.formatVersion];
  const cliAdapterInventoryValid =
    selectedAdapter !== undefined &&
    expectedRepositoryFormatVersions.some((formatVersion) =>
      selectedAdapter.repositoryFormatVersions.includes(formatVersion),
    );
  const cliEnvelopeValid = cliIdentityValid;

  if (direct.filesystem.valid !== expectedCoreValidity) {
    failures.push(
      `Repository FS inspection was ${direct.filesystem.valid ? 'valid' : 'invalid'}; expected ${options.expectedInspectionStatus}.`,
    );
  }

  if (!direct.equivalent) {
    failures.push('Repository FS and reconstructed Repository memory inspection results differ.');
  }

  failures.push(
    ...inspectDeclaredEvidence({
      actual: direct.filesystem.diagnosticCodes,
      forbidden: options.expectedEvidence.forbiddenDiagnosticCodes,
      label: 'diagnostic code',
      required: options.expectedEvidence.requiredDiagnosticCodes,
    }),
    ...inspectDeclaredEvidence({
      actual: direct.filesystem.evidenceKinds,
      forbidden: options.expectedEvidence.forbiddenEvidenceKinds,
      label: 'evidence kind',
      required: options.expectedEvidence.requiredEvidenceKinds,
    }),
  );

  if (!cliIdentityValid) {
    failures.push(
      'Installed CLI version, schema, command, status, payload, or exit code differed.',
    );
  }

  if (!cliPackageInventoryValid) {
    failures.push('Installed CLI package inventory did not match the published candidate closure.');
  }

  if (!cliAdapterInventoryValid) {
    failures.push(`Installed CLI did not expose adapter ${options.adapterId} for this format.`);
  }

  if (cliComposition.status !== 'valid') {
    failures.push('Installed CLI composition did not report valid.');
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
    cliCompositionValid:
      cliComposition.status === 'valid' && cliPackageInventoryValid && cliAdapterInventoryValid,
    cliIdentityValid,
    cliPackageInventoryValid,
    cliAdapterInventoryValid,
    cliEnvelopeValid,
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
      cliComposition,
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
