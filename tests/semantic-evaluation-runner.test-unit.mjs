// @vitest-environment node
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assessJudgeOutput,
  buildActorPrompt,
  buildBwrapArguments,
  buildJudgePrompt,
  buildSemanticEvaluationHostCommand,
  collectProductionPackageRoots,
  createPortableSkillSemanticDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticEvaluationCandidate,
  createSemanticEvaluationRecord,
  getPendingSemanticCaseDefinitions,
  getSemanticToolingSource,
  getSyntheticCompatibilityCaseIds,
  identifyConfiguredModel,
  identifyConfiguredReasoningEffort,
  mergeSemanticCandidateResult,
  normalizePortableSkillSemanticEvidence,
  resolveCodeModeHostPath,
  validateHostCommand,
  validateSemanticCandidateCompatibility,
  validateSemanticResultRecording,
} from './semantic-evaluation-runner.mjs';

const CASE_DEFINITION = {
  expected: ['expected-secret-label'],
  forbidden: ['forbidden-secret-label'],
  id: 'blind-evaluation',
  prompt: 'Evaluate this repository without changing it.',
};
const BASE_HOST_COMMAND = [
  'codex',
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
const SAFE_HOST_COMMAND = buildSemanticEvaluationHostCommand(BASE_HOST_COMMAND);
const SECOND_CASE_DEFINITION = {
  expected: ['second-expected-label'],
  forbidden: ['second-forbidden-label'],
  id: 'second-evaluation',
  prompt: 'Evaluate a second repository scenario without changing it.',
};
const ACTOR_HOST = {
  model: 'gpt-5.6-terra',
  name: 'codex',
  reasoningEffort: 'medium',
  version: '1.2.3',
};
const JUDGE_HOST = {
  model: 'gpt-5.6-terra',
  name: 'codex',
  reasoningEffort: 'medium',
  version: '1.2.3',
};
const ARTIFACT_DIGEST = 'a'.repeat(64);
const EVALUATED_AT = '2026-08-16T12:00:00.000Z';
const BEFORE_SNAPSHOT_STATE = {
  mode: 33_204,
  sha256: 'b'.repeat(64),
  type: 'file',
};
const AFTER_SNAPSHOT_STATE = {
  mode: 33_204,
  sha256: 'c'.repeat(64),
  type: 'file',
};

const createCaseResult = (caseDefinition, passed) => ({
  actorResponse: `Actor response for ${caseDefinition.id}`,
  caseId: caseDefinition.id,
  forbidden: [],
  id: caseDefinition.id,
  observed: passed ? [...caseDefinition.expected] : [],
  passed,
  rationale: passed
    ? 'The expected behavior was demonstrated.'
    : 'Expected evidence was missing.',
  workspaceChanges: {
    created: [],
    deleted: [],
    modified: [
      {
        after: AFTER_SNAPSHOT_STATE,
        before: BEFORE_SNAPSHOT_STATE,
        path: 'src/example.js',
      },
    ],
  },
});

test('actor prompt contains only the user scenario', () => {
  const actorPrompt = buildActorPrompt(CASE_DEFINITION);

  assert.equal(actorPrompt, CASE_DEFINITION.prompt);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
});

test('structured actor prompt excludes evaluation criteria', () => {
  const actorPrompt = buildActorPrompt({
    expected: ['expected-secret-label'],
    forbidden: ['forbidden-secret-label'],
    id: 'structured-evaluation',
    input: { changedPath: 'src/runtime.ts' },
    operation: 'evaluate',
    scenario: 'The adopted repository has one changed runtime file.',
  });

  assert.match(actorPrompt, /Requested operation: evaluate/);
  assert.match(actorPrompt, /src\/runtime\.ts/);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
});

test('judge prompt receives criteria after actor execution', () => {
  const judgePrompt = buildJudgePrompt(CASE_DEFINITION, 'Actor response', {
    created: [],
    deleted: [],
    modified: [],
  });

  assert.match(judgePrompt, /expected-secret-label/);
  assert.match(judgePrompt, /forbidden-secret-label/);
  assert.match(judgePrompt, /Actor response/);
});

test('assessment derives failure when expected evidence is missing', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({ forbidden: [], observed: [], rationale: 'No supporting evidence.' }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment derives failure when forbidden behavior is observed', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({
      forbidden: ['forbidden-secret-label'],
      observed: ['expected-secret-label'],
      rationale: 'Both behaviors were present.',
    }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment rejects labels outside the declared case contract', () => {
  assert.throws(
    () =>
      assessJudgeOutput(
        CASE_DEFINITION,
        JSON.stringify({
          forbidden: ['undeclared-label'],
          observed: ['expected-secret-label'],
          rationale: 'Unsupported label.',
        }),
      ),
    /undeclared behavior label/,
  );
});

