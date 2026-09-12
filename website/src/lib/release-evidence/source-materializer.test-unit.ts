// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { withMaterializedEvidenceSource } from './source-materializer.ts';

describe('withMaterializedEvidenceSource', () => {
  test('loads selected files and removes the temporary root after success', () => {
    let materializedRoot = '';
    const result = withMaterializedEvidenceSource(
      new Map([
        ['fixtures/result.json', Buffer.from('{"status":"passed"}\n')],
        ['moldea/SKILL.md', Buffer.from('# moldea\n')],
      ]),
      (repositoryRoot) => {
        materializedRoot = repositoryRoot;
        return readFileSync(join(repositoryRoot, 'fixtures', 'result.json'), 'utf8');
      },
    );

    expect(result).toBe('{"status":"passed"}\n');
    expect(existsSync(materializedRoot)).toBe(false);
  });

  test('removes the temporary root when the website loader fails', () => {
    let materializedRoot = '';

    expect(() =>
      withMaterializedEvidenceSource(
        new Map([['fixtures/result.json', Buffer.from('{}\n')]]),
        (repositoryRoot) => {
          materializedRoot = repositoryRoot;
          throw new Error('Expected loader failure.');
        },
      ),
    ).toThrow('Expected loader failure.');
    expect(existsSync(materializedRoot)).toBe(false);
  });

  test.each([
    '../escape.json',
    '/absolute.json',
    '_archive/result.json',
    'a\\b.json',
    'con.json',
    'invalid?.json',
    'trailing./result.json',
    `${'a'.repeat(65)}.json`,
    `${'é'.repeat(33)}.json`,
  ])('rejects unsafe source path %s', (repositoryPath) => {
    expect(() =>
      withMaterializedEvidenceSource(
        new Map([[repositoryPath, Buffer.from('{}\n')]]),
        () => undefined,
      ),
    ).toThrow(/unsafe materialization path/u);
  });
});
