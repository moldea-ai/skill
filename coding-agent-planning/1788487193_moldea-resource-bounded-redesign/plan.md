# Plan: Scalable clean-slate moldea activation and PR Assurance foundation

## Task contract

Replace the current moldea skill, repository-reader, Core, CLI, GitHub-repository, and PR Assurance foundations with one resource-bounded architecture that remains correct on large repositories without flooding model context, exhausting memory or disk, or reporting false success after partial work. The implementation spans the current `skill` repository, `../packages`, `../platform`, `../knowledge-base`, the public `../moldea-api-repository-github-fixture`, and the private `moldea-api-repository-github-private-fixture` repository. It includes directly affected specifications, public documentation, websites, tests, semantic evaluations, adapter qualifications, release metadata, package versions, paired provider fixtures, and stable pull-request assurance scenarios.

This is a clean break. Do not retain compatibility exports, overloads, serializers, cursor formats, fallbacks, feature flags, migrations, dual readers, schema adapters, or documentation for the superseded contracts. Previously published npm versions remain immutable registry records, but the active source and supported documentation will expose only the new major versions. Obsolete skill 4.0.0, 4.0.1, and 4.0.2 tag and release surfaces may be deleted as already authorized; shared branch history will not be force-rewritten because doing so cannot erase provider-retained objects and would endanger unrelated collaborators. Fresh model-derived evidence remains the normal release path, but the release tooling must also provide one native local evidence-pin escape hatch that can deliberately point a new release at valid passing evidence from an immutable earlier release without retaining any old runtime or compatibility code.

The product name is `moldea` in human-facing prose. Required technical identifiers retain their exact syntax, including package names, environment variables, types, and pre-existing API symbols.

The previously authorized autonomous sequence remains the execution contract: revise and challenge this plan until sound, regenerate the breakdown, implement milestones sequentially, run read-only reviews and correct findings until ready, then create signed and signed-off commits and push each cohesive repository change to its resolved branch destination. The developer additionally authorizes autonomous integration into each repository's primary `main` branch and publication through the established main-branch workflows, without another approval. Every integration still requires fresh target resolution, a complete `review main` ready verdict, conflict-free exact state, signed merge metadata when a merge commit is created, explicit one-branch pushes, and compliance with repository protection and release controls. Concurrent unrelated work must be preserved and excluded from these commits. Protected coding-instruction files remain untouched.

## Problems that brought the project here

The implementation and its permanent regression evidence must retain the following failure history so later optimization does not reintroduce it:

1. An unrelated documentation review activated moldea although the change neither touched `/moldea/**` nor matched a declared relationship.
2. Activation language such as “Use first” and “potentially durable knowledge” made nearly every meaningful engineering task eligible.
3. The skill loaded several large references before establishing relevance, consuming substantial context and causing compaction before the requested task was complete.
4. Host commands such as review and publication were captured by moldea-specific Git instructions. The resulting sessions repeatedly polled status, inspected remotes, hashed files, and performed unrelated repository checks.
5. A read-only review created a temporary index and Git tree object. Read-only moldea work must not mutate worktree files, indexes, refs, configuration, submodule state, temporary repository state, or the Git object database.
6. Root README changes activated moldea even when the managed moldea block was byte-identical.
7. Unrelated work acquired moldea-centered commentary, final-report sections, and commit identity.
8. A repository with zero agents and zero relationships still triggered full project inspection.
9. `moldea inspect --json` returned complete canonical document bodies. The observed response expanded to roughly 5,889 to 6,526 transcript lines.
10. One canonical `/moldea/project.md` body was about 194,885 UTF-8 bytes, so a single record could dominate output and model context.
11. Agents wrote ad hoc wrappers to summarize oversized CLI JSON; one wrapper failed on a guessed shape and caused another command and another full inspection.
12. The current CLI paginates after materializing and projecting complete results, so bounded stdout does not imply bounded computation or memory.
13. The current `content` path reads a complete file and builds `Array.from(content)`, multiplying memory for large Unicode documents before choosing a page.
14. Core inspection caches complete file buffers and returns body-bearing project structures through its root public contract.
15. Repository readers expose whole-file reads and recursive entry streams without page, range, snapshot, comparison, or completeness contracts.
16. The filesystem reader builds full inventories and uses fixed entry, file, and cache ceilings that can reject large but otherwise valid repositories.
17. The GitHub reader eagerly resolves a complete tree; its truncated-tree fallback walks all subtrees, and its inventory constructs and sorts a whole-repository map.
18. GitHub convenience endpoints are unsuitable as completeness contracts: recursive trees can truncate around 100,000 entries or 7 MB, compare results expose limited files, and pull-request file listings have practical caps.
19. A cache entry larger than the configured byte cache can fail instead of bypassing the cache safely.
20. The platform PR Assurance worker is still a shell. There is no reusable bounded analysis kernel, resumable checkpoint contract, or resource-exhaustion outcome.
21. PR Assurance documentation promises exact base/head reasoning and trustworthy conclusions, but the implementation foundation does not yet guarantee complete comparison without unbounded materialization.
22. Existing infrastructure ceilings measure host commands and output but are too broad to protect a customer from task-specific token, stdout, disk, memory, request, or latency regressions.
23. Universal skill behavior is repeated across adapter qualification profiles, spending model resources without increasing adapter-specific confidence.
24. The skill installation guidance includes or implies global installation. A repository cannot technically prevent an external installer from using a global flag, but moldea can document repository-bound installation and fail closed when the required repository-local adoption state is absent.
25. Upper-bounded provider-library ranges make every newly published provider minor or major appear unsupported even when the adapter's static-analysis contract remains applicable, forcing low-value adapter, CLI, and skill releases.
26. Earlier 4.0.x release bridges, carry-forward machinery, and compatibility thinking made active behavior harder to reason about. The new design must have one current runtime contract, fresh evidence by default, and one explicit evidence-pin operation instead of hidden carry-forward behavior.
27. Current release verification accepts only exact-current semantic and adapter evidence. There is no supported local escape hatch for an urgent CLI/package fix or harmless skill correction, forcing unnecessary evaluation cost and delay or encouraging ad hoc release edits.
28. The public and private GitHub fixtures currently mirror only five small branches. Their largest branch has 43 files and roughly 22 KiB of blob content, so they do not establish lazy large-repository behavior, initialized/uninitialized and bound/unbound states, on-demand source reads, or realistic PR Assurance outcomes.
29. The packages pull request failed because release planning correctly selected a changed `repository-fs` project whose manifest still declared the already published 2.0.0 version. The current branch cannot pass or publish until every release-relevant changed public project declares a greater stable version.
30. Exact first-party workspace dependencies create avoidable transitive release cascades: a compatible Repository, Core, repository-fs, or adapter patch/minor cannot be adopted without republishing downstream packages that otherwise need no code change.
31. Skill 5.0.0 currently requires exactly CLI 7.0.0 in metadata, installation guidance, the relevance gate, and runtime checks. That would require a new skill release for every compatible CLI 7 patch or minor and defeats the repository-local lockfile as the authority for the actual installed closure.
32. The skill website and qualification harness still cap npm below major 12 even though their scripts depend on stable npm capabilities already expressed by a minimum version. That unnecessary engine ceiling can force a skill/tooling release merely because a developer upgrades npm.
33. Platform's `minimumReleaseAgeExclude` policy enumerates exact moldea package releases. Every compatible first-party patch therefore requires another platform configuration edit before it can be installed immediately for integration and qualification, duplicating the same release cascade at the supply-chain-policy boundary.
34. The first fresh Custom qualification exposed a relationship-activation false negative. The unchanged `src/project-state.ts` path was explicitly named by the review task and declared under `/moldea/project.md` through `affectedBy`, but the skill treated host-known scope as changed paths only, made zero moldea CLI calls, and reported that the canonical value was unavailable. The failed attempt and its confirmation are retained as diagnostic evidence; unchanged explicitly targeted paths must remain valid task-path evidence.

## Established decisions

