import type { ISemanticEvaluationWebsiteModel } from '../../lib/semantic-evaluation/index.ts';

// result and stage states presented by evidence pages
export type IEvidenceDisplayStatus =
  | ISemanticEvaluationWebsiteModel['status']
  | 'reused'
  | 'not-recorded'
  | 'pending'
  | 'recovered'
  | 'running'
  | 'skipped'
  | 'stopped';
