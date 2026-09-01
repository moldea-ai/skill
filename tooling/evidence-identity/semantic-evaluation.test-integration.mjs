import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, test } from 'node:test';

import { runSemanticEvaluation } from './semantic-evaluation.mjs';
import { SEMANTIC_IDENTITY_RECEIPT_PATH, recoverSemanticIdentity } from './semantic-identity.mjs';

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const SEMANTIC_EVALUATION_MODULE_URL = pathToFileURL(
  resolve(CURRENT_DIRECTORY, 'semantic-evaluation.mjs'),
).href;
const temporaryRoots = [];

const FAKE_RUNNER_SOURCE = `
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arguments_ = process.argv.slice(2);
const repositoryRoot = process.cwd();
const mode = process.env.MOLDEA_FAKE_MODE ?? 'pass-through';
writeFileSync(
  join(repositoryRoot, 'fake-child-observation.json'),
  JSON.stringify({ arguments_ }),
);
process.stdout.write('fake-child-stdout\\n');
process.stderr.write('fake-child-stderr\\n');

if (mode === 'wait') {
  writeFileSync(join(repositoryRoot, 'fake-child-ready'), 'ready\\n');
  setInterval(() => {}, 1_000);
} else if (mode !== 'pass-through') {
  const candidatePath = join(repositoryRoot, 'fixtures', '.semantic-evaluation-candidate.json');
  const evidenceText =
    mode === 'record-checkpoint'
      ? readFileSync(candidatePath, 'utf8')
      : JSON.stringify({ arguments_ }) + '\\n';
  const evidenceSha256 = createHash('sha256').update(evidenceText).digest('hex');
  const attemptId = process.env.MOLDEA_FAKE_ATTEMPT_ID;
  const attemptDirectory = join(
    repositoryRoot,
    'fixtures',
    'semantic-evaluation-results',
    'attempts',
    attemptId,
  );
  mkdirSync(attemptDirectory, { recursive: true });
  writeFileSync(join(attemptDirectory, 'evidence.json'), evidenceText);
  writeFileSync(
    join(attemptDirectory, 'attempt.json'),
    JSON.stringify({
      attemptId,
      evidence: { path: 'evidence.json', sha256: evidenceSha256 },
    }) + '\\n',
  );
  if (mode === 'record-pass') {
    writeFileSync(
      join(repositoryRoot, 'fixtures', 'semantic-evaluation-result.json'),
      JSON.stringify({ semanticAttemptId: attemptId }) + '\\n',
    );
  } else {
    writeFileSync(candidatePath, evidenceText);
  }
  if (mode === 'record-source-drift') {
    writeFileSync(
      join(repositoryRoot, 'tests', 'semantic-evaluation-runner.mjs'),
      '// changed after recording\\n',
    );
  }
  if (mode === 'record-fail') process.exitCode = 7;
} else {
  process.exitCode = Number(process.env.MOLDEA_FAKE_EXIT_CODE ?? '0');
}
`;