test('semantic host commands use the runner-owned model and reasoning effort', () => {
  assert.equal(identifyConfiguredModel(SAFE_HOST_COMMAND), 'gpt-5.6-terra');
  assert.equal(identifyConfiguredReasoningEffort(SAFE_HOST_COMMAND), 'medium');
  assert.throws(
    () =>
      validateHostCommand(
        SAFE_HOST_COMMAND.map((commandPart) =>
          commandPart === 'model_reasoning_effort=medium'
            ? 'model_reasoning_effort=high'
            : commandPart,
        ),
      ),
    /must use medium reasoning effort/,
  );
});

test('semantic host commands reject caller-owned model and reasoning overrides', () => {
  assert.throws(
    () =>
      buildSemanticEvaluationHostCommand([
        ...BASE_HOST_COMMAND.slice(0, -1),
        '--model',
        'gpt-example',
        '-',
      ]),
    /must not override the runner-owned gpt-5\.6-terra model/,
  );
  assert.throws(
    () =>
      buildSemanticEvaluationHostCommand([
        ...BASE_HOST_COMMAND.slice(0, -1),
        '--config=model=gpt-example',
        '-',
      ]),
    /must not override the runner-owned gpt-5\.6-terra model/,
  );
  assert.throws(
    () =>
      buildSemanticEvaluationHostCommand([
        ...BASE_HOST_COMMAND.slice(0, -1),
        '-c',
        'model_reasoning_effort=high',
        '-',
      ]),
    /must not override the runner-owned reasoning effort/,
  );
});

test('semantic candidates bind exact artifacts, case suites, and hosts', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  const candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });

  assert.equal(
    createSemanticCaseSuiteDigest(caseDefinitions),
    createSemanticCaseSuiteDigest([...caseDefinitions].reverse()),
  );
  assert.throws(
    () => createSemanticCaseSuiteDigest([CASE_DEFINITION, CASE_DEFINITION]),
    /case IDs must be unique/,
  );
  assert.doesNotThrow(() =>
    validateSemanticCandidateCompatibility(candidate, {
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      judgeHost: JUDGE_HOST,
    }),
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: 'b'.repeat(64),
        caseDefinitions,
        judgeHost: JUDGE_HOST,
      }),
    /different portable artifact/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions: [
          { ...CASE_DEFINITION, prompt: 'Changed evaluation prompt.' },
          SECOND_CASE_DEFINITION,
        ],
        judgeHost: JUDGE_HOST,
      }),
    /different case suite/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: { ...ACTOR_HOST, version: '2.0.0' },
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        judgeHost: JUDGE_HOST,
      }),
    /different actor or judge hosts/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: { ...ACTOR_HOST, reasoningEffort: 'high' },
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        judgeHost: { ...JUDGE_HOST, reasoningEffort: 'high' },
      }),
    /different actor or judge hosts/,
  );
});

