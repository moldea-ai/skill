import type { IQualificationDisplayStatus } from './types.ts';

// accessible labels and token-based visual treatment for qualification states
export const QUALIFICATION_STATUS_PRESENTATION: Record<
  IQualificationDisplayStatus,
  { className: string; label: string }
> = {
  cached: {
    className: 'border-border bg-muted text-foreground',
    label: 'Cached',
  },
  errored: {
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    label: 'Execution error',
  },
  failed: {
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    label: 'Failed',
  },
  incomplete: {
    className: 'border-warning/40 bg-warning/20 text-warning-foreground',
    label: 'Incomplete',
  },
  'not-recorded': {
    className: 'border-border bg-muted text-muted-foreground',
    label: 'No recorded attempt',
  },
  passed: {
    className: 'border-success bg-success text-success-foreground',
    label: 'Passed',
  },
  pending: {
    className: 'border-border bg-muted text-muted-foreground',
    label: 'Pending',
  },
  running: {
    className: 'border-accent bg-accent text-accent-foreground',
    label: 'Running',
  },
};
