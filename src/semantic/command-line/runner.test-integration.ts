// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  buildCodexEvaluationHostCommand,
  identifyCodexEvaluationHost,
  prepareCodexEvaluationHome,
  type ICodexEvaluationCommandPolicyEvidence,
} from '../../execution/host/index.ts';
import { readCompletedEvidenceRun } from '../../evidence/index.ts';
import { ensureDirectory, EXCLUDED_DIRECTORY_NAMES } from '../../filesystem/index.ts';
import { createPortableSkillArtifactDigest } from '../../portable/index.ts';
import { createSemanticCliIdentity } from '../../release/index.ts';

import {
  createSemanticCaseSuiteDigest,
  loadSemanticCases,
  type ISemanticCase,
} from '../cases/index.ts';
import {
  createSemanticCoverage,
  createSemanticCoverageDigest,
  SEMANTIC_COVERAGE_CLAIMS,
} from '../coverage/index.ts';
import {
  createSemanticActiveTrial,
  createSemanticTokenAdmissionController,
  getSemanticCandidatePaidTokenCount,
  getSemanticCheckpointPath,
  loadSemanticReusableTrials,
  readSemanticCheckpoint,
  writeSemanticCheckpoint,
  type ISemanticCandidateCheckpoint,
  type ISemanticRecordedTrial,
} from '../recording/index.ts';

import {
  completeSemanticDiagnostic,
  executeSemanticCases,
  runSemanticTrial,
  type ISemanticRunnerTrialExecutionOptions,
} from './runner.ts';
import { parseSemanticEvaluationArguments } from './parser.ts';

const SHA256 = 'a'.repeat(64);
const EMPTY_COMMAND_POLICY: ICodexEvaluationCommandPolicyEvidence = {
  commandOwnership: {
    canonical: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
    cli: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
    helper: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
    project: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
    source: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
  },
  completedCommandCount: 0,
  credentialExposure: { observedCount: 0, reasons: [], status: 'not-observed' },
  maximumCommandOutputByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  moldeaCommandCount: 0,
  moldeaEvents: [],
  moldeaLauncherMissReasons: [],
  moldeaOutputByteCount: 0,
  networkAccess: {
    indeterminateCount: 0,
    observedCount: 0,
    reasons: [],
    status: 'not-observed',
  },
  sensitiveAccess: {
    indeterminateCount: 0,
    observedCount: 0,
    reasons: [],
    status: 'not-observed',
  },
};
const temporaryRoots: string[] = [];

const createCase = (id: string): ISemanticCase => ({
  coverageClaimIds: [`${id}-claim`],
  expected: [{ criterion: 'Expected behavior.', label: 'expected' }],
  forbidden: [{ criterion: 'Forbidden behavior.', label: 'forbidden' }],
  id,
  input: {
    developerDirection: `Evaluate ${id}.`,
    repositoryEvidence: [],
  },
  operation: 'evaluate',
  resourceBudget: {
    activation: 'direct',
    maximumMoldeaCommands: 1,
    maximumMoldeaOutputBytes: 1_024,
    minimumMoldeaCommands: 0,
  },
  scenario: `Scenario for ${id}.`,
});

const createRecordedTrial = (options: {
  caseDefinition: ISemanticCase;
  confirmationIndex: 1 | 2 | 3 | null;
  passed: boolean;
}): ISemanticRecordedTrial => {
  const recorded: Omit<ISemanticRecordedTrial, 'cycles' | 'paidInvocations'> = {
    gitInvocationEvidence: {
      invocationCount: 0,
      hostInvocationCount: 0,
      repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
    },
    actorExecutionEvidence: [],
    actorResponse: 'Synthetic actor response.',
    developerDirection: options.caseDefinition.input.developerDirection,
    operationalRetries: {
      actorFailureCount: 0,
      judgeFailureCount: 0,
      lastFailure: null,
    },
    stageIdentities: { actorSha256: SHA256, judgeSha256: 'b'.repeat(64) },
    trial: {
      actorCommandPolicyEvidence: EMPTY_COMMAND_POLICY,
      actorResourceEvidence: {
        commandCount: 0,
        maximumInvocationByteCount: 0,
        modelVisibleToolOutputByteCount: 0,
        operations: [],
        stdoutByteCount: 0,
      },
      actorHost: {
        developerInstructionsSha256: SHA256,
        model: 'synthetic-model',
        name: 'synthetic-host',
        reasoningEffort: 'high',
        role: 'actor',
        version: '1.0.0',
      },
      actorUsage: { cachedInputTokens: 0, inputTokens: 1, outputTokens: 1 },
      confirmationEligible: options.confirmationIndex === null && !options.passed,
      confirmationIndex: options.confirmationIndex,
      dimensions: {
        commandPolicy: true,
        mountIntegrity: true,
        operational: true,
        repositoryControl: true,
        resource: true,
        semantic: options.passed,
      },
      evaluatedAt: '2026-09-20T00:00:00.000Z',
      executionOrigin: 'executed',
      failureClassifications: options.passed ? [] : ['semantic'],
      forbidden: [],
      judgeCommandPolicyEvidence: EMPTY_COMMAND_POLICY,
      judgeHost: {
        developerInstructionsSha256: SHA256,
        model: 'synthetic-model',
        name: 'synthetic-host',
        reasoningEffort: 'high',
        role: 'judge',
        version: '1.0.0',
      },
      judgeUsage: { cachedInputTokens: 0, inputTokens: 1, outputTokens: 1 },
      kind: options.confirmationIndex === null ? 'initial' : 'confirmation',
      observed: options.passed ? ['expected'] : [],
      passed: options.passed,
      rationale: options.passed ? 'Passed.' : 'Failed.',
      stageReuse: null,
    },
    workspaceChanges: { created: [], deleted: [], modified: [] },
  };
  const cycles = [
    {
      actorExecutionEvidence: recorded.actorExecutionEvidence,
      actorResourceEvidence: recorded.trial.actorResourceEvidence,
      commandPolicyEvidence: recorded.trial.actorCommandPolicyEvidence,
      gitInvocationEvidence: recorded.gitInvocationEvidence,
      response: recorded.actorResponse,
      usage: recorded.trial.actorUsage,
      developerRequest: recorded.developerDirection,
      requestIndex: 0,
      isMountIntegrityPassing: recorded.trial.dimensions.mountIntegrity,
      isRepositoryControlPassing: recorded.trial.dimensions.repositoryControl,
      workspaceChanges: recorded.workspaceChanges,
    },
  ];
  const paidInvocations = [
    { stage: 'actor' as const, usage: recorded.trial.actorUsage },
    { stage: 'judge' as const, usage: recorded.trial.judgeUsage },
  ];
  return {
    ...recorded,
    cycles,
    paidInvocations,
    trial: { ...recorded.trial, cycles, paidInvocations },
  };
};

