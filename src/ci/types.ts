import type { ITestSuite } from '../test-suite/index.ts';

// complete Git comparison inputs supplied by the workflow
export type IChangeComparison = {
  repositoryRoot: string;
  eventName: string;
  refType: string;
  baseSha?: string | undefined;
  testedSha?: string | undefined;
};

// relevance and correctness priority are independent workflow outputs
export interface ICiSelection {
  rootRequired: boolean;
  testSuite: ITestSuite;
}
