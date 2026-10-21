import { parseStrictArgs } from 'jg-process';

import type { IEvidenceKind } from '../evidence/index.ts';
import type { IEvidenceCommand } from './types.ts';

// a required single-value option
const REQUIRED_OPTION = { type: 'string', required: true } as const;

const parseEvidenceKind = (kind: string): IEvidenceKind => {
  if (kind !== 'semantic' && kind !== 'journeys') {
    throw new Error('Evidence kind must be semantic or journeys.');
  }
  return kind;
};

/**
 * Parses the small explicit maintainer command surface for evidence assets.
 * @throws
 * - INVALID_ARGUMENTS: an unknown option, a positional argument, a missing or empty value, a
 * repeated option, or a missing required one
 * - The command is unknown, takes no arguments, or names an unsupported evidence kind.
 */
export const parseEvidenceCommand = (
  commandName: string,
  arguments_: readonly string[],
): IEvidenceCommand => {
  if (commandName === 'prepare' || commandName === 'release-check') {
    if (arguments_.length !== 0) throw new Error(`${commandName} accepts no arguments.`);
    return { kind: commandName };
  }

  if (commandName === 'pack') {
    const { run, scope } = parseStrictArgs(arguments_, {
      run: REQUIRED_OPTION,
      scope: REQUIRED_OPTION,
    });
    return { kind: 'pack', evidenceKind: parseEvidenceKind(scope), runId: run };
  }

  if (commandName === 'publish') {
    const { bundle, tag } = parseStrictArgs(arguments_, {
      bundle: REQUIRED_OPTION,
      tag: REQUIRED_OPTION,
    });
    return { kind: 'publish', bundlePath: bundle, tag };
  }

  if (commandName === 'pin') {
    const { asset, release, scope } = parseStrictArgs(arguments_, {
      asset: REQUIRED_OPTION,
      release: REQUIRED_OPTION,
      scope: REQUIRED_OPTION,
    });
    return { kind: 'pin', evidenceKind: parseEvidenceKind(scope), assetName: asset, release };
  }

  throw new Error(`Unknown evidence command: ${commandName}`);
};
