# Plan: natural discovery, adoption, and context compression

## Current behavior and repository evidence

- `README.md` defines the repository blueprint and identifies `moldea/` as the complete distributed Agent Skill, `docs/` as durable public documentation, `fixtures/conformance-cases.json` as the semantic scenario catalog, `tests/` and `tooling/` as the deterministic evaluation boundary, `qualification/` as the adapter-support gate, and `website/` as the documentation and evidence renderer.
- `moldea/SKILL.md` currently activates explicitly, from durable knowledge, or from relevant behavior changes. It correctly requires explicit adoption intent and forbids knowledge- or relevance-triggered initialization, but its unadopted completion contract only reports that knowledge was not persisted and that no files changed; it does not recommend optional initialization or explain the benefit.
- `moldea/references/context-gathering.md` already classifies initialization evidence as Insufficient, Partial, or Sufficient and requires one focused question for a missing material fact. The public examples currently explain the gap but do not use the agreed concise benefit-oriented response.
- `moldea/references/continuous-maintenance.md` already requires one authoritative owner, small coherent changes, and legitimate no-change outcomes. It does not explicitly require incremental context hygiene or define an intentional broader context-compression workflow.
- `moldea/references/evaluate-and-reconcile.md` already reports the concrete condition of project state through deterministic diagnostics, semantic problems, ambiguities, unresolved requirements, and evidence limitations. Those findings are more actionable than a health label, and structural validation alone is intentionally not semantic proof.
- The current semantic suite contains 54 cases. The actor sees only `input.developerDirection`, but 17 current directions name `moldea`; several evaluation, reconciliation, agent, and dedicated-repository requests therefore test explicit product naming instead of automatic skill discovery. The qualification runner already documents and tests the stronger precedent: initialization may name `moldea`, while post-initialization tasks describe natural developer outcomes.
- `tests/conformance.test-unit.mjs` owns the exact portable reference inventory, required semantic case ids, progressive-disclosure assertions, activation and initialization contracts, and semantic-case-specific invariants. `tests/semantic-evaluation-runner.mjs` owns scenario setup, published versus scenario-specific tooling, protected actor repositories, and free preflight materialization. `fixtures/semantic-evaluation-coverage.json` requires every semantic case to map to a portable-skill claim.
- Public initialization examples still use `Initialize moldea for this repository.` in `README.md`, documentation, semantic fixtures, qualification tasks, and the website getting-started simulation. Active source also contains capitalized prose uses of the project name.
- The owned README awareness block is a durable repository-local discovery signal, not a developer invocation. Its current recommended content explicitly tells coding agents to use the `moldea` Agent Skill for potentially durable knowledge and behavior-affecting changes. That explicit signal should remain even when semantic actor directions stop naming `moldea`.
- Recorded semantic and qualification history is append-only evidence. It may retain previous wording, but it cannot serve as current release evidence after the portable skill, case suite, coverage map, or qualification inputs change.
- The platform has not launched and no database tables have been created. The affected repository path contains no database implementation needed for this change.

## Desired final behavior and acceptance criteria

1. The project name is written as `moldea` in all editable active prose, prompts, descriptions, fixture content, generated-current outputs, and test expectations. Uppercase technical identifiers such as `MOLDEA_EVAL_*` remain unchanged because they are environment-variable contracts, not prose uses of the project name.
2. The sole canonical initialization request is `Initialize moldea`. Active examples and actor tasks do not retain the superseded “for this repository” wording or parallel compatibility language.
3. Successful initialization continues to insert exactly one owned README awareness block using the exact `<!-- moldea:start -->` and `<!-- moldea:end -->` markers. The block remains an explicit repository-owned instruction to use the `moldea` Agent Skill, states that canonical state lives under `/moldea/**`, and preserves the existing reconsideration-without-mandatory-edit rule. It does not store an adoption status, health assessment, or compression schedule. The “don’t invoke moldea” principle applies to developer-facing semantic actor directions, not this durable discovery signal.
4. When the skill activates and direct adoption probes establish that a repository is unadopted, it completes the authorized request without initializing or blocking, reports any durable knowledge that remained unpersisted, and gives one concise optional recommendation:

   > `moldea` is not initialized in this project. Initializing it gives coding agents durable, Git-owned context about the project’s purpose, boundaries, and agent behavior. This did not block the current request. When useful, say `Initialize moldea`.

   The recommendation is omitted when the current request itself authorizes adoption or when the skill did not activate. It must not become a yes-or-no interruption, a prerequisite for unrelated work, or repeated persuasion within the same response.
