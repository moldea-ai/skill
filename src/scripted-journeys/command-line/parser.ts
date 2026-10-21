import { parseStrictArgs } from 'jg-process';

import type { IJourneyPlatform } from '../index.ts';

// exact command variants keep publication and diagnostic inputs separate
export type IJourneysCommand =
  | { command: 'pack'; commit: string }
  | { command: 'publish-bundle'; bundle: string; sha256: string; runId: string }
  | {
      command: 'compose';
      runId: string;
      from?: string;
      platform?: IJourneyPlatform;
      journeys?: string[];
    }
  | {
      command: 'assess';
      bundle: string;
      sha256: string;
      exports: string[];
      diagnostic: boolean;
      models: Partial<Record<IJourneyPlatform, string>>;
      operatorRecord?: string;
    };

/** Requires the operator-held bundle digest. */
const assertBundleSha256 = (sha256: string): void => {
  if (!/^[a-f0-9]{64}$/u.test(sha256))
    throw new Error('A bundle and its operator-held SHA-256 are required.');
};

const REQUIRED = { type: 'string', required: true } as const;
const OPTIONAL = { type: 'string' } as const;
const REPEATED = { type: 'string', multiple: true } as const;

/**
 * Parses the maintainer workflow without accepting implicit refs or duplicate flags.
 * @throws
 * - INVALID_ARGUMENTS: an unknown option, a positional argument, a missing or empty value, a
 * repeated option, or a missing required one
 * - The command is unknown, or its values don't form one supported run.
 */
export const parseJourneysCommand = (argv: string[]): IJourneysCommand => {
  const [command, ...args] = argv;
  if (command === 'pack') {
    return { command, commit: parseStrictArgs(args, { commit: REQUIRED }).commit };
  }
  if (command === 'compose') {
    const flags = parseStrictArgs(args, {
      from: OPTIONAL,
      journey: REPEATED,
      platform: OPTIONAL,
      run: REQUIRED,
    });
    if (flags.platform !== undefined && flags.platform !== 'chatgpt' && flags.platform !== 'claude')
      throw new Error('Platform must be chatgpt or claude.');
    if (new Set(flags.journey).size !== flags.journey.length)
      throw new Error('Duplicate journey selector.');
    return {
      command,
      runId: flags.run,
      ...(flags.from === undefined ? {} : { from: flags.from }),
      ...(flags.platform === undefined ? {} : { platform: flags.platform }),
      ...(flags.journey.length === 0 ? {} : { journeys: flags.journey }),
    };
  }
  if (command === 'publish-bundle') {
    const flags = parseStrictArgs(args, { bundle: REQUIRED, run: REQUIRED, sha256: REQUIRED });
    assertBundleSha256(flags.sha256);
    return { command, bundle: flags.bundle, sha256: flags.sha256, runId: flags.run };
  }
  if (command !== 'assess') throw new Error('Use pack, publish-bundle, assess, or compose.');
  const flags = parseStrictArgs(args, {
    bundle: REQUIRED,
    'chatgpt-model': OPTIONAL,
    'claude-model': OPTIONAL,
    diagnostic: { type: 'boolean' },
    export: REPEATED,
    'operator-record': OPTIONAL,
    sha256: REQUIRED,
  });
  assertBundleSha256(flags.sha256);
  if (flags.export.length === 0) throw new Error('assess requires final --export paths.');
  if (
    !flags.diagnostic &&
    (flags['chatgpt-model'] !== undefined || flags['claude-model'] !== undefined)
  )
    throw new Error(
      'Legacy model flags require --diagnostic; use digest-keyed trial observations for admission.',
    );
  return {
    command: 'assess',
    bundle: flags.bundle,
    sha256: flags.sha256,
    exports: flags.export,
    diagnostic: flags.diagnostic,
    ...(flags['operator-record'] === undefined ? {} : { operatorRecord: flags['operator-record'] }),
    models: {
      ...(flags['chatgpt-model'] === undefined ? {} : { chatgpt: flags['chatgpt-model'] }),
      ...(flags['claude-model'] === undefined ? {} : { claude: flags['claude-model'] }),
    },
  };
};
