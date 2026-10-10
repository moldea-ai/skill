// complete Git comparison inputs supplied by the workflow
export type IChangeComparison = {
  repositoryRoot: string;
  eventName: string;
  refType: string;
  baseSha?: string | undefined;
  testedSha?: string | undefined;
};

// collected declaration identity, independent of test execution
export type ICollectedTest = {
  id: string;
  file: string;
  tags: string[];
};

// actual CLI selections used by the qualification integration jobs
export type IQualificationPartition = {
  name: string;
  filters?: string[];
  exclude?: string[];
  tagsFilter?: string[];
};