5. Explicit initialization with insufficient foundation evidence explains both the value and the evidence gap, creates no dependency or canonical state, and asks one focused question using this public example:

   > `moldea` keeps durable project context in the repository so coding agents can understand the project consistently over time. The README and source do not establish what this project is for, so I haven’t initialized it yet. What does the project do, and who or what does it serve?

   Partial evidence produces an evidence-specific boundary question rather than the generic foundation question.
6. Adoption remains a binary derived observation rather than a persisted manifest field, database state, or another source of truth:
   - A project is adopted when direct probes confirm the canonical moldea adoption contract; otherwise it is unadopted.
   - Partial or inconsistent moldea artifacts do not create a third formal status. The skill reports the project as unadopted, identifies the exact artifacts or missing contract elements, and does not initialize over them without explicit authorization and resolution.
   - An adopted project may still have deterministic diagnostics, semantic drift, conflicts, unresolved requirements, or evidence limitations. The skill reports those concrete findings directly without converting them into healthy, unhealthy, needs-attention, unknown, or not-assessed labels.
   - A blocked operation is reported separately when authority, safety, conflict, or insufficient foundation prevents the requested work.
   - Ordinary maintenance remains proportional and does not run or imply a whole-project evaluation merely to manufacture a status label.
7. Context compression stays inside the repository-state boundary and does not claim host context-window management:
   - Incremental hygiene is part of authorized context maintenance. It updates the existing authoritative owner, avoids introducing duplicate truth, keeps foundation content universal and focused detail local, and cleans only duplication or stale wording directly affected by the current change.
   - Explicit canonical compression is a Maintain subtype activated by natural cleanup, consolidation, organization, or compression intent. It may inspect the requested context scope broadly, consolidate proven duplicates, move facts to their established owners, split mixed-responsibility documents when useful, remove proven superseded active wording, update manifest relationships and consumers, and validate the result.
   - Compression preserves every distinct established fact, accepted rationale, relevant requirement, unresolved boundary, relationship, and consumer. Conflicting claims stop semantic writes and produce one focused question. Broad compression never starts solely because the agent notices an opportunity; it may be recommended non-blockingly.
8. Automatic-discovery semantic cases use natural developer outcomes. Only explicit initialization cases and cases whose actual subject is safe use of the repository-local `moldea` CLI may name `moldea` in the actor direction. Repository setup, canonical files, the owned README awareness block, evaluator-only scenarios, evidence, and criteria may name lowercase `moldea` because they are discovery context or evaluation contracts rather than developer invocation instructions.
9. The semantic suite adds observable coverage for optional unadopted recommendations, binary adoption reporting, incremental hygiene, explicit compression, and conflict-safe compression. It does not claim exact token savings or attempt to inspect host-internal context compaction.
10. Every affected active documentation source and rendered website surface is synchronized with the final portable contract: lowercase naming, exact initialization language, binary adoption, preserved README awareness guidance, natural developer directions, incremental hygiene, explicit compression, semantic case counts, and evidence limitations. No active page retains superseded or contradictory behavior.
11. Active superseded wording and evaluator paths are removed or rewritten rather than retained behind aliases, compatibility branches, duplicate cases, deprecated terminology, or transitional behavior.
12. No database schema, migration, backfill, dual-read or dual-write path, dependency, lockfile change, release publication, or compatibility adapter is introduced.

## Scope and explicit exclusions

### In scope

