# Agent design

Read this reference before creating or materially changing an agent, instruction, description, handoff description, schema, capability, variable, mirror, runtime relationship, or unresolved requirement.

Agent-system planning determines whether an agent should exist and proposes its high-level responsibility boundary. Agent design begins when the developer directly requests an agent or accepts a candidate for implementation. Revalidate repository evidence rather than copying a planning recommendation mechanically into canonical state or model-facing instructions.

## Establish behavior before prose

Gather sufficient project and agent-specific evidence first. Establish the supported behavioral contract before drafting or broadly rewriting model-facing text.

The contract may include identity, purpose, responsibility, minimum model-facing project context, inputs, outputs, rules, scope, exclusions, capabilities and use conditions, variables, ambiguity handling, failure and escalation, routing, and quality expectations. Include only categories that materially affect the agent.

Do not call an agent complete when the model would need hidden repository knowledge to behave correctly. Instead provide the necessary runtime/model-facing context, bind the runtime mechanism, narrow the declared behavior, implement missing authorized support, clarify intent, or preserve genuine incomplete state.

## Write minimum sufficient instructions

Every `instruction.md` must be complete and directly readable after the runtime gives the agent responsibility. Keep it:

- grounded in reliable evidence
- purposeful and explicit about actual responsibility
- actionable rather than aspirational
- scoped where boundaries prevent overlap, unsafe behavior, or unsupported work
- aligned with executable input, output, capability, variable, and runtime contracts
- precise about consequential ambiguity, failure, escalation, and routing
- internally consistent and free of stale examples
- concise enough that every runtime token earns its cost

Do not add generic boilerplate, mandatory heading templates, chain-of-thought requirements, provider details the model does not need, exhaustive edge cases, or examples that add no material clarity. Best effort never permits fabrication.

Preserve still-valid behavior during refinement. Prefer local edits when organization remains coherent; rewrite broadly only when responsibility or structure materially changed or local patches would preserve contradiction or obsolete architecture. Update neighboring model-facing surfaces together when one contract changes.

## Keep model-facing assets distinct

- `description.md` answers **what the agent does**. Keep it concise, vendor-neutral, and focused on responsibility and practical scope.
- `handoff-description.md` answers **when responsibility should transfer to this agent**. Create it only for a real routing use case and express concrete target-owned transfer conditions.
- `instruction.md` answers **how the agent operates after receiving responsibility**. It must not depend on the description or handoff description to explain core behavior.

Every registered agent uses one stable lowercase ASCII kebab-case ID, one derived `/moldea/agents/{agent-id}/` directory, mandatory `description.md` and `instruction.md`, and optional `handoff-description.md`. The instruction begins by identifying the exact agent ID in backticks according to the active repository-format contract.

Use the target's effective routing description for runtime metadata that helps a model, agent, router, or workflow select, route to, delegate to, or hand off to that target:

- use the effective handoff description when `handoff-description.md` is present
- otherwise use the effective agent description
- never fall back when a present handoff description is structurally invalid

Use the agent description for general-only runtime metadata. Establish the runtime property's semantic role from reliable runtime documentation, the active compatibility target, adapter evidence, project-local guidance, implementation behavior, and developer direction rather than its property name. A property named `description` may be routing-facing, and one property serving both general and routing purposes uses the effective routing description. Preserve that established shared-property contract; do not treat its shared purpose as misalignment or invent another runtime property solely to separate those purposes. Do not create `handoff-description.md` merely because a runtime exposes a description property; the agent-description fallback is valid when a dedicated routing hint is unnecessary.

## Select the runtime honestly

Every registered agent declares exactly one `runtime.id`. Inspect repository runtime evidence and run `compatibility --json` when the installed adapter inventory matters.

1. Identify the primary runtime integration boundary that governs model invocation and, when applicable, instruction loading, capabilities, schemas, routing, or variable provision.
2. When runtime layers are nested, select the highest-level available official adapter whose reliable documentation and repository evidence cover that boundary and composition. Treat provider SDKs beneath it as implementation dependencies rather than competing runtime IDs.
3. Select `openai`, `anthropic`, or `google-genai` only when that provider SDK is itself the primary integration boundary.
4. Use `custom` when multiple runtime layers materially and independently govern the agent and no available official adapter reliably covers the composition, or when the established integration does not reliably match one.
5. Clarify when the runtime itself is genuinely unknown rather than inventing a declaration.

