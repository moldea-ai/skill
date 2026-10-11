# Agent design

Read this reference after moldea relevance is established for creating or materially changing an agent, instruction, description, handoff description, schema, capability, variable, mirror, runtime relationship, or unresolved requirement.

Agent-system planning decides whether an agent should exist and proposes its responsibility. Agent design begins after a direct request or accepted candidate. Revalidate repository evidence rather than copying a recommendation into canonical state or model-facing instructions.

When a direct request says to create, register, and make an existing runtime agent ready, and bounded repository source plus focused tests establish its current behavior, complete the coherent implementation rather than stopping because the current instruction is inline. Create the canonical agent assets, derive every material invocation from canonical instruction through a real loader or necessary exact mirror, remove the independently maintained inline policy, register the evidenced runtime, loader, mirror, and impact relationships, preserve or strengthen focused coverage, and complete all runtime, test, and canonical file writes before final validation. If any required behavior or runtime path is not evidenced, report that exact limitation instead of inventing it.

A direct change to a one-shot model's decisions or output is agent-design work even when its policy is inline and no relationship exists. Establish the actual invocation, then give that cohesive responsibility canonical instructions consumed through a real loader or necessary exact mirror. Register only evidenced runtime and impact relationships, preserve the client contract, and test instruction consumption. Do not split one workflow into artificial agents or claim provider behavior from a canned client.

## Establish behavior before prose

Establish the supported behavioral contract before drafting or broadly rewriting model-facing text. Include only material identity, purpose, responsibility, project context, inputs, outputs, rules, scope, exclusions, capabilities, variables, ambiguity, failure, escalation, routing, and quality expectations.

Do not call an agent complete when correct behavior depends on hidden repository knowledge. Supply model-facing context and a real runtime path, narrow the behavior, implement authorized support, clarify intent, or preserve incomplete state.

Separate the requested operation's outcome from agent or runtime readiness. A blocking unresolved requirement prevents claims that the affected behavior, agent, or runtime is complete or production-ready. It does not make a narrower maintenance operation blocked when every requested safe write, preservation obligation, and validation step is complete and the limitation is recorded. Report that operation as completed with the unresolved limitation; use a blocked task outcome only when the gap prevents the requested deliverable itself.

## Write minimum sufficient instructions

Every `instruction.md` must be complete after the runtime assigns responsibility. Keep it grounded, actionable, scoped where boundaries matter, aligned with executable contracts, precise about consequential ambiguity and failure, internally consistent, and concise enough that every runtime token earns its cost.

Avoid generic boilerplate, fixed heading templates, chain-of-thought demands, unnecessary provider detail, exhaustive edge cases, and decorative examples. Best effort never permits fabrication.

Preserve valid behavior during refinement. Prefer local edits while organization remains coherent; rewrite only when responsibility or structure changed or patching would preserve contradiction. Synchronize neighboring model-facing surfaces when their shared contract changes.

## Keep model-facing assets distinct

- `description.md` states what the agent does. Keep it concise, vendor-neutral, and responsibility-focused.
- `handoff-description.md` states when responsibility should transfer to the agent. Create it only for a real routing need.
- `instruction.md` states how the agent operates after transfer and cannot depend on either description for core behavior.

Every registered agent has one lowercase ASCII kebab-case ID, one `/moldea/agents/{agent-id}/` directory, mandatory `description.md` and `instruction.md`, and optional `handoff-description.md`. After an optional Markdown heading, the first nonblank instruction line must contain the exact backtick-wrapped identity token `` `{agent-id}` ``. A heading that merely names the agent does not satisfy the identity contract.

Classify the consumer from installed SDK types, source-owned documentation, runtime guidance, implementation, and developer direction before reading meaning into its property name. A runtime property literally named `description` can still be routing-facing; its name supplies no classification evidence. Routing-facing metadata uses the target handoff description when present and valid, otherwise the agent description. General-only metadata uses the agent description. Preserve an established shared-property contract and do not create a handoff description merely because such a property exists.

Before changing a mapping, establish:

1. the evidence identifying consumer purpose
2. the canonical source currently selected, or that selection is unknown
3. the source required by the established purpose

A required source does not prove selection. Under dynamic wiring, state conditional outcomes and identify resolving wiring or tests; never call a candidate current, effective, absent, or wrong. Prove a mismatch before editing. Tests confirm a correction but do not justify it.

Always state the consumer-purpose classification, including when dynamic wiring leaves the currently selected source unknown.

## Select the runtime honestly

Every registered agent declares one `runtime.id`. Load `runtime-guidance.md` for connection work. IDs select guidance, not compatibility, certification, or vendor endorsement. Use the ID of the SDK the code calls directly; a framework's provider packages keep the framework ID, and OpenAI-compatible providers called through `openai` keep `openai`. When one SDK defines the agent and another transports its requests, select the defining SDK. Use `custom` only for an evidenced project-specific runtime, never to hide missing evidence.

Before a runtime write, establish the authorized repository scope and primary model-invocation boundary, instruction loading, capabilities, schemas, routing, and variables. Follow only the touched agent's call path, stopping at dynamic boundaries. Consult the installed SDK's types with one targeted search per field; do not read entire declaration files. Preserve every evidenced model-visible capability in canonical instructions or project-specific runtime guidance. Map unknown behavior to its smallest reliable resolver, such as closed wiring or a focused integration test. Never invent paths, owners, API fields, or runtime behavior.