const writeFixtureFile = (repositoryRoot, relativePath, content = 'export {};\n') => {
  const absolutePath = join(repositoryRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
};

const createRepository = () => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-semantic-wrapper-'));
  temporaryRoots.push(repositoryRoot);
  writeFixtureFile(
    repositoryRoot,
    'moldea/SKILL.md',
    "---\nname: moldea\nmetadata:\n  version: '4.0.0'\n---\n\nSkill release `4.0.0` supports exactly:\n",
  );
  writeFixtureFile(
    repositoryRoot,
    'moldea/references/local-tooling.md',
    '# Local tooling\n\nRelease `4.0.0` supports:\n',
  );
  writeFixtureFile(repositoryRoot, 'fixtures/conformance-cases.json', '{}\n');
  writeFixtureFile(repositoryRoot, 'fixtures/semantic-evaluation-coverage.json', '{}\n');
  writeFixtureFile(repositoryRoot, 'tests/semantic-evaluation-runner.mjs', FAKE_RUNNER_SOURCE);
  for (const relativePath of [
    'tooling/codex-evaluation-host/index.mjs',
    'tooling/evidence-identity/cli-closure.mjs',
    'tooling/evidence-identity/portable-skill.mjs',
    'tooling/evidence-identity/semantic-evaluation-child.mjs',
    'tooling/evidence-identity/semantic-evaluation.mjs',
    'tooling/evidence-identity/semantic-identity.mjs',
    'tooling/release-identity/index.mjs',
    'tooling/semantic-evaluation/index.mjs',
  ]) {
    writeFixtureFile(repositoryRoot, relativePath);
  }
  const packageManifest = {
    name: 'semantic-wrapper-fixture',
    version: '4.0.0',
    moldeaRelease: { cliJsonSchemaVersion: 2 },
    devDependencies: { '@moldea.ai/cli': '5.0.0' },
  };
  const packageLock = {
    name: packageManifest.name,
    version: packageManifest.version,
    lockfileVersion: 3,
    packages: {
      '': {
        name: packageManifest.name,
        version: packageManifest.version,
        devDependencies: packageManifest.devDependencies,
      },
      'node_modules/@moldea.ai/cli': {
        version: '5.0.0',
        integrity: 'sha512-cli',
      },
    },
  };
  writeFixtureFile(repositoryRoot, 'package.json', `${JSON.stringify(packageManifest)}\n`);
  writeFixtureFile(repositoryRoot, 'package-lock.json', `${JSON.stringify(packageLock)}\n`);
  execFileSync('git', ['init', '--quiet'], { cwd: repositoryRoot });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], {
    cwd: repositoryRoot,
  });
  execFileSync('git', ['config', 'user.name', 'Fixture'], {
    cwd: repositoryRoot,
  });
  execFileSync('git', ['add', '--all'], { cwd: repositoryRoot });
  execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], {
    cwd: repositoryRoot,
  });
  return repositoryRoot;
};

const writeHistoricalResult = (
  repositoryRoot,
  attemptId = '20260830T054330932Z-semantic-441e439c',
) => {
  const evidenceText = '{"historical":true}\n';
  const evidenceSha256 = createHash('sha256').update(evidenceText).digest('hex');
  const attemptDirectory = join(
    repositoryRoot,
    'fixtures',
    'semantic-evaluation-results',
    'attempts',
    attemptId,
  );
  mkdirSync(attemptDirectory, { recursive: true });
  writeFileSync(join(attemptDirectory, 'evidence.json'), evidenceText);
  writeFileSync(
    join(attemptDirectory, 'attempt.json'),
    `${JSON.stringify({
      attemptId,
      evidence: { path: 'evidence.json', sha256: evidenceSha256 },
    })}\n`,
  );
  writeFileSync(
    join(repositoryRoot, 'fixtures', 'semantic-evaluation-result.json'),
    `${JSON.stringify({ semanticAttemptId: attemptId })}\n`,
  );
  return attemptDirectory;
};

const createEnvironment = (overrides) => ({
  ...process.env,
  MOLDEA_FAKE_ATTEMPT_ID: '20260901T120000000Z-semantic-11111111',
  ...overrides,
});

const createHarness = (repositoryRoot) => {
  const harnessPath = join(repositoryRoot, 'semantic-wrapper-harness.mjs');
  writeFileSync(
    harnessPath,
    `import { applySemanticEvaluationOutcome, runSemanticEvaluation } from '${SEMANTIC_EVALUATION_MODULE_URL}';\n` +
      `const outcome = await runSemanticEvaluation({\n` +
      `  arguments_: JSON.parse(process.env.MOLDEA_FAKE_ARGUMENTS),\n` +
      `  environment: process.env,\n` +
      `  repositoryRoot: process.env.MOLDEA_FAKE_REPOSITORY_ROOT,\n` +
      `  runnerPath: process.env.MOLDEA_FAKE_RUNNER_PATH,\n` +
      `});\n` +
      `applySemanticEvaluationOutcome(outcome);\n`,
  );
  return harnessPath;
};

