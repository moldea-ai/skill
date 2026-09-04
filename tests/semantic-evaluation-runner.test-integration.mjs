// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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
  writeSemanticEvaluationCandidate,
} from './semantic-evaluation-runner.mjs';

const ROOT_PACKAGE_MANIFEST = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const RELEASE_CLI_VERSION = ROOT_PACKAGE_MANIFEST.devDependencies['@moldea.ai/cli'];
const RELEASE_CLI_JSON_SCHEMA_VERSION = ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion;
const SEMANTIC_CASES = JSON.parse(
  readFileSync(join(process.cwd(), 'fixtures', 'conformance-cases.json'), 'utf8'),
).semanticCases;

const runCli = (repositoryPath, arguments_) => {
  const result = spawnSync(join(repositoryPath, 'node_modules', '.bin', 'moldea'), arguments_, {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};

test('all clean-slate semantic cases materialize their declared repository evidence', async () => {
  assert.equal(SEMANTIC_CASES.length, 14);

  for (const caseDefinition of SEMANTIC_CASES) {
    const evaluationRoot = mkdtempSync(join(tmpdir(), `moldea-${caseDefinition.id}-`));
    try {
      const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
      const evidence = await collectScenarioEvidence({
        caseDefinition,
        repositoryPath,
      });
      assert.equal(hasValidScenarioEvidence(evidence, caseDefinition), true, caseDefinition.id);
    } finally {
      rmSync(evaluationRoot, { force: true, recursive: true });
    }
  }
});

test('bounded direct CLI executions project safe facts without retaining commands or content', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-cli-evidence-'));
  const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === 'zero-agent-project-validation');
  assert.ok(caseDefinition);

  try {
    const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
    const commandText = 'node_modules/.bin/moldea inspect --json --max-output-bytes 65536';
    const stdout = runCli(repositoryPath, ['inspect', '--json', '--max-output-bytes', '65536']);
    const envelope = JSON.parse(stdout);
    assert.equal(envelope.schemaVersion, RELEASE_CLI_JSON_SCHEMA_VERSION);
    assert.equal(envelope.cliVersion, RELEASE_CLI_VERSION);
    assert.equal(envelope.command, 'inspect');
    assert.equal(JSON.stringify(envelope).includes('"content"'), false);

    const hostOutput = [
      {
        item: {
          aggregated_output: stdout,
          command: commandText,
          exit_code: 0,
          id: 'bounded-inspect',
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      {
        item: { id: 'response', text: 'Validation complete.', type: 'agent_message' },
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
    assert.equal(parsed.actorExecutionEvidence[0].item.outputEvidence.facts[0].command, 'inspect');
    assert.equal(
      parsed.actorExecutionEvidence[0].item.outputEvidence.facts[0].containsContent,
      false,
    );
    assert.doesNotMatch(JSON.stringify(parsed), /node_modules|Evaluation project/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('semantic candidate checkpoints are atomically replaceable', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-candidate-'));
  const candidatePath = join(evaluationRoot, '.semantic-evaluation-candidate.json');
  const initialCandidate = { artifactDigest: 'a'.repeat(64), results: [], schemaVersion: 2 };
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
