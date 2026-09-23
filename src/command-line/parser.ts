import type { IEvidenceKind } from '../evidence/index.ts';
import type { IEvidenceCommand } from './types.ts';

const getOption = (arguments_: readonly string[], name: string): string => {
  const optionIndex = arguments_.indexOf(name);
  const optionValue = arguments_[optionIndex + 1];

  if (optionIndex === -1 || optionValue === undefined || optionValue.startsWith('--')) {
    throw new Error(`Missing required ${name} option.`);
  }

  if (arguments_.indexOf(name, optionIndex + 1) !== -1) {
    throw new Error(`Option ${name} must be provided once.`);
  }

  return optionValue;
};

const getEvidenceKind = (arguments_: readonly string[]): IEvidenceKind => {
  const kind = getOption(arguments_, '--scope');
  if (kind !== 'semantic' && kind !== 'qualification') {
    throw new Error('Evidence kind must be semantic or qualification.');
  }
  return kind;
};

const assertExactOptions = (
  arguments_: readonly string[],
  optionNames: readonly string[],
): void => {
  if (
    arguments_.length !== optionNames.length * 2 ||
    arguments_.some((argument, index) => index % 2 === 0 && !optionNames.includes(argument))
  ) {
    throw new Error(`Expected options: ${optionNames.join(', ')}.`);
  }
};

/** Parses the small explicit maintainer command surface for evidence assets. */
export const parseEvidenceCommand = (
  commandName: string,
  arguments_: readonly string[],
): IEvidenceCommand => {
  if (commandName === 'prepare' || commandName === 'release-check') {
    if (arguments_.length !== 0) throw new Error(`${commandName} accepts no arguments.`);
    return { kind: commandName };
  }

  if (commandName === 'pack') {
    const evidenceKind = getEvidenceKind(arguments_);
    if (evidenceKind === 'semantic') {
      assertExactOptions(arguments_, ['--scope', '--run']);
      return {
        kind: 'pack',
        evidenceKind,
        runId: getOption(arguments_, '--run'),
      };
    }
    assertExactOptions(arguments_, ['--scope']);
    return {
      kind: 'pack',
      evidenceKind,
    };
  }

  if (commandName === 'publish') {
    assertExactOptions(arguments_, ['--bundle', '--tag']);
    return {
      kind: 'publish',
      bundlePath: getOption(arguments_, '--bundle'),
      tag: getOption(arguments_, '--tag'),
    };
  }

  if (commandName === 'pin') {
    assertExactOptions(arguments_, ['--scope', '--release', '--asset']);
    return {
      kind: 'pin',
      evidenceKind: getEvidenceKind(arguments_),
      assetName: getOption(arguments_, '--asset'),
      release: getOption(arguments_, '--release'),
    };
  }

  throw new Error(`Unknown evidence command: ${commandName}`);
};