test('semantic candidates resume pending cases and replace targeted evidence', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  let candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });

  candidate = mergeSemanticCandidateResult(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, true),
    EVALUATED_AT,
  );
  candidate = mergeSemanticCandidateResult(
    candidate,
    SECOND_CASE_DEFINITION,
    createCaseResult(SECOND_CASE_DEFINITION, false),
    EVALUATED_AT,
  );

  assert.deepEqual(
    getPendingSemanticCaseDefinitions(candidate, caseDefinitions).map(({ id }) => id),
    [SECOND_CASE_DEFINITION.id],
  );
  assert.throws(
    () => validateSemanticResultRecording({ candidate, caseDefinitions }),
    /incomplete or failing/,
  );

  candidate = mergeSemanticCandidateResult(
    candidate,
    SECOND_CASE_DEFINITION,
    createCaseResult(SECOND_CASE_DEFINITION, true),
    '2026-08-16T12:01:00.000Z',
  );
  assert.deepEqual(getPendingSemanticCaseDefinitions(candidate, caseDefinitions), []);
  assert.doesNotThrow(() =>
    validateSemanticResultRecording({ candidate, caseDefinitions }),
  );

  const record = createSemanticEvaluationRecord({
    candidate,
    caseDefinitions,
    generatedAt: '2026-08-16T12:02:00.000Z',
  });
  assert.equal(record.evaluationProtocolVersion, 4);
  assert.equal(record.caseSuiteDigest, createSemanticCaseSuiteDigest(caseDefinitions));
  assert.deepEqual(
    record.cases.map(({ id }) => id),
    caseDefinitions.map(({ id }) => id),
  );
  assert.deepEqual(
    record.cases.map(({ caseDefinitionDigest }) => caseDefinitionDigest),
    caseDefinitions.map(createSemanticCaseDefinitionDigest),
  );
});

test('semantic candidate validation rejects internally inconsistent evidence', () => {
  const caseDefinitions = [CASE_DEFINITION];
  const candidate = mergeSemanticCandidateResult(
    createSemanticEvaluationCandidate({
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      generatedAt: EVALUATED_AT,
      judgeHost: JUDGE_HOST,
    }),
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, false),
    EVALUATED_AT,
  );

  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [{ ...candidate.results[0], passed: true }],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              workspaceChanges: { created: [], deleted: [], modified: ['src/example.js'] },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
});

test('semantic evidence normalization permits only release-version declarations', () => {
  const previousSkill = [
    'metadata:',
    '  version: "1.0.0"',
    '',
    'Skill release `1.0.0` supports exactly:',
    '',
    'Preserve canonical instruction provenance.',
  ].join('\n');
  const nextSkill = previousSkill.replaceAll('1.0.0', '1.0.1');

  assert.equal(
    normalizePortableSkillSemanticEvidence('SKILL.md', previousSkill),
    normalizePortableSkillSemanticEvidence('SKILL.md', nextSkill),
  );
  assert.equal(
    normalizePortableSkillSemanticEvidence(
      'references/local-tooling.md',
      'Release `1.0.0` supports:\n',
    ),
    normalizePortableSkillSemanticEvidence(
      'references/local-tooling.md',
      'Release `1.0.1` supports:\n',
    ),
  );
  assert.notEqual(
    normalizePortableSkillSemanticEvidence('SKILL.md', previousSkill),
    normalizePortableSkillSemanticEvidence(
      'SKILL.md',
      nextSkill.replace('Preserve canonical', 'Replace canonical'),
    ),
  );
  assert.match(createPortableSkillSemanticDigest(), /^[a-f0-9]{64}$/);
});

