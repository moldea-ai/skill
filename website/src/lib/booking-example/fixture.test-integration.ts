// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { expect, test } from 'vitest';

import { BOOKING_EXAMPLE, BOOKING_EXAMPLE_BEFORE_FILES } from './fixture.ts';

test('the displayed booking project executes the illustrated outcomes and boundary checks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moldea-booking-'));
  try {
    await mkdir(join(directory, 'src'));
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n');
    for (const file of [
      BOOKING_EXAMPLE.files.service,
      BOOKING_EXAMPLE.files.availability,
      BOOKING_EXAMPLE.files.tests,
    ]) {
      await writeFile(join(directory, file.path), file.source);
    }
    const output = execFileSync(
      process.execPath,
      ['--test', '--test-reporter=tap', BOOKING_EXAMPLE.files.tests.path],
      {
        cwd: directory,
        encoding: 'utf8',
      },
    );
    expect(output).toContain('# pass 7');
    expect(output).toContain('# fail 0');
    expect(
      BOOKING_EXAMPLE.files.service.source
        .split('\n')
        .slice(5, -1)
        .map((line) => line.slice(2))
        .join('\n'),
    ).toBe(BOOKING_EXAMPLE.serviceExcerpt);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('the displayed Git markers reflect the booking project before and after the change', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moldea-booking-status-'));
  try {
    for (const [path, source] of Object.entries(BOOKING_EXAMPLE_BEFORE_FILES)) {
      if (source === undefined) continue;
      const target = join(directory, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, source);
    }
    execFileSync('git', ['init', '--quiet'], { cwd: directory });
    execFileSync('git', ['add', '--all'], { cwd: directory });
    for (const file of Object.values(BOOKING_EXAMPLE.files)) {
      await writeFile(join(directory, file.path), file.source);
    }
    const modifiedFiles = execFileSync('git', ['diff', '--name-status'], {
      cwd: directory,
      encoding: 'utf8',
    });
    const addedFiles = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: directory,
      encoding: 'utf8',
    });
    expect(modifiedFiles.trim().split(/\r?\n/u)).toStrictEqual([
      `M\t${BOOKING_EXAMPLE.files.instructions.path}`,
      `M\t${BOOKING_EXAMPLE.files.service.path}`,
    ]);
    expect(addedFiles.trim()).toBe(BOOKING_EXAMPLE.files.tests.path);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
