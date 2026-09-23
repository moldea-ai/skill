// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

const materializeCase = async (caseId: string) => {
  const caseDefinition = cases.find(({ id }) => id === caseId);
  assert.ok(caseDefinition, `Missing semantic case ${caseId}.`);
  const root = mkdtempSync(join(tmpdir(), 'moldea-setup-'));
  temporaryRoots.push(root);
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

test('bound maintenance has an exact relationship and stale architecture context', async () => {
  const { repositoryPath } = await materializeCase('bound-context-maintenance');
  assert.equal(gateResult(repositoryPath, ['/src/cleanup-scheduler.js']), '1\n');
  assert.match(
    readFileSync(join(repositoryPath, 'moldea', 'context', 'architecture.md'), 'utf8'),
    /fixed 60-minute interval/u,
  );
});

test('initially unrelated checkout reveals a newly bound refund path through its import', async () => {
  const { caseDefinition, repositoryPath } = await materializeCase('expanding-task-relevance');
  assert.equal(gateResult(repositoryPath, ['/src/checkout.js']), '0\n');
  assert.match(readFileSync(join(repositoryPath, 'src', 'checkout.js'), 'utf8'), /refund-policy/u);
  assert.equal(gateResult(repositoryPath, ['/src/refund-policy.js']), '1\n');
  assert.equal(
    caseDefinition.input.repositoryEvidence.some(
      ({ source }) => source.kind === 'workspace-path' && source.path === 'src/refund-policy.js',
    ),
    false,
  );
});

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
