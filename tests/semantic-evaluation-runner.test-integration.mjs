// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  collectScenarioEvidence,
  hasValidScenarioEvidence,
} from '../tooling/semantic-evaluation/index.mjs';

import {
  createActorRepository,
  parseSemanticEvaluationHostOutput,
  readSemanticEvaluationCandidate,
  SEMANTIC_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT,
  writeSemanticEvaluationCandidate,
} from './semantic-evaluation-runner.mjs';

const ROOT_PACKAGE_MANIFEST = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const RELEASE_CLI_VERSION = ROOT_PACKAGE_MANIFEST.devDependencies['@moldea.ai/cli'];
const RELEASE_CLI_JSON_SCHEMA_VERSION = ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion;
const SEMANTIC_CASES = JSON.parse(
  readFileSync(join(process.cwd(), 'fixtures', 'conformance-cases.json'), 'utf8'),
).semanticCases;
const SEMANTIC_RUNNER_PATH = join(process.cwd(), 'tests', 'semantic-evaluation-runner.mjs');
const SEMANTIC_CANDIDATE_PATH = join(
  process.cwd(),
  'fixtures',
  '.semantic-evaluation-candidate.json',
);
const SEMANTIC_ATTEMPTS_PATH = join(
  process.cwd(),
  'fixtures',
  'semantic-evaluation-results',
  'attempts',
);

/** Creates an isolated no-network Codex substitute for runner boundary tests. */
const createFakeCodexHost = (root) => {
  const executablePath = join(root, 'codex');
  const companionPath = join(root, 'codex-code-mode-host');
  writeFileSync(
    executablePath,
    `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

if (process.argv.includes('--version')) {
  writeFileSync(new URL('./version-called', import.meta.url), 'called\\n');
  process.stdout.write('codex-fake 1.0.0\\n');
  process.exit(0);
}

const prompt = readFileSync(0, 'utf8');
const response = prompt.includes('Assess whether an Agent Skills host handled the scenario correctly.')
  ? JSON.stringify({
      observed: ['host-workflow-only'],
      forbidden: [],
      rationale: 'The response completed the requested documentation review without unrelated activity.',
    })
  : 'No actionable findings.';
process.stdout.write(JSON.stringify({
  item: { id: 'response', text: response, type: 'agent_message' },
  type: 'item.completed',
}) + '\\n');
process.stdout.write(JSON.stringify({
  type: 'turn.completed',
  usage: { cached_input_tokens: 0, input_tokens: 16, output_tokens: 8 },
}) + '\\n');
`,
  );
  writeFileSync(companionPath, '#!/usr/bin/env node\n');
  chmodSync(executablePath, 0o755);
  chmodSync(companionPath, 0o755);

  return [
    executablePath,
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

const readCandidateState = () =>
  existsSync(SEMANTIC_CANDIDATE_PATH) ? readFileSync(SEMANTIC_CANDIDATE_PATH, 'utf8') : null;

test('semantic model execution requires an explicit mode before host discovery', () => {
  const hostRoot = mkdtempSync(join(tmpdir(), 'moldea-fake-host-'));
  const hostCommand = createFakeCodexHost(hostRoot);
  const beforeCandidate = readCandidateState();
  const beforeAttempts = readdirSync(SEMANTIC_ATTEMPTS_PATH).sort();

  try {
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', SEMANTIC_RUNNER_PATH],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          MOLDEA_EVAL_ACTOR_COMMAND_JSON: JSON.stringify(hostCommand),
          MOLDEA_EVAL_JUDGE_COMMAND_JSON: JSON.stringify(hostCommand),
        },
      },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /requires --record or --case <id>/u);
    assert.equal(existsSync(join(hostRoot, 'version-called')), false);
    assert.equal(readCandidateState(), beforeCandidate);
    assert.deepEqual(readdirSync(SEMANTIC_ATTEMPTS_PATH).sort(), beforeAttempts);
  } finally {
    rmSync(hostRoot, { force: true, recursive: true });
  }
});

