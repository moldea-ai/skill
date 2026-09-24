import type { ISemanticCoverageClaimSource } from './types.ts';

// claim metadata retained independently from discovered semantic case evidence
export const SEMANTIC_COVERAGE_CLAIMS = [
  {
    id: 'pre-adoption-boundary',
    description:
      'Before initialization, moldea answers only concise informational questions or explicit initialization and otherwise abstains with zero moldea commands.',
    sourcePaths: ['moldea/SKILL.md#route-before-loading-references'],
    rationale:
      'These cases distinguish product information, explicit adoption, and silent failure-closed behavior before canonical project state exists.',
    fixedEvidence: [],
  },
  {
    id: 'activation-abstention',
    description:
      'moldea abstains silently from unrelated documentation, source, README, planning, review, and generic knowledge tasks.',
    sourcePaths: ['moldea/SKILL.md#run-the-appropriate-gate-once'],
    rationale:
      'These cases directly reproduce the over-activation patterns that previously consumed time and model context.',
    fixedEvidence: [],
  },
  {
    id: 'bounded-relevance',
    description:
      'Direct and relationship-based activation use the smallest deterministic boundary and preserve host workflow ownership.',
    sourcePaths: [
      'moldea/SKILL.md#run-the-appropriate-gate-once',
      'moldea/references/context-gathering.md#select-metadata-before-content',
    ],
    rationale:
      'The cases distinguish relationship gating from direct relevance and enforce ordering, command-count, and output-byte limits.',
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
    id: 'adapter-ownership',
    description:
      'Universal skill behavior is evaluated once through Custom and every published adapter keeps only its adapter-specific probes and repair cases.',
    sourcePaths: [
      'moldea/references/runtime-compatibility.md#keep-the-evidence-boundaries-separate',
      'moldea/references/agent-design.md#select-the-runtime-honestly',
    ],
    rationale:
      'Shared semantic work is not multiplied across adapter profiles, while each current runtime target retains dedicated compatibility evidence.',
    fixedEvidence: [
      {
        kind: 'qualification-profile',
        id: 'custom-custom',
      },
      {
        kind: 'qualification-profile',
        id: 'published-adapter-targets',
      },
    ],
  },
  {
    id: 'restored-activation-regressions',
    description:
      'Former over-activation paths retain silent abstention without established direct relevance or a declared relationship.',
    sourcePaths: [
      'moldea/SKILL.md#route-before-loading-references',
      'moldea/SKILL.md#run-the-appropriate-gate-once',
    ],
    rationale:
      'These cases retain negative controls for ambiguous handoffs and unrelated host work; concrete conversational context is assessed separately under bounded relevance.',
    fixedEvidence: [],
  },
  {
    id: 'initialization-and-tooling-safety',
    description:
      'Explicit initialization and local CLI establishment handle sparse evidence, partial adoption, safe package-manager boundaries, and nonstandard local layouts.',
    sourcePaths: [
      'moldea/references/continuous-maintenance.md#adoption',
      'moldea/references/local-tooling.md#supported-contract',
      'moldea/references/tooling-installation.md',
    ],
    rationale:
      'The cases distinguish valid initialization, evidence blockers, exact local tooling, conflicting providers, and executable package-manager configuration.',
    fixedEvidence: [],
  },
  {
    id: 'context-maintenance-and-compression',
    description:
      'Relevant context changes update one canonical owner, preserve unique meaning, resolve duplication, and stop on consequential conflict.',
    sourcePaths: [
      'moldea/references/continuous-maintenance.md#maintain-owned-truth',
      'moldea/references/context-compression.md',
    ],
    rationale:
      'Relationship reconsideration, direct maintenance, compression, unresolved requirements, and mirror synchronization remain independently exercised.',
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
      'Explicit project evaluation and reconciliation handle dirty, clean, unborn, ambiguous, and dedicated-repository states without losing boundaries.',
    sourcePaths: ['moldea/references/evaluate-and-reconcile.md'],
    rationale:
      'The cases retain state-sensitive evaluation, clarification, one-sided writes, and read-only related-repository controls.',
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
    id: 'runtime-compatibility-and-selection',
    description:
      'Runtime selection separates local availability, repository evidence, installed adapter package eligibility, recognized source patterns, and scoped readiness.',
    sourcePaths: [
      'moldea/references/agent-design.md#select-the-runtime-honestly',
      'moldea/references/runtime-compatibility.md',
    ],
    rationale:
      'Later eligible Eve versions remain inspectable offline. Malformed local metadata, version mismatches, opaque source, absent adapters, and external evidence retain precise boundaries without remote lookup or custom fallback.',
    fixedEvidence: [],
  },
  {
    id: 'routing-description-ownership',
    description:
      'Routing-facing metadata selects handoff or agent descriptions from proven consumer semantics rather than property names or unsupported inference.',
    sourcePaths: ['moldea/references/agent-design.md#keep-model-facing-assets-distinct'],
    rationale:
      'Dynamic, fallback, separate, shared, and stale mappings retain focused semantic coverage.',
    fixedEvidence: [],
  },
] as const satisfies readonly ISemanticCoverageClaimSource[];
