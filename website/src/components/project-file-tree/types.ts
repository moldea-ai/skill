// one example file; `before` is absent for an added file and equal to `source` for an untouched one
export interface IProjectFileTreeFile {
  id: string;
  label: string;
  language: 'json' | 'markdown' | 'typescript' | 'yaml';
  path: string;
  source: string;
  before?: string;
}

// tree rows in display order; files reference their `IProjectFileTreeFile` by id
export type IProjectFileTreeEntry =
  { kind: 'directory'; label: string; depth: number } | { kind: 'file'; id: string; depth: number };

// change state shown beside each file
export type IProjectFileStatus = 'Added' | 'Modified' | 'Unchanged';