const createCandidateCheckpoint = (cases: ISemanticCase[]): ISemanticCandidateCheckpoint => ({
  actorHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'actor',
    version: '1.0.0',
  },
  artifactDigest: SHA256,
  attemptId: 'semantic-attempt',
  caseCheckpoints: {},
  cases: [],
  caseSuiteDigest: SHA256,
  cli: {
    integrity: 'sha512-synthetic',
    jsonSchemaVersion: 5,
    name: '@moldea.ai/cli',
    packageLockSha256: SHA256,
    version: '9.0.0',
  },
  coverageDigest: SHA256,
  createdAt: '2026-09-20T00:00:00.000Z',
  judgeHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'judge',
    version: '1.0.0',
  },
  mode: 'official',
  schemaVersion: 3,
  selectedCaseIds: cases.map(({ id }) => id),
  updatedAt: '2026-09-20T00:00:00.000Z',
});

const createDeferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolve = (): void => {};
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

/** Prepares the real recording entrypoint with terminal synthetic evidence and non-model hosts. */
const prepareCompletedRecording = async (
  actorVersionChanged: boolean,
  judgeVersionChanged: boolean,
) => {
  const sourceRoot = path.resolve(import.meta.dirname, '../../..');
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-resume-'));
  temporaryRoots.push(root);
  const sourceDirectory = path.join(sourceRoot, 'src');
  await cp(sourceDirectory, path.join(root, 'src'), {
    recursive: true,
    filter: (source) => {
      const parts = path.relative(sourceDirectory, source).split(path.sep);
      if (parts.some((part) => EXCLUDED_DIRECTORY_NAMES.has(part))) return false;
      if (/\.test-(?:unit|integration|e2e|bench)\./u.test(path.basename(source))) return false;
      return !(
        parts[0] === 'semantic' &&
        parts[1] === 'cases' &&
        parts[2] !== undefined &&
        !parts[2].endsWith('.ts')
      );
    },
  });
  const portableRoot = path.join(sourceRoot, 'moldea');
  await cp(portableRoot, path.join(root, 'moldea'), {
    recursive: true,
    filter: (source) =>
      !path
        .relative(portableRoot, source)
        .split(path.sep)
        .some((part) => EXCLUDED_DIRECTORY_NAMES.has(part)),
  });
  for (const name of ['package.json', 'package-lock.json']) {
    await cp(path.join(sourceRoot, name), path.join(root, name));
  }
  await symlink(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  await cp(path.join(sourceRoot, 'dist/runtime'), path.join(root, 'dist/runtime'), {
    recursive: true,
  });
  const definition = createCase('checkpoint-host');
  definition.coverageClaimIds = SEMANTIC_COVERAGE_CLAIMS.map(({ id }) => id);
  const caseDirectory = path.join(root, 'src/semantic/cases', definition.id);
  await mkdir(caseDirectory);
  await writeFile(
    path.join(caseDirectory, 'case.ts'),
    `export const semanticCase = ${JSON.stringify(definition)};\n`,
  );
  const modelCallsPath = path.join(root, 'model-calls.txt');
  const createCommand = async (role: 'actor' | 'judge') => {
    const directory = path.join(root, role);
    await mkdir(directory);
    const executable = path.join(directory, 'codex');
    await writeFile(
      executable,
      `#!${process.execPath}\nimport { appendFileSync } from 'node:fs';\nif (process.argv[2] === '--version') process.stdout.write('codex 2.0.0\\n');\nelse { appendFileSync(${JSON.stringify(modelCallsPath)}, '${role}\\n'); process.exitCode = 97; }\n`,
    );
    await chmod(executable, 0o755);
    return [
      executable,
      'exec',
      '--ignore-user-config',
      '--ignore-rules',
      '--ephemeral',
      '--skip-git-repo-check',
      '--dangerously-bypass-approvals-and-sandbox',
      '-c',
      'shell_environment_policy.inherit=none',
      '-',
    ];
  };
  const actorCommand = await createCommand('actor');
  const judgeCommand = await createCommand('judge');
  const checkpoint = createCandidateCheckpoint([definition]);
  // reuse discovery ignores this reserved filename, allowing an export-only storage failure
  checkpoint.attemptId = 'latest';
  checkpoint.actorHost = identifyCodexEvaluationHost(
    buildCodexEvaluationHostCommand(actorCommand, 'actor'),
    'actor',
  );
  checkpoint.judgeHost = identifyCodexEvaluationHost(
    buildCodexEvaluationHostCommand(judgeCommand, 'judge'),
    'judge',
  );
  if (actorVersionChanged) checkpoint.actorHost.version = 'codex 1.0.0';
  if (judgeVersionChanged) checkpoint.judgeHost.version = 'codex 1.0.0';
  checkpoint.artifactDigest = createPortableSkillArtifactDigest(root);
  checkpoint.cli = createSemanticCliIdentity(root);
  checkpoint.caseSuiteDigest = createSemanticCaseSuiteDigest([definition]);
  checkpoint.coverageDigest = createSemanticCoverageDigest(createSemanticCoverage([definition]));
  const recordedTrial = createRecordedTrial({
    caseDefinition: definition,
    confirmationIndex: null,
    passed: true,
  });
  recordedTrial.trial.actorHost = { ...checkpoint.actorHost, role: 'actor' };
  recordedTrial.trial.judgeHost = { ...checkpoint.judgeHost, role: 'judge' };
  checkpoint.cases = [
    {
      id: definition.id,
      status: 'passed',
      confirmationStatus: 'not-required',
      trials: [recordedTrial],
    },
  ];
  await writeSemanticCheckpoint(root, checkpoint);
  const run = (arguments_: string[] = ['--record', '--workers', '1']) =>
    spawnSync(
      process.execPath,
      [path.join(root, 'src/semantic/command-line/runner.ts'), ...arguments_],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 30_000,
        maxBuffer: 1_048_576,
        env: {
          ...process.env,
          CODEX_HOME: path.join(root, 'empty-home'),
          MOLDEA_EVAL_ACTOR_COMMAND_JSON: JSON.stringify(actorCommand),
          MOLDEA_EVAL_JUDGE_COMMAND_JSON: JSON.stringify(judgeCommand),
        },
      },
    );
  return { root, checkpoint, definition, recordedTrial, modelCallsPath, run };
};

