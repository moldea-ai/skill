# Evaluate and reconcile

Read this reference before `evaluate`, `reconcile`, or a scoped semantic alignment assessment.

## Build the evidence scope

Both operations begin from the same evidence model: supported local tooling, `inspect --json`, compatibility data when material, relevant canonical state, Agent Skill source and resources, implementation, executable contracts, tests, runtime integration, runtime-adapter evidence, developer intent, and unresolved state.

When no explicit scope is provided:

- **`HEAD` exists and the working tree is dirty:** use staged, unstaged, untracked, renamed, and deleted paths relative to `HEAD` as the initial change set, then expand through registered and semantic relationships into every materially affected `moldea` surface.
- **`HEAD` exists and the working tree is clean:** assess the current `moldea` system as a whole, beginning with project foundation, relationships, active decisions, agents, capabilities, schemas, runtime guidance, requirements, and runtime-adapter evidence, then progressively inspect relevant implementation without exhaustively reading the repository.
- **No `HEAD` exists:** treat every current path as newly introduced for initial scope selection.

An explicit agent, Agent Skill, capability, domain, path, runtime, change, or contradiction defines the starting point, not an artificial prohibition on inspecting materially related evidence.

## Evaluate read-only

`evaluate` must not modify canonical state, README guidance, implementation, schemas, tests, fixtures, mirrors, dependencies, lockfiles, Git state, coding instructions, or any other repository file.

1. Run root-local `inspect --json` first.
2. Verify its complete machine envelope before interpreting results.
3. Run root-local `compatibility --json` only when compatibility can change a conclusion.
4. Preserve deterministic Core and adapter diagnostics with their actual meaning.
5. Compare affected surfaces in both directions. No asset type automatically wins.
6. Limit findings to `moldea` structural and semantic alignment unless the registered behavior makes another quality, security, performance, architecture, or test concern relevant.
7. Stop when evidence is sufficient for reliable scoped conclusions.

For every scoped registered agent, establish how canonical instruction content reaches each material runtime invocation or provider-side configuration path. Treat an unused canonical instruction, an independently maintained runtime instruction, or a material path that bypasses established canonical provenance as a confirmed semantic problem. A valid `instructionLoader` binding, declared mirror, or deterministic inspection does not by itself prove runtime consumption. When the relevant implementation is unavailable, report a material evidence limitation instead of assuming the relationship exists or is absent.

For every scoped runtime description consumer, determine whether its semantic purpose is routing-facing or general-only. Routing requires the target's handoff description when present and otherwise its agent description; general-only metadata requires the agent description. A property name does not establish the role. A shared property is routing-facing and uses the required routing description; do not call that contract misaligned or invent a duplicate. A supported closed form proving the wrong source is a diagnostic or semantic problem. Dynamic wiring may establish purpose and required source, but not the source resolved at runtime; report it unknown rather than effective, absent, or wrong.

For every scoped Agent Skill, apply the structural and semantic classification in `skill-design.md`. Assess its authoritative source and repository ownership, directory identity, portable frontmatter, activation precision, universal workflow, resource routing and links, focused references, scripts and supported environments, assets, dependencies, tests, host metadata and invocation policy, installation and distribution paths, generated or installed copy synchronization, coding-agent consumers, project documentation, agent guidance, manifest declarations, and runtime registration as applicable. Structural validity does not prove useful activation, complete workflow behavior, safe execution, consumption, or runtime registration. Treat a skill directory or installed copy as evidence of an artifact, not proof that a coding or runtime agent receives it.

Universal Core diagnostics prevent adapters from running. In that state `evidence: []` means adapter evidence was unavailable, not that runtime-native behavior is absent. In dedicated-repository mode, external implementation may also make local evidence empty or partial. Continue semantic inspection when useful, state the limitation, and rerun after structural repair before relying on adapter evidence.

Report separate categories:

- **Deterministic diagnostics:** mechanically proven Core or adapter problems.
- **Confirmed semantic problems:** evidence-backed contradictions, drift, stale relationships, or material instruction-quality concerns.
- **Material ambiguities:** consequential questions with multiple plausible intended resolutions.
- **Relevant unresolved requirements:** existing requirements that affect scope, preserving their declared effect.
- **Material evidence limitations:** missing tooling, protected access, unavailable adapter evidence, operational failures, or insufficient repository evidence.

Runtime limitations must name unknowns: invocation, instruction loading, tools, schemas, routing or handoffs, and variables or provider configuration. Also name the smallest reliable resolving evidence, such as source-owned target docs and closed repository wiring or integration tests; generic statements are insufficient.

When material repository-specific runtime behavior is not established by canonical guidance or another reliable source, report that semantic-readiness problem rather than inventing a Core structural diagnostic. Never repair an unavailable adapter by silently rewriting `runtime.id` to `custom`.

Do not fabricate PR Assurance outcomes, Cloud acceptance, merge conclusions, billable semantics, confidence thresholds, or style-only findings. Recommend a correction only when intended direction is sufficiently established.

Every evaluation reports scope, deterministic state, all five categories, tooling and checks, and the explicit fact that no repository files were changed.

## Reconcile with established intent

`reconcile` begins with the evaluate evidence model but may write within developer-authorized scope.

Before any semantic edit, complete an intended-state gate. Reconciliation authority permits resolving established drift; it does not select which plausible policy, permission, or behavior should govern. Deterministic checks can expose the conflict but cannot convert code, tests, canonical context, or instructions into intended-state authority.

1. Establish intended state from question-specific repository evidence and developer direction. A request to reconcile authorizes the operation, not an arbitrary choice among unresolved policies.
2. Do not assume code, tests, schemas, context, decisions, instructions, or adapter evidence always wins.
3. Ask the developer before choosing among materially different plausible intended states, and make no semantic write while the answer is pending.
4. Use unresolved requirements only for genuine incomplete state, not to avoid an answerable clarification.
5. Apply the smallest coherent change across every affected canonical, Agent Skill source, resource, host metadata, installed or distributed copy, coding-agent consumer, model-facing, runtime, implementation, schema, test, relationship, variable, requirement, and mirror surface. A routing-description correction includes the applicable canonical description, runtime loader or registration, routing behavior, and focused tests.
6. Preserve still-valid behavior and unrelated defects. Remove superseded paths only when the authorized resulting state makes them unnecessary.
7. Remove an unresolved requirement only after authorized work or current evidence satisfies every explicit resolution criterion; never broaden the task merely to close it.
8. Run relevant project-native verification, synchronize mirrors, rerun root-local `inspect --json`, and perform semantic readiness review.

For a same-scope contradiction over permission, approval, ownership, authorization, value-bearing behavior, destructive effects, or another consequential policy, name the exact conflicting claims and the evidence role of each. State that neither implementation nor synchronized canonical or mirror content establishes intended-state authority, ask the exact choice that must be made, and change nothing while awaiting the answer. Inspection may describe the conflict but cannot resolve it.

When reconciliation establishes canonical instruction provenance, update the canonical asset, runtime loading or provisioning mechanism, material bindings, tests, mirrors, and runtime guidance together as applicable. Remove a superseded independent instruction source only when intended behavior is established and the implementation path is within the authorized scope.

If unrelated invalidity remains, distinguish successful scoped reconciliation from complete repository validity. Do not claim alignment while a relevant semantic conflict or ambiguity remains.

## Validate

`validate` is a read-only deterministic operation. Use root-local `validate --json` when the developer requests structural validation and the project index is unnecessary. Apply the same tooling, executable, envelope, schema, version, command, status, sensitivity, and failure rules as `inspect`.

`status: invalid` with diagnostics is a completed deterministic result, not an operational failure. `status: error` is an operational failure. Validation does not prove semantic alignment.
