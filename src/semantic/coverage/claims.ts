import type { ISemanticCoverageClaimSource } from './types.ts';

// claim metadata retained independently from discovered semantic case evidence
export const SEMANTIC_COVERAGE_CLAIMS = [
  {
    id: 'pre-adoption-boundary',
    description:
      'Before adoption, moldea answers concise informational questions, handles explicit initialization, and gives bounded diagnosis for explicit setup checks while unrelated work remains silent.',
    sourcePaths: ['moldea/SKILL.md#route-before-loading-references'],
    rationale:
      'These cases distinguish product information, explicit adoption, blocked read-only diagnosis, and silent failure-closed behavior without assuming partial artifacts prove prior initialization.',
    fixedEvidence: [],
  },
  {
    id: 'activation-abstention',
    description:
      'moldea abstains silently from unrelated documentation, source, README, planning, review, and generic knowledge tasks.',
    sourcePaths: ['moldea/SKILL.md#reuse-gate-evidence'],
    rationale:
      'These cases directly reproduce the over-activation patterns that previously consumed time and model context.',
    fixedEvidence: [],
  },
  {
    id: 'bounded-relevance',
    description:
      'Direct and relationship-based activation select only relevant owners, including newly discovered and second bound owners, while preserving host workflow ownership.',
    sourcePaths: [
      'moldea/SKILL.md#reuse-gate-evidence',
      'moldea/references/context-gathering.md#select-metadata-before-content',
    ],
    rationale:
      'The cases distinguish direct and relationship relevance, an initial miss from newly discovered paths, multi-owner completion, and bounded command and output behavior.',
    fixedEvidence: [],
  },
  {
    id: 'large-context-safety',
    description:
      'Large canonical inventories remain content-free by default, paginated, byte-bounded, and compatible with zero-agent projects.',
    sourcePaths: [
      'moldea/references/context-gathering.md#select-metadata-before-content',
      'moldea/references/local-tooling.md#resource-limits',
    ],
    rationale:
      'The semantic and deterministic boundaries jointly prove that project size does not imply full-content output or agent requirements.',
    fixedEvidence: [
      {
        kind: 'deterministic-suite',
        id: 'root-conformance',
      },
    ],
  },
  {
    id: 'read-only-integrity',
    description: 'Validation and evaluation preserve repository files and Git control state.',
    sourcePaths: ['moldea/SKILL.md#preserve-authority-and-complete-the-relevant-work'],
    rationale:
      'Runner-owned before-and-after evidence detects file, index, ref, configuration, submodule, and object-database mutations.',
    fixedEvidence: [
      {
        kind: 'deterministic-suite',
        id: 'repository-control',
      },
    ],
  },
  {
    id: 'restored-activation-regressions',
    description:
      'Former over-activation paths retain silent abstention without established direct relevance or a declared relationship.',
    sourcePaths: [
      'moldea/SKILL.md#route-before-loading-references',
      'moldea/SKILL.md#reuse-gate-evidence',
    ],
    rationale:
      'These cases retain negative controls for unrelated host work; concrete conversational context is assessed separately under bounded relevance.',
    fixedEvidence: [],
  },
  {
    id: 'initialization-and-tooling-safety',
    description:
      'Explicit initialization onboards existing agents and workflows with permission, in-place document links, resumable progress and final validation; it also handles sparse evidence and partial adoption, while local CLI establishment observes installation safeguards.',
    sourcePaths: [
      'moldea/references/continuous-maintenance.md#adoption',
      'moldea/references/continuous-maintenance.md#complete-existing-project-onboarding',
      'moldea/references/agent-design.md#initialize-existing-responsibilities',
      'moldea/references/local-tooling.md#supported-contract',
      'moldea/references/tooling-installation.md',
    ],
    rationale:
      'The cases distinguish confirmation, preauthorized and resumed onboarding, unchanged no-agent foundations, evidence blockers, exact local tooling and executable package-manager configuration. PnP-only launcher proof remains not yet included in published passing coverage.',
    fixedEvidence: [],
  },
  {
    id: 'context-maintenance-and-compression',
    description:
      'Relevant context changes update every affected existing owner, preserve unique meaning, resolve duplication, and stop on consequential conflict.',
    sourcePaths: [
      'moldea/references/continuous-maintenance.md#maintain-owned-truth',
      'moldea/references/context-compression.md',
      'moldea/references/relationships.md#bindings-establish-relevance',
      'moldea/references/relationships.md#impact-paths',
      'moldea/references/relationships.md#material-facts-only',
      'moldea/references/relationships.md#shared-infrastructure',
      'moldea/references/relationships.md#granularity',
      'moldea/references/relationships.md#lifecycle',
      'moldea/references/relationships.md#report-uncertainty',
    ],
    rationale:
      'Relationship reconsideration, direct and multi-owner maintenance, compression, unresolved requirements, and mirror synchronization remain independently exercised.',
    fixedEvidence: [],
  },
  {
    id: 'agent-and-skill-design',
    description:
      'Agent and Agent Skill changes preserve runtime provenance, capability boundaries, progressive disclosure, host policy, and distribution ownership.',
    sourcePaths: ['moldea/references/agent-design.md', 'moldea/references/skill-design.md'],
    rationale:
      'These cases protect the model-facing and portable-skill design capabilities that remain current under explicit activation.',
    fixedEvidence: [],
  },
  {
    id: 'project-evaluation-and-reconciliation',
    description:
      'Explicit project evaluation and reconciliation handle dirty, clean, ambiguous, and dedicated-repository states without losing boundaries.',
    sourcePaths: ['moldea/references/evaluate-and-reconcile.md'],
    rationale:
      'The cases retain state-sensitive evaluation, clarification, one-sided writes, and read-only related-repository controls.',
    fixedEvidence: [],
  },
  {
    id: 'project-repair-and-recovery',
    description:
      'Explicit repair distinguishes established adoption, recoverable drift, ambiguous foundation, invalid markers, policy conflict, missing tooling, and healthy no-op state.',
    sourcePaths: [
      'moldea/references/project-repair.md#diagnose-blocked-adoption-without-writes',
      'moldea/references/project-repair.md#establish-recovery-authority',
      'moldea/references/project-repair.md#correct-and-verify',
      'moldea/references/project-repair.md#check-progressively',
    ],
    rationale:
      'Repair cases require evidence for authority and final state, preserving current bytes when a safe correction or verification is unavailable.',
    fixedEvidence: [],
  },
  {
    id: 'agent-system-planning',
    description:
      'Explicit agent-system planning selects deterministic software, one agent, multiple agents, clarification, or unresolved runtime evidence according to repository facts.',
    sourcePaths: ['moldea/references/agent-system-planning.md'],
    rationale:
      'Planning remains evidence-driven and does not turn every problem into an agent or infer a runtime from inventory alone.',
    fixedEvidence: [],
  },
  {
    id: 'runtime-selection',
    description:
      'Runtime labels follow the defining SDK while repository evidence establishes connections and explicit coverage states only completed file/export checks.',
    sourcePaths: [
      'moldea/references/agent-design.md#select-the-runtime-honestly',
      'moldea/references/runtime-guidance.md#check-one-connection',
    ],
    rationale:
      'A guidance label or passed export check never proves runtime consumption. Related-repository evidence retains read-only boundaries without fabricated cross-repository bindings or custom fallback.',
    fixedEvidence: [],
  },
  {
    id: 'routing-description-ownership',
    description:
      'Routing-facing metadata selects handoff or agent descriptions from proven consumer semantics rather than property names or unsupported inference.',
    sourcePaths: ['moldea/references/agent-design.md#keep-model-facing-assets-distinct'],
    rationale:
      'Dynamic, separate, shared, and stale mappings retain focused semantic coverage. Description-fallback assessment remains not yet included in published passing coverage.',
    fixedEvidence: [],
  },
] as const satisfies readonly ISemanticCoverageClaimSource[];
