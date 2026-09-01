// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { QUALIFICATION_ROOT, SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import { copyDirectory, ensureDirectory, writeTextFileAtomically } from '../filesystem/index.ts';
import { loadQualificationProfileIndex } from '../storage/index.ts';
import {
  calculateQualificationEvaluatorDigest,
  calculateQualificationEvaluatorDigestAtCommit,
  calculateQualificationLogicalInputDigest,
  calculateQualificationLogicalInputDigestAtCommit,
} from './identity.ts';

const SOURCE_COMMIT = 'fcbc34f60b12b1b66cd9ebb28b1865979a259429';

describe('qualification compatibility identity', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('preserves evaluator and all 14 logical profile identities across short storage', async () => {
    const index = await loadQualificationProfileIndex();

    await expect(calculateQualificationEvaluatorDigest()).resolves.toBe(
      await calculateQualificationEvaluatorDigestAtCommit(SOURCE_COMMIT),
    );

    for (const target of index.targets) {
      const selection = {
        adapterId: target.adapterId,
        implementationId: target.implementationId,
      };

      await expect(calculateQualificationLogicalInputDigest({ selection })).resolves.toBe(
        await calculateQualificationLogicalInputDigestAtCommit({
          commit: SOURCE_COMMIT,
          repositoryRoot: SKILL_REPOSITORY_ROOT,
          selection,
        }),
      );
    }
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
});