Reconcile runtime identity and semantic surfaces together. An ID-only edit is incomplete when evidence establishes affected behavior. Report the declared ID, exact guidance path and role, and bound implementation path and symbol when established, plus material evidence limits. Create runtime guidance only for project-specific behavior or limitations. A missing online reference does not establish a broken connection or justify changing an existing ID.

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
      - /src/order-triage-policy/**
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
        resolution: Establish runtime registration through explicit source or a focused connection test.
        related:
          - path: /src/dynamic-tools.ts
```

Register repository-root-absolute logical paths and symbols only for material implementation relationships that cannot be derived reliably, including runtime agents, executable schemas, instruction loaders, variable providers, capability implementation or registration, context, decisions, runtime guidance, and broader `affectedBy` paths.

`affectedBy` is a behavioral impact map, not a build dependency graph. Include a path when its changes can materially alter the owner's policy, capabilities, executable contracts, routing, instruction loading, or runtime integration. Prefer exact paths or coherent behavioral subtrees. Exact bindings already establish relevance; do not repeat their paths mechanically unless a broader file-level effect needs coverage.

An exact `affectedBy` path must resolve to a regular file, such as `/src/order-triage-agent.ts`. Express a coherent subtree with a supported glob, such as `/src/order-triage-policy/**`. Neither `/src/order-triage-policy` nor `/src/order-triage-policy/` expresses subtree impact: removing a trailing slash does not turn a directory into a file. Choose exact files or a subtree from the inspected behavioral ownership; do not broaden everything to `/src/**`. Binding paths, mirrors, and `related` path records keep their exact-path contracts.

When a relationship diagnostic appears, establish the field's full syntax and target-type requirements before repairing all equivalent defects in the affected change set. Preserve material relationships and unrelated declarations; never fabricate files or remove relationships merely to pass validation. Follow the entrypoint's supported recovery rule when validation reveals another defect.

Package manifests and lockfiles can matter when they select dependencies or runtime settings that materially affect that owner; do not attach them to every agent by default. Compiler configuration and type-only declarations require an evidenced behavioral effect, not compilation participation alone. Scope tests to the behavior they protect rather than automatically declaring every test. These are selection criteria, not filename bans: preserve a justified configuration or shared dependency relationship and inspect its role before narrowing an existing declaration.

When a declared path matches, inspect the actual change before additional canonical reads. Reconsider the owner, but leave it unchanged when the diff does not affect its behavior or contract. Matching identifies potential relevance, not a mandatory edit.

Never create fake paths, symbols, selectors, future files, cross-repository references, or prose substitutes. If a material relationship cannot be expressed under the established format, report the blocker.

Routing and handoffs remain runtime-native in version `1`. Maintain routing implementation, metadata, source and target instructions, target-owned descriptions, runtime guidance, impact relationships, and tests as needed. Reconsider every supported consumer when a canonical description changes, and reconsider canonical descriptions when routing behavior changes. Never invent a manifest `handoffs` graph.

## Establish canonical instruction provenance

For every in-scope agent, establish how canonical `instruction.md` reaches each material invocation or provider-side configuration. Application code, adapters, runtime libraries, builds, provisioning, mirrors, or another evidenced runtime path may provide it; do not prescribe one mechanism.

The active instruction derives from canonical content, not an independently maintained policy source. Field names do not alter provenance: turn-specific `instructions`, inputs, continuation prompts, messages, or tool payloads may transport current input but cannot own reusable policy.

Use an exact declared mirror only when the runtime requires another tracked path, and verify consumption. Register `instructionLoader` when a material repository-local loader path and symbol exist and cannot be derived. Reliable implementation evidence may make that binding unnecessary.

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

After all canonical, runtime, test, and relationship file writes, run the focused project-native tests that exercise every changed material invocation and canonical-loading path, correct any implementation or test defect, and only then run launcher-backed `validate` as the final moldea command. For repairable structural defects, follow the entrypoint's supported recovery rule: correct the complete affected contract, rerun native checks affected by the repair, and validate after the last write. Report the final status and material diagnostics, including their absence. A passing generic check or actor report is not a substitute for runner-owned focused test evidence. Review purpose, completeness, scope, contracts, instruction provenance, capabilities, routing, ambiguity, failures, consistency, economy, mirrors, and unresolved state without loading unrelated canonical bodies.

Core checks declared files and explicit TypeScript/JavaScript ESM exports. Binding coverage states exactly what passed, failed, or could not be checked; it never proves instruction consumption, runtime wiring, schema attachment, tool registration, or behavior. Preserve valid dynamic designs and report the smallest missing evidence. Recommend a connection test asserting that the outgoing request carries the canonical instruction and schema; add it only within developer-authorized implementation.

Warnings do not invalidate the project or excuse confirmed errors. Apply `continuous-maintenance.md` → “Warnings and acceptance” when reporting them; accepting a warning never turns an unchecked relationship into a passed check.

Do not claim production readiness when behavior lacks support, a material contract is hidden or contradictory, affected validation fails, or a blocking requirement remains.
