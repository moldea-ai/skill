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
    id: 'maintenance-cycle-budgets',
    description:
      'Sequential developer requests use independent maintenance-cycle budgets while retaining earlier results and campaign-wide paid usage.',
    sourcePaths: ['moldea/references/local-tooling.md#resource-limits'],
    rationale:
      'The three-request scenario measures scope, content and validation in each cycle and aggregate output above one ordinary cycle. Recorded outcomes and cycle evidence, rather than eligibility or deterministic session tests alone, establish its behavioral observations.',
    fixedEvidence: [{ kind: 'deterministic-suite', id: 'root-conformance' }],
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
      'The cases retain negative controls for unadopted handoffs, implementation, planning and ordinary whole-project evaluation without a moldea audit. Ordinary repository citations are evidence, not over-activation. Concrete conversational context is assessed separately under bounded relevance; earlier failed observations remain retained.',
    fixedEvidence: [],
  },
  {
    id: 'initialization-and-tooling-safety',
    description:
      'Explicit initialization grounds adoption first, then guides evidence-backed rounds, approves existing-agent registration within the round, and verifies the covered scope.',
    sourcePaths: [
      'moldea/references/continuous-maintenance.md#adoption',
      'moldea/references/continuous-maintenance.md#complete-existing-project-onboarding',
      'moldea/references/agent-design.md#initialize-existing-responsibilities',
      'moldea/references/local-tooling.md#supported-contract',
      'moldea/references/tooling-installation.md',
    ],
    rationale:
      'Cases distinguish confirmation from preauthorized registration, no-write foundation stops, partial approval and continuation, exact relationship coverage, and per-round progress and final verification. Adopted projects can learn a single named area.',
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
      'Check and Fix handle dirty, clean, ambiguous, and dedicated-repository states while respecting scope and write authority.',
    sourcePaths: ['moldea/references/evaluate-and-reconcile.md'],
    rationale:
      'Cases retain state-sensitive checks, scoped clarification and correction, one-sided writes, and read-only related-repository controls.',
    fixedEvidence: [],
  },
  {
    id: 'project-repair-and-recovery',
    description:
      'Explicit Fix distinguishes established adoption, recoverable drift, ambiguous foundation, invalid markers, authority conflict, and a healthy no-op.',
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
      'Evidenced implementation and instruction connections are assessed separately from file and export checks, with unsupported symbols reported as not checked.',
    sourcePaths: [
      'moldea/references/agent-design.md#register-real-relationships',
      'moldea/references/agent-design.md#verify-agent-readiness',
    ],
    rationale:
      'An observed file or export check does not prove runtime consumption. The cases preserve tested connections and report the limits of unsupported symbol verification.',
    fixedEvidence: [],
  },
  {
    id: 'routing-description-ownership',
    description:
      'Routing-facing metadata consumes description.md as its sole canonical source. Inspect the actual consumer and compare the description with the instruction.',
    sourcePaths: ['moldea/references/agent-design.md#keep-model-facing-assets-distinct'],
    rationale:
      'One case distinguishes shared routing and display metadata from display-only metadata. Dynamic wiring, stale sources, and conflicting authority each have separate coverage.',
    fixedEvidence: [],
  },
] as const satisfies readonly ISemanticCoverageClaimSource[];
