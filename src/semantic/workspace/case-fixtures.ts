import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isAlias, parseDocument, visit } from 'yaml';
import { z } from 'zod';

import type { ISemanticWorkspaceChanges, ISemanticWorkspaceSnapshot } from './setup.ts';

const SCRIPTS = path.resolve(import.meta.dirname, '../../../moldea/scripts');
const ScopeEnvelope = z.object({
  status: z.literal('valid'),
  result: z.object({
    relevant: z.boolean(),
    page: z.object({
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional(),
      records: z.array(
        z.object({
          kind: z.literal('match'),
          path: z.string(),
          relationships: z.array(z.object({ field: z.string(), path: z.string() })),
        }),
      ),
    }),
  }),
});
const ContextEntries = z.object({
  context: z.record(z.string(), z.object({ affectedBy: z.array(z.string()).default([]) })),
});

/** Writes the exact source files in a synthetic case before its baseline commit. */
export const writeCaseFixture = async (
  repositoryPath: string,
  files: Readonly<Record<string, string>>,
): Promise<void> => {
  for (const [relativePath, source] of Object.entries(files)) {
    const file = path.join(repositoryPath, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, source, 'utf8');
  }
};

/** Returns bounded source retained by the existing per-cycle snapshot. */
export const readCaseFile = (snapshot: ISemanticWorkspaceSnapshot, filePath: string): string => {
  const state = snapshot.get(filePath);
  return state?.type === 'file' ? (state.content ?? '') : '';
};

/** Lists paths whose content, mode or disposition changed during a request. */
export const listCaseChanges = (changes: ISemanticWorkspaceChanges): string[] =>
  [...changes.created, ...changes.deleted, ...changes.modified].map(({ path }) => path).sort();

/** Observes the case's authored context impact declarations without resolving workspace code. */
export const readCaseImpactPaths = (
  snapshot: ISemanticWorkspaceSnapshot,
): Map<string, string[]> => {
  const source = readCaseFile(snapshot, 'moldea/moldea.yaml');
  const document = parseDocument(source);
  if (document.errors.length > 0 || document.warnings.length > 0) return new Map();
  let containsAlias = false;
  visit(document, (_, node) => {
    if (isAlias(node)) {
      containsAlias = true;
      return visit.BREAK;
    }
    return undefined;
  });
  if (containsAlias) return new Map();
  const parsed = ContextEntries.safeParse(document.toJS({ maxAliasCount: 0 }));
  return new Map(
    parsed.success
      ? Object.entries(parsed.data.context).map(([owner, { affectedBy }]) => [owner, affectedBy])
      : [],
  );
};

/** Checks a repository-relative Markdown link without opening its target. */
export const hasCaseLink = (source: string, from: string, target: string): boolean =>
  [...source.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)].some(([, href]) => {
    const destination = href?.split('#')[0];
    if (destination === undefined || destination === '') return false;
    return (
      (destination.startsWith('/')
        ? path.posix.normalize(destination).slice(1)
        : path.posix.normalize(path.posix.join(path.posix.dirname(from), destination))) === target
    );
  });

/** Runs the trusted bundled gate and Scope against one actor-owned manifest path. */
export const checkCaseScope = (repositoryPath: string, matchPath: string) => {
  const options = {
    encoding: 'utf8',
    maxBuffer: 65_536,
    timeout: 5_000,
    env: {},
  } as const;
  const args = ['--repository', repositoryPath, '--path', matchPath];
  const gate = spawnSync(
    process.execPath,
    [path.join(SCRIPTS, 'relevance-gate.mjs'), ...args],
    options,
  );
  const scope = spawnSync(
    process.execPath,
    [
      path.join(SCRIPTS, 'moldea-cli', 'moldea.mjs'),
      'scope',
      ...args,
      '--json',
      '--max-output-bytes',
      '65536',
    ],
    options,
  );
  if (
    gate.error !== undefined ||
    gate.status !== 0 ||
    scope.error !== undefined ||
    scope.status !== 0
  )
    return null;
  let envelope: unknown;
  try {
    envelope = JSON.parse(scope.stdout);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return null;
  }
  const parsed = ScopeEnvelope.safeParse(envelope);
  if (!parsed.success) return null;
  const { relevant, page } = parsed.data.result;
  if (
    page.hasNextPage === true ||
    page.nextCursor != null ||
    gate.stdout.trim() !== (relevant ? '1' : '0')
  )
    return null;
  return { relevant, records: page.records };
};