test('one targeted fake-host evaluation emits only its bounded diagnostic', () => {
  const hostRoot = mkdtempSync(join(tmpdir(), 'moldea-fake-host-'));
  const hostCommand = createFakeCodexHost(hostRoot);
  const beforeCandidate = readCandidateState();
  const beforeAttempts = readdirSync(SEMANTIC_ATTEMPTS_PATH).sort();

  try {
    const result = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        SEMANTIC_RUNNER_PATH,
        '--case',
        'unrelated-documentation-review',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          MOLDEA_EVAL_ACTOR_COMMAND_JSON: JSON.stringify(hostCommand),
          MOLDEA_EVAL_JUDGE_COMMAND_JSON: JSON.stringify(hostCommand),
        },
        maxBuffer: 1024 * 1024,
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      Buffer.byteLength(result.stdout, 'utf8') <= SEMANTIC_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT,
    );
    assert.deepEqual(JSON.parse(result.stdout), {
      schemaVersion: 1,
      evaluationProtocolVersion: 23,
      caseId: 'unrelated-documentation-review',
      verdict: 'passed',
      criteria: { observed: ['host-workflow-only'], forbidden: [] },
      rationale:
        'The response completed the requested documentation review without unrelated activity.',
      rationaleTruncated: false,
      resources: {
        actorCommands: { completedCommandCount: 0 },
        moldea: {
          commandCount: 0,
          maximumInvocationByteCount: 0,
          modelVisibleToolOutputByteCount: 0,
          operations: [],
          stdoutByteCount: 0,
        },
        modelTokens: {
          actor: { cachedInputTokens: 0, inputTokens: 16, outputTokens: 8 },
          judge: { cachedInputTokens: 0, inputTokens: 16, outputTokens: 8 },
        },
      },
    });
    assert.equal(readCandidateState(), beforeCandidate);
    assert.deepEqual(readdirSync(SEMANTIC_ATTEMPTS_PATH).sort(), beforeAttempts);
  } finally {
    rmSync(hostRoot, { force: true, recursive: true });
  }
});