- Repository-bound installation is a documented product requirement. The skill may explain how to install into a repository and must not advertise or support global use. Runtime activation fails closed outside a repository that has explicitly initialized moldea.
- `Initialize moldea` is the one precondition for repository-dependent behavior. Before initialization, an informational question about moldea may be answered concisely without inspecting the repository. All other ordinary tasks abstain silently, including tasks in adopted-looking repositories and paths that merely resemble moldea paths.
- Portable runtime and package-manager declarations express the minimum capability the implementation requires without speculative upper bounds. The skill website and qualification harness support npm `>=10.9.0`; exact npm releases remain lockfile and CI evidence, not a reason to reject a future stable major preemptively.
- Supply-chain quarantine remains enabled for external packages. Because pnpm accepts only exact releases or complete package names in `minimumReleaseAgeExclude`, Platform exempts the first-party `@moldea.ai/*` package names so trusted patches and minors can be consumed immediately without maintaining an exact-version exception list. Compatible-major dependency declarations, lockfile review, and normal source review still prevent an unreviewed future major from being selected automatically.
- After initialization, explicit moldea requests and direct canonical work activate. Implicit activation for ordinary work is decided by a cheap task-path/manifest relationship gate. Its complete bounded input is the union of repository-logical paths explicitly named or targeted by the current developer request and the complete changed-path set already supplied by a host workflow when applicable. An unchanged explicitly named path is valid task-path evidence. moldea never runs Git solely to discover this input, and no separate relationship index or generated relevance file will be introduced.
- Host coding workflows retain ownership of Git, planning, review, commit, and publication behavior. moldea may consume already-established paths and state evidence, but it does not prescribe or repeat host Git workflows.
- Default inspection is content-free. Canonical bodies require an explicit, path-scoped, range-bounded content operation.
- A byte limit governs one response page, not repository size. Large repositories progress through stable continuation and resumable checkpoints.
- Completeness is explicit. A limit cannot silently turn a complete operation into a partial success.
- Resource dimensions remain separate: response bytes, model-visible bytes, file bytes read, entries visited, API requests, concurrency, retries, elapsed duration, disk, memory, and semantic-model tokens are not collapsed into one misleading quota.
- Standard and extended PR Assurance runs have cumulative budgets plus fixed peak limits. Extended runs may spend more total work and resume more often, but may not raise per-process memory, disk, response, or concurrency ceilings. An absolute ceiling always terminates with a clear non-success outcome.
- Numeric defaults will be calibrated from adversarial fixtures and recorded evidence. The existing CLI transport baseline of 65,536 bytes by default, 4,096 minimum, and 1,048,576 hard maximum is a starting hypothesis, not an unchangeable product promise.
- PR Assurance workers use shared deterministic repository/Core contracts directly. They never invoke the coding-agent skill or shell out to the CLI.
- The first platform delivery is a reusable private analysis kernel composed into the PR Assurance worker. It does not pretend to launch the still-missing customer workflow, database model, billing path, webhook ingestion, GitHub Check publication, discussions, or public API.
- No database migration is expected for this foundation. Discovery of a required persisted-state change triggers the authorized re-planning and challenge loop before implementation.
- Each feature branch is the implementation and milestone-review boundary. After its complete cumulative change is ready against freshly resolved `origin/main`, the agent may merge it into `main`, push `main`, monitor the established publication workflow, and use the resulting trusted artifacts to unblock downstream repositories. No merge bypasses a failed review, required status check, branch protection, signing, secret scan, or non-fast-forward rejection.
- The public and private GitHub fixtures remain behaviorally identical except for repository visibility and authentication. Remote branches and PRs prove real provider integration at bounded medium scale; deterministic synthetic providers own GitHub limit, truncation, retry, and pathological-scale cases so production-readiness tests do not create huge permanent repositories or consume unbounded clone, disk, inode, and CI resources.
- Evidence reuse is a maintainer-directed local release operation, not an administrative web workflow. A command such as `npm run release:evidence:pin -- --from v5.0.0 --reason "..."` records a compact pointer to the original immutable passing evidence. The pin intentionally bypasses current-evidence freshness and behavior-identity equality after validating source existence, integrity, passing status, and the clean stable evidence-manifest contract introduced by skill 5.0.0. Git signing plus repository publication credentials establish authority; there is no separate role system, approval step, maximum age, or same-major restriction among releases that carry that manifest.

## Current repository evidence

### `../packages`

- The package generation and forward compatibility patches are merged into `origin/main` at `47e23af6de0c51119e10097e5ea107ab1bdf20d6`; the local `new_skill` feature tip is `67a063b90a4b9a8493956d1576e55f286925754c`.
- The npm registry now resolves the reviewed forward patch generation: Repository remains 2.0.0; repository-fs is 2.0.1; Core is 3.0.1; Anthropic/OpenAI adapters are 3.0.1; the other official adapters are 2.0.1; and CLI is 7.0.1.
- The registry also resolves Anthropic and OpenAI adapters at 3.0.0 and every other official adapter at 2.0.0. Package manifests and registry versions agree.
- Repository 2.0 now owns immutable snapshots, exact entries, paged listings, ranged file reads, pairwise comparison, cancellation, continuation, completeness, and typed failures. Repository FS, Core 3, CLI 7/schema 4, and every adapter use the clean contract without the removed whole-file/schema-3 compatibility surface.
- The complete dependency-connected packages workspace and packed consumers passed the milestone review and were published through the main-branch workflow. Remaining milestones consume these trusted releases and must not reimplement Milestone 1 unless later evidence exposes a material defect.

- The lazy GitHub reader, bounded PR Assurance kernel, public availability boundaries, resource calibration, and release-evidence pin specifications are merged into `origin/main` at `23cbfed6`; compatibility synchronization is published on `new_skill` and `origin/new_skill` at `d82104791daa711e13b7765e7210a15d857a106b`.
- The GitHub repository package now exposes bounded snapshot traversal, ranged reads, pairwise comparison, explicit continuation/completeness, and public/private parity tests against the expanded fixtures. Synthetic providers own pathological GitHub limits so live fixtures remain bounded.
- `packages/api/pr-assurance` owns the reusable bounded analysis kernel, and `apps/api-worker-pr-assurance` composes it without invoking the skill or CLI. The kernel remains a dormant foundation and does not claim the absent persistence, billing, webhook, GitHub Check, public API, or customer rollout.
- `moldea/context/cloud-and-assurance.md` defines exact base/head/candidate semantics, stale-run behavior, native-check expectations, billing concepts, and non-success states. Those are durable inputs for the kernel, but not evidence that the workflow exists.
- The root README and database analysis explicitly identify PR Assurance as not implemented or feature-gated, and there are no Assurance database tables.
- The public website already contains PR Assurance pages, previews, pricing references, and generated `llms.txt` coverage that must not contradict the actual foundation or overstate launch status.
- The platform canonical tree contains package specifications for repository, filesystem reader, Core, CLI, GitHub reader, every official adapter, runtime compatibility, skill behavior, project architecture, and PR Assurance. These are in-scope state-bearing contracts.

### Public and private GitHub fixture repositories

- The public and private remotes expose byte-identical tips for the original branches plus `uninitialized_fixture`, `initialized_unbound_fixture`, `assurance_base_fixture`, `assurance_relevant_change_fixture`, `assurance_irrelevant_change_fixture`, `assurance_binding_deleted_fixture`, `assurance_large_repository_fixture`, and `fixture_manifest`.
- The repository-owned manifest at `67df7bb1329d8f4927e79f3d567d5274cc977897` pins the scenario identities and expectations without self-referential commit data. Public/private parity and bounded on-demand read behavior are covered by platform integration and e2e tests; provider-limit extremes remain synthetic.

### Current `skill` repository

- Milestones 1 through 9 are implemented, reviewed, and published. The current feature tip is signed commit `fafc4ff627bb41786f9375b849067fcc817dfafe`; the forward package/specification/site/knowledge-base compatibility synchronization is published, and the skill accepts compatible CLI 7 releases while recording exact installed evidence.
- The finalized pre-evaluation deterministic boundary passed 145 unit and 59 integration tests; qualification tooling passed 125 unit and 107 integration tests plus typecheck, lint, and formatting. The full website boundary passed 22 unit and 34 artifact integration tests plus documentation, audit, typecheck, lint, formatting, and build checks.
- Fresh semantic attempt `20260905T160351371Z-semantic-16cb2147` passed all 18 cases, including two cases recovered by the confirmation protocol. Its immutable artifact remains useful diagnostic evidence, but the pending skill wording correction changes the portable skill digest and invalidates it for final release identity.
- Fresh Custom qualification attempt `20260905T160415122Z-custom-custom-43ffbb42` passed 11 universal cases, recovered one case, and then failed `activate-declared-relationship` on the initial and first confirmation runs. The actor made zero moldea CLI calls and missed `/moldea/project.md` even though `src/project-state.ts` was explicitly named by the task and declared through `affectedBy`. The failed immutable attempt must remain diagnostic evidence and must not be promoted.
- No adapter-specific qualification profile has run. After the task-path contract is corrected and deterministic tests pass, rerun the full semantic suite and Custom qualification against the new skill digest before running the thirteen adapter-specific profiles.

### `../knowledge-base`

- The knowledge base is the canonical public support corpus and validates content through `npm test` and `npm run validate`.
- Milestone 9 compatibility and repository-bound-installation guidance is published on `main` at signed commit `5f7d67365d474af97366b436e2e5de8554f99003`. The final audit must still prove that every affected article, FAQ, troubleshooting entry, manifest record, and cross-link describes only the supported contracts and distinguishes the scalable foundation from customer features that remain unavailable.

## Completed work and remaining baseline

- Milestones 1 through 9 are complete, reviewed, and published at their recorded repository boundaries. The forward npm patch generation is registry-verified, platform compatibility synchronization is published on `new_skill` at `d82104791daa711e13b7765e7210a15d857a106b`, knowledge-base synchronization is published on `main` at `5f7d67365d474af97366b436e2e5de8554f99003`, and skill synchronization is published on `new_skill` at `fafc4ff627bb41786f9375b849067fcc817dfafe`.
- The current re-planning cycle begins inside Milestone 10 because fresh qualification discovered a material skill defect. Correct the task-path contract, publish that cohesive correction after deterministic review, then regenerate every model-derived result invalidated by the new portable skill digest.
- Untracked semantic and qualification result directories in the skill worktree contain immutable successful and failed attempt evidence from this evaluation cycle. Preserve them during correction and use only a fresh compatible passing attempt for release identity.

## Desired architecture and public contracts

### 1. Repository initialization and skill activation

`Initialize moldea` establishes the repository-local adoption state through the current canonical initialization mechanism. The skill checks that state with the cheapest direct evidence available before loading reference documents or running repository-dependent commands.

The activation state machine is:

