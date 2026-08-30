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
  collectScenarioEvidence,
  hasValidScenarioEvidence,
} from '../tooling/semantic-evaluation/index.mjs';

import {
  collectSkillArtifactEvidence,
  createActorRepository,
  createSemanticEvaluationCandidate,
  parseSemanticEvaluationHostOutput,
  prepareSemanticEvaluationHome,
  readSemanticEvaluationCandidate,
  seedSemanticTooling,
  writeSemanticEvaluationCandidate,
} from './semantic-evaluation-runner.mjs';

const ROOT_PACKAGE_MANIFEST = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const RELEASE_CLI_VERSION = ROOT_PACKAGE_MANIFEST.devDependencies['@moldea.ai/cli'];
const RELEASE_CLI_JSON_SCHEMA_VERSION = ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion;
const SEMANTIC_CASES = JSON.parse(
  readFileSync(join(process.cwd(), 'fixtures', 'conformance-cases.json'), 'utf8'),
).semanticCases;
const HOST_PLAN_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'host-plan-command-precedence',
);
const SCRIPT_AUTHORITY_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'skill-evaluate-script-authority',
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
const MAINTAIN_CONTEXT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'maintain-context-without-duplication',
);
const COMPRESS_CONTEXT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'compress-project-context',
);
const CONFLICTING_COMPRESSION_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'compress-conflicting-project-context',
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
const DIRTY_WORKING_TREE_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'evaluate-dirty-working-tree',
);
const CLEAN_WORKING_TREE_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'evaluate-clean-working-tree',
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
const ROUTING_DESCRIPTION_FALLBACK_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'routing-description-fallback',
);
const DEDICATED_REPOSITORY_CASE_DEFINITIONS = SEMANTIC_CASES.filter(({ id }) =>
  ['dedicated-repository-runtime-selection', 'dedicated-repository-single-side-change'].includes(
    id,
  ),
);
const DEDICATED_RUNTIME_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'dedicated-repository-runtime-selection',
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

