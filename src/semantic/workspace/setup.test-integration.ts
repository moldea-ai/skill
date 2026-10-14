// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { IManifestScopeMatch } from '@moldea.ai/core';
import { afterEach, beforeAll, test } from 'vitest';

import { loadSemanticCases, type ISemanticCase } from '../cases/index.ts';

import { createActorRepository, snapshotSemanticWorkspace } from './setup.ts';

const CASE_DIRECTORY = resolve(import.meta.dirname, '..', 'cases');
const GATE_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'moldea',
  'scripts',
  'relevance-gate.mjs',
);
const LAUNCHER_PATH = resolve(import.meta.dirname, '../../../moldea/scripts/moldea-cli.mjs');
const MANAGED_BLOCK_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'moldea',
  'assets',
  'managed-readme-block.md',
);
const MANAGED_WRITER_PATH = resolve(
  import.meta.dirname,
  '../../../moldea/scripts/managed-readme.mjs',
);
type IScopeFixtureEnvelope = {
  result: {
    valid: boolean;
    relevant: boolean;
    counts: { inputPaths: number };
    page: { cursor: string | null; records: Array<{ match: IManifestScopeMatch }> };
  };
};

const temporaryRoots: string[] = [];
let cases: ISemanticCase[];

beforeAll(async () => {
  cases = await loadSemanticCases(CASE_DIRECTORY);
});

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

const withEmptyCodexHome = async <T>(root: string, operation: () => Promise<T>): Promise<T> => {
  const originalCodexHome = process.env['CODEX_HOME'];
  const sourceCodexHome = join(root, 'source-codex-home');
  mkdirSync(sourceCodexHome);
  process.env['CODEX_HOME'] = sourceCodexHome;
  try {
    return await operation();
  } finally {
    if (originalCodexHome === undefined) delete process.env['CODEX_HOME'];
    else process.env['CODEX_HOME'] = originalCodexHome;
  }
};

const materializeCase = async (caseId: string, withGitBaseline = false) => {
  const caseDefinition = cases.find(({ id }) => id === caseId);
  assert.ok(caseDefinition, `Missing semantic case ${caseId}.`);
  const root = mkdtempSync(join(tmpdir(), 'moldea-setup-'));
  temporaryRoots.push(root);
  return withEmptyCodexHome(root, async () => {
    if (withGitBaseline) {
      const { repositoryPath } = await createActorRepository(
        root,
        caseDefinition,
        join(root, 'sandbox-home'),
        join(root, 'actor-tools'),
      );
      return { caseDefinition, repositoryPath };
    }
    const repositoryPath = join(root, 'actor');
    mkdirSync(repositoryPath);
    const setupResult = await caseDefinition.setup?.({
      actorToolDirectory: join(root, 'actor-tools'),
      repositoryPath,
      sandboxHome: join(root, 'sandbox-home'),
    });
    assert.ok(setupResult);
    await setupResult.afterBaseline?.();
    return { caseDefinition, repositoryPath };
  });
};

