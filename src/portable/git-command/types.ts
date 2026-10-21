/*
 * The config files a helper's Git reads see. `repository` reads only the repository's own config,
 * as the repair evidence reads always have; `cli` also reads system and global config, as the CLI
 * does.
 */
export type IGitConfigScope = 'cli' | 'repository';

// the runGit options of one bounded helper read
export type IGitCommandOptions = {
  isolateConfig: boolean;
  env: NodeJS.ProcessEnv;
  maxOutputBytes: number;
};
