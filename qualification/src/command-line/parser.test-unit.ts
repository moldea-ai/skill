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
    [['run', '--adapter', 'custom'], 'Required option is missing: --implementation'],
    [['run', '--adapter', 'custom', '--adapter', 'custom'], 'Duplicate option: --adapter'],
    [['verify', '--dry-run'], 'Option --dry-run is not valid for this command'],
    [['list', '--unknown'], 'Unknown qualification option: --unknown'],
  ])('parseQualificationCommand(%o) rejects invalid input', (args, expectedMessage) => {
    expect(() => parseQualificationCommand(args)).toThrow(expectedMessage);
  });
});
