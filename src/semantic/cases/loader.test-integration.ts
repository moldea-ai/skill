// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { projectCodexEvaluationExecutionEvidence } from '../../execution/host/index.ts';

import { buildSemanticActorPrompt, buildSemanticJudgePrompt } from '../judging/index.ts';

import { loadSemanticCases } from './loader.ts';

const temporaryRoots: string[] = [];

const createCaseDefinition = (id: string) => ({
  coverageClaimIds: ['synthetic-discovery'],
  expected: [{ criterion: 'The actor reports the synthetic result.', label: 'synthetic-result' }],
  forbidden: [{ criterion: 'The actor invents evidence.', label: 'invented-evidence' }],
  id,
  input: {
    developerDirection: 'Inspect the synthetic case.',
    repositoryEvidence: [
      {
        claim: 'The request names a synthetic case.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  operation: 'synthetic-discovery',
  resourceBudget: {
    activation: 'abstain',
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
    minimumMoldeaCommands: 0,
  },
  scenario: 'A synthetic case is added without central registration.',
});

const writeCaseModule = async (
  root: string,
  directoryName: string,
  caseId = directoryName,
): Promise<void> => {
  const caseDirectory = path.join(root, directoryName);
  await mkdir(caseDirectory, { recursive: true });
  await writeFile(
    path.join(caseDirectory, 'case.mjs'),
    `export const semanticCase = ${JSON.stringify(createCaseDefinition(caseId))};\n`,
    'utf8',
  );
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('semantic case discovery', () => {
  test('loads every maintained typed case without a fixed inventory', async () => {
    const cases = await loadSemanticCases(import.meta.dirname);

    expect(cases.length).toBeGreaterThan(1);
    expect(cases.map(({ id }) => id)).toContain('preinit-information');
    expect(cases.every(({ coverageClaimIds }) => coverageClaimIds.length > 0)).toBe(true);
    expect(cases.every(({ setup }) => typeof setup === 'function')).toBe(true);
  });

  test('every explicit repair independently enforces helper-only Git compliance', async () => {
    const cases = await loadSemanticCases(import.meta.dirname);
    const repairs = cases.filter(({ id }) => id.startsWith('repair-'));
    expect(repairs.length).toBeGreaterThan(0);
    for (const repair of repairs) {
      expect(
        repair.expected.some(({ label }) =>
          ['approved-repair-git', 'repair-git-compliance'].includes(label),
        ),
        repair.id,
      ).toBe(true);
    }
    expect(
      repairs
        .filter(({ expected }) => expected.some(({ label }) => label === 'approved-repair-git'))
        .map(({ id }) => id),
    ).toStrictEqual(['repair-continuation-after-change', 'repair-continuation-manifest-change']);
  });

  test('builds actor and judge prompts for a real case with a setup callback', async () => {
    const cases = await loadSemanticCases(import.meta.dirname);
    const caseDefinition = cases.find(({ id }) => id === 'adopted-explicit-context-correction');
    expect(caseDefinition).toBeDefined();
    if (caseDefinition === undefined) return;

    const actorPrompt = buildSemanticActorPrompt(caseDefinition);
    const judgePrompt = buildSemanticJudgePrompt({
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicyEvidence: projectCodexEvaluationExecutionEvidence('').commandPolicy,
      actorExecutionEvidence: [],
      isRepositoryControlPassing: true,
      actorResourceEvidence: {
        commandCount: 0,
        maximumInvocationByteCount: 0,
        modelVisibleToolOutputByteCount: 0,
        operations: [],
        stdoutByteCount: 0,
      },
      actorResponse: 'The correction was requested.',
      caseDefinition,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    });

    expect(actorPrompt).toBe(caseDefinition.input.developerDirection);
    expect(actorPrompt).not.toContain(caseDefinition.expected[0]?.label);
    expect(judgePrompt).toContain(caseDefinition.expected[0]?.label);
  });

  test('discovers repair and expansion cases with grading criteria isolated from actor requests', async () => {
    const cases = await loadSemanticCases(import.meta.dirname);
    for (const caseId of [
      'scope-expansion-second-owner',
      'scope-expansion-unbound-only',
      'context-instruction-injection',
      'repair-readme-drift',
      'repair-ambiguous-foundation',
      'repair-healthy-project',
      'repair-connection-drift',
      'repair-continuation-after-change',
      'repair-continuation-manifest-change',
      'maintain-bound-connection',
      'maintain-relationship-after-move',
      'maintain-tool-registration',
      'maintain-shared-module-boundary',
    ]) {
      const caseDefinition = cases.find(({ id }) => id === caseId);
      expect(caseDefinition, caseId).toBeDefined();
      if (caseDefinition === undefined) continue;
      const actorPrompt = buildSemanticActorPrompt(caseDefinition);
      expect(actorPrompt).toBe(caseDefinition.input.developerDirection);
      for (const criterion of [...caseDefinition.expected, ...caseDefinition.forbidden]) {
        expect(actorPrompt).not.toContain(criterion.label);
      }
      expect(typeof caseDefinition.setup).toBe('function');
    }
  });

  test('discovers one additional case without central registration', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-cases-'));
    temporaryRoots.push(root);
    await writeCaseModule(root, 'synthetic-case');

    await expect(loadSemanticCases(root)).resolves.toMatchObject([{ id: 'synthetic-case' }]);
  });

  test('rejects missing modules, duplicate ids, and directory mismatches', async () => {
    const missingRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-cases-'));
    const duplicateRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-cases-'));
    const mismatchRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-cases-'));
    temporaryRoots.push(missingRoot, duplicateRoot, mismatchRoot);
    await mkdir(path.join(missingRoot, 'missing-case'));
    await writeCaseModule(duplicateRoot, 'first-case', 'same-case');
    await writeCaseModule(duplicateRoot, 'second-case', 'same-case');
    await writeCaseModule(mismatchRoot, 'directory-case', 'different-case');

    await expect(loadSemanticCases(missingRoot)).rejects.toThrow(/has no case module/u);
    await expect(loadSemanticCases(duplicateRoot)).rejects.toThrow(/ids must be unique/u);
    await expect(loadSemanticCases(mismatchRoot)).rejects.toThrow(/does not match id/u);
  });
});

test('repair continuations require Git presence only when comparison is needed', async () => {
  const cases = await loadSemanticCases(import.meta.dirname);
  const presenceRequired = new Set([
    'repair-continuation-after-change',
    'repair-continuation-manifest-change',
  ]);
  const continuations = cases.filter(({ id }) => id.startsWith('repair-continuation-'));
  expect(continuations).toHaveLength(6);
  for (const definition of continuations) {
    const label = presenceRequired.has(definition.id)
      ? 'approved-repair-git'
      : 'repair-git-compliance';
    expect(
      definition.expected.some((criterion) => criterion.label === label),
      definition.id,
    ).toBe(true);
    expect(buildSemanticActorPrompt(definition)).not.toContain(label);
  }
});

const CANDIDATE_TARGET_CASE_IDS = [
  'evaluate-brief-project-request',
  'initialize-inspected-source-coverage',
  'maintenance-cycle-budget',
  'model-workflow-routing',
  'pnpm-pnp-local-cli-provider',
  'repair-continuation-manifest-change',
  'routing-description-contradiction',
  'routing-description-fallback',
];

test('the release catalog retains 143 cases with only the approved exclusion', async () => {
  const cases = await loadSemanticCases(import.meta.dirname);
  expect(cases).toHaveLength(143);
  expect(
    cases.reduce((count, { expected, forbidden }) => count + expected.length + forbidden.length, 0),
  ).toBe(643);
  expect(cases.filter(({ publication }) => publication !== 'private')).toHaveLength(142);
  expect(
    cases.filter(({ publication }) => publication === 'private').map(({ id }) => id),
  ).toStrictEqual(['repair-unproven-adoption']);
});

test.each(CANDIDATE_TARGET_CASE_IDS)(
  'candidate target %s is eligible for fresh recording',
  async (caseId) => {
    const cases = await loadSemanticCases(import.meta.dirname);
    const definition = cases.find(({ id }) => id === caseId);
    expect(definition).toBeDefined();
    expect(definition?.publication).not.toBe('private');
    expect(typeof definition?.setup).toBe('function');
  },
);
