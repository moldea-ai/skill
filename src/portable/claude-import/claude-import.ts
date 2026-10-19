import { resolveInstructionWriteTarget, type IInstructionPath } from '../instruction-link/index.ts';
import {
  isMissingFile,
  readManagedFile,
  writeManagedFileAtomically,
} from '../managed-block/index.ts';

// Claude Code instruction files, named by the subjects of Core's integration warnings
export const CLAUDE_INSTRUCTION_SUBJECTS = [
  '/CLAUDE.md',
  '/.claude/CLAUDE.md',
  '/CLAUDE.local.md',
] as const;

export type IClaudeInstructionSubject = (typeof CLAUDE_INSTRUCTION_SUBJECTS)[number];

// repository-relative instruction paths of the Claude Code subjects
const CLAUDE_INSTRUCTION_PATHS = {
  '/CLAUDE.md': 'CLAUDE.md',
  '/.claude/CLAUDE.md': '.claude/CLAUDE.md',
  '/CLAUDE.local.md': 'CLAUDE.local.md',
} as const satisfies Record<IClaudeInstructionSubject, IInstructionPath>;

// import lines Claude Code resolves to the root AGENTS.md, by the importing file's directory
const ROOT_AGENTS_IMPORTS: ReadonlySet<string> = new Set(['@AGENTS.md', '@./AGENTS.md']);
const NESTED_AGENTS_IMPORTS: ReadonlySet<string> = new Set(['@../AGENTS.md']);
const UTF8_BOM = '\uFEFF';

/** Returns whether a value names one supported Claude Code instruction file. */
export const isClaudeInstructionSubject = (value: unknown): value is IClaudeInstructionSubject =>
  CLAUDE_INSTRUCTION_SUBJECTS.some((subject) => subject === value);

/**
 * Returns the exact line that makes one Claude Code instruction file load the root AGENTS.md.
 * @param subject The Claude Code instruction file.
 * @returns `@../AGENTS.md` for `/.claude/CLAUDE.md`, otherwise `@AGENTS.md`.
 */
export const getClaudeImportLine = (subject: IClaudeInstructionSubject): string =>
  subject === '/.claude/CLAUDE.md' ? '@../AGENTS.md' : '@AGENTS.md';

/**
 * Reports whether Claude Code instruction text already imports the root AGENTS.md, using Core's
 * grammar: one unfenced line, trimmed of spaces and tabs, that is an AGENTS.md import.
 * @param text The decoded instruction text.
 * @param subject The Claude Code instruction file the text belongs to.
 * @returns Whether an equivalent import line is present.
 */
export const hasAgentsImport = (text: string, subject: IClaudeInstructionSubject): boolean => {
  const imports = subject === '/.claude/CLAUDE.md' ? NESTED_AGENTS_IMPORTS : ROOT_AGENTS_IMPORTS;
  let fence: string | null = null;

  for (const rawLine of text.replace(/^\uFEFF/u, '').split(/\r\n|\n|\r/u)) {
    const line = rawLine.replace(/^[ \t]+|[ \t]+$/gu, '');
    const marker = /^(`{3,}|~{3,})/u.exec(line)?.[1];

    if (fence !== null) {
      if (marker !== undefined && marker[0] === fence[0] && marker.length >= fence.length)
        fence = null;
    } else if (marker !== undefined) {
      fence = marker;
    } else if (imports.has(line)) {
      return true;
    }
  }

  return false;
};

/**
 * Appends the import line to Claude Code instruction bytes, keeping their line ending, or returns
 * the bytes unchanged when an equivalent import already exists.
 * @param documentBytes The bounded instruction file bytes.
 * @param subject The Claude Code instruction file the bytes belong to.
 * @returns The complete updated bytes.
 * @throws
 * - The Claude instruction file is not valid UTF-8.
 */
export const createClaudeImportBytes = (
  documentBytes: Buffer,
  subject: IClaudeInstructionSubject,
): Buffer => {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(documentBytes);
  } catch {
    throw new Error(`${CLAUDE_INSTRUCTION_PATHS[subject]} is not valid UTF-8`);
  }

  if (hasAgentsImport(text, subject)) return documentBytes;

  const newlines = text.match(/\n/gu)?.length ?? 0;
  const lineEnding = newlines > 0 && newlines === text.match(/\r\n/gu)?.length ? '\r\n' : '\n';
  const separator =
    text === '' || text === UTF8_BOM || text.endsWith('\n') || text.endsWith('\r')
      ? ''
      : lineEnding;

  return Buffer.concat([
    documentBytes,
    Buffer.from(`${separator}${getClaudeImportLine(subject)}${lineEnding}`, 'utf8'),
  ]);
};

/**
 * Makes an existing Claude Code instruction file load AGENTS.md by appending the import line.
 * A linked file is updated through its regular-file target inside the repository, keeping the
 * link; other links are refused. A missing file is never created.
 * @param repositoryRoot The canonical absolute repository root.
 * @param subject The Claude Code instruction file to update.
 * @returns Whether the import line was appended.
 * @throws
 * - The Claude instruction file does not exist.
 * - The specific reason a linked instruction file cannot be updated in place.
 * - The Claude instruction file must be a bounded regular UTF-8 file.
 */
export const updateClaudeImport = async (
  repositoryRoot: string,
  subject: IClaudeInstructionSubject,
): Promise<'unchanged' | 'updated'> => {
  const instructionPath = CLAUDE_INSTRUCTION_PATHS[subject];
  const target = await resolveInstructionWriteTarget(repositoryRoot, instructionPath);
  let current: Awaited<ReturnType<typeof readManagedFile>>;
  try {
    current = await readManagedFile(target.hostPath);
  } catch (error) {
    if (isMissingFile(error)) {
      throw new Error(
        `${instructionPath} does not exist, and Claude instruction files are never created`,
        { cause: error },
      );
    }
    throw error;
  }

  const updatedBytes = createClaudeImportBytes(current.bytes, subject);
  if (updatedBytes.equals(current.bytes)) return 'unchanged';

  await writeManagedFileAtomically(target.hostPath, updatedBytes, current.mode, current);
  await target.confirm();
  return 'updated';
};
