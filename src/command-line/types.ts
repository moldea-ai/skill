import type { IEvidenceKind } from '../evidence/index.ts';

export type IEvidenceCommand =
  | {
      kind: 'pack';
      evidenceKind: IEvidenceKind;
      runId?: string;
    }
  | {
      kind: 'prepare';
    }
  | {
      kind: 'publish';
      bundlePath: string;
      tag: string;
    }
  | {
      kind: 'pin';
      evidenceKind: IEvidenceKind;
      assetName: string;
      release: string;
    }
  | {
      kind: 'release-check';
    };