test('passes the diagnostic CLI limit to paid-stage admission before calling a host', async () => {
  const fixture = await prepareCompletedRecording(false, false);
  fixture.checkpoint.mode = 'diagnostic';
  fixture.checkpoint.cases = [];
  await writeSemanticCheckpoint(fixture.root, fixture.checkpoint);
  const result = fixture.run(['--diagnose-batch', '--all', '--workers', '1', '--token-limit', '1']);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('1 maximum.');
  expect(existsSync(fixture.modelCallsPath)).toBe(false);
  expect((await readSemanticCheckpoint(fixture.root))?.cases).toStrictEqual([]);
});

test('resumes diagnostic admission with existing charges counted exactly once', async () => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-admission-resume-'));
  temporaryRoots.push(repositoryRoot);
  const completed = createCase('completed-case');
  const pending = createCase('pending-case');
  const next = createCase('next-case');
  const checkpoint = createCandidateCheckpoint([completed, pending, next]);
  checkpoint.mode = 'diagnostic';
  checkpoint.cases = [
    {
      id: completed.id,
      status: 'passed',
      confirmationStatus: 'not-required',
      trials: [
        createRecordedTrial({ caseDefinition: completed, confirmationIndex: null, passed: true }),
      ],
    },
  ];
  const consumed = getSemanticCandidatePaidTokenCount(checkpoint.cases, {});
  expect(consumed).toBe(4);
  const reservation = 2_097_152;
  const arguments_ = parseSemanticEvaluationArguments([
    '--diagnose-batch',
    '--all',
    '--token-limit',
    String(consumed + reservation),
  ]);
  let callCount = 0;
  await executeSemanticCases({
    cases: [pending],
    checkpoint,
    repositoryRoot,
    workerCount: 1,
    tokenLimit: arguments_.tokenLimit ?? 0,
    executeTrial: async ({ tokenController, caseDefinition, confirmationIndex }) => {
      tokenController.reserve('resumed-actor');
      callCount++;
      tokenController.release('resumed-actor');
      return createRecordedTrial({ caseDefinition, confirmationIndex, passed: true });
    },
  });
  expect(callCount).toBe(1);
  expect(getSemanticCandidatePaidTokenCount(checkpoint.cases, {})).toBe(8);
  await expect(
    executeSemanticCases({
      cases: [next],
      checkpoint,
      repositoryRoot,
      workerCount: 1,
      tokenLimit: arguments_.tokenLimit ?? 0,
      executeTrial: async ({ tokenController }) => {
        tokenController.reserve('next-actor');
        throw new Error('Admission should stop before this synthetic call.');
      },
    }),
  ).rejects.toThrow('8 tokens consumed');
});

test.each([
  [true, false],
  [false, true],
  [true, true],
])(
  'finalizes a completed recording across version drift (actor %s, judge %s)',
  async (actorChanged, judgeChanged) => {
    const fixture = await prepareCompletedRecording(actorChanged, judgeChanged);
    const runsDirectory = path.join(fixture.root, '.evidence/runs/semantic');
    await mkdir(runsDirectory, { recursive: true });
    const blockedStorage = path.join(runsDirectory, 'latest.json');
    await mkdir(blockedStorage);
    const blocked = fixture.run();
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toMatch(/EEXIST|EISDIR/u);
    expect(await readSemanticCheckpoint(fixture.root)).toStrictEqual(fixture.checkpoint);
    expect(existsSync(fixture.modelCallsPath)).toBe(false);
    await rm(blockedStorage, { recursive: true });
    const completed = fixture.run();
    expect(completed.status, completed.stderr).toBe(0);
    const bundle = await readCompletedEvidenceRun(
      fixture.root,
      'semantic',
      fixture.checkpoint.attemptId,
    );
    expect(bundle.run.attemptId).toBe(fixture.checkpoint.attemptId);
    expect(bundle.run.status).toBe('passed');
    const evidence = bundle.artifacts.files.find(({ path: artifactPath }) =>
      artifactPath.endsWith('/evidence.json'),
    );
    const blob = bundle.artifacts.blobs.find(({ sha256 }) => sha256 === evidence?.sha256);
    expect(blob).toBeDefined();
    expect(JSON.parse(Buffer.from(blob!.contentBase64, 'base64').toString('utf8'))).toStrictEqual({
      cases: fixture.checkpoint.cases,
      schemaVersion: 15,
    });
    expect(getSemanticCandidatePaidTokenCount(fixture.checkpoint.cases, {})).toBe(4);
    expect(existsSync(getSemanticCheckpointPath(fixture.root))).toBe(false);
    expect(existsSync(fixture.modelCallsPath)).toBe(false);
  },
);