- Portable-skill activation, binary adoption reporting, context sufficiency, concrete evaluation findings, incremental hygiene, explicit canonical compression, progressive-disclosure routing, and completion contracts.
- A complete affected-content synchronization pass across `README.md`, `docs/**/*.md`, website pages, components, navigation, search, generated documentation surfaces, SEO or metadata copy, `llms.txt` generation inputs, and their tests. Every active source is inspected; only content affected by the final contract is edited.
- Semantic case definitions, coverage, scenario setup, deterministic case-contract tests, free preflight support, and source tests for the new behavior.
- Active qualification prompts, scenarios, profile documentation, expected fixture wording, and qualification code or tests that contain superseded initialization wording or capitalized project-name prose.
- Lowercase normalization in editable active repository-owned source discovered by a bounded final search.

### Out of scope

- Host conversation compaction, token budgeting, prompt caching, context-window instrumentation, or claims about Codex, Claude Code, or another host’s internal compression.
- Removing the explicit `moldea` Agent Skill instruction from the owned README awareness block or treating that repository-owned instruction as a forbidden developer invocation.
- Repository-format or CLI schema changes, new manifest adoption or assessment fields, persisted status records, database tables, database migrations, or Cloud behavior.
- Package dependency changes, lockfile updates, release version changes, tags, publication, or compatibility shims for the old initialization phrase.
- Editing protected coding-instruction files. In particular, the existing `qualification/profiles/claude-agent-sdk/typescript-query-subagents-0-3/projects/preserve-claude-agent-sdk-static-boundary/seed/CLAUDE.md` fixture remains untouched even if its protected fixture text contains historical capitalization.
- Rewriting append-only `qualification/results/**` or `fixtures/semantic-evaluation-results/**` history. `fixtures/semantic-evaluation-result.json` and current pointers are regenerated only by an authorized official evaluation, never edited manually.

## Proposed architecture and ownership

### Portable entrypoint

Update `moldea/SKILL.md` only with universal decisions:

- keep automatic discovery and explicit adoption authority unchanged
- route an unadopted activated workflow to the non-blocking recommendation contract
- add context consolidation and compression intent to Maintain selection without creating a new top-level operation
- add the binary derived-adoption reporting boundary without persisting it
- require incremental hygiene for affected context writes
- route explicit broad compression to a focused reference
- use lowercase `moldea` throughout

Do not add host-compression instructions or turn the frontmatter description into a catchall for unrelated requests. Preserve `moldea/agents/openai.yaml` invocation policy and supplemental role unless inspection during implementation finds stale lowercase or capability copy that must be synchronized.

### README awareness contract

- Preserve the exact marker ownership and ambiguity rules in `moldea/references/continuous-maintenance.md`.
- Keep the recommended block behaviorally equivalent: it explicitly identifies `moldea`, points to `/moldea/**`, instructs coding agents to use the `moldea` Agent Skill for potentially durable knowledge and behavior-affecting changes, and explains that reconsideration does not require a canonical edit when established truth remains accurate.
- Normalize the surrounding reference prose from `Moldea` to `moldea`, but do not replace the skill-specific instruction with generic agent guidance.
- Keep the block free of persisted adoption labels, health terminology, compression cadence, host-compaction claims, or the initialization command.
- Synchronize the canonical recommended block, semantic scenario seeds, active qualification expected READMEs, conformance assertions, and documentation examples wherever they encode this contract. Preserve unrelated README content and do not hand-edit generated or append-only evidence.

### Focused references

- Update `moldea/references/context-gathering.md` to retain the existing Insufficient, Partial, and Sufficient evidence model while adding the agreed benefit-oriented insufficient-context response, evidence-specific partial questions, and derived adoption terminology.
- Update `moldea/references/continuous-maintenance.md` to own the unadopted recommendation, bounded incremental hygiene, no-broad-cleanup rule, and compression recommendation boundary.
- Update `moldea/references/evaluate-and-reconcile.md` to report binary adoption alongside the existing five concrete evidence categories without adding a health roll-up or treating validation as semantic proof.
- Add `moldea/references/context-compression.md` as the focused explicit-compression workflow. It will define scope selection, authority, evidence classification, authoritative ownership, loss-preservation checks, conflict stopping, relationship and consumer synchronization, verification, and reporting. It will explicitly reject host-context claims and arbitrary file-count or size thresholds.
- Update lowercase prose in `moldea/references/local-tooling.md`. Leave unrelated tooling mechanics unchanged.
- Register the new reference in the progressive-disclosure list and in the exact reference inventory asserted by `tests/conformance.test-unit.mjs`.

