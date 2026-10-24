// @vitest-environment node
import { expectToThrowCode } from 'jg-exception/testing';
import { ERRORS as PROCESS_ERRORS } from 'jg-process';
import { describe, expect, test } from 'vitest';

import { parseSemanticEvaluationArguments } from './parser.ts';

describe('semantic evaluation argument parsing', () => {
  test('requires an explicit execution mode', () => {
    expect(() => parseSemanticEvaluationArguments([])).toThrow(
      /requires --record, --case <id>, or --diagnose-batch/u,
    );
  });

  test('parses recording modifiers and bounded worker counts', () => {
    expect(parseSemanticEvaluationArguments(['--record'])).toStrictEqual({
      diagnosticBatchSelector: null,
      isDiagnoseBatchRequested: false,
      isPreflightRequested: false,
      isRecordCheckpointRequested: false,
      isRecordRequested: true,
      isRestartRequested: false,
      isResumeStoppedStageRequested: false,
      isVerifyAttemptsRequested: false,
      recordCaseIds: null,
      requestedCaseId: undefined,
      tokenLimit: null,
      workerCount: 4,
    });
    expect(parseSemanticEvaluationArguments(['--record', '--workers', '2']).workerCount).toBe(2);
    expect(() => parseSemanticEvaluationArguments(['--record', '--workers', '3'])).toThrow(
      /must be 1, 2, or 4/u,
    );
    expect(() =>
      parseSemanticEvaluationArguments(['--record', '--restart', '--resume-stopped-stage']),
    ).toThrow(/cannot be combined/u);
  });

  test('records only explicitly selected cases', () => {
    expect(
      parseSemanticEvaluationArguments(['--record', '--cases', 'one,two', '--workers', '2']),
    ).toMatchObject({ recordCaseIds: ['one', 'two'], workerCount: 2 });
    expect(() => parseSemanticEvaluationArguments(['--record', '--cases', 'one,one'])).toThrow(
      /unique comma-separated/u,
    );
    expect(() => parseSemanticEvaluationArguments(['--record', '--all'])).toThrow(
      /Diagnostic selectors require|accepts only/u,
    );
  });

  test('keeps one targeted case diagnostic-only', () => {
    expect(parseSemanticEvaluationArguments(['--case', 'unrelated-review'])).toMatchObject({
      requestedCaseId: 'unrelated-review',
      workerCount: null,
    });
    expect(() =>
      parseSemanticEvaluationArguments(['--case', 'unrelated-review', '--record']),
    ).toThrow(/diagnostic-only/u);
  });

  test('accepts only a lower diagnostic admission ceiling', () => {
    expect(parseSemanticEvaluationArguments(['--diagnose-batch', '--all']).tokenLimit).toBeNull();
    expect(
      parseSemanticEvaluationArguments(['--diagnose-batch', '--all', '--token-limit', '64000000'])
        .tokenLimit,
    ).toBe(64_000_000);
    expect(
      parseSemanticEvaluationArguments(['--diagnose-batch', '--all', '--token-limit', '128000000'])
        .tokenLimit,
    ).toBe(128_000_000);
    for (const tokenLimit of [
      '0',
      '-1',
      '1.5',
      'NaN',
      'Infinity',
      '128000001',
      '9007199254740992',
      '1e6',
      '0x10',
      ' 10',
    ]) {
      expect(() =>
        parseSemanticEvaluationArguments([
          '--diagnose-batch',
          '--all',
          `--token-limit=${tokenLimit}`,
        ]),
      ).toThrow(/token-limit/u);
    }
    for (const mode of [
      ['--record'],
      ['--preflight'],
      ['--case', 'one'],
      ['--record-checkpoint'],
      ['--verify-attempts'],
    ]) {
      expect(() =>
        parseSemanticEvaluationArguments([...mode, '--token-limit', '64000000']),
      ).toThrow();
    }
  });

  test('requires one exact diagnostic batch selector', () => {
    expect(parseSemanticEvaluationArguments(['--diagnose-batch', '--all'])).toMatchObject({
      diagnosticBatchSelector: { kind: 'all', value: null },
      isDiagnoseBatchRequested: true,
      workerCount: 4,
    });
    expect(
      parseSemanticEvaluationArguments([
        '--diagnose-batch',
        '--claims',
        'activation-abstention,bounded-relevance',
      ]).diagnosticBatchSelector,
    ).toStrictEqual({
      kind: 'claims',
      value: 'activation-abstention,bounded-relevance',
    });
    expect(() => parseSemanticEvaluationArguments(['--diagnose-batch'])).toThrow(
      /exactly one diagnostic selector/u,
    );
    expect(() =>
      parseSemanticEvaluationArguments(['--diagnose-batch', '--cases', 'one,one']),
    ).toThrow(/unique comma-separated/u);
  });

  test('keeps preflight and recorded verification isolated', () => {
    expect(parseSemanticEvaluationArguments(['--preflight']).isPreflightRequested).toBe(true);
    expect(parseSemanticEvaluationArguments(['--verify-attempts']).isVerifyAttemptsRequested).toBe(
      true,
    );
    expect(() => parseSemanticEvaluationArguments(['--preflight', '--record'])).toThrow(
      /without other options/u,
    );
  });

  test.each([
    [['--record', '--unknown']],
    [['--record', '--workers', '2', '--workers', '4']],
    [['--record', 'extra']],
    [['--case']],
    [['--case', '--record']],
  ])('rejects unknown, repeated, positional and missing values %o', (arguments_) => {
    expectToThrowCode(
      () => parseSemanticEvaluationArguments(arguments_),
      PROCESS_ERRORS.INVALID_ARGUMENTS,
    );
  });

  test('accepts an option value written with an equals sign', () => {
    expect(parseSemanticEvaluationArguments(['--case=unrelated-review'])).toMatchObject({
      requestedCaseId: 'unrelated-review',
    });
  });
});
