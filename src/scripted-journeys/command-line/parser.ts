import type { IJourneyPlatform } from '../index.ts';

// exact command variants keep publication and diagnostic inputs separate
export type IJourneysCommand =
  | { command: 'pack'; commit: string }
  | { command: 'publish-bundle'; bundle: string; sha256: string; runId: string }
  | {
      command: 'assess';
      bundle: string;
      sha256: string;
      exports: string[];
      diagnostic: boolean;
      models: Partial<Record<IJourneyPlatform, string>>;
      operatorRecord?: string;
    };

/** Parses the maintainer workflow without accepting implicit refs or duplicate flags. */
export const parseJourneysCommand = (argv: string[]): IJourneysCommand => {
  const [command, ...args] = argv;
  if (!['pack', 'publish-bundle', 'assess'].includes(command ?? ''))
    throw new Error('Use pack, publish-bundle, or assess.');
  const allowed =
    command === 'pack'
      ? ['--commit']
      : command === 'publish-bundle'
        ? ['--bundle', '--sha256', '--run']
        : [
            '--bundle',
            '--sha256',
            '--export',
            '--chatgpt-model',
            '--claude-model',
            '--operator-record',
            '--diagnostic',
          ];
  const flags: Record<string, string> = {};
  const exports: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--diagnostic' && command === 'assess' && !flags[flag]) {
      flags[flag] = 'true';
      continue;
    }
    const argument = args[++index];
    if (
      !flag ||
      !allowed.includes(flag) ||
      !argument ||
      argument.startsWith('--') ||
      (flags[flag] !== undefined && flag !== '--export')
    )
      throw new Error(`Invalid argument: ${flag}`);
    flags[flag] = argument;
    if (flag === '--export') exports.push(argument);
  }
  if (command === 'pack') {
    if (!flags['--commit']) throw new Error('pack requires --commit.');
    return { command, commit: flags['--commit'] };
  }
  if (!flags['--bundle'] || !flags['--sha256'] || !/^[a-f0-9]{64}$/u.test(flags['--sha256']))
    throw new Error('A bundle and its operator-held SHA-256 are required.');
  if (command === 'publish-bundle') {
    if (!flags['--run']) throw new Error('publish-bundle requires --run.');
    return { command, bundle: flags['--bundle'], sha256: flags['--sha256'], runId: flags['--run'] };
  }
  if (!exports.length) throw new Error('assess requires final --export paths.');
  const diagnostic = flags['--diagnostic'] === 'true';
  if (!diagnostic && (flags['--chatgpt-model'] || flags['--claude-model']))
    throw new Error(
      'Legacy model flags require --diagnostic; use digest-keyed trial observations for admission.',
    );
  return {
    command: 'assess',
    bundle: flags['--bundle'],
    sha256: flags['--sha256'],
    exports,
    diagnostic,
    ...(flags['--operator-record'] ? { operatorRecord: flags['--operator-record'] } : {}),
    models: {
      ...(flags['--chatgpt-model'] ? { chatgpt: flags['--chatgpt-model'] } : {}),
      ...(flags['--claude-model'] ? { claude: flags['--claude-model'] } : {}),
    },
  };
};
