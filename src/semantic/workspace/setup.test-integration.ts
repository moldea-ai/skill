// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeAll, test } from 'vitest';

import { loadSemanticCases, type ISemanticCase } from '../cases/index.ts';

import { createActorRepository } from './setup.ts';

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
const temporaryRoots: string[] = [];
let cases: ISemanticCase[];

beforeAll(async () => {
  cases = await loadSemanticCases(CASE_DIRECTORY);
});

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

const materializeCase = async (caseId: string, withGitBaseline = false) => {
  const caseDefinition = cases.find(({ id }) => id === caseId);
  assert.ok(caseDefinition, `Missing semantic case ${caseId}.`);
  const root = mkdtempSync(join(tmpdir(), 'moldea-setup-'));
  temporaryRoots.push(root);
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

test.each([
  'adopted-direct-context-handoff',
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

test('damaged managed README blocks adoption while retaining prior canonical files', async () => {
  const { repositoryPath } = await materializeCase('damaged-setup-validation');
  assert.equal(gateResult(repositoryPath, [], true), '0\n');
  const readme = readFileSync(join(repositoryPath, 'README.md'), 'utf8');
  assert.match(readme, /<!-- moldea:start -->\nFor every repository task/u);
  assert.equal(readme.includes(readFileSync(MANAGED_BLOCK_PATH, 'utf8')), false);
  assert.equal(existsSync(join(repositoryPath, 'moldea', 'moldea.yaml')), true);
  assert.equal(existsSync(join(repositoryPath, 'moldea', 'project.md')), true);
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

  const { repositoryPath } = await createActorRepository(
    root,
    caseDefinition,
    join(root, 'sandbox-home'),
    join(root, 'actor-tools'),
  );
  const baseline = spawnSync('git', ['show', 'HEAD:README.md'], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.match(baseline.stdout, /<!-- moldea:start -->\n\n/u);
  assert.notEqual(readFileSync(join(repositoryPath, 'README.md'), 'utf8'), baseline.stdout);
  assert.equal(gateResult(repositoryPath, [], true), '0\n');
});
