// inputs selected by the initialization procedure; the installed root comes from the bundled entry
export type IInitializationInspectionOptions = {
  repositoryRoot: string;
  installedSkillRoot: string;
  paths?: string[];
};

// candidates are filesystem observations, never proof of ownership, active policy, or runtime use
export type IInitializationInventory = {
  canonicalAgentDirectories: string[];
  documents: string[];
  decisionCandidates: string[];
  skillCandidates: Array<{ path: string; ownership: 'unverified' }>;
  visitedEntries: number;
};

export type IInitializationSource = {
  path: string;
  content: string | null;
  omission: 'source-unavailable' | 'packet-limit' | null;
};

// the selected installation is distinguished even when it lives outside the repository
export type IInitializationInspection = {
  kind: 'moldea-initialization-inspection';
  status: 'complete' | 'partial';
  installedSkill: { repositoryPath: string | null; ownership: 'installed-distribution' };
} & (
  | { mode: 'inventory'; inventory: IInitializationInventory }
  | { mode: 'sources'; sources: IInitializationSource[] }
);
