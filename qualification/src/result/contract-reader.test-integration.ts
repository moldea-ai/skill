// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  QualificationProfileSchema,
  QualificationResourceCalibrationSchema,
} from '../contracts/index.ts';
import { executeProcess } from '../process/index.ts';
import { readQualificationContractJson, readQualificationContractYaml } from './contract-reader.ts';

describe('recorded qualification contracts', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('reads the recorded profile after the current profile changes', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-recorded-contract-'));
    const profilePath = path.join(temporaryRoot, 'qualification', 'profiles', 't1', 'profile.yaml');
    const resultsRoot = path.join(temporaryRoot, 'qualification', 'results');
    await mkdir(path.dirname(profilePath), { recursive: true });
    await mkdir(resultsRoot, { recursive: true });
    const createProfile = (title: string): string =>
      [
        'version: 2',
        'adapterId: custom',
        'implementationId: custom',
        `title: ${title}`,
        'description: Recorded contract fixture.',
        'probesFile: probes/claims.yaml',
        'cases:',
        '  - id: release-case',
        '    projectDirectory: cases/c1',
        '    scenarioFile: scenario.yaml',
        '',
      ].join('\n');
    await writeFile(profilePath, createProfile('Recorded profile'), 'utf8');
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: temporaryRoot,
    });
    await executeProcess({ command: 'git', args: ['add', 'qualification'], cwd: temporaryRoot });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=moldea qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: record qualification contract',
      ],
      cwd: temporaryRoot,
    });
    const { stdout } = await executeProcess({
      command: 'git',
      args: ['rev-parse', 'HEAD'],
      cwd: temporaryRoot,
    });
    await writeFile(profilePath, createProfile('Current profile'), 'utf8');

    await expect(
      readQualificationContractYaml({
        qualificationRepositoryCommit: stdout.trim(),
        relativePath: 'profiles/t1/profile.yaml',
        resultsRoot,
        schema: QualificationProfileSchema,
      }),
    ).resolves.toMatchObject({ title: 'Recorded profile' });
  });

  test('reads the recorded resource profile after the current calibration changes', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-recorded-resource-'));
    const calibrationPath = path.join(temporaryRoot, 'fixtures', 'resource-calibration.json');
    const resultsRoot = path.join(temporaryRoot, 'qualification', 'results');
    await mkdir(path.dirname(calibrationPath), { recursive: true });
    await mkdir(resultsRoot, { recursive: true });
    const createCalibration = (maxCompletedCommandCount: number): string =>
      `${JSON.stringify(
        {
          schemaVersion: 1,
          profiles: Object.fromEntries(
            ['ordinary', 'largeTraversal'].map((profileName) => [
              profileName,
              {
                maxCompletedCommandCount,
                maxCommandOutputBytes: 65_536,
                maxHostTokenCount: 1_250_000,
                maxModelVisibleToolOutputBytes: 1_048_576,
                maxAggregateMoldeaOutputBytes: 262_144,
                maxMoldeaCommandCount: 16,
                maxOutputPageBytes: 65_536,
              },
            ]),
          ),
        },
        null,
        2,
      )}\n`;
    await writeFile(calibrationPath, createCalibration(32), 'utf8');
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: temporaryRoot,
    });
    await executeProcess({ command: 'git', args: ['add', 'fixtures'], cwd: temporaryRoot });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=moldea qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: record qualification calibration',
      ],
      cwd: temporaryRoot,
    });
    const { stdout } = await executeProcess({
      command: 'git',
      args: ['rev-parse', 'HEAD'],
      cwd: temporaryRoot,
    });
    await writeFile(calibrationPath, createCalibration(64), 'utf8');

    await expect(
      readQualificationContractJson({
        contractRoot: 'repository',
        qualificationRepositoryCommit: stdout.trim(),
        relativePath: 'fixtures/resource-calibration.json',
        resultsRoot,
        schema: QualificationResourceCalibrationSchema,
      }),
    ).resolves.toMatchObject({
      profiles: { ordinary: { maxCompletedCommandCount: 32 } },
    });
  });
});