test.each([
  ['actorHost', 'model', 'other-model'],
  ['judgeHost', 'model', 'other-model'],
  ['actorHost', 'reasoningEffort', 'low'],
  ['judgeHost', 'reasoningEffort', 'low'],
  ['actorHost', 'developerInstructionsSha256', 'b'.repeat(64)],
  ['judgeHost', 'developerInstructionsSha256', 'b'.repeat(64)],
  ['actorHost', 'name', 'other-host'],
  ['judgeHost', 'name', 'other-host'],
] as const)(
  'rejects a checkpoint %s.%s mismatch without a model call',
  async (host, field, mismatch) => {
    const fixture = await prepareCompletedRecording(false, false);
    fixture.checkpoint[host][field] = mismatch;
    await writeSemanticCheckpoint(fixture.root, fixture.checkpoint);
    const result = fixture.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('The semantic checkpoint does not match this exact run.');
    expect(await readSemanticCheckpoint(fixture.root)).toStrictEqual(fixture.checkpoint);
    expect(existsSync(fixture.modelCallsPath)).toBe(false);
  },
);

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

test.each(['artifactDigest', 'caseSuiteDigest', 'coverageDigest'] as const)(
  'rejects a checkpoint %s mismatch without a model call',
  async (field) => {
    const fixture = await prepareCompletedRecording(true, true);
    fixture.checkpoint[field] = 'b'.repeat(64);
    await writeSemanticCheckpoint(fixture.root, fixture.checkpoint);
    const result = fixture.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('The semantic checkpoint does not match this exact run.');
    expect(await readSemanticCheckpoint(fixture.root)).toStrictEqual(fixture.checkpoint);
    expect(existsSync(fixture.modelCallsPath)).toBe(false);
  },
);

test('rejects checkpoint role and CLI drift without calling a host', async () => {
  const fixture = await prepareCompletedRecording(true, true);
  fixture.checkpoint.actorHost.role = 'judge';
  await writeFile(getSemanticCheckpointPath(fixture.root), JSON.stringify(fixture.checkpoint));
  const wrongRole = fixture.run();
  expect(wrongRole.status).toBe(1);
  expect(wrongRole.stderr).toContain('actorHost');
  expect(existsSync(fixture.modelCallsPath)).toBe(false);
  fixture.checkpoint.actorHost.role = 'actor';
  fixture.checkpoint.cli.version = '99.0.0';
  await writeSemanticCheckpoint(fixture.root, fixture.checkpoint);
  const wrongCli = fixture.run();
  expect(wrongCli.status).toBe(1);
  expect(wrongCli.stderr).toContain('The semantic checkpoint does not match this exact run.');
  expect(existsSync(fixture.modelCallsPath)).toBe(false);
});

