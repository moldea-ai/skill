// @vitest-environment node
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
      requestedCaseId: undefined,
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

  test('keeps one targeted case diagnostic-only', () => {
    expect(parseSemanticEvaluationArguments(['--case', 'unrelated-review'])).toMatchObject({
      requestedCaseId: 'unrelated-review',
      workerCount: null,
    });
    expect(() =>
      parseSemanticEvaluationArguments(['--case', 'unrelated-review', '--record']),
    ).toThrow(/diagnostic-only/u);
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
});