### Public documentation and website

Synchronize the durable public state in:

- `README.md`: capability list, quick start, natural-language operation examples, binary adoption and unadopted behavior, portable tree, semantic case and request counts after the suite change, and lowercase project-name prose.
- `docs/getting-started.md`, `docs/coding-agent-compatibility.md`, and `docs/examples/initialize-a-project.md`: replace every active initialization request with `Initialize moldea` and use the agreed insufficient and partial clarification language.
- `docs/how-it-works.md`, `docs/capabilities.md`, `docs/continuous-maintenance.md`, `docs/project-state.md`, `docs/repository-format.md`, and `docs/evaluate-reconcile-validate.md`: document binary derived adoption, concrete evaluation findings without a health taxonomy, incremental hygiene, explicit compression as Maintain, natural discovery, and the absence of host-context claims.
- Add `docs/examples/compress-project-context.md` with paired natural requests and outcomes for safe consolidation and conflict-safe stopping, then link it from `docs/examples/index.md`.
- `docs/semantic-evaluation.md`: document the natural-direction allowlist, new case count and request totals, new coverage characteristics, observable compression assertions, and the lack of token-saving claims.
- `docs/index.md` and any other directly affected active documentation found by the final casing and initialization-phrase searches: normalize lowercase prose without unrelated rewrites.
- `website/src/components/getting-started-simulation/getting-started-simulation.astro` and its colocated `getting-started-simulation.test-e2e.ts`: display and assert `Initialize moldea` while preserving the existing responsive, accessible, light/dark-theme simulation.
- `website/src/pages/evidence/semantic/_index.test-e2e.ts`: update current evidence count and replay wording only after current semantic evidence is regenerated; do not make the test assert a result the committed evidence does not contain.
- Inspect every active `docs/**/*.md` document and every website page, component, navigation, search, generation, SEO or metadata, and `llms.txt` source for directly affected naming, initialization, adoption, README-awareness, maintenance, compression, semantic-count, or evidence claims. Update all affected sources, even when they are not listed above, while leaving unrelated prose unchanged.
- Verify documentation-driven website routes, navigation entries, local search records, generated `llms.txt`, canonical links, and evidence pages against the synchronized sources. Do not duplicate documentation text into page code when the existing generator already owns it.

### Semantic evaluation contract

Update `fixtures/conformance-cases.json` and related tests as one authoritative suite:

- Rewrite automatic-discovery actor directions so they state natural outcomes without naming `moldea`: agent adoption, dirty and clean evaluation, unborn-project evaluation, dedicated-repository work, Agent Skill creation, runtime evaluation, and read-only Git-helper safety. Preserve lowercase `moldea` references in scenario-owned README awareness blocks and canonical setup files because those are discovery evidence, not actor invocations.
- Replace `evaluate-brief-name-only-request` with `evaluate-brief-project-request`; update its prompt, criteria, coverage, tests, and runner references instead of retaining the obsolete case id as a compatibility alias.
- Permit lowercase product naming in actor directions only for:
  - `initialize-insufficient-context`
  - `initialize-partial-context`
  - `initialize-sufficient-context`
  - `pnpm-hook-install-blocked`
  - `yarn-plugin-install-blocked`
  - `pnpm-pnp-local-cli-provider`
  - `yarn-conflicting-cli-provider`