const runCli = (repositoryPath, arguments_, input) => {
  const result = spawnSync(join(repositoryPath, 'node_modules', '.bin', 'moldea'), arguments_, {
    cwd: repositoryPath,
    encoding: 'utf8',
    input,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};

const runLauncher = (repositoryPath, arguments_, input) => {
  const result = spawnSync(
    process.execPath,
    [
      join(repositoryPath, '.agents', 'skills', 'moldea', 'scripts', 'moldea-cli.mjs'),
      '--repository',
      repositoryPath,
      '--',
      ...arguments_,
    ],
    { cwd: repositoryPath, encoding: 'utf8', input },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};

test('all clean-slate semantic cases materialize their declared repository evidence', async () => {
  assert.equal(SEMANTIC_CASES.length, 74);

  for (const caseDefinition of SEMANTIC_CASES) {
    const evaluationRoot = mkdtempSync(join(tmpdir(), `moldea-${caseDefinition.id}-`));
    try {
      const { readOnlyMounts, repositoryPath } = await createActorRepository(
        evaluationRoot,
        caseDefinition,
      );
      const evidence = await collectScenarioEvidence({
        caseDefinition,
        readOnlyMounts,
        repositoryPath,
      });
      assert.equal(hasValidScenarioEvidence(evidence, caseDefinition), true, caseDefinition.id);
    } finally {
      rmSync(evaluationRoot, { force: true, recursive: true });
    }
  }
});

test('claimed-adopted custom CLI scenarios pass the inert adoption gate', async () => {
  for (const caseId of ['pnpm-pnp-local-cli-provider', 'yarn-conflicting-cli-provider']) {
    const evaluationRoot = mkdtempSync(join(tmpdir(), `moldea-adopted-${caseId}-`));
    const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === caseId);
    assert.ok(caseDefinition);

    try {
      const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
      const readStatus = () =>
        spawnSync('git', ['status', '--porcelain=v1'], {
          cwd: repositoryPath,
          encoding: 'utf8',
        });
      const beforeStatus = readStatus();
      assert.equal(beforeStatus.status, 0, beforeStatus.stderr);
      assert.equal(beforeStatus.stdout, '');

      const gate = spawnSync(
        process.execPath,
        [
          join(repositoryPath, '.agents', 'skills', 'moldea', 'scripts', 'relevance-gate.mjs'),
          '--repository',
          repositoryPath,
          '--adoption-only',
        ],
        { cwd: repositoryPath, encoding: 'utf8' },
      );
      assert.equal(gate.status, 0, gate.stderr);
      assert.equal(gate.stdout, '1\n');
      assert.equal(existsSync(join(repositoryPath, 'unexpected-yarn-cli-invocation.txt')), false);

      const afterStatus = readStatus();
      assert.equal(afterStatus.status, 0, afterStatus.stderr);
      assert.equal(afterStatus.stdout, '');
    } finally {
      rmSync(evaluationRoot, { force: true, recursive: true });
    }
  }
});

test('dirty-tree scenario passes one complete normalized path set to the gate and scope', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-dirty-tree-gate-'));
  const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === 'evaluate-dirty-working-tree');
  assert.ok(caseDefinition);

  try {
    const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
    const readStatus = () =>
      spawnSync('git', ['status', '--porcelain=v2', '-z', '--untracked-files=all'], {
        cwd: repositoryPath,
        encoding: 'buffer',
      });
    const beforeStatus = readStatus();
    assert.equal(beforeStatus.status, 0, beforeStatus.stderr.toString('utf8'));
    assert.notEqual(beforeStatus.stdout.length, 0);
    assert.match(
      readFileSync(join(repositoryPath, 'moldea', 'moldea.yaml'), 'utf8'),
      /affectedBy:\n      - \/src\/\*\*/u,
    );
    assert.match(
      readFileSync(join(repositoryPath, 'moldea', 'project.md'), 'utf8'),
      /source tree under `\/src\/\*\*`/u,
    );

    const changedPaths = [
      'src/staged.js',
      'src/unstaged.js',
      'src/untracked.js',
      'src/renamed-before.js',
      'src/renamed-after.js',
      'src/deleted.js',
    ];
    const normalizedPaths = changedPaths.map((path) => `/${path}`);
    const normalizedPathInput = `${normalizedPaths.join('\0')}\0`;
    const gate = spawnSync(
      process.execPath,
      [
        join(repositoryPath, '.agents', 'skills', 'moldea', 'scripts', 'relevance-gate.mjs'),
        '--repository',
        repositoryPath,
      ],
      {
        cwd: repositoryPath,
        encoding: 'utf8',
        input: normalizedPathInput,
      },
    );
    assert.equal(gate.status, 0, gate.stderr);
    assert.equal(gate.stderr, '');
    assert.equal(gate.stdout, '1\n');

    const scope = JSON.parse(
      runLauncher(
        repositoryPath,
        ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
        normalizedPathInput,
      ),
    );
    assert.equal(scope.schemaVersion, 4);
    assert.equal(scope.status, 'valid');
    assert.equal(scope.result.valid, true);
    assert.equal(scope.result.relevant, true);
    assert.deepEqual(scope.result.counts, {
      declarations: 1,
      diagnostics: 0,
      inputPaths: 6,
      matchedOwners: 1,
      matchedPaths: 6,
      matches: 6,
    });
    assert.deepEqual(
      scope.result.page.records.map(({ match }) => match.inputPath).sort(),
      [...normalizedPaths].sort(),
    );
    assert.deepEqual(
      [...new Set(scope.result.page.records.map(({ match }) => JSON.stringify(match.owner)))],
      [
        JSON.stringify({
          agentId: null,
          id: '/moldea/project.md',
          kind: 'context',
        }),
      ],
    );

    const afterStatus = readStatus();
    assert.equal(afterStatus.status, 0, afterStatus.stderr.toString('utf8'));
    assert.deepEqual(afterStatus.stdout, beforeStatus.stdout);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('canonical current-change scope uses adoption proof instead of relationship matching', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-canonical-gate-'));
  const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === 'direct-canonical-relevance');
  assert.ok(caseDefinition);

  try {
    const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
    const gatePath = join(
      repositoryPath,
      '.agents',
      'skills',
      'moldea',
      'scripts',
      'relevance-gate.mjs',
    );
    const canonicalPathInput = '/moldea/project.md\0';
    const readStatus = () =>
      spawnSync('git', ['status', '--porcelain=v2', '-z', '--untracked-files=all'], {
        cwd: repositoryPath,
        encoding: 'buffer',
      });
    const beforeStatus = readStatus();
    assert.equal(beforeStatus.status, 0, beforeStatus.stderr.toString('utf8'));

    const adoption = spawnSync(
      process.execPath,
      [gatePath, '--repository', repositoryPath, '--adoption-only'],
      { cwd: repositoryPath, encoding: 'utf8' },
    );
    assert.equal(adoption.status, 0, adoption.stderr);
    assert.equal(adoption.stdout, '1\n');

    const relationship = spawnSync(process.execPath, [gatePath, '--repository', repositoryPath], {
      cwd: repositoryPath,
      encoding: 'utf8',
      input: canonicalPathInput,
    });
    assert.equal(relationship.status, 0, relationship.stderr);
    assert.equal(relationship.stdout, '0\n');

    const scope = JSON.parse(
      runCli(
        repositoryPath,
        ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
        canonicalPathInput,
      ),
    );
    assert.equal(scope.status, 'valid');
    assert.equal(scope.result.valid, true);
    assert.equal(scope.result.relevant, false);
    assert.equal(scope.result.counts.matchedOwners, 0);
    assert.equal(scope.result.counts.matches, 0);

    const afterStatus = readStatus();
    assert.equal(afterStatus.status, 0, afterStatus.stderr.toString('utf8'));
    assert.deepEqual(afterStatus.stdout, beforeStatus.stdout);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('the exact-binding semantic baseline is structurally valid before review', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-exact-binding-'));
  const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === 'exact-binding-relevance');
  assert.ok(caseDefinition);

  try {
    const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
    const envelope = JSON.parse(
      runCli(repositoryPath, ['validate', '--json', '--max-output-bytes', '65536']),
    );

    assert.equal(envelope.status, 'valid');
    assert.equal(envelope.result.valid, true);
    assert.equal(envelope.result.diagnosticCount, 0);
    assert.deepEqual(envelope.result.page.records, []);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('an unchanged explicitly named affectedBy path resolves only its bounded owner', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-unchanged-relationship-'));
  const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === 'affected-by-relevance');
  assert.ok(caseDefinition);

  try {
    const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
    const readStatus = () =>
      spawnSync('git', ['status', '--porcelain=v1'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });
    const beforeStatus = readStatus();
    assert.equal(beforeStatus.status, 0, beforeStatus.stderr);
    assert.equal(beforeStatus.stdout, '');

    const normalizedTaskPathInput = '/src/project-state.js\0';
    const gate = spawnSync(
      process.execPath,
      [
        join(repositoryPath, '.agents', 'skills', 'moldea', 'scripts', 'relevance-gate.mjs'),
        '--repository',
        repositoryPath,
      ],
      {
        cwd: repositoryPath,
        encoding: 'utf8',
        input: normalizedTaskPathInput,
      },
    );
    assert.equal(gate.status, 0, gate.stderr);
    assert.equal(gate.stdout, '1\n');

    const scope = JSON.parse(
      runCli(
        repositoryPath,
        ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
        normalizedTaskPathInput,
      ),
    );
    assert.equal(scope.status, 'valid');
    assert.equal(scope.result.relevant, true);
    assert.equal(scope.result.counts.matchedOwners, 1);
    assert.equal(scope.result.counts.matchedPaths, 1);
    assert.equal(scope.result.page.records.length, 1);
    assert.deepEqual(scope.result.page.records[0].match.owner, {
      agentId: null,
      id: '/moldea/project.md',
      kind: 'context',
    });

    const afterStatus = readStatus();
    assert.equal(afterStatus.status, 0, afterStatus.stderr);
    assert.equal(afterStatus.stdout, '');
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('bounded launcher executions with stdin project safe facts without retaining commands or content', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-cli-evidence-'));
  const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === 'zero-agent-project-validation');
  assert.ok(caseDefinition);

  try {
    const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
    const commandText =
      "printf '/src/project-state.js\\0' | node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt -- scope --paths-stdin --json --max-output-bytes 65536";
    const stdout = runLauncher(
      repositoryPath,
      ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
      '/src/project-state.js\0',
    );
    const envelope = JSON.parse(stdout);
    assert.equal(envelope.schemaVersion, RELEASE_CLI_JSON_SCHEMA_VERSION);
    assert.equal(envelope.cliVersion, RELEASE_CLI_VERSION);
    assert.equal(envelope.command, 'scope');
    assert.equal(JSON.stringify(envelope).includes('"content"'), false);

    const hostOutput = [
      {
        item: {
          aggregated_output: stdout,
          command: commandText,
          exit_code: 0,
          id: 'bounded-scope',
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      {
        item: {
          id: 'response',
          text: 'Validation complete.',
          type: 'agent_message',
        },
        type: 'item.completed',
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n');
    const parsed = parseSemanticEvaluationHostOutput(hostOutput, {
      cliVersion: RELEASE_CLI_VERSION,
      jsonSchemaVersion: RELEASE_CLI_JSON_SCHEMA_VERSION,
    });

    assert.equal(parsed.actorResourceEvidence.commandCount, 1);
    assert.equal(
      parsed.actorResourceEvidence.maximumInvocationByteCount,
      Buffer.byteLength(stdout),
    );
    assert.equal(parsed.actorResourceEvidence.stdoutByteCount, Buffer.byteLength(stdout));
    assert.equal(parsed.actorExecutionEvidence[0].item.outputEvidence.facts[0].command, 'scope');
    assert.equal(
      parsed.actorExecutionEvidence[0].item.outputEvidence.facts[0].containsContent,
      false,
    );
    assert.doesNotMatch(JSON.stringify(parsed), /node_modules|Evaluation project/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('repository integration-test output becomes one content-free passing summary', () => {
  const command = 'node --test src/support-agent.test-integration.js';
  const output = [
    '✔ canonical instruction reaches both model calls (7.1ms)',
    'ℹ tests 1',
    'ℹ suites 0',
    'ℹ pass 1',
    'ℹ fail 0',
    'ℹ cancelled 0',
    'ℹ skipped 0',
    'ℹ todo 0',
    'ℹ duration_ms 16.4',
  ].join('\n');
  const hostOutput = [
    {
      item: {
        aggregated_output: output,
        command,
        exit_code: 0,
        id: 'focused-test',
        status: 'completed',
        type: 'command_execution',
      },
      type: 'item.completed',
    },
    {
      item: {
        id: 'response',
        text: 'The integration test passed.',
        type: 'agent_message',
      },
      type: 'item.completed',
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');

  const parsed = parseSemanticEvaluationHostOutput(hostOutput, {
    cliVersion: RELEASE_CLI_VERSION,
    jsonSchemaVersion: RELEASE_CLI_JSON_SCHEMA_VERSION,
  });

  assert.deepEqual(parsed.actorExecutionEvidence[0].item.outputEvidence.facts, [
    {
      cancelledCount: 0,
      failedCount: 0,
      kind: 'node-test-summary',
      passedCount: 1,
      skippedCount: 0,
      status: 'passed',
      testCount: 1,
      testKind: 'integration',
      todoCount: 0,
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(parsed.actorExecutionEvidence),
    /canonical instruction|support-agent|duration_ms|node --test/u,
  );
});

test('semantic candidate checkpoints are atomically replaceable', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-candidate-'));
  const candidatePath = join(evaluationRoot, '.semantic-evaluation-candidate.json');
  const initialCandidate = {
    artifactDigest: 'a'.repeat(64),
    results: [],
    schemaVersion: 2,
  };
  const updatedCandidate = {
    ...initialCandidate,
    results: [{ id: 'completed-case', passed: true }],
  };

  try {
    await writeSemanticEvaluationCandidate(initialCandidate, candidatePath);
    assert.deepEqual(await readSemanticEvaluationCandidate(candidatePath), initialCandidate);
    await writeSemanticEvaluationCandidate(updatedCandidate, candidatePath);
    assert.deepEqual(await readSemanticEvaluationCandidate(candidatePath), updatedCandidate);
    assert.deepEqual(readdirSync(evaluationRoot), ['.semantic-evaluation-candidate.json']);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
