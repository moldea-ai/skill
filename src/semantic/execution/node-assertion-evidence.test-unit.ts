import { expect, test } from 'vitest';

import type { ICliInvocation } from '../../execution/host/index.ts';

import { hasValidNodeAssertionFact, projectNodeAssertion } from './node-assertion-evidence.ts';

const source =
  'import check from "node:assert/strict"; import { readRule } from "./src/rule.mjs"; ' +
  'check.deepStrictEqual(readRule(), {enabled: true});';

const project = (program: string, assertionObservation: ICliInvocation['assertionObservation']) =>
  projectNodeAssertion({
    arguments: ['--input-type=module', '-e', program],
    entrypoint: 'node-eval',
    assertionObservation,
    exitCode: 0,
    outputByteCount: 0,
    stdout: '',
  });

test('projects a bounded check independently of the child and enclosing shell exit codes', () => {
  for (const passed of [true, false]) {
    const fact = project(source, { method: 'deepStrictEqual', passed });
    expect(fact).toStrictEqual({
      kind: 'node-assertion',
      status: passed ? 'passed' : 'failed',
      method: 'deepStrictEqual',
      actual: 'readRule()',
      expected: '{"enabled": true}',
      source: './src/rule.mjs',
    });
    expect(hasValidNodeAssertionFact(JSON.parse(JSON.stringify(fact)))).toBe(true);
    expect(hasValidNodeAssertionFact({ ...fact, stdout: 'untrusted' })).toBe(false);
  }
});

test('keeps missing and ambiguous observations distinct', () => {
  expect(project(source, null)).toStrictEqual({ kind: 'node-assertion', status: 'skipped' });
  for (const observation of [
    undefined,
    'ambiguous',
    { method: 'strictEqual', passed: true },
  ] as const) {
    expect(project(source, observation)).toStrictEqual({
      kind: 'node-assertion',
      status: 'ambiguous',
    });
  }
});

test.each([
  'import check from "node:assert/strict"; if (false) check.strictEqual(1, 1);',
  'import check from "node:assert/strict"; check.strictEqual(1,',
  source + ' '.repeat(4096),
  source.replace('enabled: true', 'enabled: process.env.PASSWORD'),
  source.replace('enabled: true', 'enabled: "ghp_012345678901234567890123456789012345"'),
  source.replace('readRule()', 'readRule(process.env)'),
  'import check from "./assert.mjs"; check.strictEqual(1,1);',
])('does not project operands from unsupported programs %#', (program) => {
  expect(project(program, { method: 'deepStrictEqual', passed: true })).toStrictEqual({
    kind: 'node-assertion',
    status: 'unsupported',
  });
});
