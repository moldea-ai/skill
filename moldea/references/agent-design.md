# Agent design

Read this reference before creating or materially changing an agent, instruction, description, handoff description, schema, capability, variable, mirror, adapter relationship, or unresolved requirement.

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

## Select the runtime honestly

Every registered agent declares exactly one framework ID. Inspect runtime evidence and run `compatibility --json` when support matters.

- select a package-backed official adapter only when its active matrix entry is `available` and repository evidence matches a published target
- planned or in-development entries do not establish support
- use the built-in `custom` adapter when a known runtime does not reliably match an available official adapter
- clarify when the runtime itself is genuinely unknown
- add project-local runtime guidance only when actual integration cannot be interpreted reliably from adapter evidence, bindings, and repository evidence

Do not infer compatibility from a package name, install adapters dynamically, or invent framework support.

## Register real relationships

Use only manifest properties supported by repository format version `1` as verified by the active CLI/Core contract or installed authoritative documentation.

Register repository-root-absolute logical paths and symbols when material implementation relationships exist and cannot be derived reliably. Important relationships can include runtime agent, executable input/output schemas, instruction loader, variable providers, capability implementation and registration, focused context, accepted decisions, runtime guidance, and broader `affectedBy` paths.

Never create fake paths, symbols, selectors, future files, cross-repository references, or prose-only substitutes for required relationships. If the active manifest shape needed for a material relationship cannot be established, stop and report the blocker.

Routing and handoffs remain framework-native in version `1`. Maintain runtime routing implementation, source/target instructions, target-owned handoff descriptions, runtime guidance, and relevant impact relationships as needed. Never invent a manifest `handoffs` graph.

## Tools and skills

Manifest-register a tool or skill only when a qualifying repository-local implementation artifact exists and the version `1` capability contract can bind it.

Before describing a capability, establish its runtime-facing name, purpose, use conditions, inputs, outputs, important preconditions, limitations, side effects, authorization, failure behavior, and registration. Never invent parameters, defaults, response fields, authentication, retries, rate limits, provider guarantees, or error semantics.

Give each registered capability a stable agent-scoped ID, exact runtime-facing name, concise vendor-independent agent-specific description, implementation binding, registration/schema bindings when applicable, and complete instruction guidance. Distinguish overlapping capabilities by use condition.

A provider-hosted or external model-visible capability without a qualifying repository-local artifact may be described in the instruction or runtime guidance when reliable evidence supports it. Do not fabricate a manifest tool or skill entry.

## Schemas

Treat executable and model-facing schemas as one semantic contract:

- preserve requiredness, optionality, nullability, literals, enums, alternatives, field meaning, and material constraints
- include model-facing representations in the instruction when the model must understand the contract
- bind material executable input and output schemas to existing repository-local paths and symbols
- allow framework transformation while requiring semantic equivalence
- omit unsupported or internal fields and never expose hidden reasoning

When existing executable and model-facing contracts differ, no surface automatically wins. Inspect implementation, tests, context, developer intent, and framework transformation; clarify if the intended contract remains materially ambiguous.

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

After writes, run project-native checks for changed executable behavior when applicable, rerun deterministic `inspect --json`, and semantically review purpose, completeness, scope, contracts, capabilities, routing, ambiguity, failures, consistency, economy, mirrors, and unresolved state.

Do not call an agent production-ready when behavior lacks reliable support, a material contract is hidden or contradictory, deterministic validation fails in the affected system, or a blocking unresolved requirement affects the claimed responsibility.