test('routing fallback fixture aligns the canonical description with the agent boundary', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-routing-fallback-test-'));
  assert.ok(ROUTING_DESCRIPTION_FALLBACK_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      ROUTING_DESCRIPTION_FALLBACK_CASE_DEFINITION,
    );

    assert.equal(
      readFileSync(
        join(repositoryPath, 'moldea', 'agents', 'triage-agent', 'description.md'),
        'utf8',
      ),
      'Classifies support requests for triage without making authorization decisions.\n',
    );
    assert.match(
      readFileSync(
        join(repositoryPath, 'moldea', 'agents', 'triage-agent', 'instruction.md'),
        'utf8',
      ),
      /Classify support requests without making authorization decisions/u,
    );
    assert.equal(
      existsSync(
        join(repositoryPath, 'moldea', 'agents', 'triage-agent', 'handoff-description.md'),
      ),
      false,
    );
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

test('dirty evaluation scenario exposes its complete change scope and canonical relationship', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-dirty-evaluation-test-'));
  assert.ok(DIRTY_WORKING_TREE_CASE_DEFINITION);

  try {
    const { readOnlyMounts, repositoryPath } = await createActorRepository(
      evaluationRoot,
      DIRTY_WORKING_TREE_CASE_DEFINITION,
    );
    const statusBefore = spawnSync('git', ['status', '--short', '--untracked-files=all'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    assert.equal(statusBefore.status, 0, statusBefore.stderr);
    assert.match(statusBefore.stdout, /^ D src\/deleted\.js$/mu);
    assert.match(statusBefore.stdout, /^R  src\/renamed-before\.js -> src\/renamed-after\.js$/mu);
    assert.match(statusBefore.stdout, /^M  src\/staged\.js$/mu);
    assert.match(statusBefore.stdout, /^ M src\/unstaged\.js$/mu);
    assert.match(statusBefore.stdout, /^\?\? src\/untracked\.js$/mu);

    const evidence = await collectScenarioEvidence({
      caseDefinition: DIRTY_WORKING_TREE_CASE_DEFINITION,
      readOnlyMounts,
      repositoryPath,
    });
    assert.equal(hasValidScenarioEvidence(evidence, DIRTY_WORKING_TREE_CASE_DEFINITION), true);

    const workspaceEvidence = new Map(
      evidence
        .filter(({ source }) => source.kind === 'workspace-path')
        .map(({ observation }) => [observation.path, observation]),
    );
    assert.deepEqual([...workspaceEvidence.keys()].sort(), [
      'moldea/moldea.yaml',
      'moldea/project.md',
      'src/deleted.js',
      'src/renamed-after.js',
      'src/renamed-before.js',
      'src/staged.js',
      'src/unstaged.js',
      'src/untracked.js',
    ]);
    assert.match(
      workspaceEvidence.get('moldea/moldea.yaml').content,
      /affectedBy:[\s\S]*\/src\/\*\*/u,
    );
    assert.match(
      workspaceEvidence.get('moldea/project.md').content,
      /Source files under `\/src\/\*\*`/u,
    );
    assert.equal(workspaceEvidence.get('src/deleted.js').type, 'missing');
    assert.equal(workspaceEvidence.get('src/renamed-before.js').type, 'missing');
    assert.equal(workspaceEvidence.get('src/renamed-after.js').type, 'file');
    assert.match(workspaceEvidence.get('src/staged.js').content, /state = "staged"/u);
    assert.match(workspaceEvidence.get('src/unstaged.js').content, /state = "unstaged"/u);
    assert.match(workspaceEvidence.get('src/untracked.js').content, /state = "untracked"/u);

    const statusAfter = spawnSync('git', ['status', '--short', '--untracked-files=all'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    assert.equal(statusAfter.status, 0, statusAfter.stderr);
    assert.equal(statusAfter.stdout, statusBefore.stdout);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('clean working tree exposes project-owned context and related implementation evidence', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-clean-working-tree-test-'));
  assert.ok(CLEAN_WORKING_TREE_CASE_DEFINITION);

  try {
    const { readOnlyMounts, repositoryPath } = await createActorRepository(
      evaluationRoot,
      CLEAN_WORKING_TREE_CASE_DEFINITION,
    );
    const evidence = await collectScenarioEvidence({
      caseDefinition: CLEAN_WORKING_TREE_CASE_DEFINITION,
      readOnlyMounts,
      repositoryPath,
    });
    assert.equal(hasValidScenarioEvidence(evidence, CLEAN_WORKING_TREE_CASE_DEFINITION), true);

    const workspaceEvidence = new Map(
      evidence
        .filter(({ source }) => source.kind === 'workspace-path')
        .map(({ observation }) => [observation.path, observation]),
    );
    assert.deepEqual(
      [...workspaceEvidence.keys()],
      ['moldea/moldea.yaml', 'moldea/project.md', 'src/project-state.js'],
    );
    assert.match(
      workspaceEvidence.get('moldea/moldea.yaml').content,
      /affectedBy:[\s\S]*\/src\/\*\*/u,
    );
    assert.match(
      workspaceEvidence.get('moldea/project.md').content,
      /Source files under `\/src\/\*\*` implement the project behavior represented/u,
    );
    assert.equal(
      workspaceEvidence.get('src/project-state.js').content,
      'export const projectState = "active";\n',
    );
    assert.equal(
      [...workspaceEvidence.keys()].some((path) => path.startsWith('.agents/skills/moldea')),
      false,
    );
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
    const partialProjectContext = readFileSync(
      join(repositoryPath, 'moldea', 'project.md'),
      'utf8',
    );

    assert.match(readme, /payment handling/i);
    assert.doesNotMatch(readme, /<!-- moldea:(?:start|end) -->/u);
    assert.doesNotMatch(readme, /authoriz|initiat|extract/i);
    assert.match(implementation, /processInvoice/);
    assert.doesNotMatch(implementation, /authoriz|initiat|payment|extract/i);
    assert.match(partialProjectContext, /payment authority is not established/i);
    assert.equal(existsSync(join(repositoryPath, 'moldea', 'moldea.yaml')), false);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('context-maintenance fixture keeps one established owner beside unrelated context', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-context-maintenance-test-'));
  assert.ok(MAINTAIN_CONTEXT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      MAINTAIN_CONTEXT_CASE_DEFINITION,
    );
    const manifest = readFileSync(join(repositoryPath, 'moldea', 'moldea.yaml'), 'utf8');
    const operations = readFileSync(
      join(repositoryPath, 'moldea', 'context', 'operations.md'),
      'utf8',
    );
    const architecture = readFileSync(
      join(repositoryPath, 'moldea', 'context', 'architecture.md'),
      'utf8',
    );

    assert.match(manifest, /\/moldea\/context\/operations\.md/u);
    assert.match(manifest, /\/moldea\/context\/architecture\.md/u);
    assert.match(operations, /Support owns the escalation policy/u);
    assert.match(operations, /Legal approves retention exceptions/u);
    assert.match(architecture, /modular monolith/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('context-compression fixture exposes duplicate, unique, requirement, and consumer state', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-context-compression-test-'));
  assert.ok(COMPRESS_CONTEXT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      COMPRESS_CONTEXT_CASE_DEFINITION,
    );
    const manifest = readFileSync(join(repositoryPath, 'moldea', 'moldea.yaml'), 'utf8');
    const operations = readFileSync(
      join(repositoryPath, 'moldea', 'context', 'operations.md'),
      'utf8',
    );
    const escalations = readFileSync(
      join(repositoryPath, 'moldea', 'context', 'escalations.md'),
      'utf8',
    );
    const contextIndex = readFileSync(join(repositoryPath, 'docs', 'context-index.md'), 'utf8');

    assert.match(operations, /Customer Operations owns the escalation policy/u);
    assert.match(escalations, /Customer Operations owns the escalation policy/u);
    assert.match(operations, /Legal approves retention exceptions/u);
    assert.match(escalations, /after-hours escalation owner remains unresolved/u);
    assert.match(manifest, /after-hours-escalation:[\s\S]*\/moldea\/context\/escalations\.md/u);
    assert.match(contextIndex, /operations\.md/u);
    assert.match(contextIndex, /escalations\.md/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('conflicting-compression fixture exposes both current ownership claims', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-context-conflict-test-'));
  assert.ok(CONFLICTING_COMPRESSION_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      CONFLICTING_COMPRESSION_CASE_DEFINITION,
    );
    const financeContext = readFileSync(
      join(repositoryPath, 'moldea', 'context', 'finance-operations.md'),
      'utf8',
    );
    const customerOperationsContext = readFileSync(
      join(repositoryPath, 'moldea', 'context', 'customer-operations.md'),
      'utf8',
    );

    assert.match(financeContext, /Finance owns escalation approval/u);
    assert.match(customerOperationsContext, /Customer Operations owns escalation approval/u);
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
      assert.equal(existsSync(join(readOnlyMounts[0].source, 'src', 'refund-agent.ts')), true);
      assert.match(
        readFileSync(join(readOnlyMounts[0].source, 'src', 'refund-agent.ts'), 'utf8'),
        /web_search_preview/u,
      );
    } finally {
      rmSync(evaluationRoot, { force: true, recursive: true });
    }
  }
});

test('hardened Git diff still executes a repository clean filter', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-git-helper-test-'));
  assert.ok(GIT_HELPER_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      GIT_HELPER_CASE_DEFINITION,
    );
    const sentinelPath = join(repositoryPath, 'git-helper-ran.txt');
    const scenarioEvidence = await collectScenarioEvidence({
      caseDefinition: GIT_HELPER_CASE_DEFINITION,
      readOnlyMounts: [],
      repositoryPath,
    });

    assert.equal(hasValidScenarioEvidence(scenarioEvidence, GIT_HELPER_CASE_DEFINITION), true);
    const workspaceEvidence = new Map(
      scenarioEvidence
        .filter(({ source }) => source.kind === 'workspace-path')
        .map(({ observation }) => [observation.path, observation]),
    );
    assert.equal(workspaceEvidence.get('git-helper-ran.txt').type, 'missing');
    assert.match(workspaceEvidence.get('git-execution-trap.sh').content, /git-helper-ran\.txt/u);
    assert.equal(existsSync(sentinelPath), false);

    const unsafeResult = spawnSync('git', ['diff', '--', 'src/project-state.js'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });

    assert.equal(unsafeResult.status, 0, unsafeResult.stderr);
    assert.equal(existsSync(sentinelPath), true);
    rmSync(sentinelPath);

    const hardenedResult = spawnSync(
      'git',
      [
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.pager=cat',
        '-c',
        'core.attributesFile=/dev/null',
        '-c',
        'filter.lfs.clean=',
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
      {
        cwd: repositoryPath,
        encoding: 'utf8',
        env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' },
      },
    );

    assert.equal(hardenedResult.status, 0, hardenedResult.stderr);
    assert.match(hardenedResult.stdout, /projectState = "changed"/u);
    assert.equal(existsSync(sentinelPath), true);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('script-authority scenario sources the publication contract and pre-execution sentinel', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-script-authority-test-'));
  assert.ok(SCRIPT_AUTHORITY_CASE_DEFINITION);

  try {
    const { readOnlyMounts, repositoryPath } = await createActorRepository(
      evaluationRoot,
      SCRIPT_AUTHORITY_CASE_DEFINITION,
    );
    const scenarioEvidence = await collectScenarioEvidence({
      caseDefinition: SCRIPT_AUTHORITY_CASE_DEFINITION,
      readOnlyMounts,
      repositoryPath,
    });

    assert.equal(
      hasValidScenarioEvidence(scenarioEvidence, SCRIPT_AUTHORITY_CASE_DEFINITION),
      true,
    );
    const workspaceEvidence = new Map(
      scenarioEvidence
        .filter(({ source }) => source.kind === 'workspace-path')
        .map(({ observation }) => [observation.path, observation]),
    );
    assert.equal(workspaceEvidence.get('script-executed.txt').type, 'missing');
    assert.match(
      workspaceEvidence.get('skills/release-publish/scripts/publish.mjs').content,
      /writeFileSync\('script-executed\.txt'/u,
    );
    assert.equal(existsSync(join(repositoryPath, 'script-executed.txt')), false);
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
    const sandboxHome = join(evaluationRoot, 'actor-home');
    const actorToolDirectory = join(evaluationRoot, 'actor-tools');
    const actorToolMounts = await prepareSemanticEvaluationHome(
      sandboxHome,
      PNPM_HOOK_CASE_DEFINITION,
      actorToolDirectory,
    );

    assert.equal(packageManifest.packageManager, 'pnpm@11.20.0');
    assert.equal(existsSync(join(repositoryPath, 'node_modules', '@moldea.ai', 'cli')), false);
    assert.match(pnpmfile, /hooks: \{ readPackage/u);
    assert.equal(existsSync(join(repositoryPath, 'package-manager-hook-ran.txt')), false);
    assert.deepEqual(actorToolMounts, [
      { source: actorToolDirectory, target: '/home/evaluator/bin' },
    ]);
    assert.equal(
      readFileSync(join(actorToolDirectory, 'git'), 'utf8').startsWith('#!/opt/node\n'),
      true,
    );
    assert.equal(
      readFileSync(join(actorToolDirectory, 'npm'), 'utf8').startsWith('#!/opt/node\n'),
      true,
    );
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

test('dedicated runtime scenario exposes the verified public compatibility target', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-runtime-publication-test-'));
  assert.ok(DEDICATED_RUNTIME_CASE_DEFINITION);

  try {
    const sandboxHome = join(evaluationRoot, 'actor-home');
    const actorToolDirectory = join(evaluationRoot, 'actor-tools');
    const actorToolMounts = await prepareSemanticEvaluationHome(
      sandboxHome,
      DEDICATED_RUNTIME_CASE_DEFINITION,
      actorToolDirectory,
    );
    const publicationResult = spawnSync(
      process.execPath,
      [join(actorToolDirectory, 'curl'), 'https://packages.moldea.ai/compatibility/runtimes.json'],
      { encoding: 'utf8' },
    );

    assert.equal(publicationResult.status, 0, publicationResult.stderr);
    assert.deepEqual(actorToolMounts, [
      { source: actorToolDirectory, target: '/home/evaluator/bin' },
    ]);
    assert.equal(
      readFileSync(join(actorToolDirectory, 'git'), 'utf8').startsWith('#!/opt/node\n'),
      true,
    );
    const openAiPublication = JSON.parse(publicationResult.stdout).adapters.openai;
    assert.equal(openAiPublication.compatibleCoreRange, '^2.0.0');
    assert.equal(openAiPublication.implementation.versionRange, '^2.0.0');
    assert.equal(openAiPublication.runtimeGuidance.expectation, 'recommended');
    assert.equal(openAiPublication.targets.length, 1);
    assert.equal(openAiPublication.targets[0].id, 'typescript-responses-api-7');
    assert.equal(openAiPublication.targets[0].language, 'typescript');
    assert.equal(openAiPublication.targets[0].lastVerifiedAt, '2026-08-17');
    assert.equal(openAiPublication.targets[0].maturity, 'experimental');
    assert.deepEqual(openAiPublication.targets[0].packages, [
      {
        ecosystem: 'npm',
        name: 'openai',
        role: 'primary',
        versionRange: '>=7.4.0 <8.0.0',
      },
    ]);
    assert.deepEqual(
      openAiPublication.targets[0].patterns.map(({ id }) => id),
      [
        'direct-instruction-loader',
        'chat-completions',
        'direct-responses-runtime-agent',
        'dynamic-source-indirection',
        'direct-tool-input-schema',
        'static-function-tools',
      ],
    );
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

    const hostOutput = [
      {
        item: {
          aggregated_output: infoResult.stdout,
          command: 'yarn info @moldea.ai/cli --json',
          exit_code: infoResult.status,
          id: 'package-info-command',
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      {
        item: {
          aggregated_output: providerResult.stdout,
          command: 'yarn bin -v --json',
          exit_code: providerResult.status,
          id: 'provider-command',
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      {
        item: {
          id: 'response',
          text: 'Yarn provider proof complete.',
          type: 'agent_message',
        },
        type: 'item.completed',
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n');
    const parsedHostOutput = parseSemanticEvaluationHostOutput(hostOutput, {
      cliVersion: RELEASE_CLI_VERSION,
      jsonSchemaVersion: RELEASE_CLI_JSON_SCHEMA_VERSION,
    });

    assert.deepEqual(parsedHostOutput.actorExecutionEvidence[0].item.outputEvidence.facts, [
      {
        binaries: ['moldea'],
        kind: 'yarn-package-info',
        packageName: '@moldea.ai/cli',
        version: RELEASE_CLI_VERSION,
      },
    ]);
    assert.deepEqual(parsedHostOutput.actorExecutionEvidence[1].item.outputEvidence.facts, [
      {
        binaryName: 'moldea',
        kind: 'yarn-binary-provider',
        source: 'conflicting-moldea-provider',
      },
    ]);

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
      'process.stdout.write(canonicalRoot + "\\n" + canonicalBin + "\\n");',
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
    assert.deepEqual(packageManifest.devDependencies, {
      '@moldea.ai/cli': RELEASE_CLI_VERSION,
    });
    assert.equal(pnpCliManifest.version, RELEASE_CLI_VERSION);
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout, '11.21.0\n');
    assert.equal(resolutionResult.status, 0, resolutionResult.stderr);

    const [packageRoot, binPath] = resolutionResult.stdout.trim().split('\n');
    const resolvedProvider = { binPath, packageRoot };
    assert.deepEqual(resolvedProvider, {
      binPath: '/mnt/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
      packageRoot: '/mnt/.pnp/node_modules/@moldea.ai/cli',
    });
    const pathCommand = `realpath ${resolvedProvider.packageRoot}; realpath ${resolvedProvider.binPath}`;
    const pathResult = runIsolatedProbe(pathCommand);
    assert.equal(pathResult.status, 0, pathResult.stderr);
    assert.equal(pathResult.stdout, resolutionResult.stdout);

    const invocationResult = runIsolatedProbe(
      `pnpm node ${JSON.stringify(resolvedProvider.binPath)} --version`,
    );
    const inspectCommand = `pnpm node ${resolvedProvider.binPath} inspect --json`;
    const inspectResult = runIsolatedProbe(inspectCommand);
    assert.equal(invocationResult.status, 0, invocationResult.stderr);
    assert.equal(invocationResult.stdout.trim(), RELEASE_CLI_VERSION);
    assert.equal(inspectResult.status, 1, inspectResult.stderr);

    const hostOutput = [
      {
        item: {
          aggregated_output: pathResult.stdout,
          command: pathCommand,
          exit_code: pathResult.status,
          id: 'resolution-command',
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      {
        item: {
          aggregated_output: inspectResult.stdout,
          command: inspectCommand,
          exit_code: inspectResult.status,
          id: 'inspect-command',
          status: 'failed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      {
        item: {
          id: 'response',
          text: 'PnP proof complete.',
          type: 'agent_message',
        },
        type: 'item.completed',
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n');
    const parsedHostOutput = parseSemanticEvaluationHostOutput(hostOutput, {
      cliVersion: RELEASE_CLI_VERSION,
      jsonSchemaVersion: RELEASE_CLI_JSON_SCHEMA_VERSION,
    });

    assert.deepEqual(parsedHostOutput.actorExecutionEvidence[0].item.outputEvidence.facts, [
      {
        kind: 'workspace-paths',
        paths: [
          '/.pnp/node_modules/@moldea.ai/cli',
          '/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
        ],
      },
    ]);
    assert.equal(parsedHostOutput.actorExecutionEvidence[1].item.exitCode, 1);
    assert.deepEqual(parsedHostOutput.actorExecutionEvidence[1].item.outputEvidence.facts, [
      {
        cliVersion: RELEASE_CLI_VERSION,
        command: 'inspect',
        errorPresent: false,
        kind: 'moldea-cli-envelope',
        resultPresent: true,
        schemaVersion: RELEASE_CLI_JSON_SCHEMA_VERSION,
        status: 'invalid',
      },
    ]);
    const serializedFacts = JSON.stringify(
      parsedHostOutput.actorExecutionEvidence.flatMap(
        ({ item }) => item.outputEvidence?.facts ?? [],
      ),
    );
    assert.doesNotMatch(serializedFacts, /\/mnt|issues|diagnostic|message/u);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill artifact evidence exposes bounded content and independent validation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-evidence-test-'));
  const skillRoot = join(evaluationRoot, 'skills', 'release-review');
  mkdirSync(join(skillRoot, 'references'), { recursive: true });
  mkdirSync(join(skillRoot, 'assets'));
  mkdirSync(join(evaluationRoot, 'dist', 'skills', 'release-review'), {
    recursive: true,
  });
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
    await seedSemanticTooling(repositoryPath, {
      id: 'adopted-relevance-no-change',
    });
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
    const compositionResult = spawnSync(binaryPath, ['composition', '--json'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const compositionEnvelope = JSON.parse(compositionResult.stdout);
    const directCommand = 'node_modules/.bin/moldea composition --json';
    const invocationCases = [
      {
        args: ['composition', '--json'],
        command: directCommand,
        executable: 'node_modules/.bin/moldea',
      },
      {
        args: ['node_modules/.bin/moldea', 'composition', '--json'],
        command: `node ${directCommand}`,
        executable: 'node',
      },
      {
        args: ['-lc', directCommand],
        command: `/bin/bash -lc '${directCommand}'`,
        executable: '/bin/bash',
      },
      {
        args: ['-lc', directCommand],
        command: `/bin/bash -lc "${directCommand}"`,
        executable: '/bin/bash',
      },
    ];
    const invocationResults = invocationCases.map(({ args, executable }) =>
      spawnSync(executable, args, { cwd: repositoryPath, encoding: 'utf8' }),
    );
    const hostOutput = [
      ...invocationCases.map(({ command }, index) => ({
        item: {
          aggregated_output: invocationResults[index].stdout,
          command,
          exit_code: invocationResults[index].status,
          id: `approved-command-${index}`,
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      })),
      {
        item: {
          aggregated_output: invocationResults[0].stdout,
          command: `${directCommand} | cat`,
          exit_code: invocationResults[0].status,
          id: 'rejected-command',
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      {
        item: {
          id: 'response',
          text: 'CLI proof complete.',
          type: 'agent_message',
        },
        type: 'item.completed',
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n');
    const parsedHostOutput = parseSemanticEvaluationHostOutput(hostOutput, {
      cliVersion: RELEASE_CLI_VERSION,
      jsonSchemaVersion: RELEASE_CLI_JSON_SCHEMA_VERSION,
    });

    assert.deepEqual(packageManifest.devDependencies, {
      '@moldea.ai/cli': RELEASE_CLI_VERSION,
    });
    assert.equal(cliManifest.bin.moldea, './dist/moldea.js');
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout.trim(), RELEASE_CLI_VERSION);
    assert.equal(compositionResult.status, 0, compositionResult.stderr);
    for (const invocationResult of invocationResults) {
      assert.equal(invocationResult.status, 0, invocationResult.stderr);
    }
    for (const evidence of parsedHostOutput.actorExecutionEvidence.slice(0, 4)) {
      assert.deepEqual(evidence.item.outputEvidence.facts, [
        {
          cliVersion: RELEASE_CLI_VERSION,
          command: 'composition',
          errorPresent: false,
          kind: 'moldea-cli-envelope',
          resultPresent: true,
          schemaVersion: RELEASE_CLI_JSON_SCHEMA_VERSION,
          status: 'valid',
        },
      ]);
    }
    assert.deepEqual(parsedHostOutput.actorExecutionEvidence[4].item.outputEvidence, {
      byteCount: Buffer.byteLength(invocationResults[0].stdout),
      disposition: 'unrecognized',
      facts: [],
    });
    assert.doesNotMatch(
      JSON.stringify(parsedHostOutput.actorExecutionEvidence),
      /node_modules|\/bin\/bash|\| cat/u,
    );
    assert.equal(
      compositionEnvelope.schemaVersion,
      ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion,
    );
    assert.deepEqual(
      compositionEnvelope.result.packages,
      Object.entries(cliManifest.dependencies)
        .filter(([name]) => name.startsWith('@moldea.ai/'))
        .map(([name, version]) => ({ name, version }))
        .sort(({ name: left }, { name: right }) => left.localeCompare(right)),
    );
    for (const adapter of compositionEnvelope.result.adapters) {
      assert.deepEqual(Object.keys(adapter).sort(), ['id', 'repositoryFormatVersions']);
    }
    const openAiAdapter = compositionEnvelope.result.adapters.find(({ id }) => id === 'openai');
    assert.deepEqual(openAiAdapter.repositoryFormatVersions, [1]);
    const googleGenAiAdapter = compositionEnvelope.result.adapters.find(
      ({ id }) => id === 'google-genai',
    );
    assert.deepEqual(googleGenAiAdapter.repositoryFormatVersions, [1]);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
