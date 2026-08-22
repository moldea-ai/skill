import type { IEvidenceDisplayStatus } from './types.ts';

// accessible labels and token-based visual treatment for evidence states
export const EVIDENCE_STATUS_PRESENTATION: Record<
  IEvidenceDisplayStatus,
  { className: string; label: string }
> = {
  cached: {
    className: 'border-border bg-muted text-foreground',
    label: 'Cached',
  },
  errored: {
    className: 'border-destructive bg-destructive text-background',
    label: 'Execution error',
  },
  failed: {
    className: 'border-destructive bg-destructive text-background',
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
  skipped: {
    className: 'border-warning/40 bg-warning/20 text-warning-foreground',
    label: 'Skipped',
  },
};