- Use the exact standalone `Initialize moldea` direction for the three context-quality initialization cases. Safety cases may append their explicit non-execution constraint after that exact request. CLI-provider cases may name the CLI because proving or refusing that executable is the requested outcome.
- Remove actor-visible internal `/moldea/skills` guidance from the Agent Skill creation case and keep the prohibition evaluator-owned.
- Add three cases, bringing the suite from 54 to 57:
  1. `maintain-context-without-duplication`: a natural durable-knowledge handoff updates the established context owner, avoids duplicate canonical facts or files, leaves unrelated accumulated context untouched, and may recommend explicit compression without performing it.
  2. `compress-project-context`: a natural consolidation request removes proven duplication, preserves all unique truth and requirements, improves ownership, synchronizes manifest relationships and consumers, reruns deterministic inspection, and leaves implementation unchanged.
  3. `compress-conflicting-project-context`: a natural consolidation request encounters consequential conflicting current claims, identifies the conflict, asks one focused question, and leaves the repository unchanged.
- Extend the existing unadopted knowledge and relevance cases so the actor completes the original outcome, does not initialize, reports unadopted, and gives the agreed optional recommendation. Extend initialization cases to use binary adopted or unadopted reporting, identify partial artifacts or missing contract elements concretely, and use the improved clarification language.
- Add deterministic assertions in `tests/conformance.test-unit.mjs` for the actor-direction allowlist, exact initialization phrase, preserved README awareness guidance and markers, the distinction between actor invocation and repository discovery context, lowercase portable wording, recommendation semantics, binary adoption, absence of health labels, compression routing, new case ids, criterion labels, and updated reference inventory.
- Extend `tests/semantic-evaluation-runner.mjs` with focused scenario seed helpers for existing-authority context maintenance, duplicate context, and conflicting context. Reuse the existing adopted and initialization setup rather than creating a parallel general fixture framework.
- Update `tests/semantic-evaluation-runner.test-unit.mjs` and `tests/semantic-evaluation-runner.test-integration.mjs` to verify tooling-source selection, repository materialization, protected controls, expected fixture content, compression relationships, and free preflight coverage for the new cases.
- Add a `context-quality-and-compression` claim to `fixtures/semantic-evaluation-coverage.json`, map every new and materially revised case to its owning portable headings, and update `tooling/semantic-evaluation/coverage.test-unit.mjs` so the new claim and case coverage are deterministic.

### Qualification and active lowercase normalization

- Replace initialization tasks in every active profile under `qualification/profiles/{custom,anthropic,claude-agent-sdk,vercel-ai-sdk}/**/projects/initialize-grounded-project/task.md` with the canonical `Initialize moldea` request followed by evidence and scope constraints.
- Rewrite every active `stop-on-material-ambiguity/task.md` heading and request around `Initialize moldea`, preserving its focused stop condition and avoiding the superseded phrase.
- Normalize lowercase project-name prose in `qualification/cases/cases.yaml`, `qualification/README.md`, active profile `README.md`, `profile.yaml`, `probes/*.yaml`, `scenario.yaml`, editable expected fixture content, and qualification implementation or tests that use product-name prose or Git fixture identities.
- Update the exact active source files identified by the current bounded search, including `qualification/src/{baseline,execution,project-fixture,prompts,repository-state,result}/**`, `tests/semantic-evaluation-runner.mjs`, `tooling/codex-evaluation-host/git-command-policy-boundary.test-integration.mjs`, `tooling/package-candidate/{artifacts,published,workspace}.mjs`, `tooling/release-identity/evidence.test-integration.mjs`, and `tooling/semantic-evaluation/{actor-execution-evidence,index.d.mts}*`, but modify only capitalized prose and expectations relevant to the naming invariant.
- Do not add compression-specific adapter qualification cases. Semantic behavior belongs to the semantic suite; existing qualification profiles need only remain aligned with lowercase naming, exact initialization language, automatic discovery, and the updated portable artifact.

## Ordered implementation strategy