1. A purely informational moldea question may be answered without repository inspection or CLI use.
2. An explicit `Initialize moldea` request runs initialization.
3. Before initialization, every other task abstains silently. It loads no moldea reference, runs no moldea CLI or package command, changes no moldea state, and makes no moldea progress or final-report mention.
4. After initialization, an explicit moldea request or direct `/moldea/**` operation activates for that bounded scope.
5. An initialized ordinary task evaluates the complete host-known task-path set against the parsed manifest with the cheap scope matcher. That set contains every repository-logical path explicitly named or targeted by the current developer request plus the complete changed-path set a host workflow already established when applicable. An unchanged explicitly named target is included. A miss ends moldea handling immediately and silently, and moldea never invokes Git merely to discover the set.
6. A match loads only the owning reference and performs only the validation required by the matched relationship.

README handling is hunk-aware: changing the root README is irrelevant unless a changed hunk intersects the managed moldea block or the manifest explicitly declares another relationship. A host `review`, `plan`, or publication action is never itself an activation signal.

### 2. Repository reader 2.0 contract

Replace `@moldea.ai/repository` 1.x with one source-neutral 2.0 contract. Remove the whole-file and recursive-stream public surface instead of preserving overloads.

The reader exposes:

- immutable snapshot identity and source metadata;
- exact entry lookup by validated repository-logical path;
- `readFilePage` using byte offset and maximum bytes, returning the bytes read, total byte length when known, completion state, and next offset;
- `listEntriesPage` using prefix, exclusive `afterPath`, and maximum records, returning stable bytewise path order, completion state, and next key;
- abort-signal propagation and typed operational/resource failures;
- explicit behavior when a snapshot changes or a backend cannot prove completeness.

Add an `IRepositoryComparison` boundary for two fixed snapshots. It exposes deterministic pages of added, deleted, modified, and type-changed paths. Rename detection is deliberately represented as delete plus add because content-identity rename heuristics are expensive and unnecessary for correctness. Equal subtrees may be pruned through source-specific identities, but every reported complete comparison must cover both snapshots.

All cursor or continuation fields are closed, versioned, source-bound, filter-bound, and tamper-detectable. Offset masquerading as a cursor is not allowed for growth-capable collections. Public results use strict validation and never expose an incomplete page as a completed traversal.

### 3. Filesystem reader 2.0

Implement the new reader without building a whole-repository inventory:

- enumerate one stable page at a time in repository-logical byte order;
- range-read regular files without first allocating the complete body;
- validate containment and do not follow links across the repository boundary;
- detect relevant snapshot drift and return a changed-snapshot failure;
- cap open handles, directory work queues, cached entries, cached bytes, and concurrent reads independently;
- use a byte-aware LRU and safely bypass caching for an item larger than cache capacity;
- compare two fixed filesystem snapshots through the same public comparison contract;
- preserve cross-platform path rules and avoid shell-dependent traversal.

Large fixtures must prove bounded peak behavior and complete continuation. Limits produce typed continuation-required or resource-limit outcomes, never partial success.

### 4. Core 3.0 contract

Release Core 3.0 because the root inspection and reader boundaries are intentionally incompatible. Keep `matchManifestScope` as the single deterministic relationship authority, but expose it through clean 3.0 contracts.

Replace root full-project inspection with:

- `validateProject`, an explicit complete, content-free structural result;
- `inspectProjectPage`, a closed selection/view request that returns bounded metadata records and diagnostics for only the requested page;
- `readCanonicalContentPage`, a bounded canonical text reader built over byte ranges with Unicode-safe decoding;
- the manifest scope matcher for bounded host-known repository-logical task paths, including unchanged paths explicitly named by the developer;
- adapter-only composition operations that select one explicit agent/runtime closure, consume bounded metadata and content pages, and do not leak full project content through the general root API.

Core processing must stream or page from the reader and retain only bounded indexes needed for referential validation. When a global invariant cannot be established inside a standard cumulative budget, Core returns continuation/checkpoint state or an explicit non-success result. Diagnostics and evidence have validated field limits, deterministic ordering, stable identifiers, digests, and counts. Default inspection never contains canonical bodies at any nesting depth.

### 5. CLI 7.0 and JSON schema 4

Release CLI 7.0 with schema 4 only. Delete schema-3 serializers, fixtures, flags, aliases, and compatibility documentation.

Retain the conceptual commands `validate`, `inspect`, `scope`, `content`, and `composition`, but drive them through the bounded Core operations:

- `scope` reads only the initialization/manifest material required for relationship matching and accepts bounded task-path input without shell interpolation; callers pass explicitly named/targeted paths and any complete host-provided changed-path set, never paths discovered through moldea-owned Git work;
- `inspect` requests metadata pages directly and never constructs a full project projection;
- `validate` proves complete structural validation or reports continuation/non-success explicitly;
- `content` range-reads one explicit canonical path and emits a Unicode-safe chunk without allocating the full string;
- `composition` remains content-free and bounded.

Every JSON response fits its configured UTF-8 byte budget, including envelope and error responses. The CLI chooses records incrementally and serializes once for final verification; it never builds a full ordered array merely to slice it. Cursors bind schema, command, selection, snapshot, and last key. Invalid, mismatched, tampered, expired, or changed-snapshot continuations fail clearly.

The initial transport limits remain 64 KiB default, 4 KiB minimum, and 1 MiB hard maximum until calibration. Calibration may raise the default only with evidence that useful large diagnostics cannot fit, and may lower it only with evidence that ordinary output remains actionable. The hard maximum is a safety boundary, not a repository-size limit.

### 6. Official adapter major-version closure

Every official adapter must compile and qualify against Repository 2.0 and Core 3.0 without a compatibility layer. Publish coordinated majors:

| Package family                      | Superseded line | Released line |
| ----------------------------------- | --------------: | ------------: |
| `@moldea.ai/repository`             |           1.1.1 |         2.0.0 |
| `@moldea.ai/repository-fs`          |           1.0.6 |         2.0.0 |
| `@moldea.ai/core`                   |           2.1.0 |         3.0.0 |
| `@moldea.ai/cli`                    |           6.0.0 |         7.0.0 |
| Anthropic adapter                   |           2.0.6 |         3.0.0 |
| OpenAI adapter                      |           2.0.9 |         3.0.0 |
| Each currently 1.x official adapter |             1.x |         2.0.0 |

Keep the clean major boundaries without exact downstream pins. First-party workspace dependencies use compatible-major ranges so Repository 2, Core 3, repository-fs 2, adapter 2/3, and CLI 7 patches and minors do not force unrelated downstream releases; a future breaking major still requires an explicit contract decision. Every upstream provider-library target uses one inclusive lower bound such as `eve >=0.39.1`, with no upper bound. The matrix and adapter continue to record the exact reference package versions exercised by tests and qualification, but later provider releases remain eligible under the same static-analysis contract until concrete evidence establishes an incompatibility. Repository Format 1, CLI schema 4, and other structural contract versions remain exact.

Publish one forward patch generation to establish the policy cleanly: `@moldea.ai/repository-fs` 2.0.1, `@moldea.ai/core` 3.0.1, Anthropic/OpenAI adapters 3.0.1, every 2.x official adapter 2.0.1, and CLI 7.0.1. Repository remains 2.0.0 because its project has no release-relevant change. CLI 7 uses compatible-major dependencies on its first-party package closure, while its composition response and the consuming repository lockfile expose the exact versions actually resolved. Skill 5.0.0 accepts compatible CLI 7 releases and verifies schema 4 instead of pinning one CLI patch. Development-time parser dependencies such as TypeScript and semver stay exact because changing them can alter deterministic analysis; supported Node, package-manager, repository-format, and schema boundaries remain governed by their own tested contracts rather than being widened merely to suppress releases.

Adapter composition requests one explicit agent/runtime closure through adapter-only Core operations, consumes its metadata and canonical assets incrementally, and retains only the bounded material required by the target runtime. It must not request or reconstruct a complete project index. Each adapter enforces both repository-resource limits and the target model/runtime context limit; an oversized closure fails with a specific non-success result rather than truncating instructions or silently omitting referenced assets. Update adapter public API fixtures, package manifests, compatibility matrices, examples, packed-artifact tests, platform specifications, skill compatibility data, websites, and knowledge-base content together. Every changed public project receives the required stable patch version and the complete package verification boundary before publication.

### 7. Lazy GitHub reader and comparison

Replace the platform GitHub reader's full-inventory architecture with the 2.0 reader and comparison contracts:

- define a snapshot by repository identity, immutable commit SHA, and root tree identity rather than a materialized inventory;
- resolve exact paths lazily through tree segments with bounded request concurrency and cancellation;
- page prefix listings deterministically without requiring GitHub's recursive-tree response to be complete;
- compare base and candidate by walking tree pairs, pruning identical tree SHAs, and descending only into changed subtrees;
- request blobs only after path relevance is established and read them in bounded chunks through the adapter contract;
- treat provider truncation, pagination caps, secondary rate limits, unavailable objects, and changed authorization as explicit operational states;
- use independent request-count, response-byte, retry, concurrency, memory-cache, and disk-spool controls;
- safely bypass an undersized cache rather than failing the operation;
- never rely on GitHub compare or pull-request-files endpoints as the source of completeness.

