---
title: Adapter qualification
navigationTitle: Adapter qualification
description: Understand the transparent support gate that exercises exact adapter implementations through realistic projects, deterministic checks, and independent semantic judgment.
section: reference
order: 175
---

# Adapter qualification

Adapter qualification is the evidence gate for deciding whether one exact adapter implementation is ready for **Supported** maturity. It tests whether the current `moldea` skill and the exact published package release can understand and safely maintain realistic projects. It does not invoke the provider, run the agent, or replace provider integration tests.

Every profile, project, requirement, attempt, failure, and artifact is stored in this repository or its immutable release history. The [qualification evidence index](/evidence/qualification/) presents inspectable committed evidence without requiring a hosted service.

## What the gate exercises

Every case uses the same production composition developers rely on:

1. Repository FS reads the real Git working tree.
2. An independent Repository memory reconstruction must produce equivalent evidence.
3. Core validates and inspects Repository format state.
4. The exact packed CLI runs `compatibility`, `validate`, and `inspect` from the project-local dependency.
5. The selected adapter contributes its normal static evidence.
6. The project typechecks with the exact compiler declared and installed by that mock project, and read-only inspection must leave it unchanged.

The portable skill is installed at `.agents/skills/moldea`, its real discovery location. Candidate packages are downloaded from npm using the exact CLI-owned release closure, verified against registry SHA-512 and SHA-1 identities, and recorded with downloaded SHA-256 digests. The runner applies the same registry and digest checks to the exact TypeScript version owned by the qualification package and the exact runtime and type packages owned by the selected profile. Candidate preparation fetches external dependencies once into an attempt-local package-manager store with lifecycle scripts disabled, then every committed project installs offline from that store and the verified tarballs. Each project owns relative local executable links. The deterministic verifier does not borrow packages from the packages checkout or a machine-level package-manager store.

## Three evidence layers

Matrix probes map every behavior-affecting compatibility claim to one or more project cases. A missing claim, an unknown claim, or an uncovered case fails before model execution.

Deterministic verification runs before and after the actor. It checks package provenance, repository-reader equivalence, Core and CLI behavior, project validity, project-local typechecking, dependency integrity, and workspace preservation.

[Semantic evaluation](/docs/semantic-evaluation/) proves broad portable-skill behavior through controlled, sourced repository scenarios. Adapter qualification uses separate actor and judge processes with the same fixed frontier assurance model at `medium` reasoning effort (`gpt-5.6-sol`), but exercises transparent mock projects and exact published package compositions. In both workflows, the actor receives a natural project task rather than grading criteria. Initialization tasks may name `moldea`, while later tasks state only the intended development outcome so skill discovery and activation remain part of the evidence. Qualification requirements explicitly assign deterministic facts to the runner and semantic decisions to the judge, with the exact judge evidence sources declared in each scenario. Protocol 6 is the only qualification evidence contract.

Judge requirements assess the substantive outcome requested by the natural task and accept equivalent evidence-based explanations. Exact diagnostics, API symbols, schema symbols, and binding identities remain deterministic runner evidence unless the developer-facing task explicitly requires the actor to report them.

A case passes immediately only when its initial deterministic checks, workspace assertions, and semantic judgment all pass. A completed initial model-dependent failure starts two fresh confirmations. Both must pass to recover the case, while either confirmation failure is terminal and leaves the original failure visible. No layer can override a failure in another layer.

## Why the projects are demanding

The universal catalog currently includes eight distinct journeys:

- Evaluate an aligned project and avoid unnecessary edits.
- Initialize a useful repository model from concrete project evidence without inventing behavior.
- Create a grounded agent, canonical assets, runtime guidance, and bindings from an existing implementation contract.
- Maintain a dirty project while preserving unrelated tracked and untracked work byte-for-byte.
- Reconcile implementation drift without fabricating a relationship that static evidence cannot prove.
- Retire an obsolete agent and every stale canonical reference coherently.
- Stop without changes when project purpose is materially ambiguous.
- Resist prompt-like instructions stored in the repository and keep them within the evidence boundary.

Eight is not a permanent limit. A profile must add a project when an adapter introduces a materially different binding, package, provider, limitation, or source-analysis risk that the universal journeys do not cover.

Each ready adapter profile contains the eight universal journeys plus two adapter-specific projects. The Anthropic, Claude Agent SDK, Vercel AI SDK, OpenAI Responses, OpenAI Agents SDK, Google Gen AI, LangChain, LangGraph StateGraph, LangGraph Functional API, Cloudflare Think, Cloudflare AIChatAgent, and Eve profiles exercise their exact published packages, supported bindings, and conservative static-analysis boundaries without executing an agent, provider, handoff, or tool. The OpenAI profiles add direct Responses function-tool coverage and direct Agent, schema, function-tool, and handoff coverage respectively. Google Gen AI adds direct generate-content, system-instruction, function-declaration, and JSON-schema coverage. LangChain adds direct `createAgent`, instruction-loader, structured-output strategy, normal function-tool, closed-array, middleware, and unsupported-shape coverage. LangGraph StateGraph adds directly exported compiled graphs, explicit schemas, direct nodes and edges, waiting edges, conditional edges, static compile names, and unsupported runtime-boundary coverage. LangGraph Functional API adds directly exported entrypoints, direct local and imported tasks, interrupts, previous and final state, lexical-call boundaries, and schema, capability, routing, persistence, replay, and approval non-inference. Cloudflare Think adds directly exported class, instruction-loader, AI SDK function-tool, `agentTool` handoff, open-tool-map, dynamic-session, and initialization-sensitive class coverage. Cloudflare AIChatAgent adds direct generation, instruction-loader, `Output.object`, closed function-tool, `agentTool` handoff, runtime-selected tool, `prepareStep`, indirect-generation, and unsupported-output coverage. Eve adds flat and nested filesystem agents, exact instruction sources, output schemas, recursive tools with path-derived names, TypeScript skills, directory-backed local subagents, dynamic capabilities, and unsupported filesystem boundaries.

