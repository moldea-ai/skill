// supported root documents with moldea-owned regions
export type IManagedFileName = 'README.md' | 'AGENTS.md';

// selects the host file to update for one managed document and confirms it after the write
export type IManagedWriteTargetResolver = () => Promise<{
  readonly hostPath: string;
  readonly confirm: () => Promise<void>;
}>;
