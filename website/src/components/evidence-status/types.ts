import type { IQualificationStatus } from '../../lib/qualification/index.ts';

// result and stage states presented by evidence pages
export type IEvidenceDisplayStatus =
  | IQualificationStatus
  | 'reused'
  | 'not-recorded'
  | 'pending'
  | 'recovered'
  | 'running'
  | 'skipped'
  | 'stopped';
