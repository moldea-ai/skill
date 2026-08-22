import type { IQualificationStatus } from '../../lib/qualification/index.ts';

// result and stage states presented by qualification pages
export type IQualificationDisplayStatus =
  IQualificationStatus | 'cached' | 'not-recorded' | 'pending' | 'running' | 'skipped';
