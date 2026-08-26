# Agent design

Read this reference before creating or materially changing an agent, instruction, description, handoff description, schema, capability, variable, mirror, runtime relationship, or unresolved requirement.

Agent-system planning decides whether an agent should exist and proposes its responsibility. Agent design begins after a direct request or accepted candidate. Revalidate repository evidence rather than copying a recommendation into canonical state or model-facing instructions.

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

Routing-facing metadata uses the target handoff description when present and valid, otherwise the agent description. General-only metadata uses the agent description. Establish a consumer's routing, general, or shared role from runtime documentation, compatibility, adapter evidence, guidance, implementation, and developer direction rather than its property name. A property called `description` may be shared or routing-facing. Preserve an established shared-property contract and do not create a handoff description merely because such a property exists.

Before changing a mapping, establish:

1. the evidence identifying consumer purpose
2. the canonical source currently selected, or that selection is unknown
3. the source required by the established purpose

A required source does not prove selection. Under dynamic wiring, state conditional outcomes and identify resolving wiring or tests; never call a candidate current, effective, absent, or wrong. Prove a mismatch before editing. Tests confirm a correction but do not justify it.

## Select the runtime honestly

Every registered agent declares one `runtime.id`. Inspect the primary model-invocation boundary and use `compatibility --json` when installed adapter inventory matters.

1. Identify the layer governing invocation and applicable instruction loading, capabilities, schemas, routing, or variables.
2. For nested layers, select the highest-level available official adapter whose reliable documentation and repository evidence cover that composition. Provider SDKs beneath it remain dependencies.
3. Select `openai`, `anthropic`, or `google-genai` only when that provider SDK is the primary boundary.
4. Select `custom` only when materially independent layers govern the agent without an official adapter covering the composition, or the integration reliably matches none.
5. Clarify a genuinely unknown runtime rather than inventing one.

If the required adapter is absent from this release, report a tooling prerequisite and stop without selecting another CLI version or replacement runtime. Inventory establishes availability, not integration identity.

Create runtime guidance only for material project-specific behavior or limitations not established elsewhere. Optional manifest syntax is not a Core error. Do not infer compatibility from package names, compact inventory, or general knowledge, dynamically install adapters, or claim behavioral support without authorized adapter documentation and repository evidence.

Without behavioral evidence, preserve the runtime and map every material unknown invocation, instruction-loading, capability, schema, routing, or variable fact to its smallest reliable resolving artifact, established owner, and required proof. Source-owned target documentation, closed wiring, provider configuration, or integration tests may resolve it. Never invent a path, identity, or owner; evaluation remains incomplete without a resolver.

In dedicated-repository mode, inspect both repository states, establish the runtime boundary from implementation, inventory external capabilities, and classify them as model-visible, integration-only, or qualifying local implementation. Reconcile runtime identity and semantic surfaces together. Put model-visible behavior in canonical instructions, project-specific integration in runtime guidance, and only qualifying local implementation in the manifest. Provider hosting or correct runtime identity never replaces model-visible semantics. Report evidence paths, repository states, canonical inspection limits, and remaining unknowns.

## Register real relationships

Use only properties supported by repository format version `1` under the active CLI/Core contract.

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

After writes, run relevant project checks, rerun `inspect --json`, and review purpose, completeness, scope, contracts, instruction provenance, capabilities, routing, ambiguity, failures, consistency, economy, mirrors, and unresolved state.

Do not claim production readiness when behavior lacks support, a material contract is hidden or contradictory, affected validation fails, or a blocking requirement remains.
