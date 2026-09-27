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

  test('builds actor and judge prompts for a real case with a setup callback', async () => {
    const cases = await loadSemanticCases(import.meta.dirname);
    const caseDefinition = cases.find(({ id }) => id === 'adopted-explicit-context-correction');
    expect(caseDefinition).toBeDefined();
    if (caseDefinition === undefined) return;

    const actorPrompt = buildSemanticActorPrompt(caseDefinition);
    const judgePrompt = buildSemanticJudgePrompt({
      actorCommandPolicyEvidence: projectCodexEvaluationExecutionEvidence('').commandPolicy,
      actorExecutionEvidence: [],
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
