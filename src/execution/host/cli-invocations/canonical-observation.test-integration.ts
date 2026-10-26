import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { observeCanonicalDigest } from './canonical-observation.ts';

const withFixture = (operation: (root: string) => void): void => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-canonical-'));
  try {
    operation(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('digest identifies canonical content and names independently of enumeration order or mode', () =>
  withFixture((root) => {
    const canonical = join(root, 'canonical');
    mkdirSync(canonical);
    writeFileSync(join(canonical, 'b.md'), 'second');
    writeFileSync(join(canonical, 'a.md'), 'first');
    const before = observeCanonicalDigest(canonical);
    expect(before).toMatch(/^[a-f0-9]{64}$/u);
    rmSync(join(canonical, 'b.md'));
    writeFileSync(join(canonical, 'b.md'), 'second');
    chmodSync(join(canonical, 'a.md'), 0o755);
    expect(observeCanonicalDigest(canonical)).toBe(before);
    writeFileSync(join(canonical, 'a.md'), 'changed');
    expect(observeCanonicalDigest(canonical)).not.toBe(before);
    writeFileSync(join(canonical, 'a.md'), 'first');
    renameSync(join(canonical, 'a.md'), join(canonical, 'renamed.md'));
    expect(observeCanonicalDigest(canonical)).not.toBe(before);
  }));

test('distinguishes absence from an empty directory and refuses linked roots, parents and files', () =>
  withFixture((root) => {
    const canonical = join(root, 'canonical');
    const absent = observeCanonicalDigest(canonical);
    mkdirSync(canonical);
    expect(observeCanonicalDigest(canonical)).not.toBe(absent);
    const outside = join(root, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'private.md'), 'not canonical');
    symlinkSync(outside, join(canonical, 'linked'));
    expect(observeCanonicalDigest(canonical)).toBeNull();
    rmSync(join(canonical, 'linked'));
    symlinkSync(join(outside, 'private.md'), join(canonical, 'linked.md'));
    expect(observeCanonicalDigest(canonical)).toBeNull();
    symlinkSync(canonical, join(root, 'linked-root'));
    expect(observeCanonicalDigest(join(root, 'linked-root'))).toBeNull();
  }));

test('bounds canonical bytes, entries and depth before granting chronology evidence', () =>
  withFixture((root) => {
    const canonical = join(root, 'canonical');
    mkdirSync(canonical);
    writeFileSync(join(canonical, 'large.md'), Buffer.alloc(16 * 1024 * 1024));
    expect(observeCanonicalDigest(canonical)).toMatch(/^[a-f0-9]{64}$/u);
    writeFileSync(join(canonical, 'extra.md'), 'x');
    expect(observeCanonicalDigest(canonical)).toBeNull();
    rmSync(canonical, { recursive: true });
    mkdirSync(canonical);
    for (let index = 0; index < 4096; index++)
      writeFileSync(join(canonical, `file-${index}.md`), '');
    expect(observeCanonicalDigest(canonical)).toMatch(/^[a-f0-9]{64}$/u);
    writeFileSync(join(canonical, 'file-4096.md'), '');
    expect(observeCanonicalDigest(canonical)).toBeNull();
    rmSync(canonical, { recursive: true });
    mkdirSync(canonical);
    let nested = canonical;
    for (let depth = 0; depth < 64; depth++) {
      nested = join(nested, 'd');
      mkdirSync(nested);
    }
    expect(observeCanonicalDigest(canonical)).toMatch(/^[a-f0-9]{64}$/u);
    mkdirSync(join(nested, 'd'));
    expect(observeCanonicalDigest(canonical)).toBeNull();
  }));
