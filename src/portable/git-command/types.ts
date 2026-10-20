/*
 * Options for one hardened Git read. `repository` reads only the repository's own config, as the
 * repair evidence reads always have; `cli` also reads system and global config, as the CLI does.
 */
export type IGitCommandOptions = {
  configScope: 'cli' | 'repository';
  maxOutputBytes: number;
  acceptedExitCodes?: readonly number[];
};

// the exit code and captured standard output of one accepted Git read
export type IGitCommandResult = {
  status: number;
  stdout: Buffer;
};