When a needed adapter is absent from the installed CLI inventory, treat that as a tooling prerequisite. Do not select another CLI release because this skill owns one exact version. Report the release limitation; `evaluate` never changes the dependency.

Create project-local runtime guidance when repository-specific behavior, limitations, or integration decisions are material and not established elsewhere. Do not turn optional manifest syntax into a Core structural error.

Do not infer behavioral compatibility from package names, the compact CLI inventory, or general runtime knowledge, install adapters dynamically, or claim support without reliable adapter documentation and repository evidence.

Treat adapter documentation as available only when it is present in authorized evidence. When it is absent, do not reconstruct target details, supported patterns, provider limitations, maturity, or wiring semantics from model knowledge, package names, or compatibility inventory. Identify the missing evidence and preserve the existing runtime unless other reliable evidence establishes the replacement.

In dedicated-repository mode, continue from runtime selection into model-visible capability reconciliation. Reliable evidence from a developer-identified related application may establish provider-hosted or external capability semantics even when repository format version `1` cannot bind the implementation. Preserve that established behavior in the canonical instruction or project-local runtime guidance. The absence of a qualifying repository-local artifact prevents a manifest capability entry; it does not justify omitting established model-visible behavior or creating an unresolved requirement solely for the missing cross-repository binding.

## Register real relationships

Use only manifest properties supported by repository format version `1` as verified by the active CLI/Core contract or installed authoritative documentation.

Register repository-root-absolute logical paths and symbols when material implementation relationships exist and cannot be derived reliably. Important relationships can include runtime agent, executable input/output schemas, instruction loader, variable providers, capability implementation and registration, focused context, accepted decisions, runtime guidance, and broader `affectedBy` paths.

Never create fake paths, symbols, selectors, future files, cross-repository references, or prose-only substitutes for required relationships. If the active manifest shape needed for a material relationship cannot be established, stop and report the blocker.

Routing and handoffs remain runtime-native in version `1`. Maintain runtime routing implementation, routing-facing metadata, source/target instructions, target-owned descriptions, runtime guidance, relevant impact relationships, and focused tests as needed. When either canonical description changes, reconsider every supported runtime consumer of that value. When routing metadata changes, reconsider whether the canonical descriptions remain accurate. Never invent a manifest `handoffs` graph.

## Establish canonical instruction provenance

For every in-scope registered agent, establish how the canonical `/moldea/agents/{agent-id}/instruction.md` content reaches the runtime model or provider-side agent configuration. Do not prescribe a loading mechanism. Application code, a runtime adapter, runtime-library integration, build or provisioning logic, a declared mirror, or another established runtime path may provide the content.

The active runtime instruction must derive from the canonical instruction rather than an independently maintained behavioral source. Provider-specific formatting, composition, caching, or transport is acceptable when it preserves the canonical behavior and does not introduce another independently editable instruction.

Use a declared exact mirror when the runtime requires the instruction at another repository path, and verify that the runtime actually uses that mirror. Register `instructionLoader` when a material repository-local loader path and symbol exist and cannot be derived reliably. Do not require that binding when an adapter or other reliable evidence already establishes the relationship.

Trace every material invocation or configuration path. Within the authorized scope, remove superseded inline, embedded, copied, or otherwise independent instruction sources and verify the provenance chain at the closest practical runtime or integration boundary. Also verify build or deployment inclusion when the mechanism depends on packaged canonical or mirrored content. Deterministic inspection validates declared relationships and mirrors; it does not prove runtime consumption.

If the provenance chain cannot be established because required integration is missing, preserve the gap as a blocking unresolved requirement with explicit resolution criteria. When the relevant runtime implementation cannot be inspected, report the evidence limitation rather than claiming either connection or disconnection. Do not describe the agent as aligned, complete, or production-ready while a material provenance gap remains.