1. Update the portable behavior contract first.
   - Edit `moldea/SKILL.md` and the three existing context/evaluation references.
   - Add and route `moldea/references/context-compression.md`.
   - Update the exact reference inventory and core conformance assertions immediately so the portable artifact has one coherent, reviewable contract.
   - Review checkpoint: confirm no host context-window responsibility, persisted adoption or assessment state, health taxonomy, new top-level operation, compatibility language, or broadened write authority was introduced.
2. Synchronize public documentation and the website initialization surface.
   - Apply the exact lowercase name and `Initialize moldea` language.
   - Preserve and synchronize the explicit README awareness block as repository-owned discovery guidance; do not apply the actor-direction prohibition to it.
   - Add the unadopted recommendation, improved insufficient and partial responses, binary adoption explanation, concrete evaluation reporting, compression capability, and compression example.
   - Update the README project blueprint and portable tree for the new reference.
   - Inspect all active documents and website surfaces, update every directly affected page or generated-source input, and verify documentation-driven navigation, search, SEO metadata, `llms.txt`, and evidence rendering.
   - Update website copy and its colocated tests while preserving existing semantic HTML, keyboard behavior, 320px responsiveness, light/dark themes, and accessible names.
   - Review checkpoint: compare every active public claim and rendered affected page with the portable source, ensure the README guidance still names the skill, and ensure no documentation advertises host compaction, unsupported token savings, health labels, or superseded initialization wording.
3. Replace invocation-shaped semantic prompts and add the new behavior cases.
   - Rewrite or rename existing cases, add the three new cases, update coverage, and extend runner setup.
   - Keep all expected and forbidden criteria observable through actor response, sourced repository state, workspace changes, deterministic envelopes, and protected controls.
   - Update deterministic tests alongside each case change rather than relying on a paid judge to catch malformed fixture contracts.
   - Review checkpoint: verify complete plan-to-case coverage, exact actor-direction allowlist, preserved repository-owned discovery context, 57-case count, and no hidden evaluator information in actor prompts.
4. Synchronize qualification inputs and complete the active lowercase pass.
   - Update all current profile tasks and directly affected scenario or expected content without touching result history or protected instruction files.
   - Update qualification and tooling test strings that encode the old capitalization.
   - Run bounded case-insensitive searches for superseded initialization variants and capitalized project-name prose; resolve every editable active occurrence or document why it is an immutable result, protected instruction fixture, or uppercase technical identifier.
   - Review checkpoint: ensure the old path is removed rather than aliased and that no unrelated fixture behavior changed.
5. Format, inspect, and run free deterministic verification.
   - Format only touched Markdown, JSON, YAML, Astro, JavaScript, and TypeScript files with the repository’s installed Prettier configurations.
   - Review the complete diff, generated-path status, protected files, and active casing search before running checks.
   - Run the checks listed below in increasing scope and triage any failure against the new contract rather than weakening expectations.
6. Refresh paid evidence only through the repository’s release workflow after source review and a committed, pushed checkpoint.
   - Do not hand-edit semantic or qualification results.
   - Explain the need for fresh evidence, current call counts, expected duration, and why deterministic checks are insufficient, then obtain separate explicit approval for the exact paid operation.
   - Record and review a fresh semantic attempt and affected qualification profiles only after the source commit is immutable and the repository-specific prerequisites are satisfied.
   - Update website evidence assertions against the newly generated current result, run evidence verification and the final release gate, and preserve all old attempts as history.

## Verification commands and evidence

