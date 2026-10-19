// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createClaudeImportBytes, getClaudeImportLine, hasAgentsImport } from './index.ts';

describe('Claude Code AGENTS.md imports', () => {
  test.each([
    ['/CLAUDE.md', '@AGENTS.md'],
    ['/CLAUDE.local.md', '@AGENTS.md'],
    ['/.claude/CLAUDE.md', '@../AGENTS.md'],
  ] as const)('getClaudeImportLine(%s) -> %s', (subject, line) => {
    expect(getClaudeImportLine(subject)).toBe(line);
  });

  test.each([
    ['@AGENTS.md\n', '/CLAUDE.md', true],
    ['# Rules\n  \t@./AGENTS.md \t\n', '/CLAUDE.md', true],
    ['\uFEFF@AGENTS.md', '/CLAUDE.local.md', true],
    ['@../AGENTS.md\r\n', '/.claude/CLAUDE.md', true],
    ['@AGENTS.md\n', '/.claude/CLAUDE.md', false],
    ['@../AGENTS.md\n', '/CLAUDE.md', false],
    ['See @AGENTS.md for rules\n', '/CLAUDE.md', false],
    ['```md\n@AGENTS.md\n```\n', '/CLAUDE.md', false],
    ['~~~~\n@AGENTS.md\n~~~\n', '/CLAUDE.md', false],
    ['```\n@AGENTS.md\n```\n@AGENTS.md\n', '/CLAUDE.md', true],
    ['@agents.md\n', '/CLAUDE.md', false],
  ] as const)('hasAgentsImport(%o, %s) -> %s', (text, subject, expected) => {
    expect(hasAgentsImport(text, subject)).toBe(expected);
  });

  test.each([
    ['', '/CLAUDE.md', '@AGENTS.md\n'],
    ['\uFEFF', '/CLAUDE.md', '\uFEFF@AGENTS.md\n'],
    ['# Rules\n', '/CLAUDE.md', '# Rules\n@AGENTS.md\n'],
    ['# Rules', '/CLAUDE.local.md', '# Rules\n@AGENTS.md\n'],
    ['# Rules\r\n\r\nKeep\r\n', '/CLAUDE.md', '# Rules\r\n\r\nKeep\r\n@AGENTS.md\r\n'],
    ['# Rules\r\nKeep', '/CLAUDE.md', '# Rules\r\nKeep\r\n@AGENTS.md\r\n'],
    ['# Mixed\r\nline\n', '/CLAUDE.md', '# Mixed\r\nline\n@AGENTS.md\n'],
    ['# Nested\n', '/.claude/CLAUDE.md', '# Nested\n@../AGENTS.md\n'],
  ] as const)('createClaudeImportBytes(%o, %s) appends one line', (text, subject, expected) => {
    expect(createClaudeImportBytes(Buffer.from(text, 'utf8'), subject).toString('utf8')).toBe(
      expected,
    );
  });

  test('returns the same bytes when an equivalent import exists', () => {
    const bytes = Buffer.from('# Rules\r\n@./AGENTS.md\r\n', 'utf8');
    expect(createClaudeImportBytes(bytes, '/CLAUDE.md')).toBe(bytes);
  });

  test('rejects invalid UTF-8', () => {
    expect(() => createClaudeImportBytes(Buffer.from([0xff]), '/CLAUDE.md')).toThrow(
      'CLAUDE.md is not valid UTF-8',
    );
  });
});
