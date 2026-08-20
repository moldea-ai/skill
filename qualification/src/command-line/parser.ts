import type { IQualificationCommand } from './types.ts';

const VALUE_OPTIONS = new Set(['--adapter', '--attempt', '--implementation', '--skill-repository']);
const BOOLEAN_OPTIONS = new Set([
  '--all',
  '--confirm-paid-execution',
  '--dry-run',
  '--json',
  '--no-cache',
]);

type IParsedOptions = {
  values: Map<string, string>;
  booleans: Set<string>;
};

const parseOptions = (args: readonly string[]): IParsedOptions => {
  const values = new Map<string, string>();
  const booleans = new Set<string>();

  for (let argumentIndex = 0; argumentIndex < args.length; argumentIndex += 1) {
    const argument = args[argumentIndex];

    if (argument === undefined) {
      continue;
    }

    if (BOOLEAN_OPTIONS.has(argument)) {
      if (booleans.has(argument)) {
        throw new Error(`Duplicate option: ${argument}`);
      }

      booleans.add(argument);
      continue;
    }

    if (VALUE_OPTIONS.has(argument)) {
      if (values.has(argument)) {
        throw new Error(`Duplicate option: ${argument}`);
      }

      const optionValue = args[argumentIndex + 1];

      if (optionValue === undefined || optionValue.startsWith('--')) {
        throw new Error(`Option ${argument} requires a value.`);
      }

      values.set(argument, optionValue);
      argumentIndex += 1;
      continue;
    }

    throw new Error(`Unknown qualification option: ${argument}`);
  }

  return { values, booleans };
};

const requireValue = (options: IParsedOptions, optionName: string): string => {
  const optionValue = options.values.get(optionName);

  if (optionValue === undefined) {
    throw new Error(`Required option is missing: ${optionName}`);
  }

  return optionValue;
};

const rejectOptions = (options: IParsedOptions, allowedOptions: ReadonlySet<string>): void => {
  const suppliedOptions = [...options.values.keys(), ...options.booleans];

  for (const suppliedOption of suppliedOptions) {
    if (!allowedOptions.has(suppliedOption)) {
      throw new Error(`Option ${suppliedOption} is not valid for this command.`);
    }
  }
};

/** Parses the strict local qualification command contract without accepting positional ambiguity. */
export const parseQualificationCommand = (args: readonly string[]): IQualificationCommand => {
  const [commandName, ...optionArgs] = args;

  if (commandName === undefined) {
    throw new Error('Interactive qualification has no parsed command.');
  }

  const options = parseOptions(optionArgs);
  const isJson = options.booleans.has('--json');

  switch (commandName) {
    case 'list':
      rejectOptions(options, new Set(['--json']));
      return { kind: 'list', isJson };
    case 'status':
      rejectOptions(options, new Set(['--all', '--json']));
      return { kind: 'status', isAll: options.booleans.has('--all'), isJson };
    case 'verify':
      rejectOptions(options, new Set(['--json']));
      return { kind: 'verify', isJson };
    case 'record':
      rejectOptions(options, new Set(['--attempt', '--json']));
      return { kind: 'record', attemptId: requireValue(options, '--attempt'), isJson };
    case 'resume':
    case 'retry':
      rejectOptions(options, new Set(['--attempt', '--confirm-paid-execution', '--json']));
      return {
        kind: commandName,
        attemptId: requireValue(options, '--attempt'),
        hasConfirmedPaidExecution: options.booleans.has('--confirm-paid-execution'),
        isJson,
      };
    case 'run':
      rejectOptions(
        options,
        new Set([
          '--adapter',
          '--confirm-paid-execution',
          '--dry-run',
          '--implementation',
          '--json',
          '--no-cache',
          '--skill-repository',
        ]),
      );
      return {
        kind: 'run',
        selection: {
          adapterId: requireValue(options, '--adapter'),
          implementationId: requireValue(options, '--implementation'),
        },
        ...(options.values.has('--skill-repository')
          ? { skillRepository: requireValue(options, '--skill-repository') }
          : {}),
        isDryRun: options.booleans.has('--dry-run'),
        useCache: !options.booleans.has('--no-cache'),
        hasConfirmedPaidExecution: options.booleans.has('--confirm-paid-execution'),
        isJson,
      };
    default:
      throw new Error(`Unknown qualification command: ${commandName}`);
  }
};
