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
      useCache: true,
      hasConfirmedPaidExecution: false,
      isJson: true,
    });
  });

  test.each([
    [['list', '--json'], { kind: 'list', isJson: true }],
    [['status', '--all'], { kind: 'status', isAll: true, isJson: false }],
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
        isJson: false,
      },
    ],
    [
      ['retry', '--attempt', 'attempt-1', '--json'],
      {
        kind: 'retry',
        attemptId: 'attempt-1',
        hasConfirmedPaidExecution: false,
        isJson: true,
      },
    ],
  ] as const)('parses %s', (args, expectedCommand) => {
    expect(parseQualificationCommand(args)).toStrictEqual(expectedCommand);
  });

  test.each([
    [['run', '--adapter', 'custom'], 'Required option is missing: --implementation'],
    [['run', '--adapter', 'custom', '--adapter', 'custom'], 'Duplicate option: --adapter'],
    [['verify', '--dry-run'], 'Option --dry-run is not valid for this command'],
    [['list', '--unknown'], 'Unknown qualification option: --unknown'],
  ])('parseQualificationCommand(%o) rejects invalid input', (args, expectedMessage) => {
    expect(() => parseQualificationCommand(args)).toThrow(expectedMessage);
  });
});