test('selects synthetic compatibility only for the two unsupported runtime states', () => {
  assert.deepEqual(getSyntheticCompatibilityCaseIds(), [
    'dedicated-repository-runtime-selection',
    'runtime-adapter-lifecycle',
  ]);
  assert.equal(
    getSemanticToolingSource('dedicated-repository-runtime-selection'),
    'synthetic-compatibility',
  );
  assert.equal(
    getSemanticToolingSource('runtime-adapter-lifecycle'),
    'synthetic-compatibility',
  );
  assert.equal(
    getSemanticToolingSource('agent-adoption-inline-runtime-instruction'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('adopted-relevance-no-change'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-insufficient-context'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-partial-context'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-sufficient-context'), 'published-package');
  assert.equal(getSemanticToolingSource('pnpm-pnp-local-cli-provider'), 'scenario-specific');
});

test('collects the exact published CLI production dependency closure', () => {
  const packageVersions = collectProductionPackageRoots(
    join(process.cwd(), 'node_modules', '@moldea.ai', 'cli'),
  )
    .map((packageRoot) => {
      const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
      return `${manifest.name}@${manifest.version}`;
    })
    .sort();

  assert.deepEqual(packageVersions, [
    '@moldea.ai/adapter-openai@2.0.0',
    '@moldea.ai/cli@2.0.0',
    '@moldea.ai/core@2.0.0',
    '@moldea.ai/repository-fs@1.0.1',
    '@moldea.ai/repository@1.0.1',
    'error-message-utils@1.2.11',
    'semver@7.8.5',
    'typescript@6.0.3',
    'yaml@2.9.0',
    'zod@4.3.6',
  ]);
});

test('code-mode host resolves only from the Codex executable directory', () => {
  const executableDirectory = mkdtempSync(join(tmpdir(), 'moldea-codex-bundle-test-'));
  const hostExecutable = join(executableDirectory, 'codex');
  const companionExecutable = join(executableDirectory, 'codex-code-mode-host');
  writeFileSync(hostExecutable, 'host');
  writeFileSync(companionExecutable, 'companion');
  chmodSync(companionExecutable, 0o755);

  try {
    assert.equal(resolveCodeModeHostPath(hostExecutable), companionExecutable);
    rmSync(companionExecutable);
    assert.throws(() => resolveCodeModeHostPath(hostExecutable), /code-mode host/);
  } finally {
    rmSync(executableDirectory, { force: true, recursive: true });
  }
});

test('sandbox uses an empty root, isolated network, and restricted relay', () => {
  const argumentsList = buildBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostCompanionExecutable: '/runtime/codex-code-mode-host',
    hostExecutable: '/usr/bin/codex',
    nodeExecutable: '/runtime/node',
    sandboxHome: '/tmp/evaluation-home',
  });
  assert.deepEqual(argumentsList.slice(0, 2), ['--die-with-parent', '--new-session']);
  assert.ok(argumentsList.includes('--unshare-net'));
  assert.ok(
    argumentsList.some((part) =>
      part.includes('TCP-LISTEN:3128,bind=127.0.0.1,reuseaddr,fork'),
    ),
  );
  assert.ok(
    argumentsList.some((part) =>
      part.includes('UNIX-CONNECT:/home/evaluator/egress-proxy.sock'),
    ),
  );
  assert.equal(
    argumentsList.some(
      (part, index) => part === '--ro-bind' && argumentsList[index + 1] === '/',
    ),
    false,
  );
  assert.ok(
    argumentsList.some(
      (part, index) =>
        part === '--ro-bind' &&
        argumentsList[index + 1] === '/runtime/codex-code-mode-host' &&
        argumentsList[index + 2] === '/opt/codex-code-mode-host',
    ),
  );
  assert.ok(
    argumentsList.some(
      (part, index) =>
        part === '--ro-bind' &&
        argumentsList[index + 1] === '/runtime/node' &&
        argumentsList[index + 2] === '/opt/node',
    ),
  );
  assert.ok(argumentsList.includes('/home/evaluator/bin:/opt:/usr/bin:/bin'));
});

test('sandbox mounts related repositories read-only', () => {
  const argumentsList = buildBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostExecutable: '/usr/bin/codex',
    readOnlyMounts: [
      {
        source: '/tmp/related-application',
        target: '/related-application',
      },
    ],
    sandboxHome: '/tmp/evaluation-home',
  });
  const mountIndex = argumentsList.findIndex(
    (part, index) =>
      part === '--ro-bind' && argumentsList[index + 1] === '/tmp/related-application',
  );

  assert.notEqual(mountIndex, -1);
  assert.equal(argumentsList[mountIndex + 2], '/related-application');
  assert.equal(
    argumentsList.some(
      (part, index) =>
        part === '--bind' && argumentsList[index + 1] === '/tmp/related-application',
    ),
    false,
  );
});

test('host command requires externally sandboxed execution mode', () => {
  assert.doesNotThrow(() => validateHostCommand(SAFE_HOST_COMMAND));
  assert.throws(
    () =>
      validateHostCommand([
        ...SAFE_HOST_COMMAND.slice(0, -1),
        '--sandbox',
        'workspace-write',
        '-',
      ]),
    /sandbox-weakening/,
  );
});

test('host command rejects writable paths outside the workspace', () => {
  assert.throws(
    () => validateHostCommand([...SAFE_HOST_COMMAND.slice(0, -1), '--add-dir', '/host', '-']),
    /sandbox-weakening/,
  );
});

test('host command rejects missing external-sandbox delegation', () => {
  assert.throws(
    () =>
      validateHostCommand(
        SAFE_HOST_COMMAND.filter(
          (part) => part !== '--dangerously-bypass-approvals-and-sandbox',
        ),
      ),
    /outer sandbox/,
  );
});
