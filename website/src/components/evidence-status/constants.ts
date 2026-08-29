import type { IEvidenceDisplayStatus } from './types.ts';

// accessible labels and token-based visual treatment for evidence states
export const EVIDENCE_STATUS_PRESENTATION: Record<
  IEvidenceDisplayStatus,
  { label: string; tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning' }
> = {
  cached: {
    label: 'Cached',
    tone: 'neutral',
  },
  errored: {
    label: 'Execution error',
    tone: 'danger',
  },
  failed: {
    label: 'Failed',
    tone: 'danger',
  },
  incomplete: {
    label: 'Incomplete',
    tone: 'warning',
  },
  'not-recorded': {
    label: 'No recorded attempt',
    tone: 'neutral',
  },
  passed: {
    label: 'Passed',
    tone: 'success',
  },
  pending: {
    label: 'Pending',
    tone: 'neutral',
  },
  recovered: {
    label: 'Recovered',
    tone: 'success',
  },
  running: {
    label: 'Running',
    tone: 'info',
  },
  skipped: {
    label: 'Skipped',
    tone: 'warning',
  },
};