The GitHub adapter may use provider-specific cursors internally, but its public continuation remains source-neutral and bound to the immutable snapshots. Pairwise non-recursive descent may bypass the aggregate limit of a recursive tree response. It cannot manufacture pagination when GitHub marks an individual tree response truncated and exposes no continuation for that tree. In that case the reader returns an explicit provider-incomplete failure, and PR Assurance maps it to `analysisUnavailableResourceLimit`; it never reports a complete comparison or approval. Integration tests use deterministic provider fixtures for truncated recursive trees, an unpageable truncated individual tree, wide and deep repositories, identical subtree pruning, deleted directories, type changes, large blobs, rate limiting, retryable failures, authorization loss, and continuation/resume.

Expand the public and private GitHub fixture repositories in lockstep. Preserve their existing immutable branches and add this explicit scenario matrix with identical commits in both repositories:

| Branch                                | State and purpose                                                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uninitialized_fixture`               | Realistic TypeScript application without `/moldea/**`; proves pre-adoption source exploration and silent moldea abstention.                                                                                                                                         |
| `initialized_unbound_fixture`         | Minimal valid initialized project with no agents or implementation relationships; proves zero-agent/zero-relationship behavior without broad inspection.                                                                                                            |
| `assurance_base_fixture`              | Initialized project with realistic access/refund behavior, canonical policy, one bound implementation surface, one `affectedBy` surface, and unrelated decoy code.                                                                                                  |
| `assurance_relevant_change_fixture`   | Candidate from the assurance base with a behaviorally relevant defect or contract drift that must produce deterministic relevance and a semantic finding.                                                                                                           |
| `assurance_irrelevant_change_fixture` | Candidate from the same base that changes only unowned implementation and must finish without blob materialization or semantic work.                                                                                                                                |
| `assurance_binding_deleted_fixture`   | Candidate that removes or relocates a base-side binding so base/candidate scope union remains relevant.                                                                                                                                                             |
| `assurance_large_repository_fixture`  | Bounded remote integration corpus with 1,024 generated source files, nested and wide trees, at least one multi-page Unicode source file, mostly irrelevant paths, and a small relevant change. Keep total committed blob content at or below 16 MiB per repository. |
| `fixture_manifest`                    | Coordination branch created after every scenario commit; records scenario identities and expectations without attempting to record its own commit identity.                                                                                                         |

Add the repository-owned machine-readable fixture manifest on `fixture_manifest`. It records every scenario branch, base/head relationship, expected commit/tree identity, initialization/binding state, changed paths, relevance result, expected content reads, and PR Assurance outcome, while omitting its own branch/commit identity to avoid self-reference. Generation is deterministic and rejects drift. Existing branch consumers remain valid, but new tests consume the pinned manifest commit rather than scattering new scenario SHAs through test files.

Create matching pull requests for the relevant, irrelevant, deleted-binding, and large-repository base/head pairs in both repositories, then close them without merging and never mutate their branches. This preserves stable provider objects without leaving fixture PRs open or repeatedly triggering repository automation. Tests use the PR number only to verify GitHub repository/ref/permission mapping and use the pinned base/head commit SHAs as the correctness authority. If authenticated PR creation is unavailable, branch and commit fixture publication proceeds, but live PR integration remains a precise external prerequisite rather than being simulated as complete.

Extreme provider boundaries remain synthetic: recursive responses beyond 100,000 entries or 7 MiB, PR file lists beyond 3,000 entries, compare-file lists beyond 300 entries, unpageable tree truncation, oversized blobs, rate limits, retries, and request amplification are generated inside platform tests. This proves the limits without turning either permanent remote fixture into a disk or CI hazard.

### 8. PR Assurance analysis kernel

Create a private `@moldea/api-pr-assurance` package under the platform API packages and compose it into `apps/api-worker-pr-assurance`. It owns deterministic analysis orchestration, not transport or product persistence.

The kernel accepts trusted repository identity plus immutable base and candidate revisions. Its ordered pipeline is:

1. open base and candidate repository snapshots;
2. create a complete lazy comparison;
3. parse the base manifest for deleted/old paths and the candidate manifest for added/current paths;
4. union both scope results so relationship deletion, relocation, and ownership changes cannot hide relevance;
5. return an `irrelevant` outcome without blob reads when no path is relevant;
6. perform bounded structural validation and assemble content-free evidence records;
7. fetch only relevant canonical/source blob ranges and produce bounded deterministic diff partitions;
8. redact or reject sensitive material before any semantic boundary;
9. emit semantic work partitions through an injectable evaluator contract;
10. checkpoint after stable units and resume idempotently from the immutable revisions.

The kernel exposes one closed outcome union:

- `irrelevant`;
- `readyForSemanticAnalysis` when deterministic preparation is complete but no evaluator is configured;
- `completed` when an injected evaluator returns a complete supported result;
- `structuralFailure`;
- `continuationRequired` with a resumable checkpoint;
- `analysisUnavailableResourceLimit` after an absolute resource ceiling;
- `operationalFailure` for provider, authorization, or infrastructure failure.

Only `completed` may represent successful analysis. Partial, truncated, budget-exhausted, stale, or provider-failed work never becomes a pass. Checkpoints bind repository, base SHA, candidate SHA, contract version, selection, completed partition identities, and resource ledger. Resuming the same unit is idempotent and does not double-count semantic or provider work.

The semantic evaluator boundary records requested and actual input/output tokens, model identity, redaction status, partition identity, and failure classification. This milestone may use a deterministic fake evaluator for integration tests. It does not add a production model provider, customer billing, durable database state, public route, webhook, queue contract, GitHub Check, discussion, notification, or UI workflow. Those remain separate planned product work because the current repository lacks the required authorities and persistence.

### 9. Resource profiles, calibration, and reporting

Define source-controlled standard, extended, and absolute resource profiles shared by the kernel and its tests. Use separate counters for:

- entries visited and comparison records emitted;
- bytes read from repository providers and bytes retained in memory;
- network requests, response bytes, retries, and concurrent operations;
- temporary disk bytes and open handles;
- CLI stdout bytes and model-visible tool-output bytes;
- semantic input, cached-input, reasoning when reported, and output tokens;
- wall duration and resumptions.

Peak safety limits apply to every profile and cannot be raised by an extended run. Cumulative standard limits should finish ordinary pull requests in one run. Extended limits permit larger total work through more resumptions. The absolute ceiling stops pathological work predictably.

Do not select customer-facing budgets from arbitrary round numbers alone. Add a reproducible calibration corpus with at least:

- a small ordinary project;
- a medium monorepo with many unrelated files;
- a wide/deep repository whose recursive aggregate exceeds one provider tree response while each descended tree remains complete, plus an unpageable single-tree fixture that must fail explicitly;
- a deep repository that exercises segmented traversal;
- large canonical and source files with multibyte Unicode;
- a change touching many irrelevant files and one relevant relationship;
- a broadly relevant manifest;
- repeated binary/large-file attacks and high-diagnostic inputs.

Record fixture shape, sample count, command/tool version, observed distributions, peak memory, peak disk, request counts, output bytes, token counts, and latency. Choose defaults with meaningful headroom above the upper ordinary distribution, validate extended behavior on adversarial but legitimate fixtures, and keep the absolute ceiling high enough to avoid confusing normal users while still protecting machines. Runtime errors name the exhausted dimension, configured limit, observed usage, completion state, and safe next action. They never report a generic “resource exceeded” message when a specific measurement is available.

Summary output has an explicit maximum byte budget meaning that each model-visible summary or CLI page must fit a known encoded-size ceiling. It does not mean the system refuses a large codebase. Complete work is divided into ordered pages or checkpoints, while each individual response remains safe to transport and consume.

### 10. Skill semantic and adapter qualification design

Add deterministic and semantic regression cases for the actual failures:

- informational question before initialization: concise answer, no repository operation;
- unrelated task before initialization: complete silent abstention;
- direct canonical-looking path before initialization: silent abstention unless the request is initialization itself;
- initialized unrelated documentation/source review: no reference load, CLI call, output, or moldea mention;
- initialized source path named by `affectedBy`: one cheap scope decision and bounded owner validation;
- initialized `/moldea/**` change: relevant bounded evaluation;
- initialized root README change outside the managed block: abstention;
- initialized managed-block hunk: bounded activation;
- explicit host review/plan/publication command: host workflow remains in control;
- zero-agent/zero-relationship project: no full inspection;
- large repository and large canonical file: continuation without context or memory blowup;
- malformed/tampered continuation and changed snapshot: clear non-success;
- resource exhaustion: dimension-specific failure, never false success;
- read-only operation: no repository or Git-object mutation.

Run universal skill behavior once in the Custom qualification. Each official adapter profile contains only adapter-specific setup, message shape, tool protocol, error behavior, and integration variance. A coverage matrix proves that every universal behavior and every adapter-specific contract has exactly one appropriate owner.

Scenario budgets are guardrails, not tiny universal constants. Abstention cases require zero moldea commands and zero moldea-visible output. Relevant small cases use tight evidence-derived ranges. Large/resumable cases assert bounded peaks, monotonic progress, and correct completion or continuation instead of requiring the same command count or duration as a trivial case. Evaluation reports distinguish infrastructure output from model-visible output and report both actual and allowed values.

Expensive semantic and adapter runs happen only after deterministic code, unit/integration/e2e suites, packed-package tests, calibration fixtures, resource assertions, and the evidence-pin release path pass. A preflight estimates profile count, model calls, and maximum token spend. Fresh release evidence is generated once for the finalized candidate unless the developer explicitly directs the release to pin a named earlier release; failed exploratory attempts are not promoted into release identity.

### 11. Local release evidence pin

Add one repository-local release command:

```bash
npm run release:evidence:pin -- --from v<version> --reason "<reason>"
```

Skill 5.0.0 introduces one stable, compact `fixtures/release-evidence.json` envelope used by every completed release. A fresh release records `mode: "fresh"`, the target version, portable-skill and dependency-closure identity digests, semantic and qualification attempt identifiers, artifact digests, protocols, targets, and passing resource status. The pin command resolves an exact stable release tag whose tagged tree contains that envelope, validates its referenced evidence artifacts and digests, and writes the current release envelope with `mode: "pinned"`, the current target version and portable identity digest, original source tag/commit/evidence digests, and the maintainer-supplied reason. The target tag binds the committed envelope to the target commit, so the file never attempts to contain its own commit hash. It contains no copied model transcript, source body, or duplicate result payload. Until fresh evidence completes or a pin is explicitly selected, the unreleased candidate has no envelope and release validation reports a clear not-ready state; no placeholder, pending mode, or fabricated evidence is committed.

Evidence selection and release verification remain separate. After all exact-current semantic and qualification evidence passes, the established recording workflow or a focused `release:evidence:record` command writes the deterministic fresh envelope. `release:evidence:pin` writes the pinned envelope, and `--clear` removes only a pinned envelope. `release:check` is read-only: it delegates to one release-evidence orchestrator before invoking mode-specific model-evidence verification. For `fresh`, it runs the existing semantic and qualification verifiers and requires exact-current identities plus an exact envelope match. For `pinned`, it validates the source tag, stable envelope, referenced source artifacts, digests, passing states, and original-source identity without invoking current-only semantic or qualification verification. It intentionally bypasses current skill/suite/CLI/target identity equality and freshness checks. The root package script must no longer run current-only verifiers unconditionally ahead of this decision. This is the supported escape hatch, not an assertion that evidence was rerun. Website and release output state `Evidence pinned from v<version>` and show the reason rather than describing it as current evidence.

The command and validator have only essential safeguards:

- reject a missing, mutable, malformed, corrupt, incomplete, failing, internally over-budget, or pre-5.0 source release that lacks the stable evidence envelope;
- accept previous-major and arbitrarily old evidence carrying the stable envelope when explicitly selected;
- resolve a pinned source automatically through its envelope to the original fresh evidence and store that source directly, preventing reference chains;
- reject hand-edited digests, mismatched tag/commit identities, an invalid target release, or a pin that points at the target itself;
- derive authority from the signed Git release and the credentials required to publish it, without a separate local administrator-role or approval system;
- allow `npm run release:evidence:pin -- --clear` to remove a prepared pin explicitly and regenerate a fresh envelope after current evidence passes; recording unrelated evaluation attempts never silently changes the selected release mode.

Add integration tests around `tooling/release-identity/evidence.mjs`, `check-release.mjs`, focused evidence-envelope record/pin modules and commands, package scripts, fixtures, website loaders, CI checkout/tag availability, and release documentation. Tests cover valid fresh recording, read-only checking, valid direct and resolved pins, old-major pins carrying the stable envelope, rejection of pre-envelope releases, missing/corrupt/failed evidence, digest and tag tampering, self-reference, absent reason, fresh-evidence default behavior, explicit bypass of changed current identities, no unconditional current-only verifier execution, explicit clearing, and clear public provenance.

### 12. Documentation and website truth

Synchronize every state-bearing surface in the same milestones as its owning behavior:

- platform specifications under `../platform/moldea/**` for repository 2.0, filesystem reader 2.0, Core 3.0, CLI 7.0/schema 4, all adapter majors, GitHub lazy traversal, runtime compatibility, activation/initialization, project architecture, and PR Assurance resource/completeness semantics;
- package READMEs, root blueprint, npm-release documentation, examples, public API fixtures, changelogs or release plans where established;
- skill `README.md`, `moldea/SKILL.md`, routed references, conformance docs, semantic/qualification docs, website source, generated website fixtures, and public compatibility/install content;
- platform website PR Assurance page, previews, pricing/availability statements, `llms.txt`, metadata, website README, and directly affected tests;
- knowledge-base installation, open-source tools, repository format, validation, runtime compatibility, GitHub integration, PR Assurance lifecycle/review/limitations/merge-enforcement, troubleshooting, security/privacy, billing boundaries, FAQs, manifest, and cross-links.

Public installation instructions must say that moldea is installed into and bound to a repository, must show repository-local commands only, and must warn that global installation is unsupported because it breaks the adoption boundary. Documentation must not claim the repository can technically block every external installer's global mode.

Public PR Assurance prose must explain that large repositories are processed lazily with bounded peaks and resumable work, that extended analysis spends more cumulative work without increasing machine-risk ceilings, and that resource exhaustion produces an unavailable/incomplete result rather than approval. Until the full customer workflow exists, website and knowledge-base copy must clearly label the kernel and scalable reader work as foundation or forthcoming capability and must not imply that a usable end-to-end service has launched.

Use `moldea` consistently in human-facing prose. Automated searches must allow exact package names, code symbols, environment variables, historical quotations that must remain exact, and other required technical casing.

## Repository implementation scope

### `../packages`

1. Preserve the completed Repository 2, filesystem reader 2, Core 3, CLI 7/schema 4, and coordinated adapter-major implementation as the behavioral baseline.
2. Correct the current release-relevant package state before model evaluation: give every changed public project a greater stable patch version; replace exact first-party workspace pins with compatible-major ranges throughout repository-fs, Core, adapters, and CLI; replace every provider-library upper-bounded target range with its existing inclusive minimum only; update runtime compatibility source/generated output, package discovery constants, manifests, lockfile, tests, packed candidates, and package docs.
3. Keep exact reference versions in qualification fixtures and evidence so support breadth never obscures what was actually exercised. Add regressions proving later provider versions and compatible first-party patch/minor releases are accepted, future first-party breaking majors are rejected, and release planning selects a coherent publishable forward patch set.
4. Publish the resulting packages through the established signed `main` workflow and verify registry propagation before updating downstream lockfiles or resuming semantic/adapter evaluation.
5. Reopen package implementation again only if later evidence exposes another concrete public-contract defect. A material contract correction requires the autonomous revise/challenge/breakdown loop plus a forward package release; no compatibility layer is added.

### `../platform`

1. Replace `packages/api/repository-github/src` eager inventory/session behavior with lazy Repository 2.0 paging and comparison. Update its service, provider session, inventory/tree traversal, caches, types, validations, public entry point, package manifest, and colocated unit/integration/e2e tests.
2. Create `packages/api/pr-assurance/` as the private kernel package with thin public exports and focused modules for contracts, resource profiles and ledger, checkpoint validation, scope union, deterministic evidence/diff partitioning, redaction boundary, orchestration, and semantic evaluator interface. Add package scripts, TypeScript/Vitest configuration only as required by established workspace patterns.
3. Compose the kernel into `apps/api-worker-pr-assurance` while preserving the worker's process/lifecycle conventions. Do not invent external message, persistence, or billing contracts; expose only an internal callable composition and deterministic integration harness until those authorities exist.
4. Update package dependency ranges and `pnpm-lock.yaml` to the trusted published Repository 2/Core 3/CLI 7/adapter compatible-major lines, with the lockfile recording exact resolved artifacts. Replace platform's exact-version `minimumReleaseAgeExclude` entries with first-party `@moldea.ai/*` package-name exclusions because pnpm does not accept semver ranges there; retain quarantine for external packages and rely on compatible-major manifests, lockfile review, and source review to reject unreviewed first-party breaking majors. Do not commit local tarball paths as final dependencies.
5. Rewrite the affected specifications under `moldea/context/`: `repository-package.md`, `repository-fs-package.md`, `core-package.md`, `cli-package.md`, all adapter package specifications, `runtime-adapter-contract.md`, `runtime-compatibility-matrix.md`, `api-repository-github-package.md`, `agent-skill.md`, `skill-design-and-quality.md`, `context-gathering.md`, `repository-format.md`, `packages.md`, `platform-architecture.md`, and `cloud-and-assurance.md`. The adapter specifications must replace claims that upper bounds are deliberate with the lower-bound support policy and exact tested-reference disclosure. Update `moldea/project.md` and other directly linked canonical authorities only where their current-state statements change.
6. Update root `README.md`, `apps/website/README.md`, PR Assurance pages/components/constants, pricing and availability statements, metadata, `llms.txt` generation/fixtures, and directly affected website tests. Preserve established branding, accessibility, responsive behavior, light/dark themes, reduced-motion paths, and React render efficiency for any executable UI change.
7. Update `docs/database-analysis.md` only to preserve the explicit absence of a persisted customer workflow. No migration is created in this scope.

### Public and private GitHub fixture repositories

1. In the public repository, preserve existing branches and build the new scenario commits from deterministic repository-owned generation inputs. Add realistic TypeScript behavior, canonical project states, generated large-tree corpus, and branch-specific README contracts, then create the dedicated `fixture_manifest` coordination commit after every scenario commit identity is final.
2. Clone or otherwise establish a clean local working copy of the private repository through the configured Git credentials. Add it as an additional remote to the canonical fixture worktree or fetch the canonical commit objects into it; do not recreate commits independently. The exact same commit objects, branch tips, trees, blobs, modes, symlinks, and fixture manifests must back both repositories.
3. Publish each exact new commit to the matching public and private branch using explicit branch refspecs. Never mutate a fixture branch after platform tests pin it; corrections use a new branch/commit and coordinated test update.
4. Create matching PRs for the assurance scenarios when authenticated host capability is available, close them without merging, and leave their branch tips immutable. Keep repository-specific names, visibility, and PR numbers in a platform-owned live-test map; the identical repository-owned manifest contains only scenario identities and expectations shared by both repositories. Store no credentials.
5. Add platform table-driven live coverage that executes the same snapshot, comparison, ranged-read, initialization, binding, and PR mapping assertions for public and private repositories. Keep live requests bounded and skip clearly when the GitHub App installation is unavailable; synthetic tests remain the correctness authority for provider limits and failure injection.

### Current `skill` repository

1. Rewrite `moldea/SKILL.md`, `moldea/agents/openai.yaml`, and the smallest affected references so initialization precedes repository-dependent activation, irrelevant pre/post-init work abstains silently, host workflows retain control, and references load only after relevance.
2. Update CLI establishment to require the repository-local compatible CLI 7/schema 4 contract. Replace skill frontmatter's exact `metadata.cliVersion` with `metadata.cliVersionRange: "^7.0.0"`; accept a repository declaration and installed stable CLI version only when both remain in that range; and verify the exact installed executable's schema-4 composition before use. Keep the skill repository's development dependency and lockfile exact at the CLI version used for release evidence, and record that exact evaluated closure separately from the portable supported range. Remove schema-3/current-v5 compatibility branches rather than accepting multiple generations.
3. Remove the artificial npm `<12.0.0` engine ceiling from the website and qualification harness while retaining the established `>=10.9.0` minimum and exact lockfile-selected npm/toolchain evidence.
4. Extend deterministic conformance fixtures and assertions for the initialization state machine, hunk-aware README behavior, relationship gates, bounded output, continuation, resource errors, and read-only state.
5. Add scenario-specific semantic resource budgets, preflight estimates, and reporting for commands, stdout, model-visible bytes, tokens, and latency. Preserve raw evidence while keeping model-visible summaries bounded.
6. Deduplicate qualification ownership: Custom runs universal behavior once; the fourteen adapter profiles retain only adapter-specific cases. Update profiles, probes, coverage validation, result schemas, runtime assertions, docs, and release identity.
7. Add `release:evidence:record` and `release:evidence:pin`, their focused release-evidence envelope/record/pin modules and schema, temporary-repository test fixtures, exports, integration tests, and release/website rendering. Rework `evidence.mjs`, `check-release.mjs`, and the root release script so evidence recording is explicit, `release:check` remains read-only, fresh exact-current evidence is the default, and an explicit valid pin selects source-evidence validation before any current-only semantic or qualification verification. Do not commit the current `fixtures/release-evidence.json` until final fresh evidence completes or the developer explicitly selects a pin.
8. Remove all active compatibility, hidden carry-forward, migration, historical-result, fixture, loader, script, and generated-data paths whose only purpose is skill 4.0.0, 4.0.1, or 4.0.2. The evidence pin is a new transparent release contract and must not reuse old carry-forward implementations.
9. Keep the clean skill release at 5.0.0 because no 5.0.0 tag/release has been published and the branch is still the unreleased replacement for 4.x. Regenerate its lockfile and use fresh evidence against published CLI 7/Core 3 packages unless the developer explicitly selects an earlier release with `release:evidence:pin`.
10. Update root/website documentation, generated references, install guidance, semantic/qualification documentation, evidence provenance, support statements, and release checks. Run expensive evaluations only after deterministic acceptance and evidence-pin tests are complete.
11. After the clean branch is published and authenticated hosting access is available, delete exact local and remote `v4.0.0`, `v4.0.1`, and `v4.0.2` tag refs and matching GitHub Releases/assets. Verify absence without force-pushing branches or claiming deletion from provider retention systems.

### `../knowledge-base`

1. Replace skill 4.0.2/global installation instructions in `content/003_open-source-tools/008_installation-and-requirements.md` and every linked quick-start/FAQ with repository-bound initialization and current versions.
2. Update the open-source overview, skill, CLI, Core, repository-reader, validation, adapter, repository-format, local-tools, compatibility, and troubleshooting articles to the new clean contracts.
3. Update the PR Assurance overview, review scope, lifecycle, triage, findings, resolution, merge enforcement, limitations, GitHub integration, repository access/security, billing boundary, and FAQ articles with lazy comparison, explicit completeness, checkpoints, resource profiles, and non-success semantics.
4. Update `content/manifest.json`, indexes, cross-links, and any generated or validation fixtures affected by changed titles/routes/content. Do not add API endpoint documentation under `/docs` or claim an endpoint that does not exist.
5. Run knowledge-base validation and searches for contradictory global-install, old-version, full-inspection, false-completeness, and launched-service wording.

## Ordered implementation strategy

1. **Correct package release flexibility before evaluation.** Preserve the completed major-generation behavior, then publish the forward patch generation that resolves the repository-fs version failure, changes first-party dependencies to compatible-major ranges, changes every provider-library target to a lower-bound-only range, updates exact tested-reference evidence, and synchronizes packages, platform specifications, skill CLI acceptance, websites, and knowledge base. Verify registry propagation before any paid evaluation resumes.
2. **Expand paired fixtures and replace the GitHub reader.** Create the public scenario commits and fixture manifest, push the exact same commit objects to matching private branches, and establish matching closed unmerged PRs when host access permits. Implement lazy snapshot traversal, ranged reads, and pairwise tree comparison in platform; prove public/private parity, on-demand content behavior, completeness, and resources with live bounded fixtures plus synthetic provider-limit cases; synchronize the GitHub package spec; then review and publish the platform state.
3. **Build the PR Assurance kernel and worker composition.** Add the private package, resource ledger/profiles, checkpointing, base/candidate scope union, bounded evidence/diff partitions, redaction and semantic interface, worker composition, and deterministic fake-evaluator integration. Update canonical and public foundation status without claiming launch. Review and publish.
4. **Rewrite skill activation and cheap gating.** Apply the initialization state machine, repository-bound establishment, post-init path/manifest gate, host-workflow precedence, schema-4 CLI usage, and silent abstention. Add deterministic conformance before semantic work. Review and publish the feature branch while retaining final `main` release integration until valid fresh or explicitly pinned evidence is selected.
5. **Synchronize public websites and knowledge base.** Update platform website, skill website/docs, generated text, and knowledge-base content so install, scalability, availability, failure, and version claims agree. Run their complete owned validation boundaries and publish each repository through its applicable feature/`main` path.
6. **Calibrate resource profiles.** Run the deterministic calibration corpus on final packages, record reproducible distributions and peaks, select realistic standard/extended/absolute defaults, and update code/spec/docs/tests if evidence changes a hypothesis. Any material contract change returns through plan revision and challenge before proceeding; any changed public package generation is revalidated and released atomically.
7. **Implement the local evidence-pin release path.** Add the stable fresh/pinned evidence-envelope contract, focused fresh-record and pin/clear commands, source-tag artifact verification, original-source resolution, read-only mode-aware release checking, website/release disclosure, CI tag availability, and adversarial deterministic tests. Keep fresh evidence as the default while allowing an explicit maintainer pin to bypass current identity/freshness matching without another authorization system. Leave the current release envelope absent and explicitly not ready until Milestone 8 selects valid evidence; review and publish the feature branch without releasing 5.0.0 yet.
8. **Run expensive semantic and adapter evaluations.** Preserve the completed forward publication and the immutable passing semantic and failed Custom attempts as diagnostic evidence. First correct the discovered task-path ambiguity so explicitly named unchanged relationship targets reach the bounded scope operation without moldea-owned Git discovery; add deterministic regression coverage; review and publish the cohesive skill correction. Then rerun semantic preflight, the complete semantic suite, universal Custom behavior once, and the thirteen adapter-specific qualifications against the new portable skill digest. Fix product defects and rerun only evidence invalidated by each correction. Do not weaken budgets or assertions solely to make a run pass. Use fresh evidence for the final release unless the developer has explicitly selected the tested pin path.
9. **Finalize clean release identity and main integration.** Remove obsolete active compatibility artifacts, select fresh or explicitly pinned 5.0.0 evidence against registry-published package majors, validate release identity, review and integrate the final skill branch into `main`, delete authorized old tags/releases, and verify public version closure.
10. **Perform final cross-repository audit.** Search all active source/docs/sites and both fixture contracts for old behavior and contradictions, run final verification, confirm exact `main` tips and workflows, and publish any remaining cohesive reviewed state. Keep registry, protected-branch, workflow, PR-creation, or release-host failures visible as incomplete until proven.

Each numbered implementation slice becomes one or more milestones only where it can reach a complete tested review checkpoint. Required tests and directly affected documentation stay with the implementation they validate. No milestone may introduce a temporary adapter, dual contract, incomplete public surface, or false success merely to make the boundary smaller.

## Verification strategy

### Package correctness and resource behavior

- Run every changed package's granular unit, integration, and e2e scripts, then the generic correctness suite at the affected workspace boundary.
- Run repository-wide typechecking, linting, formatting checks, build, public API, documentation, compatibility/release-plan, and packed-candidate checks established by `../packages`.
- Confirm production artifacts exclude all test categories.
- Test empty, first, exact-boundary, multi-page, and final pages; stable ordering with shared prefixes; invalid/tampered/mismatched continuation; snapshot drift; abort propagation; provider truncation; cache bypass; large files; multibyte boundaries; and absolute-limit failures.
- Instrument representative and pathological fixtures to assert bounded peak retained bytes, cache bytes, disk bytes, open handles, request concurrency, and model-visible output. Avoid brittle wall-clock assertions; record latency distributions for calibration.
- Recursively inspect every non-content CLI result and fail if canonical body fields or known fixture text appear.
- Before and after every read-only command, compare worktree state, index checksum, refs, config, submodule state, and Git object path/metadata. Do not use Git plumbing that writes objects to construct the proof.

### Platform and PR Assurance

- Run the GitHub repository package's unit, integration, e2e, type, lint, format, build, and public API checks, followed by the broader affected platform workspace suite.
- Validate the pinned `fixture_manifest` commit and require identical scenario/manifest commit objects, trees, and expected outcomes in the public and private repositories. Validate the separate platform-owned repository/PR map, then run bounded live tests for both visibility modes, pinned base/head SHAs, PR mapping when available, and on-demand blob reads; no live test may depend on mutable branch tips after its fixture is published.
- Exercise complete comparisons beyond recursive aggregate convenience limits when non-recursive descended trees remain complete, and prove that an unpageable truncated individual tree produces provider-incomplete/non-success rather than lost changes or false completion.
- Test base-only, candidate-only, moved, deleted, newly declared, broadly matched, and irrelevant relationships through the base/candidate manifest union.
- Test every kernel outcome, checkpoint tampering, stale revisions, repeated resume, duplicate partitions, partial provider failure, redaction rejection, semantic evaluator failure, and resource exhaustion.
- Verify that only `completed` can yield success and that no incomplete state maps to an approving worker result.
- Run website unit/e2e/build checks for changed claims and UI. For UI changes, inspect 320px through desktop, keyboard/focus/accessibility, light/dark themes, reduced motion, and render behavior.
- Run canonical link, format, package-version, contract-reference, lowercase-brand, and contradiction checks under `../platform/moldea/**` and the root blueprint.

### Skill, semantic, and qualification

- Run `npm test`, docs, website, path, release-identity, and candidate-package checks.
- Run the skill-creator validator against `moldea/` and independent forward tests for initialization, abstention, relevance, large repository, host workflow, continuation, and resource failure.
- Run evidence-envelope/record/pin unit and integration tests with temporary Git repositories. Prove deterministic fresh recording, read-only checking, fresh default behavior, mode selection before current-only verification, explicit identity/freshness bypass, source evidence integrity, original-source flattening, previous-major acceptance for releases carrying the stable envelope, pre-envelope rejection, explicit clearing, and public provenance without any model call.
- Run semantic preflight before paid/model-backed evaluation and archive only final valid evidence in the current release identity.
- Assert zero moldea work for abstention cases and evidence-derived ranges for relevant cases. Report command count, CLI stdout, model-visible bytes, input/output tokens, and duration separately.
- Run universal qualification behavior once and all adapter-specific profiles once. Validate the ownership matrix rejects missing and duplicated cases.

### Knowledge base and cross-repository consistency

- Run `npm test` and `npm run validate` in `../knowledge-base` plus its established link/manifest checks.
- Search active trees, excluding protected instructions and hard-excluded archive/backup directories, for unsupported global installation, skill 4.x, Repository 1.x, Core 2.x, CLI 6/schema 3, body-bearing inspect, eager-complete GitHub inventory, generic resource errors, and claims that the unfinished customer workflow is live.
- Verify all package manifests, lockfiles, runtime matrices, website metadata, knowledge-base copy, canonical specifications, and generated references agree on current versions and availability.

## Security, privacy, and operational controls

- Validate all repository-logical paths before provider or filesystem access; reject traversal, drive-relative, UNC, device namespace, NUL, malformed UTF-8, and containment escapes.
- Treat provider responses, continuation tokens, checkpoint payloads, manifests, file bodies, and semantic output as untrusted boundary data with closed schemas and bounded fields.
- Never interpolate repository or provider input into shell commands. The new reader and kernel use runtime APIs and argument arrays.
- Redact secrets and sensitive values before semantic evaluation and before persistent diagnostic evidence. Record safe identifiers and hashes rather than full source bodies.
- Avoid logging canonical contents, authorization headers, provider payloads, credentials, or model prompts containing source.
- Use timeouts/cancellation and retry only idempotent provider reads with bounded attempts. Respect rate-limit reset information without holding unbounded process state.
- Keep temporary storage under an explicit task-owned directory with validated names and byte accounting. Clean it on normal completion, cancellation, and handled failure; checkpoint data never contains unnecessary source bodies.
- Checkpoint and resume operations are idempotent and bound to immutable revisions. A stale or mismatched checkpoint fails without reusing conclusions.
- Resource errors preserve diagnostic specificity without exposing private paths or content.

## Compatibility, release, deployment, and rollback

- Repository 2.0, filesystem reader 2.0, Core 3.0, CLI 7.0/schema 4, and the adapter major releases are intentional breaks. No old contract remains supported in active code.
- Skill 5.0.0 remains the first clean post-4.x skill release because it has not been tagged or released. Its runtime closure must target only the new package majors. Its model-derived evidence is exact-current by default or an explicit validated pin to immutable passing evidence when the developer invokes the escape hatch.
- Skill portability and release reproducibility are separate contracts: `metadata.cliVersionRange` and repository installation guidance allow compatible CLI 7 patch/minor releases, while release identity and evidence record the exact CLI and transitive package closure resolved by the release lockfile. A future CLI 8 or schema change still requires a deliberate skill release.
- Existing npm versions cannot be erased or reused. After the new majors are trusted and available, mark superseded package releases deprecated through the release-owner workflow when authenticated registry policy permits, with a message directing users to the new major. Do not make source compatibility depend on deprecation succeeding.
- Cross-repository development uses packed artifacts and recorded digests. Final committed lockfiles resolve trusted registry artifacts, never local paths or hand-authored integrity values.
- Feature branches and `main` are pushed with explicit one-branch refspecs. The agent is authorized to merge reviewed work into `main` and trigger established main-branch publication/deployment workflows. It may not bypass branch protection, required checks, signing, secret controls, or release policy, and it may not infer that a successful Git push proves registry or deployment success.
- Before every integration, refresh only the relevant `origin/main`, review the complete cumulative feature-branch change against that exact target, and require a ready verdict and conflict-free prospective result. Update a clean local `main` to the resolved remote tip, create a signed and signed-off non-fast-forward merge commit when repository history requires an explicit merge record, verify its parents/tree/signature/worktree, and push only that `main` ref. A repository that requires hosted pull-request merging is integrated through the authenticated hosted path when available; unavailable credentials or unsatisfied required checks are genuine external blockers.
- Before public release, rollback is a normal revert of the cohesive feature-branch commit. After public package release, correction is a forward release; do not overwrite or reuse a published version.
- The PR Assurance kernel is dormant foundation until a later authorized workflow supplies persistence, queues/webhooks, billing, checks, APIs, and product rollout. Its inclusion must not change customer-visible runtime behavior by accident.
- Deleting the three authorized skill tags/releases affects visible release metadata only. Record exact refs before deletion and verify afterward. Do not force-rewrite shared branches or claim physical erasure from provider caches.

## Risks and controls

- **False completeness:** every listing, comparison, validation, and analysis result carries explicit completion state; tests ensure limits cannot map to success.
- **Hidden full materialization:** instrumentation and large fixtures measure retained bytes and object counts inside readers, Core, CLI, GitHub traversal, and the kernel rather than judging safety from stdout alone.
- **Too-low budgets:** calibration uses ordinary upper-distribution evidence and headroom; the extended profile offers cumulative capacity and resumability without increasing dangerous peaks.
- **Too-high budgets:** fixed peak ceilings protect memory, disk, output, handles, and concurrency; absolute cumulative ceilings terminate pathological work with a dimension-specific result.
- **Provider API caps:** pairwise tree walking and provider pagination are the completeness source; convenience endpoints may optimize hints but never establish correctness.
- **Fixture cost and drift:** remote fixtures stay under the stated file/blob envelope, derive from one deterministic manifest, and are mirrored tree-for-tree across visibility modes. Provider-limit scale and failure injection remain synthetic so production tests do not consume unbounded disk, API, or CI resources.
- **Snapshot inconsistency:** immutable revision/tree identities bind every cursor and checkpoint. Drift or unavailable objects invalidate continuation explicitly.
- **Scope false negatives:** base and candidate manifests are both evaluated, direct canonical work remains explicit, and adversarial deletion/relocation cases cover ownership changes.
- **Task-path ambiguity:** the gate input contract explicitly unions developer-named or targeted repository paths with any complete host-provided changed-path set. Tests cover an unchanged named source related through `affectedBy`, require the canonical owner, and require bounded CLI activation without allowing moldea to run Git for discovery.
- **Scope false positives:** initialization is necessary but not sufficient; unrelated paths, README hunks, host commands, and generic knowledge remain silent.
- **Adapter regression cost:** shared deterministic contract suites catch universal issues before paid qualifications, and qualification ownership removes duplicate universal model runs.
- **Over-broad compatibility:** provider-library `>=minimum` ranges intentionally trade proactive upper-bound rejection for lower maintenance. Exact reference versions remain visible in tests and qualification evidence, and a demonstrated upstream incompatibility is corrected by raising the minimum or introducing a new target contract. First-party ranges remain major-bounded so an unreviewed breaking moldea generation is never accepted automatically.
- **Documentation overclaim:** website and knowledge-base checks compare stated availability with the feature-gated platform state.
- **Concurrent agents:** repository status and exact affected paths are re-established at each review/publication boundary. Unrelated changes are preserved and excluded, with publication stopped if a cohesive commit cannot be formed.
- **Package-graph atomicity:** the initial major generation remains one dependency-connected source generation. The forward patch policy uses compatible-major dependencies so independently compatible fixes do not cascade, while every actually changed public project still declares, validates, and publishes a greater stable version.
- **Cross-repository ordering:** drafted specifications and packed artifacts support development, but platform specification publication and all downstream lockfiles/release evidence wait for the corresponding implementation or trusted registry publication.
- **Evidence-pin misuse:** the pin is always explicit, release-scoped, reasoned, and visibly attributed to the original immutable passing source. It bypasses freshness/identity matching but cannot bypass source existence, stable-envelope integrity, passing status, or the signing and publication credentials required for the target release.

## Acceptance criteria

1. Before initialization, an informational question is concise and every repository-dependent task except initialization abstains with zero moldea reference loads, commands, output, mutations, and reporting mentions.
2. After initialization, unrelated tasks and README changes outside the managed block abstain; explicit/direct canonical work and exact declared relationship matches activate deterministically and load only bounded owners. The relationship gate evaluates unchanged repository paths explicitly named or targeted by the developer as well as a complete changed-path set already supplied by the host, and it performs no moldea-owned Git discovery.
3. Host plan, review, Git, commit, and publication workflows remain authoritative and are not repeated or renamed by moldea.
4. Repository 2.0 has no whole-file or unbounded recursive public API. It provides stable snapshot, page, range, comparison, cancellation, continuation, and completeness contracts.
5. Filesystem and GitHub implementations traverse repositories larger than one page and beyond recursive aggregate provider limits when the provider exposes complete descended trees, with bounded peaks and deterministic continuation. An unpageable provider truncation returns an explicit non-success and never loses changes behind a complete claim.
6. Oversized cache entries bypass caching safely; provider truncation, rate limiting, cancellation, and authorization loss have explicit tested outcomes.
7. Core 3.0 root operations are content-free by default and do not cache or return complete canonical bodies. Full adapter composition is isolated behind the explicit adapter boundary.
8. CLI 7.0/schema 4 is the only active CLI contract. It pages during computation, keeps every response inside the encoded byte ceiling, and range-reads explicit content without allocating the complete text.
9. Every non-content CLI result is recursively body-free; every cursor/checkpoint is versioned, bound, validated, and rejects drift or tampering.
10. Resource limits identify the dimension, limit, observed use, completion state, and next action. No generic or truncated success is possible.
11. Standard, extended, and absolute profiles have calibrated cumulative budgets and invariant peak limits. Large-codebase acceptance depends on bounded peaks and resumability, not a low fixed repository-size cap.
12. All official adapters use the new major contracts, compatible-major first-party dependency ranges, and lower-bound-only upstream provider-library targets; compose only one explicit agent/runtime closure within repository and target-context limits; reject oversized closures without truncation; expose the exact tested reference versions; pass package regression checks; and retain adapter-specific qualification protection.
13. Repository 2, filesystem reader 2, Core 3, CLI 7, and all adapter majors form one root-buildable, root-testable, dependency-connected package generation; no incompatible intermediate generation or compatibility bridge is committed to `main` or published.
14. PR Assurance compares immutable base/candidate trees lazily, unions base/candidate scope, reads only relevant blobs, checkpoints idempotently, and maps only `completed` to success.
15. The PR Assurance kernel is composed into its worker without invoking the skill/CLI and without inventing database, billing, webhook, public API, check, or customer-launch behavior.
16. Read-only operations leave worktree files/modes, real index, refs, config, submodules, and Git object storage unchanged.
17. Deterministic tests cover every observed activation, output, compute, storage, provider, continuation, and false-success regression before expensive evaluations begin, including the qualification-discovered case where an unchanged explicitly named source path is owned through `affectedBy`.
18. Universal semantic/qualification behavior runs once; adapter profiles contain only real adapter variance; coverage validation rejects gaps and duplicates.
19. Semantic evidence reports commands, stdout bytes, model-visible bytes, tokens, duration, and budget independently, with zero-work assertions for abstention and realistic calibrated ranges elsewhere.
20. Public and private GitHub fixtures expose identical immutable trees for uninitialized, initialized-unbound, relevant, irrelevant, deleted-binding, and bounded large-repository scenarios. Live parity and on-demand reads pass, while provider-limit extremes remain deterministic synthetic tests.
21. `release:evidence:pin` can point a prepared release at any immutable valid passing release that carries the clean stable evidence envelope, using one command and compact provenance. It deliberately bypasses current identity/freshness matching, resolves the original evidence source, rejects corrupt, failed, or pre-envelope evidence, requires no separate administrator workflow, and never presents pinned evidence as freshly run.
22. Public installation documentation is repository-bound, contains no global installation path, and accurately states the enforcement limitation.
23. Platform specifications, package docs, skill docs/site, platform website, and knowledge base agree on versions, contracts, scalability, resource failures, evidence provenance, and customer availability.
24. Human-facing changed prose uses `moldea`; technical identifiers retain required casing.
25. Active source, scripts, fixtures, loaders, CI, documentation, and generated evidence contain no compatibility machinery or supported runtime path for the superseded contracts or skill 4.0.x. The new evidence-pin contract is transparent and shares no old carry-forward implementation.
26. The exact obsolete skill tags/releases are absent after authorized cleanup, while shared branch history and unrelated releases remain untouched.
27. Focused and broader tests, typechecks, lint, formatting, builds, public API checks, docs/site checks, packed candidates, semantic evaluation, qualifications, and release identity all pass at their applicable boundaries.
28. Every milestone receives a read-only ready verdict before a cohesive signed and signed-off commit and explicit branch push; unrelated concurrent work and protected instructions are not included.
29. Before integration, every cumulative feature branch receives a fresh `Ready to merge into main` verdict against the resolved target. The exact reviewed commits are merged through repository controls, `main` is pushed explicitly, and triggered package/site/release workflows are monitored to a proven success or a precise external blocker.
30. Every release-relevant changed public package declares a greater stable version; the packages PR release plan passes; the forward patch artifacts are registry-verified before downstream evidence runs.
31. Compatible first-party patch/minor releases do not require downstream package or skill releases solely to satisfy exact pins. Future first-party breaking majors still fail closed, while every provider-library target accepts its established minimum and later stable versions without an upper bound.
32. Website and qualification tooling accept npm `>=10.9.0` without an artificial future-major ceiling; lockfiles and CI still record the exact npm/toolchain releases used for reproducible evidence.
33. Platform's release-age quarantine remains active for external packages, while first-party `@moldea.ai/*` packages no longer require an exact exception-list edit for every trusted release. Compatible-major dependency ranges and review still reject automatic adoption of future breaking majors.

## Assumptions and genuine external prerequisites

- The current `skill/new_skill` branch is at published commit `fafc4ff627bb41786f9375b849067fcc817dfafe` and additionally contains only untracked evaluation artifacts plus this authorized planning revision until implementation resumes. Publication still resolves every actual destination and target tip again rather than relying on this snapshot.
- `../platform/new_skill` is clean and published at `d82104791daa711e13b7765e7210a15d857a106b`; `../knowledge-base/main` is clean and published at `5f7d67365d474af97366b436e2e5de8554f99003`. `../packages/new_skill` currently contains unrelated concurrent website edits that are outside this plan and must be preserved and excluded from any future package publication.
- The private fixture repository is reachable through Git credentials but has no current sibling clone. Establishing that clone and confirming a clean exact baseline is part of the fixture milestone before any edit.
- Trusted registry publication and any npm deprecation require the established release workflow and valid credentials. The agent may merge and push reviewed work to `main` to trigger that workflow, then must monitor and verify the result; a feature-branch or `main` push alone cannot be represented as registry publication.
- Deletion of hosted GitHub Releases requires authenticated host capability. If unavailable, branch/tag work may finish but the release cleanup remains an explicit external prerequisite rather than a false completion.
- Unrelated agents may edit other files. Their work is outside this plan and must neither be reverted nor bundled.

## Execution scope

Preserve the completed and published Repository/filesystem/Core/CLI/adapter generation, paired fixtures, lazy GitHub reader, PR Assurance kernel, resource calibration, evidence-pin path, compatibility synchronization, and public documentation from Milestones 1 through 9. Complete Milestone 10 by correcting the qualification-discovered task-path contract so unchanged explicitly named relationship targets activate through the bounded manifest gate without moldea-owned Git discovery, add deterministic regression protection, review and publish the correction, then rerun only the semantic and qualification evidence invalidated by the new portable skill digest and retain failed attempts as diagnostics. Complete the clean 5.0.0 release and final cross-repository audit, including removal of active legacy/compatibility paths and authorized 4.0.x release surfaces, fresh review of every cumulative branch against current `main`, signed and signed-off commits and merges, explicit publication, registry and host verification, and contradiction searches across active specifications, docs, websites, and knowledge-base content. Do not modify protected instructions, incorporate unrelated concurrent work, weaken resource budgets or assertions, create false completeness, or claim completion before registry and host prerequisites are proven.