const startHarness = (repositoryRoot, arguments_, environmentOverrides) => {
  const runnerPath = join(repositoryRoot, 'tests', 'semantic-evaluation-runner.mjs');
  const child = spawn(process.execPath, [createHarness(repositoryRoot)], {
    cwd: repositoryRoot,
    env: createEnvironment({
      MOLDEA_FAKE_ARGUMENTS: JSON.stringify(arguments_),
      MOLDEA_FAKE_REPOSITORY_ROOT: repositoryRoot,
      MOLDEA_FAKE_RUNNER_PATH: runnerPath,
      ...environmentOverrides,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const completion = new Promise((resolveCompletion, reject) => {
    child.once('error', reject);
    child.once('close', (exitCode, signal) => {
      resolveCompletion({ exitCode, signal, stderr, stdout });
    });
  });
  return { child, completion };
};

const waitForPath = async (path) => {
  const deadline = Date.now() + 5_000;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${path}.`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 16));
  }
};

const waitForProcessExit = async (processId) => {
  const deadline = Date.now() + 5_000;
  while (true) {
    try {
      process.kill(processId, 0);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') return;
      throw error;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for process ${processId} to exit.`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 16));
  }
};

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('passes non-recording arguments, streams, and exit status through unchanged', async () => {
  const repositoryRoot = createRepository();
  const { completion } = startHarness(repositoryRoot, ['--case', 'case-a'], {
    MOLDEA_FAKE_EXIT_CODE: '3',
    MOLDEA_FAKE_MODE: 'pass-through',
  });
  const result = await completion;

  assert.deepEqual(result, {
    exitCode: 3,
    signal: null,
    stderr: 'fake-child-stderr\n',
    stdout: 'fake-child-stdout\n',
  });
  assert.deepEqual(
    JSON.parse(readFileSync(join(repositoryRoot, 'fake-child-observation.json'), 'utf8')),
    { arguments_: ['--case', 'case-a'] },
  );
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), false);
});

test('identifies a failed recorded attempt and preserves its nonzero status', async () => {
  const repositoryRoot = createRepository();
  const outcome = await runSemanticEvaluation({
    arguments_: ['--record', '--restart'],
    environment: createEnvironment({ MOLDEA_FAKE_MODE: 'record-fail' }),
    repositoryRoot,
  });

  assert.deepEqual(outcome, { exitCode: 7, signal: null });
  const attemptDirectory = join(
    repositoryRoot,
    'fixtures',
    'semantic-evaluation-results',
    'attempts',
    '20260901T120000000Z-semantic-11111111',
  );
  assert.equal(existsSync(join(attemptDirectory, 'identity.json')), true);
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), false);
  assert.deepEqual(
    JSON.parse(readFileSync(join(repositoryRoot, 'fake-child-observation.json'), 'utf8')),
    { arguments_: ['--record', '--restart'] },
  );
});

test('identifies record-checkpoint attempts without changing the forwarded option', async () => {
  const repositoryRoot = createRepository();
  writeFileSync(
    join(repositoryRoot, 'fixtures', '.semantic-evaluation-candidate.json'),
    '{"checkpoint":true}\n',
  );
  const outcome = await runSemanticEvaluation({
    arguments_: ['--record-checkpoint'],
    environment: createEnvironment({ MOLDEA_FAKE_MODE: 'record-checkpoint' }),
    repositoryRoot,
  });

  assert.deepEqual(outcome, { exitCode: 0, signal: null });
  assert.deepEqual(
    JSON.parse(readFileSync(join(repositoryRoot, 'fake-child-observation.json'), 'utf8')),
    { arguments_: ['--record-checkpoint'] },
  );
});

test('rejects dirty recording inputs before the child can start', async () => {
  const repositoryRoot = createRepository();
  writeFileSync(
    join(repositoryRoot, 'fixtures', 'semantic-evaluation-coverage.json'),
    '{"changed":true}\n',
  );

  await assert.rejects(
    runSemanticEvaluation({
      arguments_: ['--record'],
      environment: createEnvironment({ MOLDEA_FAKE_MODE: 'record-pass' }),
      repositoryRoot,
    }),
    /requires every relevant/u,
  );
  assert.equal(existsSync(join(repositoryRoot, 'fake-child-observation.json')), false);
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), false);
});

test('preserves an unresolved receipt when source changes after attempt recording', async () => {
  const repositoryRoot = createRepository();
  await assert.rejects(
    runSemanticEvaluation({
      arguments_: ['--record'],
      environment: createEnvironment({
        MOLDEA_FAKE_MODE: 'record-source-drift',
      }),
      repositoryRoot,
    }),
    /requires every relevant|no longer matches/u,
  );
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), true);
  assert.equal(
    existsSync(
      join(
        repositoryRoot,
        'fixtures',
        'semantic-evaluation-results',
        'attempts',
        '20260901T120000000Z-semantic-11111111',
        'identity.json',
      ),
    ),
    false,
  );
});