Each project commits its scenario, natural task, baseline, optional dirty overlay, expected model-free outcome, workspace assertions, and evaluator-owned requirements. Anyone can inspect those inputs before reading an outcome. The runner validates every scenario, requires its id and title to match the catalog, and rejects duplicate ids, paths, patterns, diagnostic codes, evidence kinds, checks, or evidence sources before candidate construction or paid approval. Workspace assertions may use exact paths or bounded repository-relative `*` and `**` patterns. The same path contract is reapplied when committed passing evidence is verified, so permitting a descriptive runtime filename does not permit unrelated changes.

## Publication status

Terminal paid attempts are recorded whether they pass, fail, or stop with an execution error. An interrupted attempt remains local and resumable unless the operator explicitly records it as incomplete.

A committed profile remains visible with an explicit no-attempt state until its first official run. This lets anyone inspect the projects and requirements before evidence exists. The release gate still requires current passing evidence.

The website publishes every valid terminal attempt, including failures and execution errors, while maintaining independent latest and last-passing pointers. Attempt pages lead with the verdict and realistic project journeys. Each journey opens to a Replay reconstructed from the digest-verified actor prompt, projected command outcomes, exact path-only workspace snapshots, recorded actor response, runner-owned verification, and independent judge rationale. The Evidence view explains what had to happen, what was prohibited, why the journey passed, recovered, or failed, and the final requirement results. The Technical view keeps source cleanliness, host identity, exact package checksums, stage outcomes, deterministic results, requirement ownership, workspace assertions, cache provenance, token usage when available, retries, and committed artifacts available without placing them in the primary reading path.

Qualification replay is a bounded reconstruction, not a verbatim terminal transcript or hidden reasoning. Current event evidence records command completion, exit status, and output size but intentionally omits command text and command output. The replay therefore summarizes successful and non-zero command activity without inventing operations. An attempt whose immutable actor prompt does not retain the recorded developer-task boundary is rejected instead of being reconstructed from current profile text. Release eligibility still requires fresh passing evidence through the separate release gate.

## Current repository storage

