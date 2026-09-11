// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { parseQualificationCommand } from './parser.ts';

describe('parseQualificationCommand', () => {
  test('parses one explicit dry-run target without paid approval', () => {
    expect(
      parseQualificationCommand([
        'run',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--packages-repository',
        '/work/packages',
        '--dry-run',
        '--json',
      ]),
    ).toStrictEqual({
      kind: 'run',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      packagesRepository: '/work/packages',
      isDryRun: true,
      reuseEvidence: true,
      workerCount: 4,
      hasConfirmedPaidExecution: false,
      isJson: true,
    });
  });

  test('parses one explicit paid diagnostic case', () => {
    expect(
      parseQualificationCommand([
        'diagnose',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--case',
        'stop-on-material-ambiguity',
        '--confirm-paid-execution',
        '--json',
      ]),
    ).toStrictEqual({
      kind: 'diagnose',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      caseId: 'stop-on-material-ambiguity',
      hasConfirmedPaidExecution: true,
      isJson: true,
    });
  });

  test.each([
    [
      ['diagnose-batch', '--adapter', 'custom', '--implementation', 'custom', '--all'],
      { kind: 'all', value: null },
    ],
    [
      [
        'diagnose-batch',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--cases',
        'case-one,case-two',
      ],
      { kind: 'cases', value: 'case-one,case-two' },
    ],
    [
      [
        'diagnose-batch',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--claims',
        'claim-one',
        '--restart',
      ],
      { kind: 'claims', value: 'claim-one' },
    ],
    [
      [
        'diagnose-batch',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--unresolved-from',
        'attempt-one',
        '--resume-stopped-stage',
      ],
      { kind: 'unresolved-from', value: 'attempt-one' },
    ],
  ] as const)('parses one diagnose-batch selector from %o', (args, selector) => {
    expect(parseQualificationCommand(args)).toMatchObject({
      kind: 'diagnose-batch',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      selector,
      workerCount: 4,
    });
  });

  test.each([
    [['run-batch', '--all'], { kind: 'all', value: null }],
    [
      [
        'run-batch',
        '--targets',
        'anthropic/typescript-messages-api-0-117,vercel-ai-sdk/typescript-tool-loop-agent-7',
        '--workers',
        '2',
      ],
      {
        kind: 'targets',
        value: 'anthropic/typescript-messages-api-0-117,vercel-ai-sdk/typescript-tool-loop-agent-7',
      },
    ],
    [
      ['run-batch', '--unresolved-from', 'batch-one'],
      { kind: 'unresolved-from', value: 'batch-one' },
    ],
  ] as const)('parses one run-batch selector from %o', (args, selector) => {
    expect(parseQualificationCommand(args)).toMatchObject({
      kind: 'run-batch',
      selector,
      resumeStoppedStage: false,
      workerCount: selector.kind === 'targets' ? 2 : 4,
    });
  });

  test.each([
    [['list', '--json'], { kind: 'list', isJson: true }],
    [['status', '--all'], { kind: 'status', isAll: true, isJson: false }],
    [
      ['status', '--cursor', 'opaque-cursor', '--json'],
      { kind: 'status', cursor: 'opaque-cursor', isAll: false, isJson: true },
    ],
    [['verify'], { kind: 'verify', isJson: false }],
    [
      ['record', '--attempt', 'attempt-1'],
      { kind: 'record', attemptId: 'attempt-1', isJson: false },
    ],
    [
      ['resume', '--attempt', 'attempt-1', '--confirm-paid-execution'],
      {
        kind: 'resume',
        attemptId: 'attempt-1',
        hasConfirmedPaidExecution: true,
        resumeStoppedStage: false,
        workerCount: 4,
        isJson: false,
      },
    ],
    [
      ['resume', '--attempt', 'attempt-1', '--resume-stopped-stage'],
      {
        kind: 'resume',
        attemptId: 'attempt-1',
        hasConfirmedPaidExecution: false,
        resumeStoppedStage: true,
        workerCount: 4,
        isJson: false,
      },
    ],
    [
      ['retry', '--attempt', 'attempt-1', '--json'],
      {
        kind: 'retry',
        attemptId: 'attempt-1',
        hasConfirmedPaidExecution: false,
        workerCount: 4,
        isJson: true,
      },
    ],
  ] as const)('parses %s', (args, expectedCommand) => {
    expect(parseQualificationCommand(args)).toStrictEqual(expectedCommand);
  });

  test.each([
    [['run', '--adapter', 'custom'], 'Required option is missing: --implementation'],
    [
      ['diagnose', '--adapter', 'custom', '--implementation', 'custom'],
      'Required option is missing: --case',
    ],
    [['run', '--adapter', 'custom', '--adapter', 'custom'], 'Duplicate option: --adapter'],
    [['verify', '--dry-run'], 'Option --dry-run is not valid for this command'],
    [['verify', '--cursor', 'opaque-cursor'], 'Option --cursor is not valid for this command'],
    [
      ['retry', '--attempt', 'attempt-1', '--resume-stopped-stage'],
      'Option --resume-stopped-stage is not valid for this command',
    ],
    [
      [
        'diagnose',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--case',
        'one',
        '--no-reuse',
      ],
      'Option --no-reuse is not valid for this command',
    ],
    [
      ['diagnose-batch', '--adapter', 'custom', '--implementation', 'custom'],
      'diagnose-batch requires exactly one diagnostic selector',
    ],
    [['run-batch'], 'run-batch requires exactly one profile selector'],
    [['run-batch', '--all', '--targets', 't1'], 'run-batch requires exactly one profile selector'],
    [['run-batch', '--all', '--workers', '3'], '--workers must be 1, 2, or 4'],
    [
      ['run-batch', '--all', '--restart', '--resume-stopped-stage'],
      '--restart and --resume-stopped-stage cannot be combined',
    ],
    [
      [
        'diagnose-batch',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--all',
        '--cases',
        'one',
      ],
      'diagnose-batch requires exactly one diagnostic selector',
    ],
    [
      [
        'diagnose-batch',
        '--adapter',
        'custom',
        '--implementation',
        'custom',
        '--all',
        '--restart',
        '--resume-stopped-stage',
      ],
      '--restart and --resume-stopped-stage cannot be combined',
    ],
    [['list', '--unknown'], 'Unknown qualification option: --unknown'],
  ])('parseQualificationCommand(%o) rejects invalid input', (args, expectedMessage) => {
    expect(() => parseQualificationCommand(args)).toThrow(expectedMessage);
  });
});