Run these source and model-free checks after implementation, using the repository’s installed dependencies and safe local-tooling constraints:

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run eval:semantic:preflight`
4. `npm run qualification:test`
5. `npm run qualification:typecheck`
6. `npm run qualification:lint`
7. `npm run qualification:format:check`
8. `npm run qualification:dry-run` when the adjacent packages repository and registry-backed candidate prerequisites are available
9. `npm run website:check` after current generated semantic and qualification evidence is compatible with the changed source; before paid evidence is refreshed, report expected stale-evidence failures rather than changing tests back to old behavior
10. A final bounded casing and phrase search excluding `_archive`, `_archives`, `_backup`, `_backups`, append-only result history, generated current evidence pending refresh, and protected instruction files
11. A documentation and website synchronization audit covering all active `docs/**/*.md` files and website sources, with affected rendered routes, navigation, search, SEO metadata, generated `llms.txt`, and evidence pages verified against the portable contract

After separate paid-execution authorization and the required source commit:

- Run the official semantic evaluator for all 57 cases. A clean initial pass requires 114 model requests; the theoretical confirmation-inclusive maximum is 342, with operational retries additional. Provide an expected-duration estimate from current runner and provider observations immediately before seeking approval.
- Verify generated semantic history with `npm run eval:semantic:verify`.
- Run and record the Custom qualification baseline, then each affected adapter profile in the repository-required order. Do not infer approval for these paid runs from plan or implementation approval.
- Run `npm run qualification:verify` and finally `npm run release:check` only after current semantic and qualification evidence exists.

For the website changes, deliberately verify every affected rendered page and the existing getting-started simulation at 320px and representative desktop width in light and dark color schemes, with keyboard navigation, accessible names, visible focus, and no horizontal overflow. Confirm that documentation navigation, search, canonical metadata, generated `llms.txt`, and evidence links expose the synchronized wording. No animation, layout, or theme mechanism is added.

## Risks and edge cases

- Binary adoption answers only whether the canonical moldea adoption contract is established. It does not certify correctness or conceal concrete diagnostics, drift, conflicts, unresolved requirements, or evidence limitations.
- Partial artifacts are reported as unadopted with precise evidence, but they must not be treated like an empty repository. Initialization or repair waits for explicit authority and resolution so existing project context is not overwritten.
- The skill cannot guarantee a recommendation on a request for which the host does not select the skill. The contract applies whenever automatic discovery activates `moldea`; the frontmatter must not become an unrelated-work catchall merely to force a recommendation.
- Incremental hygiene must not authorize broad cleanup. It may remove only duplication or stale wording directly affected by the authorized change. Existing broader bloat is reported as an optional explicit-compression opportunity.
- Compression can accidentally erase distinctions that look repetitive. The workflow therefore requires claim-by-claim ownership, unique-fact preservation, relationship and consumer tracing, reverse verification, and a hard stop on consequential conflict.
- Renaming or removing compressed context files can break manifest paths and consumers. Explicit compression owns those synchronized updates and final deterministic inspection in the same change.
- Natural actor prompts must remain self-contained. Removing evaluator terminology cannot hide a path, related repository, or non-execution constraint that the developer would need to supply.
- The “don’t invoke moldea” rule can be over-applied. Repository-owned README guidance and canonical setup must continue naming `moldea` so automatic discovery remains reliable; only developer-facing actor directions lose unnecessary product invocation.
- New semantic cases increase paid evaluation cost and invalidate the existing suite digest. No paid execution occurs without its separate repository-required approval.
- Qualification input wording changes invalidate current profile evidence even when runtime fixtures are unchanged. Append-only history remains visible, but release readiness requires new compatible evidence.
- The protected `CLAUDE.md` fixture and immutable historical results may retain old capitalization. They are excluded from active-product conformance because this workflow is forbidden to alter them; no compatibility behavior depends on their wording.
- Because no database tables or launched platform state exist, rollback is a clean Git revert of the cohesive source change before release. No migration, data restoration, dual path, or staged compatibility period is needed.

## Approval required

Approval authorizes the clean source implementation described above: lowercase `moldea` naming, exact `Initialize moldea` language, preserved explicit README awareness guidance, optional unadopted recommendations, improved context clarification, binary derived adoption without a health taxonomy, concrete evaluation findings, incremental hygiene, explicit canonical compression, natural developer-facing automatic-discovery prompts, three new semantic cases, synchronized qualification inputs, every affected documentation source and website page, and model-free verification. It does not authorize paid semantic or qualification model execution, commits, pushes, tags, publication, database work, compatibility paths, protected-instruction edits, or rewriting immutable evidence history; those actions retain their separate repository workflows and approvals.
