// source-backed, illustrative artifacts rendered without per-example browser code
export type ICapabilityVisual =
  | { kind: 'source'; path: string; language: string; source: string; caption: string }
  | {
      kind: 'diff';
      path: string;
      language: string;
      oldValue: string;
      newValue: string;
      caption: string;
    }
  | { kind: 'flow'; steps: { title: string; detail: string }[]; caption: string };

// each example separates the suggested request, expected outcome, and evidence boundary
export interface ICapabilityExample {
  id: string;
  title: string;
  request: string;
  outcome: string;
  boundary: string;
  source: { href: string; label: string };
  visual: ICapabilityVisual;
}

// this editorial catalog is durably bounded at six categories of eight examples
export interface ICapabilityCategory {
  id: string;
  label: string;
  title: string;
  description: string;
  guide: { href: string; label: string };
  examples: ICapabilityExample[];
}
