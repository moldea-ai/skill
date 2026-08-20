import path from 'node:path';

const FORWARDED_ENVIRONMENT_NAMES = [
  'CODEX_HOME',
  'HOME',
  'LANG',
  'LC_ALL',
  'PATH',
  'SHELL',
  'TERM',
  'TMPDIR',
  'USER',
  'XDG_RUNTIME_DIR',
] as const;

/** Creates the minimal inherited environment used by Codex and its sandboxed commands. */
export const createCodexEnvironment = (candidateRuntimeDirectory: string): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = {};

  for (const environmentName of FORWARDED_ENVIRONMENT_NAMES) {
    const environmentValue = process.env[environmentName];

    if (environmentValue !== undefined) {
      environment[environmentName] = environmentValue;
    }
  }

  const candidateBinaryDirectory = path.join(candidateRuntimeDirectory, 'node_modules', '.bin');
  environment['PATH'] = `${candidateBinaryDirectory}${path.delimiter}${environment['PATH'] ?? ''}`;
  environment['NO_COLOR'] = '1';
  environment['CI'] = 'true';

  return environment;
};
