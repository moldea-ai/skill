// complete Git comparison inputs supplied by the workflow
export type IChangeComparison = {
  repositoryRoot: string;
  eventName: string;
  refType: string;
  baseSha?: string | undefined;
  testedSha?: string | undefined;
};
