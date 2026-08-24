// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { buildCodexEvaluationBwrapArguments } from '../tooling/codex-evaluation-host/index.mjs';

import {
  collectSkillArtifactEvidence,
  createActorRepository,
  prepareSemanticEvaluationHome,
  readSemanticEvaluationCandidate,
  seedSemanticTooling,
  writeSemanticEvaluationCandidate,
} from './semantic-evaluation-runner.mjs';

const ROOT_PACKAGE_MANIFEST = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const RELEASE_CLI_VERSION = ROOT_PACKAGE_MANIFEST.devDependencies['@moldea.ai/cli'];
const SEMANTIC_CASES = JSON.parse(
  readFileSync(join(process.cwd(), 'fixtures', 'conformance-cases.json'), 'utf8'),
).semanticCases;
const HOST_PLAN_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'host-plan-command-precedence',
);
const YARN_CONFLICT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'yarn-conflicting-cli-provider',
);
const UNADOPTED_CONTEXT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'unadopted-direct-context-handoff',
);
const ADOPTED_DIRECT_CONTEXT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'adopted-direct-context-handoff',
);
const AMBIGUOUS_CONTEXT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'adopted-ambiguous-context-handoff',
);
const EXPLICIT_CONTEXT_CORRECTION_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'adopted-explicit-context-correction',
);
const PARTIAL_INITIALIZATION_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'initialize-partial-context',
);
const INSUFFICIENT_INITIALIZATION_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'initialize-insufficient-context',
);
const RECONCILE_AMBIGUITY_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'reconcile-material-ambiguity',
);
const SKILL_HOST_METADATA_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'skill-maintain-host-invocation-policy',
);
const EXISTING_PROJECT_PLAN_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'plan-existing-project-one-agent',
);
const MULTI_AGENT_PLAN_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'plan-justified-multi-agent',
);
const AMBIGUOUS_PLAN_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'plan-material-ambiguity',
);
const GIT_HELPER_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'read-only-git-helper-suppression',
);
const PNPM_PNP_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'pnpm-pnp-local-cli-provider',
);
const PNPM_HOOK_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'pnpm-hook-install-blocked',
);
const SKILL_REUSE_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'skill-reuse-existing-cohesive',
);
const UNRESOLVED_REQUIREMENT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'unresolved-related-file-changed',
);
const DEDICATED_REPOSITORY_CASE_DEFINITIONS = SEMANTIC_CASES.filter(({ id }) =>
  ['dedicated-repository-runtime-selection', 'dedicated-repository-single-side-change'].includes(
    id,
  ),
);