test(
  'blocks a second recording while the first receipt owner remains active',
  { timeout: 10_000 },
  async () => {
    const repositoryRoot = createRepository();
    const { child, completion } = startHarness(repositoryRoot, ['--record'], {
      MOLDEA_FAKE_MODE: 'wait',
    });
    let firstCompletion;
    try {
      await waitForPath(join(repositoryRoot, 'fake-child-ready'));
      const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
      const originalReceipt = readFileSync(receiptPath, 'utf8');

      await assert.rejects(
        runSemanticEvaluation({
          arguments_: ['--record'],
          environment: createEnvironment({ MOLDEA_FAKE_MODE: 'record-pass' }),
          repositoryRoot,
        }),
        /belongs to active recording process/u,
      );
      assert.equal(readFileSync(receiptPath, 'utf8'), originalReceipt);

      child.kill('SIGTERM');
      firstCompletion = await completion;
      assert.equal(firstCompletion.signal, 'SIGTERM');
      assert.equal(existsSync(receiptPath), false);
    } finally {
      if (firstCompletion === undefined) {
        child.kill('SIGTERM');
        await completion;
      }
    }
  },
);

test(
  'stops the evaluator and safely recovers after abrupt wrapper termination',
  { timeout: 10_000 },
  async () => {
    const repositoryRoot = createRepository();
    const { child, completion } = startHarness(repositoryRoot, ['--record'], {
      MOLDEA_FAKE_MODE: 'wait',
    });
    await waitForPath(join(repositoryRoot, 'fake-child-ready'));
    const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(Number.isSafeInteger(receipt.evaluatorProcessId), true);

    child.kill('SIGKILL');
    await completion;
    await waitForProcessExit(receipt.evaluatorProcessId);

    assert.deepEqual(await recoverSemanticIdentity(repositoryRoot), {
      attemptId: null,
      status: 'retired',
    });
    assert.equal(existsSync(receiptPath), false);
  },
);

test('does not identify a historical result when a recording fails before creating an attempt', async () => {
  const repositoryRoot = createRepository();
  const historicalAttemptDirectory = writeHistoricalResult(repositoryRoot);
  const outcome = await runSemanticEvaluation({
    arguments_: ['--record'],
    environment: createEnvironment({
      MOLDEA_FAKE_EXIT_CODE: '7',
      MOLDEA_FAKE_MODE: 'pass-through',
    }),
    repositoryRoot,
  });

  assert.deepEqual(outcome, { exitCode: 7, signal: null });
  assert.equal(existsSync(join(historicalAttemptDirectory, 'identity.json')), false);
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), false);
});

test(
  'forwards termination signals and retires a receipt when no attempt was created',
  { timeout: 10_000 },
  async () => {
    const repositoryRoot = createRepository();
    const { child, completion } = startHarness(repositoryRoot, ['--record'], {
      MOLDEA_FAKE_MODE: 'wait',
    });
    await waitForPath(join(repositoryRoot, 'fake-child-ready'));
    child.kill('SIGTERM');
    const result = await completion;

    assert.equal(result.exitCode, null);
    assert.equal(result.signal, 'SIGTERM');
    assert.match(result.stdout, /fake-child-stdout/u);
    assert.match(result.stderr, /fake-child-stderr/u);
    assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), false);
  },
);

test(
  'does not identify a historical result when termination precedes attempt creation',
  { timeout: 10_000 },
  async () => {
    const repositoryRoot = createRepository();
    const historicalAttemptDirectory = writeHistoricalResult(repositoryRoot);
    const { child, completion } = startHarness(repositoryRoot, ['--record'], {
      MOLDEA_FAKE_MODE: 'wait',
    });
    await waitForPath(join(repositoryRoot, 'fake-child-ready'));
    child.kill('SIGTERM');
    const result = await completion;

    assert.equal(result.signal, 'SIGTERM');
    assert.equal(existsSync(join(historicalAttemptDirectory, 'identity.json')), false);
    assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), false);
  },
);