test('an over-ceiling actor cycle records a resource failure and confirmations without stopping later cases', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-token-ceiling-'));
  temporaryRoots.push(root);
  const bin = path.join(root, 'bin');
  const sourceHome = path.join(root, 'source-home');
  await Promise.all([bin, sourceHome].map((directory) => mkdir(directory)));
  await writeFile(
    path.join(bin, 'codex'),
    `#!/opt/node
const fs = require('node:fs');
const prompt = fs.readFileSync(0, 'utf8');
const isJudge = prompt.startsWith('Assess whether');
const isOverBudget = !isJudge && prompt.includes('over-budget');
const text = isJudge ? JSON.stringify({expected:{expected:true},forbidden:{forbidden:false},rationale:'Completed.'}) : 'Completed.';
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}));
console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:isOverBudget ? 2000000 : 100,cached_input_tokens:isOverBudget ? 1900000 : 50,output_tokens:isOverBudget ? 97153 : 20}}));
`,
  );
  await chmod(path.join(bin, 'codex'), 0o755);
  await writeFile(path.join(bin, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n');
  await chmod(path.join(bin, 'codex-code-mode-host'), 0o755);
  vi.stubEnv('CODEX_HOME', sourceHome);
  vi.stubEnv('PATH', `${bin}${path.delimiter}${process.env['PATH'] ?? ''}`);
  try {
    const cases = ['over-budget', 'later-case'].map((id) => ({
      ...createCase(id),
      setup: async ({ sandboxHome }: { sandboxHome: string }) => {
        await prepareCodexEvaluationHome(sandboxHome);
        return {};
      },
    }));
    const checkpoint = createCandidateCheckpoint(cases);
    await writeSemanticCheckpoint(root, checkpoint);
    const base = [
      'codex',
      'exec',
      '--ignore-user-config',
      '--ignore-rules',
      '--ephemeral',
      '--skip-git-repo-check',
      '--dangerously-bypass-approvals-and-sandbox',
      '-c',
      'shell_environment_policy.inherit=none',
      '--json',
      '-',
    ];
    const tokenController = createSemanticTokenAdmissionController({
      getConsumedTokenCount: () =>
        getSemanticCandidatePaidTokenCount(checkpoint.cases, checkpoint.caseCheckpoints),
    });
    const results = await executeSemanticCases({
      cases,
      checkpoint,
      repositoryRoot: root,
      workerCount: 1,
      executeTrial: async (options) =>
        (
          await runSemanticTrial({
            ...options,
            actorCommand: buildCodexEvaluationHostCommand(base, 'actor'),
            judgeCommand: buildCodexEvaluationHostCommand(base, 'judge'),
            actorHost: checkpoint.actorHost,
            judgeHost: checkpoint.judgeHost,
            artifactDigest: SHA256,
            cli: checkpoint.cli,
            isOperationalResumeRequested: false,
            reusableTrials: [],
            tokenController,
          })
        ).recordedTrial,
    });
    expect(results.map(({ id, status }) => ({ id, status }))).toStrictEqual([
      { id: 'over-budget', status: 'failed' },
      { id: 'later-case', status: 'passed' },
    ]);
    const failedTrials = results[0]!.trials;
    expect(failedTrials).toHaveLength(3);
    for (const recorded of failedTrials) {
      expect(recorded.trial.failureClassifications).toStrictEqual(['resource']);
      expect(recorded.trial.confirmationEligible).toBe(true);
      expect(recorded.trial.actorUsage).toStrictEqual({
        inputTokens: 2_000_000,
        cachedInputTokens: 1_900_000,
        outputTokens: 97_153,
      });
      expect(recorded.operationalRetries).toStrictEqual({
        actorFailureCount: 0,
        judgeFailureCount: 0,
        lastFailure: null,
      });
    }
    expect(getSemanticCandidatePaidTokenCount(checkpoint.cases, checkpoint.caseCheckpoints)).toBe(
      3 * (2_097_153 + 120) + 240,
    );
    expect(await readSemanticCheckpoint(root)).toStrictEqual(checkpoint);
  } finally {
    vi.unstubAllEnvs();
  }
}, 30_000);

describe('semantic runner case orchestration', () => {
  test.each(['passed', 'recovered', 'failed'] as const)(
    'archives a completed %s diagnostic with all usage and confirmations before cleanup',
    async (outcome) => {
      const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
      temporaryRoots.push(repositoryRoot);
      const cases = [createCase('case-one')];
      const checkpoint = createCandidateCheckpoint(cases);
      checkpoint.attemptId = `sem-${outcome}`;
      checkpoint.mode = 'diagnostic';
      await writeSemanticCheckpoint(repositoryRoot, checkpoint);
      const results = await executeSemanticCases({
        cases,
        checkpoint,
        executeTrial: async ({ caseDefinition, confirmationIndex }) =>
          createRecordedTrial({
            caseDefinition,
            confirmationIndex,
            passed: outcome === 'passed' || (outcome === 'recovered' && confirmationIndex !== null),
          }),
        repositoryRoot,
        workerCount: 1,
      });
      expect(results[0]?.status).toBe(outcome);
      expect(results[0]?.trials).toHaveLength(outcome === 'passed' ? 1 : 3);
      const archivePath = await completeSemanticDiagnostic(repositoryRoot, checkpoint);
      expect(JSON.parse(await readFile(archivePath, 'utf8'))).toStrictEqual(checkpoint);
      expect(checkpoint.cases).toStrictEqual(results);
      expect(existsSync(getSemanticCheckpointPath(repositoryRoot))).toBe(false);
      expect(await loadSemanticReusableTrials(repositoryRoot)).toStrictEqual([]);

      // a cleanup interruption can be finalized again without replaying any paid stage
      await writeSemanticCheckpoint(repositoryRoot, checkpoint);
      const resumed = await executeSemanticCases({
        cases: [],
        checkpoint,
        executeTrial: async () => {
          throw new Error('A completed diagnostic must never call the model.');
        },
        repositoryRoot,
        workerCount: 1,
      });
      expect(resumed).toStrictEqual(results);
      expect(await completeSemanticDiagnostic(repositoryRoot, checkpoint)).toBe(archivePath);
      expect(JSON.parse(await readFile(archivePath, 'utf8'))).toStrictEqual(checkpoint);
    },
  );

  test('preserves the completed active checkpoint when diagnostic archival fails', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const caseDefinition = createCase('case-one');
    const checkpoint = createCandidateCheckpoint([caseDefinition]);
    checkpoint.attemptId = 'sem-write-failure';
    checkpoint.mode = 'diagnostic';
    checkpoint.cases = [
      {
        confirmationStatus: 'not-required',
        id: caseDefinition.id,
        status: 'passed',
        trials: [createRecordedTrial({ caseDefinition, confirmationIndex: null, passed: true })],
      },
    ];
    await writeSemanticCheckpoint(repositoryRoot, checkpoint);
    const blockedDirectory = path.join(repositoryRoot, '.evidence', 'semantic', 'diagnostics');
    await writeFile(blockedDirectory, 'existing non-directory');

    await expect(completeSemanticDiagnostic(repositoryRoot, checkpoint)).rejects.toThrow();
    expect(await readSemanticCheckpoint(repositoryRoot)).toStrictEqual(checkpoint);
    await rm(blockedDirectory);
    await ensureDirectory(blockedDirectory);
    const archivePath = await completeSemanticDiagnostic(repositoryRoot, checkpoint);
    expect(JSON.parse(await readFile(archivePath, 'utf8'))).toStrictEqual(checkpoint);
    expect(existsSync(getSemanticCheckpointPath(repositoryRoot))).toBe(false);
  });

  test('preflight constructs prompts for every discovered case before model execution', async () => {
    const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
    const cases = await loadSemanticCases(path.join(repositoryRoot, 'src', 'semantic', 'cases'));
    const output = execFileSync(
      process.execPath,
      [path.join(repositoryRoot, 'src', 'semantic', 'command-line', 'runner.ts'), '--preflight'],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );

    expect(JSON.parse(output)).toMatchObject({ caseCount: cases.length });
  });

  test('round trips interrupted confirmation progress and resumes without replay', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const cases = [createCase('case-one'), createCase('case-two')];
    const checkpoint = createCandidateCheckpoint(cases);
    const executionLog: string[] = [];
    let shouldInterrupt = true;
    await writeSemanticCheckpoint(repositoryRoot, checkpoint);

    const executeTrial = async (
      options: ISemanticRunnerTrialExecutionOptions,
    ): Promise<ISemanticRecordedTrial> => {
      const trialId = `${options.caseDefinition.id}:${String(options.confirmationIndex)}`;
      executionLog.push(trialId);
      const activeTrial =
        options.activeTrial ??
        createSemanticActiveTrial(options.confirmationIndex, '2026-09-20T00:01:00.000Z');
      await options.persistActiveTrial(activeTrial);
      if (
        shouldInterrupt &&
        options.caseDefinition.id === 'case-two' &&
        options.confirmationIndex === 2
      ) {
        throw new Error('Synthetic interruption.');
      }
      return createRecordedTrial({
        caseDefinition: options.caseDefinition,
        confirmationIndex: options.confirmationIndex,
        passed: options.confirmationIndex !== null,
      });
    };

    await expect(
      executeSemanticCases({
        cases,
        checkpoint,
        executeTrial,
        repositoryRoot,
        workerCount: 1,
      }),
    ).rejects.toThrow('Synthetic interruption.');

    const interruptedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    expect(interruptedCheckpoint.cases.map(({ id }) => id)).toStrictEqual(['case-one']);
    expect(interruptedCheckpoint.caseCheckpoints['case-two']?.trials).toHaveLength(2);
    expect(
      interruptedCheckpoint.caseCheckpoints['case-two']?.trials.map(
        ({ trial }) => trial.confirmationIndex,
      ),
    ).toStrictEqual([null, 1]);
    expect(interruptedCheckpoint.caseCheckpoints['case-two']?.activeTrial?.confirmationIndex).toBe(
      2,
    );
    expect(interruptedCheckpoint.cases[0]?.trials[0]?.trial.confirmationIndex).toBeNull();
    expect(
      interruptedCheckpoint.caseCheckpoints['case-two']?.trials[0]?.trial.confirmationIndex,
    ).toBeNull();

    executionLog.length = 0;
    shouldInterrupt = false;
    const resumedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    const results = await executeSemanticCases({
      cases: cases.slice(resumedCheckpoint.cases.length),
      checkpoint: resumedCheckpoint,
      executeTrial,
      repositoryRoot,
      workerCount: 1,
    });

    expect(executionLog).toStrictEqual(['case-two:2']);
    expect(results.map(({ id, status }) => ({ id, status }))).toStrictEqual([
      { id: 'case-one', status: 'recovered' },
      { id: 'case-two', status: 'recovered' },
    ]);
    const completedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    expect(completedCheckpoint.caseCheckpoints).toStrictEqual({});
    expect(completedCheckpoint.cases.map(({ id }) => id)).toStrictEqual(['case-one', 'case-two']);
  });

  test('runs targeted cases without creating checkpoint state', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const caseDefinition = createCase('case-one');

    const results = await executeSemanticCases({
      cases: [caseDefinition],
      checkpoint: null,
      executeTrial: async ({ confirmationIndex }) =>
        createRecordedTrial({ caseDefinition, confirmationIndex, passed: true }),
      repositoryRoot,
      workerCount: 1,
    });

    expect(results).toMatchObject([
      { confirmationStatus: 'not-required', id: 'case-one', status: 'passed' },
    ]);
    expect(existsSync(getSemanticCheckpointPath(repositoryRoot))).toBe(false);
  });

  test('commits concurrently resolved cases in selected order', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const cases = [createCase('case-one'), createCase('case-two')];
    const checkpoint = createCandidateCheckpoint(cases);
    const firstCaseConfirmation = createDeferred();
    const executionLog: string[] = [];
    await writeSemanticCheckpoint(repositoryRoot, checkpoint);

    const execution = executeSemanticCases({
      cases,
      checkpoint,
      executeTrial: async ({ caseDefinition, confirmationIndex }) => {
        const trialId = `${caseDefinition.id}:${String(confirmationIndex)}`;
        executionLog.push(trialId);
        if (caseDefinition.id === 'case-one' && confirmationIndex === 1) {
          await firstCaseConfirmation.promise;
        }
        return createRecordedTrial({
          caseDefinition,
          confirmationIndex,
          passed: confirmationIndex !== null,
        });
      },
      repositoryRoot,
      workerCount: 2,
    });

    await expect.poll(() => executionLog.includes('case-two:2')).toBe(true);
    expect(executionLog).not.toContain('case-one:2');
    firstCaseConfirmation.resolve();

    await expect(execution).resolves.toMatchObject([
      { id: 'case-one', status: 'recovered' },
      { id: 'case-two', status: 'recovered' },
    ]);
    const completedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    expect(completedCheckpoint.cases.map(({ id }) => id)).toStrictEqual(['case-one', 'case-two']);
  });
});

