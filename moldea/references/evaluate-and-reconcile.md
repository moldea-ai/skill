# Evaluate and reconcile

Read this reference before `evaluate`, `reconcile`, or a scoped semantic alignment assessment.

## Build the evidence scope

Both operations use supported local tooling, `inspect --json`, material compatibility data, canonical state, Agent Skill source and resources, implementation, executable contracts, tests, runtime integration, adapter evidence, developer intent, and unresolved state.

Resolve the subject before collecting target evidence:

1. Establish adoption from project-owned canonical state.
2. In an adopted repository, a brief name-only request targets the project-owned Moldea system. Ask one focused question before evaluating when material subject ambiguity remains.
3. Use the installed `.agents/skills/moldea` entrypoint and operation-triggered references only as operating guidance. Do not inventory, validate, or report that tree as target evidence unless the developer explicitly scopes it or repository evidence establishes project ownership.

After resolving the subject, select initial evidence from repository state:

- **HEAD exists and the tree is dirty:** include staged, unstaged, untracked, renamed, and deleted paths relative to HEAD, then expand through registered and semantic relationships into materially affected Moldea surfaces.
- **HEAD exists and the tree is clean:** begin with the project-owned foundation, relationships, decisions, agents, capabilities, schemas, runtime guidance, requirements, and adapter evidence, then inspect relevant implementation progressively rather than exhaustively.
- **HEAD does not exist:** treat every current path as newly introduced for initial scope selection.

An explicit agent, Agent Skill, capability, domain, path, runtime, change, or contradiction supplies the starting point but does not prohibit inspection of materially related evidence. An explicit or project-owned Agent Skill evaluation retains its complete artifact scope.

## Evaluate read-only

`evaluate` changes no repository, dependency, lockfile, mirror, or Git state.

1. Run root-local `inspect --json` and verify its completed machine envelope before interpreting it.
2. Run root-local `compatibility --json` only when compatibility can change a conclusion.
3. Preserve Core and adapter diagnostics with their actual meaning.
4. Compare affected surfaces in both directions; no asset type automatically wins.
5. Limit findings to structural and semantic Moldea alignment unless registered behavior makes another concern relevant.
6. Stop when evidence supports reliable scoped conclusions.

Semantic alignment requires reliable evidence of each material behavior's intended meaning and relevant consumption. A relationship proves scope and implementation proves current behavior; neither alone proves agreement. Report an exact evidence limitation instead of claiming alignment when intent or consumption remains unknown.

For every scoped agent, establish how canonical instruction content reaches each material runtime invocation or provider-side configuration. An unused canonical instruction, independent runtime instruction, or material path that bypasses canonical provenance is a confirmed semantic problem. Bindings, mirrors, and deterministic inspection do not alone prove consumption. Unavailable implementation creates an evidence limitation, not an assumed connection or disconnection.

For runtime description consumers, establish the consumer purpose, required canonical source, selected source, and resolver using `agent-design.md`. An absent handoff description is aligned fallback when the consumer uses the agent description. Under unresolved dynamic wiring, state conditional outcomes and call a source required, never current, effective, absent, correct, or wrong.

For Agent Skills, apply `skill-design.md` to the authoritative artifact, activation, resources, scripts, dependencies, metadata, copies, distribution, consumers, documentation, agent use, and runtime registration. Structural validation alone does not prove useful activation, workflow quality, consumption, or registration.

Core invalidity can prevent adapters from running. In that state `evidence: []` means unavailable evidence, not absent runtime behavior. External implementation can create the same limitation in dedicated-repository mode.

Report five separate categories:

- **Deterministic diagnostics:** mechanically proven Core or adapter problems.
- **Confirmed semantic problems:** evidence-backed contradiction, drift, stale relationship, or material instruction-quality concern.
- **Material ambiguities:** consequential questions with multiple plausible resolutions.
- **Relevant unresolved requirements:** existing requirements affecting the scope and their declared effect.
- **Material evidence limitations:** each unknown fact, its smallest reliable resolving artifact and established owner, and what that artifact must prove.

Reliable resolvers include source-owned target documentation, closed wiring, provider configuration, and integration tests. Do not invent a path or owner. A missing-evidence list without an unknown-to-resolver mapping leaves evaluation incomplete.

Report repository-specific runtime guidance gaps semantically rather than inventing Core diagnostics or changing `runtime.id` to `custom`. Do not fabricate PR Assurance, Cloud acceptance, merge readiness, billable semantics, confidence thresholds, or style-only findings.

For an unscoped clean evaluation, state the project-owned starting scope, the canonical relationship that expanded implementation evidence or why none was material, and the conclusion. Every evaluation reports scope, deterministic state, all five categories, tooling and checks, and that no repository files changed.

## Reconcile with established intent

Reconciliation uses the evaluation evidence model and may write only within established authority. It corrects known drift; it does not select policy, permission, ownership, or behavior.

1. Establish intended state from question-specific evidence and developer direction. Authorization to reconcile does not choose among unresolved alternatives.
2. Treat code, tests, schemas, context, decisions, instructions, runtime guidance, and adapter evidence according to their evidence roles.
3. Ask before choosing among materially different intended states and make no semantic write while the answer is pending.
4. Use unresolved requirements for genuine incomplete state, not answerable clarification.
5. Apply the smallest coherent change across every genuinely affected canonical, Agent Skill, metadata, copy, consumer, runtime, implementation, schema, test, relationship, variable, requirement, and mirror surface.
6. Preserve still-valid behavior and unrelated defects. Remove superseded paths only when established resulting state makes them unnecessary.
7. Remove a requirement only after every resolution criterion is established; do not broaden work merely to close it.
8. Run relevant project-native verification, synchronize mirrors, rerun `inspect --json`, and review semantic readiness.

For a consequential same-scope contradiction, name both claims and the evidence role of each. State that neither implementation nor synchronized canonical or mirror content selects intended state, ask the exact choice, and change nothing while awaiting the answer.

When establishing canonical instruction provenance, update the canonical asset, runtime loading or provisioning, material bindings, tests, mirrors, and runtime guidance together where applicable. Remove an independent instruction source only when intended behavior and implementation authority are established.

Distinguish successful scoped reconciliation from complete repository validity when unrelated invalidity remains. Do not claim alignment while relevant conflict or ambiguity remains.

## Validate

`validate` is read-only and deterministic. Use root-local `validate --json` when the developer requests structural validation and the project index is unnecessary. Apply the same provider, version, envelope, status, sensitivity, and failure rules as `inspect`.

`status: invalid` with diagnostics is a completed result, not successful validation or operational failure. `status: error` is operational failure. Validation does not prove semantic alignment.
