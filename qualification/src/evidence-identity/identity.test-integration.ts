// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { QUALIFICATION_ROOT } from '../constants/index.ts';
import { copyDirectory, ensureDirectory, writeTextFileAtomically } from '../filesystem/index.ts';
import { loadQualificationProfileIndex } from '../storage/index.ts';
import {
  calculateQualificationCaseModelInputDigests,
  calculateQualificationEvaluatorDigest,
  calculateQualificationLogicalInputDigest,
  calculateQualificationModelStageEvaluatorDigest,
} from './identity.ts';

describe('qualification compatibility identity', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('derives stable, distinct current identities for all 14 profiles', async () => {
    const index = await loadQualificationProfileIndex();
    const evaluatorDigest = await calculateQualificationEvaluatorDigest();
    const logicalDigests = new Set<string>();

    await expect(calculateQualificationEvaluatorDigest()).resolves.toBe(evaluatorDigest);

    for (const target of index.targets) {
      const selection = {
        adapterId: target.adapterId,
        implementationId: target.implementationId,
      };
      const logicalDigest = await calculateQualificationLogicalInputDigest({ selection });

      await expect(calculateQualificationLogicalInputDigest({ selection })).resolves.toBe(
        logicalDigest,
      );
      logicalDigests.add(logicalDigest);
    }

    expect(logicalDigests.size).toBe(index.targets.length);
  });

  test('changes a logical digest when actor-visible profile bytes change', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-logical-input-'));
    const qualificationRoot = path.join(temporaryRoot, 'qualification');
    const profilesRoot = path.join(qualificationRoot, 'profiles');
    await ensureDirectory(path.join(qualificationRoot, 'cases'));
    await copyDirectory(
      path.join(QUALIFICATION_ROOT, 'profiles', 't5'),
      path.join(profilesRoot, 't1'),
    );
    await writeTextFileAtomically(
      path.join(profilesRoot, 'index.yaml'),
      [
        'version: 1',
        'targets:',
        '  - key: t1',
        '    adapterId: custom',
        '    implementationId: custom',
        '',
      ].join('\n'),
    );
    await writeFile(
      path.join(qualificationRoot, 'cases', 'cases.yaml'),
      await readFile(path.join(QUALIFICATION_ROOT, 'cases', 'cases.yaml')),
    );
    const selection = { adapterId: 'custom', implementationId: 'custom' } as const;
    const initialDigest = await calculateQualificationLogicalInputDigest({
      qualificationRoot,
      selection,
    });
    const taskPath = path.join(profilesRoot, 't1', 'cases', 'c1', 'task.md');
    await writeFile(taskPath, `${await readFile(taskPath, 'utf8')}\nChanged input.\n`, 'utf8');

    await expect(
      calculateQualificationLogicalInputDigest({ qualificationRoot, selection }),
    ).resolves.not.toBe(initialDigest);
  });

  test('isolates case input changes to their exact owning case', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-case-input-'));
    const qualificationRoot = path.join(temporaryRoot, 'qualification');
    await Promise.all([
      copyDirectory(
        path.join(QUALIFICATION_ROOT, 'profiles', 't5'),
        path.join(qualificationRoot, 'profiles', 't5'),
      ),
      ensureDirectory(path.join(qualificationRoot, 'cases')),
    ]);
    await Promise.all([
      writeFile(
        path.join(qualificationRoot, 'profiles', 'index.yaml'),
        await readFile(path.join(QUALIFICATION_ROOT, 'profiles', 'index.yaml')),
      ),
      writeFile(
        path.join(qualificationRoot, 'cases', 'cases.yaml'),
        await readFile(path.join(QUALIFICATION_ROOT, 'cases', 'cases.yaml')),
      ),
    ]);
    const selection = { adapterId: 'custom', implementationId: 'custom' } as const;
    const caseIds = ['evaluate-aligned-project', 'create-grounded-agent'];
    const before = await calculateQualificationCaseModelInputDigests({
      caseIds,
      qualificationRoot,
      selection,
    });
    const scenarioPath = path.join(
      qualificationRoot,
      'profiles',
      't5',
      'cases',
      'c3',
      'scenario.yaml',
    );
    await writeFile(
      scenarioPath,
      `${await readFile(scenarioPath, 'utf8')}\n# changed case input\n`,
    );
    const after = await calculateQualificationCaseModelInputDigests({
      caseIds,
      qualificationRoot,
      selection,
    });

    expect(after['evaluate-aligned-project']).toBe(before['evaluate-aligned-project']);
    expect(after['create-grounded-agent']).not.toBe(before['create-grounded-agent']);
  });

  test('keeps scheduling source outside the model-stage evaluator digest', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-identity-'));
    await ensureDirectory(path.join(temporaryRoot, 'qualification'));
    await Promise.all([
      copyDirectory(
        path.join(QUALIFICATION_ROOT, 'src'),
        path.join(temporaryRoot, 'qualification', 'src'),
      ),
      copyDirectory(
        path.join(QUALIFICATION_ROOT, '..', 'tooling', 'codex-evaluation-host'),
        path.join(temporaryRoot, 'tooling', 'codex-evaluation-host'),
      ),
      copyDirectory(
        path.join(QUALIFICATION_ROOT, '..', 'tooling', 'package-candidate'),
        path.join(temporaryRoot, 'tooling', 'package-candidate'),
      ),
      copyDirectory(
        path.join(QUALIFICATION_ROOT, '..', 'tooling', 'resource-calibration'),
        path.join(temporaryRoot, 'tooling', 'resource-calibration'),
      ),
      writeFile(
        path.join(temporaryRoot, 'package.json'),
        await readFile(path.join(QUALIFICATION_ROOT, '..', 'package.json')),
      ),
      writeFile(
        path.join(temporaryRoot, 'package-lock.json'),
        await readFile(path.join(QUALIFICATION_ROOT, '..', 'package-lock.json')),
      ),
      writeFile(
        path.join(temporaryRoot, 'qualification', 'package.json'),
        await readFile(path.join(QUALIFICATION_ROOT, 'package.json')),
      ),
      writeFile(
        path.join(temporaryRoot, 'qualification', 'package-lock.json'),
        await readFile(path.join(QUALIFICATION_ROOT, 'package-lock.json')),
      ),
    ]);
    const before = await calculateQualificationModelStageEvaluatorDigest(temporaryRoot);
    const executorPath = path.join(
      temporaryRoot,
      'qualification',
      'src',
      'execution',
      'executor.ts',
    );
    await writeFile(executorPath, `${await readFile(executorPath, 'utf8')}\n// scheduling only\n`);

    await expect(calculateQualificationModelStageEvaluatorDigest(temporaryRoot)).resolves.toBe(
      before,
    );

    const workspacePath = path.join(
      temporaryRoot,
      'qualification',
      'src',
      'execution',
      'workspaces.ts',
    );
    await writeFile(workspacePath, `${await readFile(workspacePath, 'utf8')}\n// model-visible\n`);
    await expect(calculateQualificationModelStageEvaluatorDigest(temporaryRoot)).resolves.not.toBe(
      before,
    );
  });
});
