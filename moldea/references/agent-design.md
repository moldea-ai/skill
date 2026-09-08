# Agent design

Read this reference after moldea relevance is established for creating or materially changing an agent, instruction, description, handoff description, schema, capability, variable, mirror, runtime relationship, or unresolved requirement.

Agent-system planning decides whether an agent should exist and proposes its responsibility. Agent design begins after a direct request or accepted candidate. Revalidate repository evidence rather than copying a recommendation into canonical state or model-facing instructions.

When a direct request says to create, register, and make an existing runtime agent ready, and bounded repository source plus focused tests establish its current behavior, complete the coherent implementation rather than stopping because the current instruction is inline. Create the canonical agent assets, derive every material invocation from canonical instruction through a real loader or necessary exact mirror, remove the independently maintained inline policy, register the evidenced runtime, loader, mirror, and impact relationships, preserve or strengthen focused coverage, and complete all runtime, test, and canonical file writes before final validation. If any required behavior or runtime path is not evidenced, report that exact limitation instead of inventing it.

## Establish behavior before prose

Establish the supported behavioral contract before drafting or broadly rewriting model-facing text. Include only material identity, purpose, responsibility, project context, inputs, outputs, rules, scope, exclusions, capabilities, variables, ambiguity, failure, escalation, routing, and quality expectations.

Do not call an agent complete when correct behavior depends on hidden repository knowledge. Supply model-facing context and a real runtime path, narrow the behavior, implement authorized support, clarify intent, or preserve incomplete state.

## Write minimum sufficient instructions

Every `instruction.md` must be complete after the runtime assigns responsibility. Keep it grounded, actionable, scoped where boundaries matter, aligned with executable contracts, precise about consequential ambiguity and failure, internally consistent, and concise enough that every runtime token earns its cost.

Avoid generic boilerplate, fixed heading templates, chain-of-thought demands, unnecessary provider detail, exhaustive edge cases, and decorative examples. Best effort never permits fabrication.

Preserve valid behavior during refinement. Prefer local edits while organization remains coherent; rewrite only when responsibility or structure changed or patching would preserve contradiction. Synchronize neighboring model-facing surfaces when their shared contract changes.

## Keep model-facing assets distinct

- `description.md` states what the agent does. Keep it concise, vendor-neutral, and responsibility-focused.
- `handoff-description.md` states when responsibility should transfer to the agent. Create it only for a real routing need.
- `instruction.md` states how the agent operates after transfer and cannot depend on either description for core behavior.

Every registered agent has one lowercase ASCII kebab-case ID, one `/moldea/agents/{agent-id}/` directory, mandatory `description.md` and `instruction.md`, and optional `handoff-description.md`. The instruction begins with the exact agent ID under the active format contract.

Classify the consumer from runtime documentation, compatibility, adapter evidence, guidance, implementation, and developer direction before reading meaning into its property name. A runtime property literally named `description` can still be routing-facing; its name supplies no classification evidence. Routing-facing metadata uses the target handoff description when present and valid, otherwise the agent description. General-only metadata uses the agent description. Preserve an established shared-property contract and do not create a handoff description merely because such a property exists.

Before changing a mapping, establish:

1. the evidence identifying consumer purpose
2. the canonical source currently selected, or that selection is unknown
3. the source required by the established purpose

A required source does not prove selection. Under dynamic wiring, state conditional outcomes and identify resolving wiring or tests; never call a candidate current, effective, absent, or wrong. Prove a mismatch before editing. Tests confirm a correction but do not justify it.

Always state the consumer-purpose classification, including when dynamic wiring leaves the currently selected source unknown.

## Select the runtime honestly

Every registered agent declares one `runtime.id`. Use `composition --json` when installed adapter inventory matters. Load `runtime-compatibility.md` when published target compatibility or maturity matters. Complete this gate before editing runtime state:

