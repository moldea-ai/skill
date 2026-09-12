import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const WINDOWS_RESERVED_PATH_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;

const hasInvalidPathCharacter = (segment: string): boolean =>
  [...segment].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 || '<>:"|?*'.includes(character);
  });

const resolveMaterializedPath = (root: string, repositoryPath: string): string => {
  const segments = repositoryPath.split('/');
  if (
    repositoryPath.length === 0 ||
    Buffer.byteLength(repositoryPath, 'utf8') > 160 ||
    repositoryPath.includes('\\') ||
    isAbsolute(repositoryPath) ||
    segments.some(
      (segment) =>
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        Buffer.byteLength(segment, 'utf8') > 64 ||
        hasInvalidPathCharacter(segment) ||
        /[. ]$/u.test(segment) ||
        WINDOWS_RESERVED_PATH_PATTERN.test(segment) ||
        EXCLUDED_DIRECTORY_NAMES.has(segment),
    )
  ) {
    throw new Error(`Pinned evidence contains an unsafe materialization path: ${repositoryPath}`);
  }
  const path = resolve(root, ...segments);
  const relativePath = relative(root, path);
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`Pinned evidence path escapes its temporary root: ${repositoryPath}`);
  }
  return path;
};

/** Materializes one authenticated snapshot for a synchronous website loader and removes it. */
export const withMaterializedEvidenceSource = <Output>(
  files: ReadonlyMap<string, Buffer>,
  load: (repositoryRoot: string) => Output,
): Output => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-evidence-source-'));
  try {
    for (const [repositoryPath, source] of files) {
      const path = resolveMaterializedPath(temporaryRoot, repositoryPath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, source, { flag: 'wx' });
    }
    return load(temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};