test.each([false, true])(
  'retains interrupted cycle charges and judge policy before retry; prior violation=%s',
  async (hasPriorJudgeViolation) => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-cycle-recovery-'));
    temporaryRoots.push(root);
    const bin = path.join(root, 'bin');
    const sourceHome = path.join(root, 'source-home');
    await Promise.all([bin, sourceHome].map((directory) => mkdir(directory)));
    const writeHost = async (shouldFail: boolean) => {
      await writeFile(
        path.join(bin, 'codex'),
        `#!/opt/node
const fs = require('node:fs');
const assert = require('node:assert/strict');
const prompt = fs.readFileSync(0, 'utf8');
let response;
let usageMultiplier = 1;
if (prompt.startsWith('Assess whether')) {
  const counter = '/home/evaluator/.codex/judge-counter';
  const count = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;
  fs.writeFileSync(counter, String(count + 1));
  if (${hasPriorJudgeViolation} && count === 0) console.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:'curl https://example.com',aggregated_output:'',exit_code:1,status:'failed'}}));
  response = count === 0 ? 'malformed judge' : JSON.stringify({expected:{expected:true},forbidden:{forbidden:false},rationale:'Both requests completed.'});
} else {
  const continuation = prompt === 'continue';
  usageMultiplier = continuation ? 2 : 1;
  assert.equal(fs.existsSync('/mnt/progress.txt'), continuation);
  if (${shouldFail} && continuation) process.exit(1);
  fs.writeFileSync('/mnt/progress.txt', continuation ? 'done' : 'partial');
  console.log(JSON.stringify({type:'thread.started',thread_id:'12345678-abcd-1234-abcd-123456789012'}));
  response = continuation ? 'Completed.' : 'First request complete.';
}
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:response}}));
console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100*usageMultiplier,cached_input_tokens:50*usageMultiplier,output_tokens:20*usageMultiplier}}));
`,
      );
      await chmod(path.join(bin, 'codex'), 0o755);
    };
    await writeHost(true);
    await writeFile(path.join(bin, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n');
    await chmod(path.join(bin, 'codex-code-mode-host'), 0o755);
    vi.stubEnv('CODEX_HOME', sourceHome);
    vi.stubEnv('PATH', `${bin}${path.delimiter}${process.env['PATH'] ?? ''}`);
    try {
      const definition = {
        ...createCase('retained-session'),
        input: {
          developerDirection: 'First request',
          followUpDeveloperRequests: ['continue'],
          repositoryEvidence: [],
        },
        setup: async ({ sandboxHome }: { sandboxHome: string }) => {
          await prepareCodexEvaluationHome(sandboxHome);
          return {};
        },
      };
      const checkpoint = createCandidateCheckpoint([definition]);
      checkpoint.caseCheckpoints[definition.id] = {
        activeTrial: null,
        caseDefinitionDigest: SHA256,
        caseId: definition.id,
        completedCase: null,
        trials: [],
      };
      const command = buildCodexEvaluationHostCommand(
        [
          'codex',
          'exec',
          '--ignore-user-config',
          '--ignore-rules',
          '--ephemeral',
          '--skip-git-repo-check',
          '--dangerously-bypass-approvals-and-sandbox',
          '-c',
          'shell_environment_policy.inherit=none',
          '--json',
          '-',
        ],
        'actor',
      );
      const judgeCommand = buildCodexEvaluationHostCommand(
        [
          'codex',
          'exec',
          '--ignore-user-config',
          '--ignore-rules',
          '--ephemeral',
          '--skip-git-repo-check',
          '--dangerously-bypass-approvals-and-sandbox',
          '-c',
          'shell_environment_policy.inherit=none',
          '--json',
          '-',
        ],
        'judge',
      );
      const tokenController = createSemanticTokenAdmissionController({
        getConsumedTokenCount: () =>
          getSemanticCandidatePaidTokenCount([], checkpoint.caseCheckpoints),
      });
      const options = {
        activeTrial: null,
        actorCommand: command,
        actorHost: checkpoint.actorHost,
        artifactDigest: SHA256,
        caseDefinition: definition,
        cli: checkpoint.cli,
        confirmationIndex: null,
        isOperationalResumeRequested: false,
        judgeCommand,
        judgeHost: checkpoint.judgeHost,
        persistActiveTrial: async (
          activeTrial: NonNullable<(typeof checkpoint.caseCheckpoints)[string]['activeTrial']>,
        ) => {
          checkpoint.caseCheckpoints[definition.id]!.activeTrial = activeTrial;
          await writeSemanticCheckpoint(root, checkpoint);
        },
        reusableTrials: [],
        tokenController,
      };
      await expect(runSemanticTrial(options)).rejects.toThrow();
      const stopped = (await readSemanticCheckpoint(root)).caseCheckpoints[definition.id]!
        .activeTrial!;
      expect(stopped.phase).toBe('actor-pending');
      expect(stopped.operationalRetries.actorFailureCount).toBe(2);
      expect(stopped.paidInvocations.map(({ usage }) => usage)).toStrictEqual([
        { inputTokens: 100, cachedInputTokens: 50, outputTokens: 20 },
        null,
        { inputTokens: 100, cachedInputTokens: 50, outputTokens: 20 },
        null,
      ]);
      expect(stopped.paidInvocations.filter(({ cycle }) => cycle !== undefined)).toHaveLength(2);
      expect(getSemanticCandidatePaidTokenCount([], checkpoint.caseCheckpoints)).toBe(
        2 * 2_097_152 + 240,
      );
      await writeHost(false);
      const completed = await runSemanticTrial({
        ...options,
        activeTrial: stopped,
        isOperationalResumeRequested: true,
      });
      expect(
        completed.recordedTrial.cycles.map(({ developerRequest }) => developerRequest),
      ).toStrictEqual(['First request', 'continue']);
      expect(completed.publicTrial.passed).toBe(!hasPriorJudgeViolation);
      expect(completed.publicTrial.dimensions.commandPolicy).toBe(!hasPriorJudgeViolation);
      expect(completed.recordedTrial.operationalRetries).toMatchObject({
        actorFailureCount: 2,
        judgeFailureCount: 1,
      });
      expect(completed.recordedTrial.paidInvocations).toHaveLength(8);
      expect(
        completed.recordedTrial.paidInvocations.filter(
          ({ stage, usage }) => stage === 'judge' && usage !== null,
        ),
      ).toHaveLength(2);
      expect(getSemanticCandidatePaidTokenCount([], checkpoint.caseCheckpoints)).toBe(
        2 * 2_097_152 + 720,
      );
      if (!hasPriorJudgeViolation) {
        await writeFile(
          path.join(bin, 'codex'),
          '#!/opt/node\nthrow new Error("Unexpected paid execution");\n',
        );
        const reused = await runSemanticTrial({
          ...options,
          reusableTrials: [
            {
              caseId: definition.id,
              recordedTrial: completed.recordedTrial,
              sourceCaseStatus: 'passed',
              sourceAttemptId: 'sem-source',
              sourceEvidenceSha256: SHA256,
            },
          ],
        });
        expect(reused.publicTrial.executionOrigin).toBe('reused');
        expect(reused.recordedTrial.cycles).toStrictEqual(completed.recordedTrial.cycles);
        expect(getSemanticCandidatePaidTokenCount([], checkpoint.caseCheckpoints)).toBe(0);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  },
  30_000,
);

test.each([
  'context-recovery-install-blocked',
  'context-recovery-install-only',
  'context-recovery-paused',
  'context-recovery-topic-change',
])('%s retains the exact session, private request order and cycle deltas', async (caseId) => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-recovery-session-'));
  temporaryRoots.push(root);
  try {
    const cases = await loadSemanticCases(path.resolve(import.meta.dirname, '../cases'));
    const definition = cases.find(({ id }) => id === caseId);
    if (!definition) throw new Error('Missing context recovery case');
    const requests = [
      definition.input.developerDirection,
      ...(definition.input.followUpDeveloperRequests ?? []),
    ];
    const bin = path.join(root, 'bin');
    const sourceHome = path.join(root, 'source-home');
    await Promise.all([bin, sourceHome].map((directory) => mkdir(directory)));
    const verdict = {
      expected: Object.fromEntries(definition.expected.map(({ label }) => [label, true])),
      forbidden: Object.fromEntries(definition.forbidden.map(({ label }) => [label, false])),
      rationale: 'Synthetic verdict exercises retained-session plumbing only.',
    };
    await writeFile(
      path.join(bin, 'codex'),
      `#!/opt/node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const prompt = fs.readFileSync(0, 'utf8');
const requests = ${JSON.stringify(requests)};
let response;
if (prompt.startsWith('Assess whether')) {
  response = ${JSON.stringify(JSON.stringify(verdict))};
} else {
  const counter = '/home/evaluator/.codex/recovery-counter';
  const index = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;
  assert.ok(index < 2);
  assert.equal(prompt, requests[index]);
  const resumeIndex = process.argv.indexOf('resume');
  assert.equal(resumeIndex >= 0, index === 1);
  if (index === 1) assert.equal(process.argv[resumeIndex + 1], '12345678-abcd-1234-abcd-123456789012');
  assert.equal(fs.existsSync('/mnt/node_modules/@moldea.ai/cli/package.json'), false);
  assert.ok(fs.readFileSync('/mnt/moldea/project.md', 'utf8').includes('within 30 days'));
  assert.equal(fs.readFileSync('/mnt/reports/status.txt', 'utf8'), 'pending\\n');
  if (index === 1 && ${caseId === 'context-recovery-topic-change'}) fs.writeFileSync('/mnt/reports/status.txt', 'complete\\n');
  fs.writeFileSync(counter, String(index + 1));
  console.log(JSON.stringify({type:'thread.started',thread_id:'12345678-abcd-1234-abcd-123456789012'}));
  response = index === 0 ? 'Local tooling is unavailable; the context correction remains blocked.' : 'The follow-up restriction is preserved. No installation or canonical update occurred.';
}
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:response}}));
console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:0,output_tokens:20}}));
`,
      'utf8',
    );
    await writeFile(path.join(bin, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n');
    await Promise.all(
      ['codex', 'codex-code-mode-host'].map((file) => chmod(path.join(bin, file), 0o755)),
    );
    vi.stubEnv('CODEX_HOME', sourceHome);
    vi.stubEnv('PATH', `${bin}${path.delimiter}${process.env['PATH'] ?? ''}`);
    const checkpoint = createCandidateCheckpoint([definition]);
    const baseCommand = [
      'codex',
      'exec',
      '--ignore-user-config',
      '--ignore-rules',
      '--ephemeral',
      '--skip-git-repo-check',
      '--dangerously-bypass-approvals-and-sandbox',
      '-c',
      'shell_environment_policy.inherit=none',
      '--json',
      '-',
    ];
    const execution = await runSemanticTrial({
      activeTrial: null,
      actorCommand: buildCodexEvaluationHostCommand(baseCommand, 'actor'),
      actorHost: checkpoint.actorHost,
      artifactDigest: SHA256,
      caseDefinition: definition,
      cli: { ...checkpoint.cli, version: '13.0.1', jsonSchemaVersion: 7 },
      confirmationIndex: null,
      isOperationalResumeRequested: false,
      judgeCommand: buildCodexEvaluationHostCommand(baseCommand, 'judge'),
      judgeHost: checkpoint.judgeHost,
      persistActiveTrial: async (activeTrial) => {
        checkpoint.caseCheckpoints[caseId] = {
          activeTrial,
          caseDefinitionDigest: SHA256,
          caseId,
          completedCase: null,
          trials: [],
        };
        await writeSemanticCheckpoint(root, checkpoint);
      },
      reusableTrials: [],
      tokenController: createSemanticTokenAdmissionController({ getConsumedTokenCount: () => 0 }),
    });
    const cycles = execution.recordedTrial.cycles;
    expect(cycles.map(({ developerRequest }) => developerRequest)).toStrictEqual(requests);
    expect(cycles.map(({ requestIndex }) => requestIndex)).toStrictEqual([0, 1]);
    expect(cycles[0]?.workspaceChanges).toStrictEqual({ created: [], deleted: [], modified: [] });
    expect(cycles[1]?.workspaceChanges.created).toStrictEqual([]);
    expect(cycles[1]?.workspaceChanges.deleted).toStrictEqual([]);
    expect(cycles[1]?.workspaceChanges.modified.map(({ path }) => path)).toStrictEqual(
      caseId === 'context-recovery-topic-change' ? ['reports/status.txt'] : [],
    );
    if (caseId === 'context-recovery-topic-change') {
      expect(cycles[1]?.workspaceChanges.modified[0]?.after).toMatchObject({
        content: 'complete\n',
      });
    }
    expect(execution.recordedTrial.paidInvocations.map(({ stage }) => stage)).toStrictEqual([
      'actor',
      'actor',
      'judge',
    ]);
  } finally {
    vi.unstubAllEnvs();
  }
});