1. Establish authorized repository scope and state. Inspect identified related repositories as read-only evidence.
2. Identify the primary model-invocation boundary and applicable instruction loading, capabilities, schemas, routing, and variables.
3. Inventory external capabilities and classify them as model-visible, integration-only, or qualifying local implementation.
4. Select the highest-level locally available official adapter with a matching published technical target established for the repository. Use a provider ID only when its SDK is primary, and `custom` only when independent layers govern without an official match. Clarify an unknown runtime.
5. Map model-visible behavior to canonical instructions, project-specific integration behavior to runtime guidance, and only qualifying local implementation to the manifest. Provider hosting or correct runtime identity never replaces model-visible semantics.
6. Without behavioral evidence, preserve the runtime and map every material unknown invocation, instruction-loading, capability, schema, routing, or variable fact to its smallest reliable resolving artifact, established owner, and required proof. Never invent a path, identity, or owner.
7. Reconcile runtime identity and semantic surfaces together. Update every affected surface as one coherent change. A `runtime.id`-only edit is incomplete when reliable evidence establishes model-visible or project-specific integration behavior.
8. Report evidence paths, repository states, canonical inspection limits, and remaining unknowns.

For a runtime-alignment review, report the declared runtime ID, the exact runtime-guidance path and its role, and the bound implementation path and symbol whenever those facts are established.

Before a runtime write, retain a checklist of every externally evidenced model-visible capability. Do not validate or claim completion until each capability remains represented in canonical instruction or runtime guidance.

If the required adapter is absent from this release, report a tooling prerequisite and stop without selecting another CLI version or replacement runtime. Composition establishes availability, not integration identity, target support, or maturity.

Create runtime guidance only for material project-specific behavior or limitations. Optional manifest syntax is not a Core error. Do not infer compatibility from package names, composition, or general knowledge, dynamically install adapters, or claim behavioral support without a validated published target and repository evidence. Source-owned target documentation, closed wiring, provider configuration, or integration tests may resolve an evidence gap; evaluation remains incomplete without a resolver.

## Register real relationships

Use only properties supported by repository format version `1` under the active CLI/Core contract.

Use the established version `1` shapes directly instead of guessing alternate nesting or logical paths. Runtime guidance is a root-owned Markdown asset under `/moldea/runtimes/`; an agent references it from `runtime.guidance`, binds the real invocation from `bindings.runtimeAgent`, and declares material source impact through `affectedBy`. The example uses `custom` only for an integration already established as Custom; complete runtime selection before applying it.

```yaml
version: 1
agents:
  order-triage:
    runtime:
      id: custom
      guidance: /moldea/runtimes/custom.md
    bindings:
      runtimeAgent:
        path: /src/order-triage-agent.ts
        symbol: createOrderTriageAgent
    affectedBy:
      - /src/order-triage-agent.ts
```

Register shared context by its complete `/moldea/context/*.md` logical path and let agents select that same path. Record an agent-owned unresolved requirement under the agent, with traceability expressed as `related` path records:

```yaml
context:
  /moldea/context/billing.md:
    affectedBy:
      - /src/billing.ts
agents:
  support:
    context:
      - /moldea/context/billing.md
    unresolved:
      dynamic-tool-registration:
        category: tool-registration
        effect: warning
        description: The final tool registry cannot be proven from static repository evidence.
        resolution: Establish the runtime registration through explicit source or supported adapter evidence.
        related:
          - path: /src/dynamic-tools.ts
```

Register repository-root-absolute logical paths and symbols only for material implementation relationships that cannot be derived reliably, including runtime agents, executable schemas, instruction loaders, variable providers, capability implementation or registration, context, decisions, runtime guidance, and broader `affectedBy` paths.

Never create fake paths, symbols, selectors, future files, cross-repository references, or prose substitutes. If a material relationship cannot be expressed under the established format, report the blocker.

Routing and handoffs remain runtime-native in version `1`. Maintain routing implementation, metadata, source and target instructions, target-owned descriptions, runtime guidance, impact relationships, and tests as needed. Reconsider every supported consumer when a canonical description changes, and reconsider canonical descriptions when routing behavior changes. Never invent a manifest `handoffs` graph.

## Establish canonical instruction provenance

For every in-scope agent, establish how canonical `instruction.md` reaches each material invocation or provider-side configuration. Application code, adapters, runtime libraries, builds, provisioning, mirrors, or another evidenced runtime path may provide it; do not prescribe one mechanism.