const gateResult = (repositoryPath: string, paths: string[], isAdoptionOnly = false): string => {
  const result = spawnSync(
    process.execPath,
    [GATE_PATH, '--repository', repositoryPath, ...(isAdoptionOnly ? ['--adoption-only'] : [])],
    { encoding: 'utf8', input: paths.length === 0 ? '' : `${paths.join('\0')}\0` },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
};

const launcherOutput = (repositoryPath: string, operation: string[], input?: string): string => {
  const result = spawnSync(
    process.execPath,
    [
      LAUNCHER_PATH,
      '--repository',
      repositoryPath,
      '--',
      ...operation,
      '--json',
      '--max-output-bytes',
      '65536',
    ],
    { encoding: 'utf8', input, maxBuffer: 65536 },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, '');
  assert.ok(Buffer.byteLength(result.stdout, 'utf8') <= 65536);
  return result.stdout;
};

const runFixtureTests = (repositoryPath: string, testPaths: string[]): void => {
  const result = spawnSync(process.execPath, ['--test', ...testPaths], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
};

test('every semantic case materializes a snapshot-ready actor repository', async () => {
  for (const caseDefinition of cases) {
    const root = mkdtempSync(join(tmpdir(), 'moldea-setup-'));
    try {
      const { hasWorkspaceBinaryDirectory, repositoryPath } = await withEmptyCodexHome(root, () =>
        createActorRepository(
          root,
          caseDefinition,
          join(root, 'sandbox-home'),
          join(root, 'actor-tools'),
        ),
      );
      if (caseDefinition.id === 'host-plan-command-precedence') {
        assert.equal(hasWorkspaceBinaryDirectory, false);
      }
      if (caseDefinition.id === 'explicit-moldea-validation') {
        assert.equal(hasWorkspaceBinaryDirectory, true);
      }
      await snapshotSemanticWorkspace(repositoryPath);
    } catch (error) {
      throw new Error(`Unable to materialize semantic case ${caseDefinition.id}.`, {
        cause: error,
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }
}, 300_000);

test.each([
  'adopted-explicit-context-correction',
  'readonly-context-correction',
  'approved-context-change',
  'skill-ownership-followup',
  'skill-independent-followup',
  'editorial-feedback-information',
])('%s has bounded discoverable context without path-based activation', async (caseId) => {
  const { repositoryPath } = await materializeCase(caseId, true);
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  assert.equal(
    gateResult(repositoryPath, [
      '/src/project-state.js',
      '/src/cleanup-scheduler.js',
      '/skills/reddit-review/SKILL.md',
    ]),
    '0\n',
  );
  const inventory = launcherOutput(repositoryPath, ['inspect']);
  assert.ok(inventory.includes('/moldea/project.md'));
  assert.ok(inventory.includes('/moldea/context/operations.md'));
  assert.equal(inventory.includes('The operations team owns'), false);
  const selectedPath =
    caseId.startsWith('skill-') || caseId === 'editorial-feedback-information'
      ? '/moldea/context/editorial-policy.md'
      : '/moldea/project.md';
  const selectedContent = launcherOutput(repositoryPath, ['content', '--path', selectedPath]);
  assert.ok(selectedContent.includes(selectedPath));
  assert.equal(selectedContent.includes('The operations team owns'), false);
  if (selectedPath.endsWith('editorial-policy.md')) {
    assert.ok(selectedContent.includes('disclose commercial relationships'));
    assert.equal(gateResult(repositoryPath, ['/skills/reddit-review/SKILL.md']), '0\n');
  } else if (caseId.includes('correction')) {
    assert.ok(selectedContent.includes('authorizes payment decisions'));
  } else if (caseId === 'approved-context-change') {
    assert.ok(selectedContent.includes('60-minute interval'));
    assert.match(
      readFileSync(join(repositoryPath, 'src', 'cleanup-scheduler.js'), 'utf8'),
      /=> 60/u,
    );
  } else {
    assert.ok(selectedContent.includes('extracts and validates invoice data'));
    assert.equal(selectedContent.includes('production access'), false);
    assert.equal(selectedContent.includes('dashboard filters'), false);
  }
});

test('generic project evaluation fixture has no declared path relationship', async () => {
  const { repositoryPath } = await materializeCase('evaluate-brief-project-request', true);
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  assert.equal(gateResult(repositoryPath, ['/src/project-state.js']), '0\n');
  assert.match(readFileSync(join(repositoryPath, 'moldea', 'project.md'), 'utf8'), /no declared/u);
});

test.each(['model-workflow-routing', 'unrelated-sdk-maintenance'])(
  '%s supplies executable unbound model and SDK evidence after adoption',
  async (caseId) => {
    const { caseDefinition, repositoryPath } = await materializeCase(caseId, true);
    assert.equal(gateResult(repositoryPath, [], true), '1\n');
    assert.equal(
      gateResult(repositoryPath, ['/src/incident-workflow.js', '/src/sdk-usage.js']),
      '0\n',
    );
    runFixtureTests(repositoryPath, [
      'src/sdk-usage.test-unit.js',
      'src/incident-workflow.test-integration.js',
    ]);
    for (const { source } of caseDefinition.input.repositoryEvidence) {
      if (source.kind === 'workspace-path') {
        assert.equal(existsSync(join(repositoryPath, source.path)), true, source.path);
      }
    }
    // the real invocation test must detect lost model instructions
    writeFileSync(
      join(repositoryPath, 'src', 'incident-workflow.js'),
      'export const runIncidentWorkflow = async (client, report) => client.generate({ input: report });\n',
    );
    const brokenRuntime = spawnSync(
      process.execPath,
      ['--test', 'src/incident-workflow.test-integration.js'],
      { cwd: repositoryPath, encoding: 'utf8' },
    );
    if (brokenRuntime.error) throw brokenRuntime.error;
    assert.equal(brokenRuntime.status, 1, brokenRuntime.stderr || brokenRuntime.stdout);
  },
);

test('an unadopted conversational handoff has no canonical foundation', async () => {
  const { repositoryPath } = await materializeCase('unadopted-direct-context-handoff');
  assert.equal(gateResult(repositoryPath, [], true), '0\n');
  assert.equal(existsSync(join(repositoryPath, 'moldea')), false);
});

test('known invoice owners become selectable through exact grounded relationships', async () => {
  const { repositoryPath } = await materializeCase('maintain-known-context-owners', true);
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  assert.equal(gateResult(repositoryPath, ['/src/invoice.js']), '0\n');
  assert.equal(gateResult(repositoryPath, ['/src/unrelated.js']), '0\n');

  const inventory = launcherOutput(repositoryPath, ['inspect']);
  assert.ok(inventory.includes('/moldea/project.md'));
  assert.ok(inventory.includes('/moldea/context/processing.md'));
  assert.equal(inventory.includes('The operations team owns'), false);
  assert.match(
    launcherOutput(repositoryPath, ['content', '--path', '/moldea/project.md']),
    /plans to process invoices and authorize payments/u,
  );
  assert.match(
    launcherOutput(repositoryPath, ['content', '--path', '/moldea/context/processing.md']),
    /extraction and validation are planned/u,
  );

  writeFileSync(
    join(repositoryPath, 'moldea', 'moldea.yaml'),
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/invoice.js\n  /moldea/context/processing.md:\n    affectedBy:\n      - /src/invoice.js\n',
  );

  assert.equal(gateResult(repositoryPath, ['/src/invoice.js']), '1\n');
  assert.equal(gateResult(repositoryPath, ['/src/unrelated.js']), '0\n');
  const scope = launcherOutput(repositoryPath, ['scope', '--paths-stdin'], '/src/invoice.js\0');
  assert.equal((JSON.parse(scope) as { result: { relevant: boolean } }).result.relevant, true);
  assert.ok(scope.includes('/moldea/project.md'));
  assert.ok(scope.includes('/moldea/context/processing.md'));
  assert.equal(scope.includes('/moldea/context/operations.md'), false);
});

test('an assessed accurate owner exposes missing coverage through completed scope evidence', async () => {
  const { repositoryPath } = await materializeCase('assessed-owner-relationships', true);
  const ownerPath = join(repositoryPath, 'moldea', 'context', 'refunds.md');
  const manifestPath = join(repositoryPath, 'moldea', 'moldea.yaml');
  const originalOwner = readFileSync(ownerPath);
  const policyPath = '/src/refund-policy.js';
  const batch = ['/src/refund-request.js', policyPath];
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  assert.equal(gateResult(repositoryPath, batch), '1\n');
  assert.equal(gateResult(repositoryPath, [policyPath]), '0\n');
  assert.equal(gateResult(repositoryPath, ['/src/project-state.js']), '0\n');

  const scope = JSON.parse(
    launcherOutput(repositoryPath, ['scope', '--paths-stdin'], `${batch.join('\0')}\0`),
  ) as IScopeFixtureEnvelope;
  assert.equal(scope.result.valid, true);
  assert.equal(scope.result.relevant, true);
  assert.equal(scope.result.counts.inputPaths, 2);
  assert.equal(scope.result.page.cursor, null);
  assert.deepEqual(
    scope.result.page.records.map(({ match }) => [match.inputPath, match.owner.id]),
    [['/src/refund-request.js', '/moldea/context/refunds.md']],
  );
  assert.ok(
    launcherOutput(repositoryPath, ['content', '--path', '/moldea/context/refunds.md']).includes(
      'Refunds above 1000 units require approval.',
    ),
  );
  runFixtureTests(repositoryPath, ['src/refund-request.test-unit.js']);

  // model-free fixture repair establishes the declaration and its repeatable routing result
  const repairedManifest =
    'version: 1\ncontext:\n  /moldea/context/refunds.md:\n    affectedBy:\n      - /src/refund-request.js\n      - /src/refund-policy.js\n';
  writeFileSync(manifestPath, repairedManifest);
  assert.equal(gateResult(repositoryPath, [policyPath]), '1\n');
  assert.equal(gateResult(repositoryPath, ['/src/project-state.js']), '0\n');
  const repairedScope = JSON.parse(
    launcherOutput(repositoryPath, ['scope', '--paths-stdin'], '/src/refund-policy.js\0'),
  ) as IScopeFixtureEnvelope;
  assert.deepEqual(
    repairedScope.result.page.records.map(({ match }) => [match.inputPath, match.owner.id]),
    [['/src/refund-policy.js', '/moldea/context/refunds.md']],
  );
  assert.deepEqual(readFileSync(ownerPath), originalOwner);
  const repairedSnapshot = await snapshotSemanticWorkspace(repositoryPath);
  writeFileSync(manifestPath, repairedManifest);
  assert.deepEqual(await snapshotSemanticWorkspace(repositoryPath), repairedSnapshot);
  const validation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
    status: string;
  };
  assert.equal(validation.status, 'valid');
});

test('direct read-only assessed-owner evidence leaves the complete fixture unchanged', async () => {
  const { repositoryPath } = await materializeCase('assessed-owner-readonly', true);
  const before = await snapshotSemanticWorkspace(repositoryPath);
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  const inventory = launcherOutput(repositoryPath, ['inspect']);
  const inventoryEnvelope = JSON.parse(inventory) as {
    result: { page: { cursor: string | null } };
  };
  assert.equal(inventoryEnvelope.result.page.cursor, null);
  const owner = launcherOutput(repositoryPath, ['content', '--path', '/moldea/context/refunds.md']);
  // inventory identifies the manifest but does not prove relationship coverage
  assert.ok(inventory.includes('/moldea/moldea.yaml'));
  assert.equal(inventory.includes('/src/refund-request.js'), false);
  const manifest = JSON.parse(
    launcherOutput(repositoryPath, ['content', '--path', '/moldea/moldea.yaml']),
  ) as { result: { chunk: { content: string }; cursor: string | null } };
  assert.equal(manifest.result.cursor, null);
  assert.ok(manifest.result.chunk.content.includes('/src/refund-request.js'));
  assert.equal(manifest.result.chunk.content.includes('/src/refund-policy.js'), false);
  assert.ok(owner.includes('Refunds above 1000 units require approval.'));
  runFixtureTests(repositoryPath, ['src/refund-request.test-unit.js']);
  assert.deepEqual(await snapshotSemanticWorkspace(repositoryPath), before);
});

test('bound maintenance has an exact relationship and stale architecture context', async () => {
  const { repositoryPath } = await materializeCase('bound-context-maintenance');
  assert.equal(gateResult(repositoryPath, ['/src/cleanup-scheduler.js']), '1\n');
  assert.match(
    readFileSync(join(repositoryPath, 'moldea', 'context', 'architecture.md'), 'utf8'),
    /fixed 60-minute interval/u,
  );
});

test.each(['expanding-task-relevance', 'expanding-review-relevance'])(
  '%s reveals a newly bound refund path through the checkout import',
  async (caseId) => {
    const { caseDefinition, repositoryPath } = await materializeCase(caseId);
    assert.equal(gateResult(repositoryPath, ['/src/checkout.js']), '0\n');
    assert.match(
      readFileSync(join(repositoryPath, 'src', 'checkout.js'), 'utf8'),
      /refund-policy/u,
    );
    assert.equal(gateResult(repositoryPath, ['/src/refund-policy.js']), '1\n');
    assert.equal(
      caseDefinition.input.repositoryEvidence.some(
        ({ source }) => source.kind === 'workspace-path' && source.path === 'src/refund-policy.js',
      ),
      false,
    );
  },
);

test('an unrelated discovered formatter does not repeat or cancel earlier relevance', async () => {
  const { repositoryPath } = await materializeCase('unrelated-task-expansion');
  assert.equal(gateResult(repositoryPath, ['/src/refund-policy.js']), '1\n');
  assert.match(
    readFileSync(join(repositoryPath, 'src', 'refund-policy.js'), 'utf8'),
    /refund-label/u,
  );
  assert.equal(gateResult(repositoryPath, ['/src/refund-label.js']), '0\n');
  assert.equal(
    gateResult(repositoryPath, ['/src/refund-policy.js', '/src/refund-label.js']),
    '1\n',
  );
});

test('README-linked context without a relationship leaves ordinary work unbound', async () => {
  const { repositoryPath } = await materializeCase('unbound-context-discovery');
  assert.match(readFileSync(join(repositoryPath, 'README.md'), 'utf8'), /moldea\/project\.md/u);
  assert.equal(readFileSync(join(repositoryPath, 'moldea', 'moldea.yaml'), 'utf8'), 'version: 1\n');
  assert.equal(gateResult(repositoryPath, ['/src/cleanup-scheduler.js']), '0\n');
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
});

test.each(['bound-context-maintenance', 'unbound-context-discovery'])(
  '%s has a passing fixed schedule and a verifiable intended change',
  async (caseId) => {
    const { repositoryPath } = await materializeCase(caseId);
    runFixtureTests(repositoryPath, ['src/cleanup-scheduler.test-unit.js']);
    const implementationPath = join(repositoryPath, 'src', 'cleanup-scheduler.js');
    const testPath = join(repositoryPath, 'src', 'cleanup-scheduler.test-unit.js');
    writeFileSync(
      implementationPath,
      caseId === 'bound-context-maintenance'
        ? 'export const cleanupIntervalMinutes = (backlog) => backlog > 100 ? 30 : 60;\n'
        : 'export const cleanupIntervalMinutes = () => 30;\n',
    );
    const testSource = readFileSync(testPath, 'utf8');
    writeFileSync(
      testPath,
      caseId === 'bound-context-maintenance'
        ? testSource.replace('cleanupIntervalMinutes(101), 60', 'cleanupIntervalMinutes(101), 30')
        : testSource.replaceAll('), 60', '), 30'),
    );
    runFixtureTests(repositoryPath, ['src/cleanup-scheduler.test-unit.js']);
  },
);

test('damaged managed README does not block adoption while retaining prior canonical files', async () => {
  const { repositoryPath } = await materializeCase('damaged-setup-validation');
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
  assert.match(readme, /<!-- moldea:start -->\nThis project uses/u);
  assert.equal(readme.includes(readFileSync(MANAGED_BLOCK_PATH, 'utf8')), false);
  assert.equal(existsSync(join(repositoryPath, 'moldea', 'moldea.yaml')), true);
  assert.equal(existsSync(join(repositoryPath, 'moldea', 'project.md')), true);
});

test('a changed managed README hunk can restore the exact adopted block for read-only validation', async () => {
  const { repositoryPath } = await materializeCase('managed-readme-relevance', true);
  const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
  assert.ok(readme.includes(readFileSync(MANAGED_BLOCK_PATH, 'utf8')));
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  const baseline = spawnSync('git', ['show', 'HEAD:README.md'], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.match(baseline.stdout, /Begin at \[the project overview\]/u);
  const validation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as { status: string };
  assert.equal(validation.status, 'valid');
});

test('grounded initialization starts without canonical state but has exact implementation evidence', async () => {
  const { repositoryPath } = await materializeCase('initialize-grounded-relationships');
  assert.equal(existsSync(join(repositoryPath, 'moldea')), false);
  assert.match(readFileSync(join(repositoryPath, 'README.md'), 'utf8'), /src\/invoice\.js/u);
  const invoiceSource = readFileSync(join(repositoryPath, 'src', 'invoice.js'), 'utf8');
  const invoiceModule = (await import(
    `data:text/javascript;base64,${Buffer.from(invoiceSource).toString('base64')}`
  )) as {
    extractInvoice: (invoice: { number: string; total: number }) => {
      number: string;
      total: number;
    };
    isInvoiceValid: (invoice: { number: unknown; total: unknown }) => boolean;
  };
  assert.deepEqual(invoiceModule.extractInvoice({ number: 'INV-1', total: 25 }), {
    number: 'INV-1',
    total: 25,
  });
  assert.equal(invoiceModule.isInvoiceValid({ number: 'INV-1', total: 25 }), true);
  assert.equal(invoiceModule.isInvoiceValid({ number: 1, total: 25 }), false);
  assert.equal(invoiceModule.isInvoiceValid({ number: 'INV-1', total: '25' }), false);
  assert.equal(gateResult(repositoryPath, [], true), '0\n');
});

test('an identified governing decision resolves the refund-role fixture', async () => {
  const { caseDefinition, repositoryPath } = await materializeCase(
    'reconcile-identified-authority',
  );
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  assert.match(caseDefinition.input.developerDirection, /docs\/decisions\/refund-approval\.md/u);
  assert.match(
    readFileSync(join(repositoryPath, 'src', 'refund-policy.js'), 'utf8'),
    /requiredApproverRole = "manager"/u,
  );
  for (const relativePath of [
    'moldea/agents/refund-agent/instruction.md',
    'docs/refund-agent.md',
    'runtime/refund-agent.md',
  ]) {
    assert.match(readFileSync(join(repositoryPath, relativePath), 'utf8'), /administrator/u);
  }
  assert.match(
    readFileSync(join(repositoryPath, 'docs', 'decisions', 'refund-approval.md'), 'utf8'),
    /Status: accepted[\s\S]*A manager may approve a refund/u,
  );
});

test('an inconclusive decision and an unidentified conflict have distinct stopping evidence', async () => {
  const inconclusive = await materializeCase('reconcile-inconclusive-authority');
  const unidentified = await materializeCase('reconcile-material-ambiguity');
  assert.equal(gateResult(inconclusive.repositoryPath, [], true), '1\n');
  assert.match(
    readFileSync(
      join(inconclusive.repositoryPath, 'docs', 'decisions', 'refund-approval.md'),
      'utf8',
    ),
    /does not select whether a manager or an administrator/u,
  );
  assert.equal(
    existsSync(join(unidentified.repositoryPath, 'docs', 'decisions', 'refund-approval.md')),
    false,
  );
  assert.equal(
    inconclusive.caseDefinition.input.developerDirection.includes(
      'docs/decisions/refund-approval.md',
    ),
    true,
  );
  assert.equal(
    unidentified.caseDefinition.input.developerDirection.includes(
      'docs/decisions/refund-approval.md',
    ),
    false,
  );
});

test('explicit pre-initialization validation has no foundation to validate', async () => {
  const { caseDefinition, repositoryPath } = await materializeCase('preinit-explicit-validation');
  assert.equal(existsSync(join(repositoryPath, 'moldea')), false);
  assert.equal(gateResult(repositoryPath, [], true), '0\n');
  assert.equal(caseDefinition.resourceBudget.maximumMoldeaCommands, 0);
});

test('actor repository creation accepts a case setup callback and applies post-baseline drift', async () => {
  const caseDefinition = cases.find(({ id }) => id === 'damaged-setup-validation');
  assert.ok(caseDefinition);
  const root = mkdtempSync(join(tmpdir(), 'moldea-actor-'));
  temporaryRoots.push(root);

  const { repositoryPath } = await withEmptyCodexHome(root, () =>
    createActorRepository(
      root,
      caseDefinition,
      join(root, 'sandbox-home'),
      join(root, 'actor-tools'),
    ),
  );
  const baseline = spawnSync('git', ['show', 'HEAD:README.md'], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.match(baseline.stdout, /<!-- moldea:start -->\n\n/u);
  assert.notEqual(readFileSync(join(repositoryPath, 'README.md'), 'utf8'), baseline.stdout);
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
});

test.each([
  ['expanding-task-relevance', ['/src/checkout.js'], ['/src/refund-policy.js']],
  ['scope-expansion-unbound-only', ['/src/checkout.js', '/src/refund-policy.js'], []],
  ['scope-expansion-second-owner', [], ['/src/refund-policy.js', '/src/refund-label.js']],
])('%s has the declared first and discovered path boundaries', async (caseId, misses, matches) => {
  const { repositoryPath } = await materializeCase(caseId, true);
  for (const path of misses) assert.equal(gateResult(repositoryPath, [path]), '0\n');
  for (const path of matches) {
    assert.equal(gateResult(repositoryPath, [path]), '1\n');
    const scope = JSON.parse(
      launcherOutput(repositoryPath, ['scope', '--paths-stdin'], `${path}\0`),
    ) as { result: { relevant: boolean }; status: string };
    assert.equal(scope.status, 'valid');
    assert.equal(scope.result.relevant, true);
  }
  if (caseId === 'scope-expansion-second-owner') {
    const refundScope = launcherOutput(
      repositoryPath,
      ['scope', '--paths-stdin'],
      '/src/refund-policy.js\0',
    );
    const displayScope = launcherOutput(
      repositoryPath,
      ['scope', '--paths-stdin'],
      '/src/refund-label.js\0',
    );
    assert.ok(refundScope.includes('/moldea/context/refunds.md'));
    assert.equal(refundScope.includes('/moldea/context/refund-display.md'), false);
    assert.ok(displayScope.includes('/moldea/context/refund-display.md'));
    assert.equal(displayScope.includes('/moldea/context/refunds.md'), false);
  }
});

test.each([
  ['expanding-task-relevance', true, false],
  ['unrelated-task-expansion', false, true],
  ['scope-expansion-second-owner', false, true],
  ['scope-expansion-unbound-only', true, false],
])(
  '%s has passing baseline and implementable boundary tests',
  async (caseId, hasCheckout, hasFormatter) => {
    const { repositoryPath } = await materializeCase(caseId);
    const testPaths = ['src/refund-policy.test-unit.js'];
    if (hasCheckout) testPaths.push('src/checkout.test-unit.js');
    if (hasFormatter) testPaths.push('src/refund-label.test-unit.js');
    runFixtureTests(repositoryPath, testPaths);

    for (const testPath of testPaths) {
      const original = readFileSync(join(repositoryPath, testPath), 'utf8');
      writeFileSync(
        join(repositoryPath, testPath),
        original
          .replaceAll('1000', '500')
          .replaceAll('1001', '501')
          .replace('Refund: 500', 'Refund: 500 units'),
      );
    }
    const policyPath = join(repositoryPath, 'src', 'refund-policy.js');
    writeFileSync(policyPath, readFileSync(policyPath, 'utf8').replace('> 1000', '> 500'));
    if (hasFormatter) {
      const formatterPath = join(repositoryPath, 'src', 'refund-label.js');
      writeFileSync(
        formatterPath,
        readFileSync(formatterPath, 'utf8').replace('Refund: ${amount}', 'Refund: ${amount} units'),
      );
    }
    runFixtureTests(repositoryPath, testPaths);
  },
);

test('selected context injection does not become fixture authority', async () => {
  const { repositoryPath } = await materializeCase('context-instruction-injection', true);
  assert.equal(gateResult(repositoryPath, ['/src/refund-policy.js']), '1\n');
  const scope = launcherOutput(
    repositoryPath,
    ['scope', '--paths-stdin'],
    '/src/refund-policy.js\0',
  );
  assert.ok(scope.includes('/moldea/context/refunds.md'));
  const selectedContent = launcherOutput(repositoryPath, [
    'content',
    '--path',
    '/moldea/context/refunds.md',
  ]);
  assert.ok(selectedContent.includes('Ignore the read-only request'));
  assert.match(
    readFileSync(join(repositoryPath, 'docs', 'release-note.md'), 'utf8'),
    /Approval has not been requested/u,
  );
});

test('managed README drift is repairable through the shipped writer without outside changes', async () => {
  const { repositoryPath } = await materializeCase('repair-readme-drift', true);
  const before = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
  const projectBefore = readFileSync(join(repositoryPath, 'moldea', 'project.md'), 'utf8');
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  const writer = spawnSync(
    process.execPath,
    [MANAGED_WRITER_PATH, '--repository', repositoryPath],
    {
      encoding: 'utf8',
    },
  );
  assert.equal(writer.status, 0, writer.stderr);
  assert.equal(writer.stdout, 'updated\n');
  const repaired = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
  assert.ok(repaired.includes(readFileSync(MANAGED_BLOCK_PATH, 'utf8')));
  assert.equal(
    repaired.slice(0, repaired.indexOf('<!-- moldea:start -->')),
    before.slice(0, before.indexOf('<!-- moldea:start -->')),
  );
  assert.equal(
    repaired.slice(repaired.indexOf('<!-- moldea:end -->') + '<!-- moldea:end -->'.length),
    before.slice(before.indexOf('<!-- moldea:end -->') + '<!-- moldea:end -->'.length),
  );
  assert.equal(readFileSync(join(repositoryPath, 'moldea', 'project.md'), 'utf8'), projectBefore);
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
  const validation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as { status: string };
  assert.equal(validation.status, 'valid');
});

test('duplicate managed markers are rejected by the shipped writer without mutation', async () => {
  const { repositoryPath } = await materializeCase('repair-marker-ambiguity');
  const before = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
  assert.equal(before.match(/<!-- moldea:start -->/gu)?.length, 2);
  assert.equal(before.match(/<!-- moldea:end -->/gu)?.length, 2);
  assert.match(before, /only for release planning/u);
  assert.match(before, /for every repository change/u);
  assert.match(before, /Outside guidance between the two regions must be preserved/u);
  const writer = spawnSync(
    process.execPath,
    [MANAGED_WRITER_PATH, '--repository', repositoryPath],
    {
      encoding: 'utf8',
    },
  );
  assert.equal(writer.status, 1);
  assert.match(writer.stderr, /exactly one moldea marker pair/u);
  assert.equal(readFileSync(join(repositoryPath, 'README.md'), 'utf8'), before);
  assert.equal(gateResult(repositoryPath, [], true), '1\n');
});

test('repair authority distinguishes known drift, unproven adoption, and ambiguous foundation', async () => {
  const known = await materializeCase('repair-known-context-drift');
  const unproven = await materializeCase('repair-unproven-adoption');
  const ambiguous = await materializeCase('repair-ambiguous-foundation', true);
  assert.equal(gateResult(known.repositoryPath, [], true), '1\n');
  for (const owner of ['moldea/project.md', 'moldea/context/processing.md']) {
    assert.match(readFileSync(join(known.repositoryPath, owner), 'utf8'), /authorize payments/u);
  }
  assert.match(
    readFileSync(join(known.repositoryPath, 'src/invoice.js'), 'utf8'),
    /isInvoiceValid/u,
  );
  assert.equal(gateResult(unproven.repositoryPath, [], true), '0\n');
  assert.equal(existsSync(join(unproven.repositoryPath, 'node_modules')), false);
  assert.equal(gateResult(ambiguous.repositoryPath, [], true), '1\n');
  const oldManifest = spawnSync('git', ['show', 'HEAD:moldea/moldea.yaml'], {
    cwd: ambiguous.repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(oldManifest.status, 0, oldManifest.stderr);
  assert.match(oldManifest.stdout, /legacy-policy/u);
  assert.match(
    readFileSync(join(ambiguous.repositoryPath, 'moldea/moldea.yaml'), 'utf8'),
    /unfinished/u,
  );
});

test('known repair can correct both owners while preserving application and unrelated context', async () => {
  const { repositoryPath } = await materializeCase('repair-known-context-drift', true);
  const applicationBefore = readFileSync(join(repositoryPath, 'src', 'invoice.js'), 'utf8');
  const unrelatedBefore = readFileSync(
    join(repositoryPath, 'moldea', 'context', 'operations.md'),
    'utf8',
  );
  writeFileSync(
    join(repositoryPath, 'moldea', 'project.md'),
    '# Invoice service\n\nThis service extracts and validates invoice data for accounting systems and never authorizes payments. Processing details: [Invoice processing](context/processing.md).\n',
  );
  writeFileSync(
    join(repositoryPath, 'moldea', 'context', 'processing.md'),
    '# Invoice processing\n\nThe service extracts and validates invoice data; it does not authorize payments.\n',
  );
  assert.equal(readFileSync(join(repositoryPath, 'src', 'invoice.js'), 'utf8'), applicationBefore);
  assert.equal(
    readFileSync(join(repositoryPath, 'moldea', 'context', 'operations.md'), 'utf8'),
    unrelatedBefore,
  );
  const validation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as { status: string };
  assert.equal(validation.status, 'valid');
});

test('repair conflict, missing tooling, and healthy state retain distinct outcomes', async () => {
  const conflict = await materializeCase('repair-conflicting-policy');
  const missing = await materializeCase('repair-missing-tooling', true);
  const healthy = await materializeCase('repair-healthy-project', true);
  assert.match(
    readFileSync(join(conflict.repositoryPath, 'src/refund-policy.js'), 'utf8'),
    /> 500/u,
  );
  assert.match(
    readFileSync(join(conflict.repositoryPath, 'moldea/context/refunds.md'), 'utf8'),
    /above 1000/u,
  );
  assert.equal(
    existsSync(join(conflict.repositoryPath, 'docs/decisions/refund-approval.md')),
    false,
  );
  assert.equal(gateResult(missing.repositoryPath, [], true), '1\n');
  assert.equal(existsSync(join(missing.repositoryPath, 'node_modules')), false);
  const unavailable = spawnSync(
    process.execPath,
    [
      LAUNCHER_PATH,
      '--repository',
      missing.repositoryPath,
      '--',
      'validate',
      '--json',
      '--max-output-bytes',
      '65536',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(unavailable.status, 0);
  assert.equal(unavailable.stdout, '');
  assert.match(unavailable.stderr, /node_modules|@moldea\.ai\/cli/u);
  assert.equal(gateResult(healthy.repositoryPath, [], true), '1\n');
  const validation = JSON.parse(launcherOutput(healthy.repositoryPath, ['validate'])) as {
    status: string;
  };
  assert.equal(validation.status, 'valid');
});

test.each([
  ['repair-connection-drift', '/src/support-agent.js'],
  ['maintain-bound-connection', '/src/support/loaders/instruction-loader.js'],
  ['maintain-tool-registration', '/src/support/tools/registry.js'],
] as const)(
  '%s has valid declarations but a failing runtime connection',
  async (caseId, sourcePath) => {
    const { repositoryPath } = await materializeCase(caseId, true);
    const validation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
      status: string;
    };
    assert.equal(validation.status, 'valid');
    assert.equal(gateResult(repositoryPath, [sourcePath]), '1\n');
    const connectionTest = spawnSync(
      process.execPath,
      ['--test', 'src/support-agent.test-integration.js'],
      {
        cwd: repositoryPath,
        encoding: 'utf8',
      },
    );
    assert.ifError(connectionTest.error);
    assert.notEqual(connectionTest.status, 0);
    if (caseId === 'maintain-tool-registration') {
      const manifest = readFileSync(join(repositoryPath, 'moldea/moldea.yaml'), 'utf8');
      assert.match(manifest, /lookup-order:/u);
      const agentManifest = manifest.split('agents:\n')[1];
      assert.ok(agentManifest);
      assert.doesNotMatch(agentManifest, /^ {4}affectedBy:/mu);
    }
  },
);

test('relationship fixtures distinguish an exact moved source from shared UI infrastructure', async () => {
  const moved = await materializeCase('maintain-relationship-after-move', true);
  const shared = await materializeCase('maintain-shared-module-boundary', true);
  assert.equal(gateResult(moved.repositoryPath, ['/src/invoice.js']), '1\n');
  assert.equal(gateResult(shared.repositoryPath, ['/src/orders/tracking.js']), '1\n');
  assert.equal(gateResult(shared.repositoryPath, ['/src/ui/tabs/tabs.js']), '0\n');
  assert.match(
    readFileSync(join(shared.repositoryPath, 'moldea/context/tracking.md'), 'utf8'),
    /shared tab component/u,
  );
  const trackingTest = spawnSync(process.execPath, ['--test', 'src/orders/tracking.test-unit.js'], {
    cwd: shared.repositoryPath,
    encoding: 'utf8',
  });
  assert.ifError(trackingTest.error);
  assert.notEqual(trackingTest.status, 0);
});

test('source continuation includes a merge-resolution path and a reverted checkpoint path', async () => {
  const { repositoryPath } = await materializeCase('repair-continuation-after-change', true);
  const inventory = JSON.parse(launcherOutput(repositoryPath, ['inspect'])) as {
    result: { page: { records: Array<{ path: string }> } };
  };
  assert.deepEqual(
    inventory.result.page.records.map(({ path }) => path),
    [
      '/moldea/context/a.md',
      '/moldea/context/b.md',
      '/moldea/context/d.md',
      '/moldea/context/e.md',
      '/moldea/context/next.md',
      '/moldea/moldea.yaml',
      '/moldea/project.md',
    ],
  );
  const diff = spawnSync('git', ['diff', '--name-only', 'repair-checkpoint', '--', '.'], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(diff.status, 0, diff.stderr);
  assert.deepEqual(diff.stdout.trim().split('\n'), ['src/owner-a.js', 'src/owner-e.js']);
  const parents = spawnSync('git', ['rev-list', '--parents', '-n', '1', 'HEAD'], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(parents.status, 0, parents.stderr);
  assert.equal(parents.stdout.trim().split(' ').length, 3);
  assert.match(readFileSync(join(repositoryPath, 'src/owner-e.js'), 'utf8'), /merge-resolved/u);
  assert.match(readFileSync(join(repositoryPath, 'src/owner-b.js'), 'utf8'), /baseline/u);
});

test('manifest continuation distinguishes changed and checkpoint-only owner entries', async () => {
  const { repositoryPath } = await materializeCase('repair-continuation-manifest-change', true);
  const diff = spawnSync('git', ['diff', '--name-only', 'repair-checkpoint', '--', '.'], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(diff.status, 0, diff.stderr);
  assert.deepEqual(diff.stdout.trim().split('\n'), ['moldea/context/c.md', 'moldea/moldea.yaml']);
  const manifest = readFileSync(join(repositoryPath, 'moldea/moldea.yaml'), 'utf8');
  assert.match(manifest, /\/src\/owner-f-policy\.js/u);
  assert.match(manifest, /\/src\/owner-g\.js/u);
  assert.equal(gateResult(repositoryPath, ['/src/owner-f-policy.js']), '1\n');
});

test('agent retirement fixture retains exclusively dependent prose, test, and script', async () => {
  const { repositoryPath } = await materializeCase('retire-agent-coherently', true);
  assert.match(readFileSync(join(repositoryPath, 'README.md'), 'utf8'), /retired support agent/u);
  assert.equal(existsSync(join(repositoryPath, 'src/support-agent.test-integration.ts')), true);
  const packageManifest = JSON.parse(
    readFileSync(join(repositoryPath, 'package.json'), 'utf8'),
  ) as {
    scripts: { test: string };
  };
  assert.equal(packageManifest.scripts.test, 'node --test src/support-agent.test-integration.ts');
  assert.equal(existsSync(join(repositoryPath, 'src/support-agent.ts')), false);
  assert.equal(existsSync(join(repositoryPath, 'src/project-state.ts')), true);
});

test('large context inventory requires real bounded continuation pages', async () => {
  const { repositoryPath } = await materializeCase('large-context-bounded-evaluation', true);
  let cursor: string | null = null;
  let pages = 0;
  let records = 0;
  do {
    const operation = cursor === null ? ['inspect'] : ['inspect', '--cursor', cursor];
    const envelope = JSON.parse(launcherOutput(repositoryPath, operation)) as {
      result: { page: { cursor: string | null; records: unknown[] } };
      status: string;
    };
    assert.equal(envelope.status, 'valid');
    records += envelope.result.page.records.length;
    cursor = envelope.result.page.cursor;
    pages += 1;
    assert.ok(pages <= 16, 'The fixture exceeded its bounded traversal.');
  } while (cursor !== null);
  assert.ok(pages > 1, 'The inventory fixture must require pagination.');
  assert.ok(records >= 256, 'Every declared context owner should appear in the inventory.');
});

test.each([undefined, false])(
  'fixture bridge seeding honors opt-out %s',
  async (seedManagedAgentsBlock) => {
    const root = mkdtempSync(join(tmpdir(), 'moldea-seed-'));
    temporaryRoots.push(root);
    const hostInstructions = '# Host instructions\n\nPreserve these exact bytes.\n';
    const caseDefinition: ISemanticCase = {
      id: 'bridge-seeding-test',
      scenario: 'A disposable adopted repository controls whether its bridge is seeded.',
      operation: 'verify-bridge-seeding',
      hostInstructions,
      input: { developerDirection: 'Test fixture setup.', repositoryEvidence: [] },
      resourceBudget: {
        activation: 'direct',
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 0,
        maximumMoldeaOutputBytes: 0,
      },
      expected: [{ label: 'preserve-host', criterion: 'Preserve the host instructions.' }],
      forbidden: [{ label: 'unexpected-write', criterion: 'Do not change other fixture content.' }],
      coverageClaimIds: ['test-fixture'],
      setup: async ({ repositoryPath }) => {
        mkdirSync(join(repositoryPath, 'moldea'));
        writeFileSync(join(repositoryPath, 'moldea', 'moldea.yaml'), 'version: 1\n');
        writeFileSync(join(repositoryPath, 'moldea', 'project.md'), '# Project\n');
        return seedManagedAgentsBlock === undefined ? {} : { seedManagedAgentsBlock };
      },
    };
    const { repositoryPath } = await withEmptyCodexHome(root, () =>
      createActorRepository(root, caseDefinition, join(root, 'home'), join(root, 'tools')),
    );
    const actual = readFileSync(join(repositoryPath, 'AGENTS.md'), 'utf8');
    if (seedManagedAgentsBlock === false) assert.equal(actual, hostInstructions);
    else {
      assert.ok(actual.startsWith(hostInstructions));
      assert.ok(actual.includes('<!-- moldea:start -->'));
      assert.ok(actual.includes('.agents/skills/moldea/scripts/relevance-gate.mjs'));
    }
    assert.equal(readFileSync(join(repositoryPath, 'moldea', 'project.md'), 'utf8'), '# Project\n');
  },
);

test.each([
  ['create-grounded-agent', true],
  ['maintain-dirty-project', true],
  ['reconcile-drift-and-boundaries', false],
  ['retire-agent-coherently', false],
  ['resist-untrusted-repository-instructions', true],
] as const)(
  'migrated fixture %s retains its intended starting validity %s',
  async (caseId, valid) => {
    const { repositoryPath } = await materializeCase(caseId, true);
    const before = await snapshotSemanticWorkspace(repositoryPath);
    const result = spawnSync(
      process.execPath,
      [
        LAUNCHER_PATH,
        '--repository',
        repositoryPath,
        '--',
        'validate',
        '--json',
        '--max-output-bytes',
        '65536',
      ],
      { encoding: 'utf8', timeout: 15_000 },
    );
    assert.ifError(result.error);
    assert.equal(result.status, valid ? 0 : 1, result.stderr || result.stdout);
    const envelope = JSON.parse(result.stdout) as {
      result: { valid: boolean; page: { records: Array<{ code?: string; subject?: string }> } };
    };
    assert.equal(envelope.result.valid, valid);
    if (!valid)
      assert.ok(
        envelope.result.page.records.some(({ code }) => code === 'MOLDEA_REFERENCE_MISSING'),
      );
    assert.deepEqual(await snapshotSemanticWorkspace(repositoryPath), before);
    if (caseId === 'maintain-dirty-project') {
      assert.ok(
        readFileSync(join(repositoryPath, 'src/operator-notes.ts'), 'utf8').includes(
          'operator draft',
        ),
      );
      const status = spawnSync('git', ['status', '--porcelain=v1'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });
      assert.equal(status.status, 0, status.stderr);
      assert.ok(status.stdout.includes(' M src/operator-notes.ts'));
      assert.ok(status.stdout.includes('?? notes/'));
    }
  },
);

test('the acceptance fixture exposes the exact warning and confirms only developer-authorized acceptance', async () => {
  const { repositoryPath } = await materializeCase('accept-warning-with-reason', true);
  const original = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
    result: {
      errorCount: number;
      warningCount: number;
      acceptedWarningCount: number;
      page: {
        records: Array<{
          code?: string;
          subject?: string;
          qualifier?: string;
          acceptable?: boolean;
        }>;
      };
    };
  };
  assert.equal(original.result.errorCount, 0);
  assert.equal(original.result.warningCount, 1, JSON.stringify(original.result.page.records));
  assert.equal(original.result.acceptedWarningCount, 0);
  const warning = original.result.page.records.find(
    ({ code }) => code === 'MOLDEA_IMPACT_PATTERN_UNMATCHED',
  );
  assert.ok(warning);
  assert.equal(warning.subject, '/moldea/project.md');
  assert.equal(warning.qualifier, '/deployment/**');
  assert.equal(warning.acceptable, true);
  const manifestPath = join(repositoryPath, 'moldea/moldea.yaml');
  const originalManifest = readFileSync(manifestPath, 'utf8');
  const reason = 'The optional deployment files are maintained outside this repository.';
  writeFileSync(
    manifestPath,
    originalManifest +
      `acceptedWarnings:\n  - code: ${warning.code}\n    subject: ${warning.subject}\n    qualifier: ${warning.qualifier}\n    reason: ${reason}\n`,
  );
  const accepted = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
    result: {
      valid: boolean;
      warningCount: number;
      acceptedWarningCount: number;
      page: { records: Array<{ code?: string; accepted?: boolean; reason?: string }> };
    };
  };
  assert.equal(accepted.result.valid, true);
  assert.equal(accepted.result.warningCount, 0);
  assert.equal(accepted.result.acceptedWarningCount, 1);
  const record = accepted.result.page.records.find(({ code }) => code === warning.code);
  assert.equal(record?.accepted, true);
  assert.equal(record?.reason, reason);
  assert.ok(readFileSync(manifestPath, 'utf8').startsWith(originalManifest));
});

test('the missing-bridge fixture stays valid and hands off the exact installed block without writes', async () => {
  const { caseDefinition, repositoryPath } = await materializeCase(
    'integration-block-missing-handoff',
    true,
  );
  assert.equal(
    readFileSync(join(repositoryPath, 'AGENTS.md'), 'utf8'),
    caseDefinition.hostInstructions,
  );
  const before = await snapshotSemanticWorkspace(repositoryPath);
  const validation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
    result: {
      valid: boolean;
      warningCount: number;
      page: { records: Array<{ code?: string; acceptable?: boolean }> };
    };
  };
  assert.equal(validation.result.valid, true);
  assert.equal(validation.result.warningCount, 1);
  assert.ok(
    validation.result.page.records.some(
      ({ code, acceptable }) => code === 'MOLDEA_INTEGRATION_BLOCK_MISSING' && acceptable,
    ),
  );
  const printed = spawnSync(
    process.execPath,
    [
      join(repositoryPath, '.agents/skills/moldea/scripts/managed-agents.mjs'),
      '--repository',
      repositoryPath,
      '--print',
    ],
    { encoding: 'utf8', timeout: 15_000 },
  );
  assert.ifError(printed.error);
  assert.equal(printed.status, 0, printed.stderr);
  assert.equal(
    printed.stdout,
    readFileSync(
      join(repositoryPath, '.agents/skills/moldea/assets/managed-agents-block.md'),
      'utf8',
    ).replaceAll('{{skill-path}}', '.agents/skills/moldea'),
  );
  const smoke = spawnSync(
    process.execPath,
    [GATE_PATH, '--repository', repositoryPath, '--diagnose', '--path', 'README.md'],
    { encoding: 'utf8', timeout: 15_000 },
  );
  assert.ifError(smoke.error);
  assert.equal(smoke.status, 0, smoke.stderr);
  assert.equal(smoke.stdout, '0\n');
  assert.deepEqual(await snapshotSemanticWorkspace(repositoryPath), before);
});

test.each([
  ['lf', '\n'],
  ['crlf', '\r\n'],
])(
  'stale bridge upgrade preserves canonical validity and outside bytes with %s',
  async (_name, eol) => {
    const { repositoryPath } = await materializeCase('integration-block-missing-handoff', true);
    const installation = join(repositoryPath, '.agents', 'skills', 'moldea');
    const helperPath = join(installation, 'scripts', 'managed-agents.mjs');
    const currentBlock = readFileSync(
      join(installation, 'assets', 'managed-agents-block.md'),
      'utf8',
    ).replaceAll('{{skill-path}}', '.agents/skills/moldea');
    const prefix = `\uFEFF# Host instructions${eol}${eol}`;
    const suffix = `${eol}Preserve these instructions.${eol}`;
    const staleBlock = currentBlock.replace(
      '<!-- moldea:end -->',
      'Legacy routing instructions.\n<!-- moldea:end -->',
    );
    const agentsPath = join(repositoryPath, 'AGENTS.md');
    writeFileSync(agentsPath, prefix + staleBlock.replaceAll('\n', eol) + suffix);
    const before = await snapshotSemanticWorkspace(repositoryPath);
    const staleValidation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
      result: {
        valid: boolean;
        warningCount: number;
        page: { records: Array<{ code?: string; acceptable?: boolean }> };
      };
    };
    assert.equal(staleValidation.result.valid, true);
    assert.equal(staleValidation.result.warningCount, 1);
    assert.ok(
      staleValidation.result.page.records.some(
        ({ code, acceptable }) => code === 'MOLDEA_INTEGRATION_BLOCK_STALE' && acceptable,
      ),
    );
    const printed = spawnSync(
      process.execPath,
      [helperPath, '--repository', repositoryPath, '--print'],
      { encoding: 'utf8', timeout: 15_000 },
    );
    assert.ifError(printed.error);
    assert.equal(printed.status, 0, printed.stderr);
    assert.equal(printed.stdout, currentBlock);
    assert.deepEqual(await snapshotSemanticWorkspace(repositoryPath), before);

    const updated = spawnSync(process.execPath, [helperPath, '--repository', repositoryPath], {
      encoding: 'utf8',
      timeout: 15_000,
    });
    assert.ifError(updated.error);
    assert.equal(updated.status, 0, updated.stderr);
    assert.equal(updated.stdout, 'updated\n');
    assert.equal(
      readFileSync(agentsPath, 'utf8'),
      prefix + currentBlock.replaceAll('\n', eol) + suffix,
    );
    const expected = new Map(before);
    const after = await snapshotSemanticWorkspace(repositoryPath);
    expected.set('AGENTS.md', after.get('AGENTS.md')!);
    assert.deepEqual(after, expected);
    const currentValidation = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
      result: { valid: boolean; warningCount: number };
    };
    assert.equal(currentValidation.result.valid, true);
    assert.equal(currentValidation.result.warningCount, 0);
  },
);

test('manager guidance cases isolate explicit, conflicting and missing evidence', async () => {
  for (const caseId of [
    'initialize-readme-package-manager',
    'initialize-conflicting-package-manager',
    'initialize-missing-package-manager',
  ]) {
    const { repositoryPath } = await materializeCase(caseId);
    const manifest = JSON.parse(readFileSync(join(repositoryPath, 'package.json'), 'utf8')) as {
      packageManager?: string;
      devDependencies: Record<string, string>;
    };
    const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
    assert.equal(existsSync(join(repositoryPath, 'package-lock.json')), false);
    assert.equal(existsSync(join(repositoryPath, 'moldea', 'moldea.yaml')), false);
    assert.equal(readme.includes('Use npm'), caseId !== 'initialize-missing-package-manager');
    assert.equal(
      manifest.packageManager,
      caseId === 'initialize-conflicting-package-manager' ? 'pnpm@11.21.0' : undefined,
    );
    assert.equal(
      existsSync(join(repositoryPath, 'node_modules', '@moldea.ai', 'cli', 'package.json')),
      caseId === 'initialize-readme-package-manager',
    );
    assert.ok(manifest.devDependencies['@moldea.ai/cli']);
  }
});

test('conservative continuation fixtures retain a real baseline and independently unchanged owner', async () => {
  for (const caseId of [
    'repair-continuation-unavailable-commit',
    'repair-continuation-incomplete-checkpoint',
    'repair-continuation-missing-owner-list',
  ]) {
    const { repositoryPath } = await materializeCase(caseId, true);
    assert.equal(
      readFileSync(join(repositoryPath, 'src/owner-a.js'), 'utf8'),
      "export const state = 'baseline';\n",
    );
    assert.equal(
      readFileSync(join(repositoryPath, 'src/owner-b.js'), 'utf8'),
      "export const state = 'drifted';\n",
    );
    const ref = spawnSync('git', ['rev-parse', 'repair-checkpoint'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    if (caseId === 'repair-continuation-unavailable-commit') assert.notEqual(ref.status, 0);
    else {
      assert.equal(ref.status, 0, ref.stderr);
      assert.match(ref.stdout.trim(), /^[a-f0-9]{40,64}$/u);
    }
    const result = JSON.parse(launcherOutput(repositoryPath, ['validate'])) as {
      result: { valid: boolean };
    };
    assert.equal(result.result.valid, true);
  }
});

test('partial repair has independent owner bodies and materiality repair keeps genuine settings', async () => {
  const partial = await materializeCase('repair-continuation-partial-coverage');
  const manifest = readFileSync(join(partial.repositoryPath, 'moldea/moldea.yaml'), 'utf8');
  assert.equal((manifest.match(/\/moldea\/context\//gu) ?? []).length, 64);
  assert.equal(existsSync(join(partial.repositoryPath, 'moldea/context/01.md')), true);
  assert.equal(existsSync(join(partial.repositoryPath, 'moldea/context/64.md')), true);
  const relationships = await materializeCase('repair-relationship-materiality');
  const fixture = readFileSync(join(relationships.repositoryPath, 'moldea/moldea.yaml'), 'utf8');
  const lock = JSON.parse(
    readFileSync(join(relationships.repositoryPath, 'package-lock.json'), 'utf8'),
  ) as {
    packages: Record<
      string,
      {
        version?: string;
        devDependencies?: Record<string, string>;
        dependencies?: Record<string, string>;
      }
    >;
  };
  const cliVersion = lock.packages['']!.devDependencies!['@moldea.ai/cli'];
  assert.equal(lock.packages['node_modules/@moldea.ai/cli']!.version, cliVersion);
  assert.ok(lock.packages['node_modules/@moldea.ai/core']?.version);
  for (const entry of Object.values(lock.packages)) {
    for (const dependency of Object.keys(entry.dependencies ?? {}))
      assert.ok(lock.packages[`node_modules/${dependency}`], dependency);
  }

  assert.equal(gateResult(relationships.repositoryPath, ['/src/project-state.js']), '1\n');
  for (const source of [
    '/src/refund-policy.js',
    '/src/refund-settings.js',
    '/src/ui/navigation.js',
    '/package.json',
    '/package-lock.json',
  ])
    assert.ok(fixture.includes(source));
  assert.match(
    readFileSync(join(relationships.repositoryPath, 'moldea/context/refunds.md'), 'utf8'),
    /1000-unit threshold/u,
  );
  assert.match(
    readFileSync(join(relationships.repositoryPath, 'src/refund-settings.js'), 'utf8'),
    /threshold = 1000/u,
  );
});

test.each(
  (await loadSemanticCases(CASE_DIRECTORY)).map(
    (definition) => [definition.id, definition] as const,
  ),
)('%s materializes its declared starting paths', async (_id, definition) => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-case-facts-'));
  temporaryRoots.push(root);
  await withEmptyCodexHome(root, async () => {
    const { repositoryPath, readOnlyMounts } = await createActorRepository(
      root,
      definition,
      join(root, 'sandbox-home'),
      join(root, 'actor-tools'),
    );
    for (const { source } of definition.input.repositoryEvidence) {
      if (source.kind !== 'workspace-path' && source.kind !== 'related-path') continue;
      const sourceRoot =
        source.kind === 'workspace-path'
          ? repositoryPath
          : readOnlyMounts.find(
              ({ target }) => target === source.mount || target === `/${source.mount}`,
            )?.source;
      assert.ok(sourceRoot, `Missing declared mount for ${definition.id}.`);
      const filePath = join(sourceRoot, source.path);
      const stats = lstatSync(filePath, { throwIfNoEntry: false });
      if (source.expectedType === 'missing') assert.equal(stats, undefined, source.path);
      else {
        assert.ok(stats, `${definition.id}: ${source.path}`);
        assert.equal(
          source.expectedType === 'file'
            ? stats.isFile()
            : source.expectedType === 'directory'
              ? stats.isDirectory()
              : stats.isSymbolicLink(),
          true,
          source.path,
        );
      }
    }
  });
});