## Register tools and skills

Read `skill-design.md` before creating or materially changing the Agent Skill artifact itself. This section governs only the agent's model-visible capability relationship.

Manifest-register a tool or skill only when a qualifying repository-local implementation artifact exists and the version `1` capability contract can bind it.

Before describing a capability, establish its runtime-facing name, purpose, use conditions, inputs, outputs, important preconditions, limitations, side effects, authorization, failure behavior, and registration. Never invent parameters, defaults, response fields, authentication, retries, rate limits, provider guarantees, or error semantics.

Give each registered capability a stable agent-scoped ID, exact runtime-facing name, concise vendor-independent agent-specific description, implementation binding, registration/schema bindings when applicable, and complete instruction guidance. Distinguish overlapping capabilities by use condition.

A provider-hosted or external model-visible capability without a qualifying repository-local artifact remains instruction or runtime-guidance behavior when reliable evidence supports it. Do not fabricate a manifest tool or skill entry. Related-application evidence never becomes adapter evidence or a cross-repository binding.

## Schemas

Treat executable and model-facing schemas as one semantic contract:

- preserve requiredness, optionality, nullability, literals, enums, alternatives, field meaning, and material constraints
- include model-facing representations in the instruction when the model must understand the contract
- bind material executable input and output schemas to existing repository-local paths and symbols
- allow runtime transformation while requiring semantic equivalence
- omit unsupported or internal fields and never expose hidden reasoning

When existing executable and model-facing contracts differ, no surface automatically wins. Inspect implementation, tests, context, developer intent, and runtime transformation; clarify if the intended contract remains materially ambiguous.

## Runtime variables

Use runtime variables only for genuinely runtime-varying values. Use `{{VARIABLE_NAME}}` placeholders with uppercase ASCII letters, numbers, and underscores.

Declare every referenced variable, reference every declared variable, require every value at resolution time, and treat an empty string as a valid supplied value. Version `1` has no invented optional, default, null, undefined, or `n/a` semantics.

Describe what each value means where the model uses it and bind a real provider when the relationship exists. Keep actual values private and transient; never persist them in canonical files, diagnostics, logs, or reports. Variables must not hide unfinished design.

## Mirrors

A declared mirror is an exact Git-tracked textual copy of canonical `instruction.md` after the repository format's BOM and line-ending normalization. It lives outside `/moldea/**`, is a regular file, has one owning agent, and performs no transformation, templating, wrapping, or generation.

Edit the canonical instruction first and synchronize every mirror in the same coherent developer change. Never edit a mirror independently. Prefer direct canonical consumption when the runtime supports it.

## Unresolved requirements

Create a project- or agent-owned unresolved requirement only when missing or uncertain information or functionality materially affects current truth or declared behavior.

Every requirement has:

- a stable ID
- a precise category
- effect `blocking`, `warning`, or `informational`
- a current-state description
- explicit human-readable resolution criteria
- only useful existing related repository references
- an optional external reference when useful

Use `blocking` for unsafe or materially incomplete behavior, `warning` for a relevant gap with safe coherent current behavior, and `informational` for visibility without outcome impact.

Record the requirement in `moldea.yaml` under the project or agent that owns the gap. An instruction may communicate the limitation to the model, but instruction prose is not a registered requirement. Related paths provide traceability only; they do not create context, binding, composition, or automatic resolution.

Do not use requirements as a roadmap or backlog. Do not create one to avoid an answerable developer clarification. Never remove one because a related file changed; verify every stated resolution criterion first.

## Verify agent readiness

After writes, run project-native checks for changed executable behavior when applicable, rerun deterministic `inspect --json`, and semantically review purpose, completeness, scope, contracts, canonical instruction provenance, capabilities, routing, ambiguity, failures, consistency, economy, mirrors, and unresolved state.

Do not call an agent production-ready when behavior lacks reliable support, a material contract is hidden or contradictory, deterministic validation fails in the affected system, or a blocking unresolved requirement affects the claimed responsibility.