The active instruction derives from canonical content, not an independently maintained policy source. Field names do not alter provenance: turn-specific `instructions`, inputs, continuation prompts, messages, or tool payloads may transport current input but cannot own reusable policy.

Use an exact declared mirror only when the runtime requires another tracked path, and verify consumption. Register `instructionLoader` when a material repository-local loader path and symbol exist and cannot be derived. Adapter or other reliable evidence may make that binding unnecessary.

Trace every material path. Within scope, remove superseded independent durable instructions from every material field and verify provenance near the runtime boundary, including build or deployment inclusion when required. Deterministic relationships and mirror checks do not prove runtime consumption.

If the chain cannot be established because integration is missing, preserve a blocking unresolved requirement with explicit criteria. If implementation cannot be inspected, report the evidence limitation rather than connection or disconnection. Do not claim completeness or production readiness while a material provenance gap remains.

## Register tools and skills

Read `skill-design.md` before changing an Agent Skill artifact. Manifest-register a capability only when a qualifying repository-local implementation exists and format version `1` can bind it.

Establish the runtime-facing name, purpose, use conditions, inputs, outputs, preconditions, limitations, side effects, authorization, failure behavior, and registration before describing a capability. Never invent fields, defaults, authentication, retries, limits, guarantees, or errors.

Give each registered capability a stable agent-scoped ID, exact runtime name, concise agent-specific description, implementation binding, applicable registration or schema bindings, and complete instruction guidance. Distinguish overlaps by use condition.

Provider-hosted or external model-visible capabilities belong in canonical instruction even without a local manifest artifact. Integration-only behavior belongs in runtime guidance. Never fabricate a manifest or cross-repository binding.

## Schemas

Treat executable and model-facing schemas as one semantic contract. Preserve requiredness, optionality, nullability, literals, alternatives, meanings, and material constraints; show the model fields it needs; bind material executable schemas to real paths and symbols; allow transformations only with semantic equivalence; omit internal fields and hidden reasoning.

When representations differ, inspect implementation, tests, context, intent, and transformation. No surface automatically wins; clarify unresolved material differences.

## Runtime variables

Use `{{VARIABLE_NAME}}` only for runtime-varying values. Declare every referenced variable, reference every declaration, and require every value at resolution; an empty string is supplied. Version `1` has no invented optional, default, null, undefined, or `n/a` semantics.

Explain each value where used and bind a real provider when it exists. Keep values private and transient. Variables cannot hide unfinished design.

## Mirrors

A declared mirror is an exact Git-tracked textual copy of canonical `instruction.md` after format normalization. It is a regular file outside `/moldea/**`, has one owning agent, and performs no transformation or wrapping.

Edit canonical instruction first and synchronize every mirror in the same change. Never edit a mirror independently. Prefer direct canonical consumption.

## Unresolved requirements

Create a project- or agent-owned requirement only for missing or uncertain information or functionality that materially affects current truth or declared behavior. It has a stable ID, precise category, `blocking`, `warning`, or `informational` effect, current-state description, explicit resolution criteria, useful existing related paths, and an optional external reference.

Use `blocking` for unsafe or materially incomplete behavior, `warning` for a gap with safe coherent behavior, and `informational` for visibility without outcome impact. Record it under its manifest owner. Instruction prose may communicate the limitation but is not the requirement; related paths provide traceability only.

Requirements are not a roadmap. Do not create one to avoid an answerable question or remove one because a related file changed; establish every criterion first.

## Verify agent readiness

After all canonical, runtime, test, and relationship file writes, run the focused project-native tests that exercise every changed material invocation and canonical-loading path, correct any implementation or test defect, and only then run launcher-backed `validate` as the final moldea command. If validation reports a repairable structural defect, apply the complete repair and run one final validation afterward; never write after the last allowed validation or claim readiness for an unvalidated repair. Report the final status and material diagnostics, including their absence. A passing generic check or actor report is not a substitute for runner-owned focused test evidence. Review purpose, completeness, scope, contracts, instruction provenance, capabilities, routing, ambiguity, failures, consistency, economy, mirrors, and unresolved state without loading unrelated canonical bodies.

Do not claim production readiness when behavior lacks support, a material contract is hidden or contradictory, affected validation fails, or a blocking requirement remains.