Qualification keeps logical adapter, implementation, case, attempt, and artifact identities separate from their physical repository paths. [`qualification/profiles/index.yaml`](https://github.com/moldea-ai/skill/blob/main/qualification/profiles/index.yaml) maps each target to an append-only `t<number>` directory. Each profile maps its logical case ids to short `cases/c<number>` directories.

Current results use the same target key, a deterministic `a-<attempt-id-digest-prefix>` attempt directory, and numbered artifact files. The unchanged logical attempt is stored in `attempt.json`; `storage.json` binds every logical artifact path to its contained physical file and verifies the attempt, artifact, source, portable-skill behavior, CLI closure, and qualification compatibility digests. Ordinary qualification commands resolve these mappings internally and continue to display logical identities.

The current checkout contains only the verified latest passing Custom attempt. The other 59 attempts from release `v4.0.0` remain unchanged in immutable tag `v4.0.0` at commit `fcbc34f60b12b1b66cd9ebb28b1865979a259429`. Current qualification commands do not enumerate or copy those 59 historical attempts and do not need historical Git. The carried Custom attempt is accepted locally only when its short storage and checked-in source binding match the current portable-skill behavior, CLI closure, qualification evaluator, universal logical input, execution environment, Custom target, and shared package closure.

Release verification handles historical source access separately. It verifies the immutable source attempts and the checked-in carry-forward attestation, then selects current compatible evidence first and historical compatible evidence second. A missing source tag produces an explicit fetch requirement. It never checks out the long historical result tree and never invokes an actor, judge, model host, semantic evaluation, or adapter qualification.

Website generation also uses complete history without restoring those paths. At build time it reads all 60 `v4.0.0` attempts directly from immutable Git objects into memory, validates their complete artifact inventory and recorded contracts through the same website evidence boundary as current short storage, and combines them by logical profile and attempt id. The only permitted duplicate is the carried Custom attempt, and it is removed only after the source attempt, every artifact byte, source commit, source release, and source digest match. Historical artifact links remain pinned to commit `fcbc34f60b12b1b66cd9ebb28b1865979a259429`; browser output receives only the resolved static evidence model and no Git or filesystem capability.

## When qualification must run again

Evidence validity follows the inputs that can affect the result, not the release number.

| Change                                                                                                      | Required evidence                                                                                                             |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Release-version metadata only                                                                               | Existing semantic, Custom, and adapter evidence remains eligible.                                                             |
| Any other portable-skill path or byte                                                                       | Semantic, Custom, and every adapter must run again.                                                                           |
| CLI closure or supported runtime contract                                                                   | Semantic, Custom, and every adapter must run again.                                                                           |
| Semantic cases, coverage, host, evaluator, or protocol                                                      | Semantic evaluation must run again. Qualification is unchanged.                                                               |
| Shared qualification evaluator, universal input, execution environment, or shared published package closure | Custom and every adapter must run again. Semantic evaluation is unchanged.                                                    |
| One adapter profile, provider runtime, target contract, or target-local package                             | Only that adapter must run again. Custom and sibling adapters remain eligible.                                                |
| A new adapter                                                                                               | Add its complete profile and run only that adapter after the existing Custom baseline passes the current compatibility check. |

The `4.0.1` bridge is a one-time proof that maps all 60 original attempts to source-computed compatibility envelopes without rewriting them. Future releases do not add another version exception. They compare each attested source envelope with current portable-skill, CLI, evaluator, logical-input, target, environment, package, and baseline identities. A historical attempt is selected only when all applicable identities still match.

Historical baseline replay checks the complete recorded environment. The original adapter retries could increase their host timeout, so replay permits only an adapter timeout that is at least its Custom baseline timeout while requiring exact model, toolchain, network allowlist, model endpoint, and TLS certificate identities. Each adapter's exact timeout remains bound to its own envelope. New adapter runs require an exact complete environment match with the current carried Custom baseline.

## Checkpoints and cache integrity

Local checkpoints are written atomically after each meaningful stage and retryable host failure. Resume requires the same portable skill, shared production evaluator behavior, selected profile and target behavior, selected package behavior, candidate closure, model configuration, host boundary, and tool versions that created the attempt. Exact repository commits remain provenance, while unrelated clean commits, sibling adapters, tests, and operator documentation do not invalidate matching selected inputs. Resume preserves completed trials and contiguous retry histories. Actor retries restore the pristine pre-actor project; judge retries recreate only the read-only judge workspace.

Candidate and model caches are separate. An initial-trial cache hit must validate its complete identity and artifact digests, restore the actor workspace exactly, and continue through deterministic checks and result verification. Confirmations never read or write cross-attempt model caches. Raw Codex streams are discarded in memory; caches and current result artifacts retain only safe projected command completion facts and command-policy aggregates. Actor and judge command-policy compliance is a global trial invariant, independent of scenario requirements, and an observed actor violation prevents an unnecessary judge call. Result verification parses every protocol-owned artifact and independently derives command-policy failures, requirement assessments, retries, trials, confirmations, cases, and the attempt verdict against the exact profile and scenario contracts. Dry runs never use model caches or a fake judge. They report judge-owned requirements as `not-evaluated` and never publish results.

The runner retries only `execution-failed`, `proxy-unavailable`, and `timed-out` host failures. It records a safe category, timestamp, contiguous count, and delay, then waits with capped exponential backoff and bounded jitter. Qualification permits one retry after the initial actor or judge call. A second retryable failure safely exhausts the stage. Those retries do not consume a trial. Output limits, spawn failures, malformed outputs, deterministic failures, input drift, and unknown errors stop instead.

If post-actor deterministic checks or workspace assertions already prove that a case failed, the judge stage is recorded as skipped and no judge call is made. This saves a call without changing the outcome or allowing cached evidence to bypass verification.

The ordinary planned paid workload is 48 calls for the eight-case Custom profile and 60 for each current ten-case adapter profile. Those figures cover an actor and judge for every initial and possible confirmation trial. Including the one operational retry permitted for every call, the hard maxima are 96 and 120. Short-circuiting, cache hits, and skipped judges can reduce the total.

A paid `diagnose` command can run one selected initial trial through the same clean-input, candidate, host, deterministic, assertion, evidence, cache, retry, and checkpoint boundaries. It performs no confirmations and reports two planned and four maximum calls. A diagnostic skips the official Custom-baseline prerequisite, never updates public results, cannot be recorded, and cannot satisfy release or maturity gates.

## Supported maturity eligibility

Qualification is necessary evidence for **Supported** maturity, not an automatic promotion. The Custom profile must pass first as the universal baseline, and the selected adapter implementation must then pass its complete current behavior-bearing profile against the same portable skill and shared evaluator contract with its own selected target and exact package closure. The release gate requires compatible passing Custom evidence, which may be current or source-attested. A newer compatible Custom attempt does not invalidate adapter evidence that still matches its selected inputs and retains its original passing baseline in committed history. The profile must cover every applicable compatibility claim and every distinct adapter risk.

Maturity is an outcome considered after qualification. It is not an input, compatibility claim, or provenance field used to make the test pass.

Review the [current qualification evidence](/evidence/qualification/) or inspect the [qualification source](https://github.com/moldea-ai/skill/tree/main/qualification) directly.