test('actor repository materializes host instructions before the clean baseline', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-instructions-test-'));
  assert.ok(HOST_PLAN_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      HOST_PLAN_CASE_DEFINITION,
    );
    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const committedInstructions = spawnSync('git', ['show', 'HEAD:AGENTS.md'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });

    assert.equal(
      readFileSync(join(repositoryPath, 'AGENTS.md'), 'utf8'),
      HOST_PLAN_CASE_DEFINITION.hostInstructions,
    );
    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(committedInstructions.status, 0, committedInstructions.stderr);
    assert.equal(committedInstructions.stdout, HOST_PLAN_CASE_DEFINITION.hostInstructions);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('unadopted context handoff exposes no adoption state or marker', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-unadopted-context-test-'));
  assert.ok(UNADOPTED_CONTEXT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      UNADOPTED_CONTEXT_CASE_DEFINITION,
    );
    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');

    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(existsSync(join(repositoryPath, 'moldea')), false);
    assert.doesNotMatch(readme, /<!-- moldea:(?:start|end) -->/u);
    assert.equal(existsSync(join(repositoryPath, 'src', 'http-client.js')), true);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('adopted direct context handoff exposes canonical state and marker', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-adopted-context-test-'));
  assert.ok(ADOPTED_DIRECT_CONTEXT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      ADOPTED_DIRECT_CONTEXT_CASE_DEFINITION,
    );
    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');

    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(existsSync(join(repositoryPath, 'moldea', 'moldea.yaml')), true);
    assert.equal(existsSync(join(repositoryPath, 'moldea', 'project.md')), true);
    assert.match(readme, /<!-- moldea:start -->[\s\S]*<!-- moldea:end -->/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('ambiguous context scenario commits the established ownership baseline', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-ambiguous-context-test-'));
  assert.ok(AMBIGUOUS_CONTEXT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      AMBIGUOUS_CONTEXT_CASE_DEFINITION,
    );
    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const committedProject = spawnSync('git', ['show', 'HEAD:moldea/project.md'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });

    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(committedProject.status, 0, committedProject.stderr);
    assert.match(committedProject.stdout, /Finance currently owns refund approval/);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('explicit correction scenario commits the stale product boundary baseline', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-explicit-correction-test-'));
  assert.ok(EXPLICIT_CONTEXT_CORRECTION_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      EXPLICIT_CONTEXT_CORRECTION_CASE_DEFINITION,
    );
    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const committedProject = spawnSync('git', ['show', 'HEAD:moldea/project.md'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });

    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(committedProject.status, 0, committedProject.stderr);
    assert.match(committedProject.stdout, /authorizes payment decisions/);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('partial initialization exposes payment involvement without deciding authority', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-partial-initialization-test-'));
  assert.ok(PARTIAL_INITIALIZATION_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      PARTIAL_INITIALIZATION_CASE_DEFINITION,
    );
    const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
    const implementation = readFileSync(join(repositoryPath, 'src', 'invoice.js'), 'utf8');

    assert.match(readme, /payment handling/i);
    assert.doesNotMatch(readme, /authoriz|initiat|extract/i);
    assert.match(implementation, /processInvoice/);
    assert.doesNotMatch(implementation, /authoriz|initiat|payment|extract/i);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('insufficient initialization exposes only generic metadata and placeholder code', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-insufficient-initialization-test-'));
  assert.ok(INSUFFICIENT_INITIALIZATION_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      INSUFFICIENT_INITIALIZATION_CASE_DEFINITION,
    );
    const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
    const implementation = readFileSync(join(repositoryPath, 'src', 'index.js'), 'utf8');

    assert.equal(readme, '# Evaluation repository\n');
    assert.equal(implementation, 'export const project = {};\n');
    assert.equal(existsSync(join(repositoryPath, 'moldea')), false);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('reconciliation ambiguity exposes conflicting policy authorities', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-reconcile-ambiguity-test-'));
  assert.ok(RECONCILE_AMBIGUITY_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      RECONCILE_AMBIGUITY_CASE_DEFINITION,
    );
    const instruction = readFileSync(
      join(repositoryPath, 'moldea', 'agents', 'refund-agent', 'instruction.md'),
      'utf8',
    );
    const implementation = readFileSync(join(repositoryPath, 'src', 'refund-policy.js'), 'utf8');

    assert.match(instruction, /administrator may approve a refund/u);
    assert.match(implementation, /requiredApproverRole = "manager"/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill host metadata scenario begins with stale portable activation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-host-metadata-test-'));
  assert.ok(SKILL_HOST_METADATA_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      SKILL_HOST_METADATA_CASE_DEFINITION,
    );
    const portableSkill = readFileSync(
      join(repositoryPath, 'skills', 'deployment-review', 'SKILL.md'),
      'utf8',
    );
    const hostMetadata = readFileSync(
      join(repositoryPath, 'skills', 'deployment-review', 'agents', 'openai.yaml'),
      'utf8',
    );

    assert.match(portableSkill, /description: Review deployments\./u);
    assert.match(
      hostMetadata,
      /default_prompt: "Use \$deployment-review to review a deployment\."/u,
    );
    assert.match(hostMetadata, /allow_implicit_invocation: false/u);
    assert.match(hostMetadata, /brand_color: "#336699"/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('planning scenarios expose grounded evidence, permission boundaries, and authority conflict', async () => {
  const groundedRoot = mkdtempSync(join(tmpdir(), 'moldea-grounded-plan-test-'));
  const multiAgentRoot = mkdtempSync(join(tmpdir(), 'moldea-multi-agent-plan-test-'));
  const ambiguousRoot = mkdtempSync(join(tmpdir(), 'moldea-ambiguous-plan-test-'));
  assert.ok(EXISTING_PROJECT_PLAN_CASE_DEFINITION);
  assert.ok(MULTI_AGENT_PLAN_CASE_DEFINITION);
  assert.ok(AMBIGUOUS_PLAN_CASE_DEFINITION);

  try {
    const grounded = await createActorRepository(
      groundedRoot,
      EXISTING_PROJECT_PLAN_CASE_DEFINITION,
    );
    const multiAgent = await createActorRepository(
      multiAgentRoot,
      MULTI_AGENT_PLAN_CASE_DEFINITION,
    );
    const ambiguous = await createActorRepository(ambiguousRoot, AMBIGUOUS_PLAN_CASE_DEFINITION);
    const supportApi = readFileSync(join(grounded.repositoryPath, 'src', 'support-api.js'), 'utf8');
    const supportContract = readFileSync(
      join(grounded.repositoryPath, 'docs', 'support-triage.md'),
      'utf8',
    );
    const promotionContract = readFileSync(
      join(multiAgent.repositoryPath, 'docs', 'promotion-system.md'),
      'utf8',
    );
    const promotionControls = readFileSync(
      join(multiAgent.repositoryPath, 'src', 'promotion-controls.js'),
      'utf8',
    );
    const refundApi = readFileSync(join(ambiguous.repositoryPath, 'src', 'refund-api.js'), 'utf8');
    const authorityContract = readFileSync(
      join(ambiguous.repositoryPath, 'docs', 'refund-authority.md'),
      'utf8',
    );

    assert.match(supportApi, /authorization\.requireSupportAccess/u);
    assert.match(supportApi, /persistence\.saveClassification/u);
    assert.match(supportContract, /cannot authorize access or perform state transitions/u);
    assert.match(promotionContract, /Public market research has no customer access/u);
    assert.match(
      promotionContract,
      /Personalized recommendations require private purchase history/u,
    );
    assert.match(promotionContract, /human approves publication/u);
    assert.match(promotionControls, /eligible && humanApproved/u);
    assert.match(refundApi, /payments\.reverse/u);
    assert.match(authorityContract, /automated refunds/u);
    assert.match(authorityContract, /human to approve every reversal/u);
    assert.match(authorityContract, /No accepted decision/u);
  } finally {
    rmSync(groundedRoot, { force: true, recursive: true });
    rmSync(multiAgentRoot, { force: true, recursive: true });
    rmSync(ambiguousRoot, { force: true, recursive: true });
  }
});

test('partial requirement scenario leaves integration coverage unresolved at baseline', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-partial-requirement-test-'));
  assert.ok(UNRESOLVED_REQUIREMENT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      UNRESOLVED_REQUIREMENT_CASE_DEFINITION,
    );
    const manifest = readFileSync(join(repositoryPath, 'moldea', 'moldea.yaml'), 'utf8');
    const implementation = readFileSync(
      join(repositoryPath, 'src', 'pending-capability.js'),
      'utf8',
    );

    assert.match(manifest, /Confirm provider support and add passing integration coverage/u);
    assert.match(implementation, /providerSupport = false/u);
    assert.equal(existsSync(join(repositoryPath, 'test', 'provider.test.js')), false);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('dedicated repository scenarios expose the declared related application mount', async () => {
  assert.equal(DEDICATED_REPOSITORY_CASE_DEFINITIONS.length, 2);

  for (const caseDefinition of DEDICATED_REPOSITORY_CASE_DEFINITIONS) {
    const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-related-application-test-'));

    try {
      const { readOnlyMounts } = await createActorRepository(evaluationRoot, caseDefinition);

      assert.equal(readOnlyMounts.length, 1);
      assert.equal(readOnlyMounts[0].target, '/related-application');
      assert.equal(existsSync(join(readOnlyMounts[0].source, 'package.json')), true);
      assert.equal(existsSync(join(readOnlyMounts[0].source, 'src', 'refund-agent.js')), true);
      assert.match(
        readFileSync(join(readOnlyMounts[0].source, 'src', 'refund-agent.js'), 'utf8'),
        /web_search_preview/u,
      );
    } finally {
      rmSync(evaluationRoot, { force: true, recursive: true });
    }
  }
});

test('safe Git diff suppresses configured execution helpers', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-git-helper-test-'));
  assert.ok(GIT_HELPER_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      GIT_HELPER_CASE_DEFINITION,
    );
    const sentinelPath = join(repositoryPath, 'git-helper-ran.txt');
    const unsafeResult = spawnSync('git', ['diff', '--', 'src/project-state.js'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });

    assert.equal(unsafeResult.status, 0, unsafeResult.stderr);
    assert.equal(existsSync(sentinelPath), true);
    rmSync(sentinelPath);

    const safeResult = spawnSync(
      'git',
      [
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.pager=cat',
        '-c',
        'core.attributesFile=/dev/null',
        '-c',
        'filter.lfs.process=',
        '-c',
        'filter.lfs.smudge=',
        '-c',
        'filter.lfs.required=false',
        '-c',
        'diff.external=',
        '--no-pager',
        'diff',
        '--no-ext-diff',
        '--no-textconv',
        '--ignore-submodules=all',
        '--',
        'src/project-state.js',
      ],
      { cwd: repositoryPath, encoding: 'utf8' },
    );

    assert.equal(safeResult.status, 0, safeResult.stderr);
    assert.match(safeResult.stdout, /projectState = "changed"/u);
    assert.equal(existsSync(sentinelPath), false);
    const status = spawnSync(
      'git',
      [
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.pager=cat',
        '--no-pager',
        'status',
        '--porcelain',
        '--ignore-submodules=all',
      ],
      { cwd: repositoryPath, encoding: 'utf8' },
    );
    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, ' M src/project-state.js\n');
    assert.equal(existsSync(sentinelPath), false);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('pnpm hook scenario exposes executable configuration without installing the CLI', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-pnpm-hook-test-'));
  assert.ok(PNPM_HOOK_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      PNPM_HOOK_CASE_DEFINITION,
    );
    const packageManifest = JSON.parse(readFileSync(join(repositoryPath, 'package.json'), 'utf8'));
    const pnpmfile = readFileSync(join(repositoryPath, '.pnpmfile.cjs'), 'utf8');

    assert.equal(packageManifest.packageManager, 'pnpm@11.20.0');
    assert.equal(existsSync(join(repositoryPath, 'node_modules', '@moldea.ai', 'cli')), false);
    assert.match(pnpmfile, /hooks: \{ readPackage/u);
    assert.equal(existsSync(join(repositoryPath, 'package-manager-hook-ran.txt')), false);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('release-review fixture delegates changelog discovery to its verifier', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-release-verifier-test-'));
  assert.ok(SKILL_REUSE_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      SKILL_REUSE_CASE_DEFINITION,
    );
    const verifierPath = join(repositoryPath, 'scripts', 'verify-release.mjs');
    const { verifyRelease } = await import(pathToFileURL(verifierPath).href);

    assert.equal(verifyRelease({ manager: 'npm', repositoryRoot: repositoryPath }), false);

    writeFileSync(join(repositoryPath, 'CHANGELOG.md'), '# Changelog\n\n## Current\n', 'utf8');

    assert.equal(verifyRelease({ manager: 'npm', repositoryRoot: repositoryPath }), true);
    assert.equal(verifyRelease({ manager: 'unknown', repositoryRoot: repositoryPath }), false);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Yarn conflict scenario exposes read-only provider evidence and traps invocation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-yarn-conflict-test-'));
  assert.ok(YARN_CONFLICT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      YARN_CONFLICT_CASE_DEFINITION,
    );
    const sandboxHome = join(evaluationRoot, 'actor-home');
    const actorToolDirectory = join(evaluationRoot, 'actor-tools');
    const actorToolMounts = await prepareSemanticEvaluationHome(
      sandboxHome,
      YARN_CONFLICT_CASE_DEFINITION,
      actorToolDirectory,
    );

    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const packageManifest = JSON.parse(readFileSync(join(repositoryPath, 'package.json'), 'utf8'));
    const cliManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
        'utf8',
      ),
    );
    const conflictingManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, 'node_modules', 'conflicting-moldea-provider', 'package.json'),
        'utf8',
      ),
    );
    const binaryPath = join(repositoryPath, 'node_modules', '.bin', 'moldea');
    const conflictingBinaryPath = join(
      repositoryPath,
      'node_modules',
      'conflicting-moldea-provider',
      'bin',
      'moldea.cjs',
    );
    const yarnProbePath = join(actorToolDirectory, 'yarn');
    const sentinelPath = join(repositoryPath, 'unexpected-yarn-cli-invocation.txt');
    const runProbe = (argumentsList) =>
      spawnSync(process.execPath, [yarnProbePath, ...argumentsList], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });

    const versionResult = runProbe(['--version']);
    const infoResult = runProbe(['info', '@moldea.ai/cli', '--json']);
    const providerResult = runProbe(['bin', '-v', '--json']);

    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(packageManifest.packageManager, 'yarn@4.18.0');
    assert.deepEqual(packageManifest.devDependencies, {
      '@moldea.ai/cli': RELEASE_CLI_VERSION,
      'conflicting-moldea-provider': '1.0.0',
    });
    assert.equal(cliManifest.name, '@moldea.ai/cli');
    assert.equal(cliManifest.version, RELEASE_CLI_VERSION);
    assert.deepEqual(cliManifest.bin, { moldea: './dist/moldea.js' });
    assert.deepEqual(conflictingManifest, {
      bin: { moldea: './bin/moldea.cjs' },
      name: 'conflicting-moldea-provider',
      version: '1.0.0',
    });
    assert.equal(readlinkSync(binaryPath), '../conflicting-moldea-provider/bin/moldea.cjs');
    assert.equal(realpathSync(binaryPath), realpathSync(conflictingBinaryPath));
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout, '4.18.0\n');
    assert.equal(infoResult.status, 0, infoResult.stderr);
    assert.deepEqual(JSON.parse(infoResult.stdout), {
      value: `@moldea.ai/cli@npm:${RELEASE_CLI_VERSION}`,
      children: {
        Version: RELEASE_CLI_VERSION,
        'Exported Binaries': ['moldea'],
      },
    });
    assert.equal(providerResult.status, 0, providerResult.stderr);
    assert.deepEqual(JSON.parse(providerResult.stdout), {
      name: 'moldea',
      source: 'conflicting-moldea-provider',
      path: '/mnt/node_modules/conflicting-moldea-provider/bin/moldea.cjs',
    });
    assert.equal(existsSync(sentinelPath), false);

    assert.deepEqual(actorToolMounts, [
      { source: actorToolDirectory, target: '/home/evaluator/bin' },
    ]);
    const isolatedProbeResult = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: [
          'codex',
          '-c',
          [
            'test "$(command -v yarn)" = "/home/evaluator/bin/yarn"',
            'test "$(yarn --version)" = "4.18.0"',
            'if printf tampered > /home/evaluator/bin/yarn; then exit 10; fi',
            'test "$(yarn --version)" = "4.18.0"',
            'yarn bin -v --json',
          ].join(' && '),
        ],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        readOnlyMounts: actorToolMounts,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );

    assert.equal(isolatedProbeResult.status, 0, isolatedProbeResult.stderr);
    assert.deepEqual(JSON.parse(isolatedProbeResult.stdout), {
      name: 'moldea',
      source: 'conflicting-moldea-provider',
      path: '/mnt/node_modules/conflicting-moldea-provider/bin/moldea.cjs',
    });
    assert.match(isolatedProbeResult.stderr, /Read-only file system|Permission denied/);
    assert.equal(readFileSync(yarnProbePath, 'utf8').startsWith('#!/opt/node\n'), true);

    const forbiddenResult = runProbe(['exec', 'moldea', 'validate', '--json']);

    assert.equal(forbiddenResult.status, 2);
    assert.match(forbiddenResult.stderr, /must not be invoked/);
    assert.equal(readFileSync(sentinelPath, 'utf8'), 'yarn exec moldea validate --json\n');

    rmSync(sentinelPath);
    const forbiddenResolutionResult = runProbe(['bin', 'moldea']);

    assert.equal(forbiddenResolutionResult.status, 2);
    assert.match(forbiddenResolutionResult.stderr, /must not be invoked/);
    assert.equal(readFileSync(sentinelPath, 'utf8'), 'yarn bin moldea\n');

    rmSync(sentinelPath);
    const directInvocationResult = spawnSync(
      process.execPath,
      [conflictingBinaryPath, '--version'],
      {
        cwd: repositoryPath,
        encoding: 'utf8',
      },
    );

    assert.equal(directInvocationResult.status, 2);
    assert.match(directInvocationResult.stderr, /must not be invoked/);
    assert.equal(readFileSync(sentinelPath, 'utf8'), 'direct moldea --version\n');
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('pnpm PnP scenario resolves and executes the exact local CLI provider', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-pnpm-pnp-test-'));
  assert.ok(PNPM_PNP_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      PNPM_PNP_CASE_DEFINITION,
    );
    const sandboxHome = join(evaluationRoot, 'actor-home');
    const actorToolDirectory = join(evaluationRoot, 'actor-tools');
    const actorToolMounts = await prepareSemanticEvaluationHome(
      sandboxHome,
      PNPM_PNP_CASE_DEFINITION,
      actorToolDirectory,
    );
    const packageManifest = JSON.parse(readFileSync(join(repositoryPath, 'package.json'), 'utf8'));
    const pnpCliManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, '.pnp', 'node_modules', '@moldea.ai', 'cli', 'package.json'),
        'utf8',
      ),
    );
    const pnpResolutionProbe = [
      'const { realpathSync } = require("node:fs");',
      'const { isAbsolute, join, relative, resolve } = require("node:path");',
      'const pnpapi = require("pnpapi");',
      'const packageRoot = pnpapi.resolveToUnqualified("@moldea.ai/cli", "/mnt/package.json");',
      'const manifest = require(join(packageRoot, "package.json"));',
      'if (manifest.name !== "@moldea.ai/cli") process.exit(9);',
      `if (manifest.version !== ${JSON.stringify(RELEASE_CLI_VERSION)}) process.exit(10);`,
      'if (typeof manifest.bin?.moldea !== "string" || isAbsolute(manifest.bin.moldea)) process.exit(11);',
      'const canonicalRoot = realpathSync(packageRoot);',
      'const canonicalBin = realpathSync(resolve(canonicalRoot, manifest.bin.moldea));',
      'const relativeBin = relative(canonicalRoot, canonicalBin);',
      'if (relativeBin === ".." || relativeBin.startsWith("../") || isAbsolute(relativeBin)) process.exit(12);',
      'process.stdout.write(JSON.stringify({ binPath: canonicalBin, packageRoot: canonicalRoot }));',
    ].join(' ');
    const runIsolatedProbe = (command) =>
      spawnSync(
        'bwrap',
        buildCodexEvaluationBwrapArguments({
          command: ['codex', '-c', command],
          cwd: repositoryPath,
          hostExecutable: realpathSync('/bin/sh'),
          nodeExecutable: process.execPath,
          readOnlyMounts: actorToolMounts,
          sandboxHome,
        }),
        { encoding: 'utf8', timeout: 2_000 },
      );

    const versionResult = runIsolatedProbe('pnpm --version');
    const resolutionResult = runIsolatedProbe(
      `pnpm node --eval ${JSON.stringify(pnpResolutionProbe)}`,
    );

    assert.equal(packageManifest.packageManager, 'pnpm@11.21.0');
    assert.deepEqual(packageManifest.devDependencies, { '@moldea.ai/cli': RELEASE_CLI_VERSION });
    assert.equal(pnpCliManifest.version, RELEASE_CLI_VERSION);
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout, '11.21.0\n');
    assert.equal(resolutionResult.status, 0, resolutionResult.stderr);

    const resolvedProvider = JSON.parse(resolutionResult.stdout);
    assert.deepEqual(resolvedProvider, {
      binPath: '/mnt/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
      packageRoot: '/mnt/.pnp/node_modules/@moldea.ai/cli',
    });

    const invocationResult = runIsolatedProbe(
      `pnpm node ${JSON.stringify(resolvedProvider.binPath)} --version`,
    );
    assert.equal(invocationResult.status, 0, invocationResult.stderr);
    assert.equal(invocationResult.stdout.trim(), RELEASE_CLI_VERSION);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill artifact evidence exposes bounded content and independent validation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-evidence-test-'));
  const skillRoot = join(evaluationRoot, 'skills', 'release-review');
  mkdirSync(join(skillRoot, 'references'), { recursive: true });
  mkdirSync(join(skillRoot, 'assets'));
  mkdirSync(join(evaluationRoot, 'dist', 'skills', 'release-review'), { recursive: true });
  writeFileSync(
    join(skillRoot, 'SKILL.md'),
    [
      '---',
      'name: release-review',
      'description: Reviews npm and pnpm releases when publication readiness is requested.',
      '---',
      '',
      '# Release review',
      '',
      'Read [the release policy](/docs/release-policy.md).',
      'Read `references/package-managers.md` before verification.',
      'Run `/scripts/verify-release.mjs` after reviewing the policy.',
    ].join('\n'),
  );
  mkdirSync(join(evaluationRoot, 'docs'));
  writeFileSync(join(evaluationRoot, 'docs', 'release-policy.md'), '# Release policy\n');
  mkdirSync(join(evaluationRoot, 'scripts'));
  writeFileSync(
    join(evaluationRoot, 'scripts', 'verify-release.mjs'),
    'export const verifyRelease = () => true;\n',
  );
  writeFileSync(
    join(skillRoot, 'references', 'package-managers.md'),
    '# Package managers\n\nVerify npm and pnpm.\n',
  );
  writeFileSync(join(skillRoot, 'large.txt'), 'x'.repeat(32_769));
  symlinkSync('/outside-evaluation', join(skillRoot, 'linked-resource'));
  writeFileSync(
    join(evaluationRoot, 'dist', 'skills', 'release-review', 'SKILL.md'),
    readFileSync(join(skillRoot, 'SKILL.md')),
  );

  try {
    const evidence = await collectSkillArtifactEvidence(evaluationRoot, {
      id: 'skill-maintain-linked-resources',
      skillEvidence: {
        activationScenarios: [],
        artifacts: [
          {
            role: 'authoritative-source',
            root: 'skills/release-review',
          },
          {
            role: 'distributed-copy',
            root: 'dist/skills/release-review',
          },
        ],
      },
    });

    assert.equal(evidence.length, 2);
    assert.equal(evidence[0].role, 'authoritative-source');
    assert.equal(evidence[0].rootType, 'directory');
    assert.deepEqual(evidence[0].validation, {
      description: 'Reviews npm and pnpm releases when publication readiness is requested.',
      errors: [],
      name: 'release-review',
      valid: true,
    });
    assert.deepEqual(evidence[0].directories, [
      'skills/release-review',
      'skills/release-review/assets',
      'skills/release-review/references',
    ]);
    assert.equal(evidence[0].truncatedDirectoryCount, 0);
    assert.equal(evidence[0].excludedDirectoryCount, 0);
    assert.equal(evidence[0].truncatedFileCount, 0);
    assert.deepEqual(evidence[0].resourceReferences, [
      {
        isSafe: true,
        reference: '/docs/release-policy.md',
        resolvedPath: 'docs/release-policy.md',
        type: 'file',
      },
      {
        isSafe: true,
        reference: '/scripts/verify-release.mjs',
        resolvedPath: 'scripts/verify-release.mjs',
        type: 'file',
      },
      {
        isSafe: true,
        reference: 'references/package-managers.md',
        resolvedPath: 'skills/release-review/references/package-managers.md',
        type: 'file',
      },
    ]);
    assert.deepEqual(
      evidence[0].files.map(({ path }) => path),
      [
        'skills/release-review/SKILL.md',
        'skills/release-review/large.txt',
        'skills/release-review/linked-resource',
        'skills/release-review/references/package-managers.md',
      ],
    );
    assert.match(evidence[0].files[0].content, /Read `references\/package-managers\.md`/);
    assert.equal(evidence[0].files[1].omission, 'file-too-large');
    assert.equal(evidence[0].files[1].sha256, null);
    assert.equal(evidence[0].files[2].omission, 'symlink');
    assert.match(evidence[0].files[3].content, /Verify npm and pnpm/);
    assert.equal(evidence[0].isTraversalTruncated, false);
    assert.equal(evidence[0].truncatedResourceReferenceCount, 0);
    assert.equal(evidence[1].role, 'distributed-copy');
    assert.equal(evidence[1].validation.valid, true);
    assert.equal(evidence[1].files[0].path, 'dist/skills/release-review/SKILL.md');
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill artifact evidence stops traversal and reference inspection at hard limits', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-evidence-limits-test-'));
  const skillRoot = join(evaluationRoot, 'skills', 'bounded-skill');
  mkdirSync(skillRoot, { recursive: true });
  const references = Array.from(
    { length: 40 },
    (_, index) => `Read \`references/resource-${String(index).padStart(2, '0')}.md\`.`,
  );
  writeFileSync(
    join(skillRoot, 'SKILL.md'),
    [
      '---',
      'name: bounded-skill',
      'description: Exercises evaluator evidence limits when skill artifacts are unusually large.',
      '---',
      '',
      '# Bounded skill',
      '',
      ...references,
    ].join('\n'),
  );
  for (let index = 0; index < 40; index += 1) {
    mkdirSync(join(skillRoot, `directory-${String(index).padStart(2, '0')}`));
    writeFileSync(join(skillRoot, `file-${String(index).padStart(2, '0')}.txt`), 'evidence');
  }

  try {
    const [evidence] = await collectSkillArtifactEvidence(evaluationRoot, {
      id: 'skill-evidence-resource-limits',
      skillEvidence: {
        activationScenarios: [],
        artifacts: [{ role: 'authoritative-source', root: 'skills/bounded-skill' }],
      },
    });

    assert.equal(evidence.isTraversalTruncated, true);
    assert.deepEqual(evidence.directories, ['skills/bounded-skill']);
    assert.deepEqual(
      evidence.files.map(({ path }) => path),
      ['skills/bounded-skill/SKILL.md'],
    );
    assert.equal(evidence.resourceReferences.length, 32);
    assert.equal(evidence.truncatedResourceReferenceCount, 8);
    assert.equal(evidence.validation.valid, true);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill artifact evidence accepts the exact traversal limit without a false truncation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-evidence-boundary-test-'));
  const skillRoot = join(evaluationRoot, 'skills', 'boundary-skill');
  mkdirSync(skillRoot, { recursive: true });
  writeFileSync(
    join(skillRoot, 'SKILL.md'),
    [
      '---',
      'name: boundary-skill',
      'description: Exercises the exact semantic evidence traversal boundary.',
      '---',
      '',
      '# Boundary skill',
    ].join('\n'),
  );
  for (let index = 0; index < 63; index += 1) {
    mkdirSync(join(skillRoot, `directory-${String(index).padStart(2, '0')}`));
  }

  try {
    const [evidence] = await collectSkillArtifactEvidence(evaluationRoot, {
      id: 'skill-evidence-exact-traversal-limit',
      skillEvidence: {
        activationScenarios: [],
        artifacts: [{ role: 'authoritative-source', root: 'skills/boundary-skill' }],
      },
    });

    assert.equal(evidence.isTraversalTruncated, false);
    assert.equal(evidence.directories.length, 32);
    assert.equal(evidence.truncatedDirectoryCount, 32);
    assert.equal(evidence.validation.valid, true);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('semantic candidate checkpoints are atomically replaceable', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-candidate-test-'));
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

test('semantic actors execute the copied published CLI closure', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-published-cli-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  mkdirSync(repositoryPath);

  try {
    await seedSemanticTooling(repositoryPath, { id: 'adopted-relevance-no-change' });
    const packageManifest = JSON.parse(readFileSync(join(repositoryPath, 'package.json'), 'utf8'));
    const cliManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
        'utf8',
      ),
    );
    const binaryPath = join(repositoryPath, 'node_modules', '.bin', 'moldea');
    const versionResult = spawnSync(binaryPath, ['--version'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const compatibilityResult = spawnSync(binaryPath, ['compatibility', '--json'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const compatibilityEnvelope = JSON.parse(compatibilityResult.stdout);

    assert.deepEqual(packageManifest.devDependencies, { '@moldea.ai/cli': RELEASE_CLI_VERSION });
    assert.equal(cliManifest.bin.moldea, './dist/moldea.js');
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout.trim(), RELEASE_CLI_VERSION);
    assert.equal(compatibilityResult.status, 0, compatibilityResult.stderr);
    assert.equal(
      compatibilityEnvelope.schemaVersion,
      ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion,
    );
    assert.deepEqual(
      compatibilityEnvelope.result.packages,
      Object.entries(cliManifest.dependencies)
        .filter(([name]) => name.startsWith('@moldea.ai/'))
        .map(([name, version]) => ({ name, version }))
        .sort(({ name: left }, { name: right }) => left.localeCompare(right)),
    );
    for (const adapter of compatibilityEnvelope.result.adapters) {
      assert.deepEqual(Object.keys(adapter).sort(), ['id', 'repositoryFormatVersions']);
    }
    const openAiAdapter = compatibilityEnvelope.result.adapters.find(({ id }) => id === 'openai');
    assert.deepEqual(openAiAdapter.repositoryFormatVersions, [1]);
    const googleGenAiAdapter = compatibilityEnvelope.result.adapters.find(
      ({ id }) => id === 'google-genai',
    );
    assert.deepEqual(googleGenAiAdapter.repositoryFormatVersions, [1]);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
