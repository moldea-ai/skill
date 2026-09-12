# Plan: Complete `moldea` 5.0.1 with coherent adoption, authority, and runtime eligibility

## Task contract

Complete the already-started `moldea` 5.0.1 release by preserving the reviewed runtime-maturity and managed-README work and resolving three additional production-readiness contradictions across the skill, packages, platform specifications, packages website, skill website, and public knowledge base:

1. A user must initialize `moldea` before any repository-dependent `moldea` operation, including agent-system planning. Before adoption, only concise repository-independent product information and an explicit initialization request are valid `moldea` routes. Generic host-owned planning remains available without `moldea`.
2. Instruction precedence, efficient investigation order, and claim-specific evidence authority must be separate concepts. Retrieval order must never decide which conflicting factual claim wins. Each source establishes only the fact type it can support, and unresolved contradictions remain explicit unless a current developer selection or an independent resolver establishes the governing claim.
3. Runtime package requirements remain flexible minimum-only ranges in the canonical form `>=x.y.z`. They are best-effort inspection-eligibility ranges, not claims that every later stable release has been empirically qualified. Exact executed package versions and evidence dates remain owned by immutable adapter-qualification evidence and must be visible on the relevant qualification surfaces.

The packages website remains the sole owner of optional maturity presentation. Maturity must not enter skill activation, runtime selection, package eligibility, technical compatibility, deterministic adapter behavior, qualification, or canonical unresolved state.

No paid semantic evaluation or adapter qualification will run for this release. Both evidence families will remain explicitly pinned to the previously accepted evidence through the existing repository-bound release-evidence mechanism. The public release must retain the original source provenance and the maintainer reason and must not imply that the earlier models evaluated the revised contracts. Deterministic tests, conformance checks, semantic preflight, qualification dry runs, website checks, builds, and release verification remain required.

Hosted-platform findings from the external specification review are excluded. The observed `skill-mock` repository, Eve runtime implementation, Cloud behavior, PR Assurance implementation, historical evidence artifacts, immutable tags, and unrelated work from concurrent agents are also excluded.

## Current state and repository evidence

### Skill repository

- `/home/jesusgraterol/Documents/projects/moldea/skill` is clean on `development` at `1e7ba9675a5fa038753f26bb73ee256ae24b52e2`, matching `origin/development`. `main` and `origin/main` remain at `0c56584525ecba2ea7ca784196aa5023f3fc37bb`. Tag `v5.0.1` does not exist.
- The earlier website provenance boundary is complete and published on `development` as `fc49341e30505ee53063302152d731bbdb6d7aed`.
- The runtime-maturity removal, canonical managed README writer, exact adoption gate, current semantic-case replacement, qualification-fixture normalization, immutable-source verification, 5.0.1 version update, and explicit dual-domain evidence pin are complete and published on `development` as `1e7ba9675a5fa038753f26bb73ee256ae24b52e2`.
- `fixtures/release-evidence.json` currently pins qualification to `v5.0.0` at commit `c3416c52ae69a3f26d2e38c07ba98aa8531e358d` and semantic evidence directly to commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`. The envelope already states that the prior models did not evaluate the 5.0.1 contracts.
- `moldea/SKILL.md` and `fixtures/semantic-evaluation-coverage.json` already establish the intended strict pre-adoption gate, but `moldea/references/agent-system-planning.md` says planning may precede adoption.
- `moldea/references/context-gathering.md` defines a fixed “Evidence hierarchy,” while the top-level conflict rule in `moldea/SKILL.md` requires claim-specific resolution and preserves unresolved conflicts. The portable reference therefore risks turning an efficient lookup sequence into factual precedence.
- `moldea/references/runtime-compatibility.md`, current conformance wording, and related public documentation still use “package compatibility” where the publication establishes only minimum-based package eligibility plus separately inspected source patterns.
- Qualification profiles already declare exact `runtimePackages`, and immutable results already record the complete executed package closure under `result.provenance.packages` with `createdAt` and `completedAt`. The website search model indexes current values, but profile pages do not display configured runtime package inputs and attempt pages do not render the executed package closure visibly. For pinned releases, `website/src/lib/release-evidence/loader.ts` authenticates the immutable source through `assertPinnedReleaseEvidenceSection` but projects only its source label, link, and reason, so the exact executed packages and evidence time accepted for 5.0.1 are not visible on a current website route.

### Packages repository

- `/home/jesusgraterol/Documents/projects/moldea/packages` was clean on `development` at `4707c8154abcc7a544ca4c300e59bdb5968042c5`, matching `origin/development`, `origin/main`, and local `main` when this plan was revised.
- `compatibility/runtimes.yaml` already has the intended canonical minimum-only runtime requirements, including Eve `>=0.39.1`, LangChain `>=1.5.9`, and LangGraph `>=1.4.12`. Those requirements and their `lastVerifiedAt` values must remain unchanged because no new adapter qualification is being executed.
- `scripts/runtime-compatibility/generator.ts` and generated `docs/runtime-compatibility.md` label every requirement a “Verified range.” `apps/website/src/components/adapter-details.astro` presents the same values generically as “Range.”
- The Eve, LangChain, and LangGraph package READMEs and focused target documents describe bounded `0.39.x`, `1.5.x`, and `1.4.x` families despite the canonical minimum-only contract. The OpenAI and OpenAI Agents SDK diagnostic documentation also uses “verified range” for eligibility failures.
- The root packages README still describes Core as version `3.1` and CLI as version `7.1`; the repository contains Core `4.0.1` and CLI `8.0.0`.
- Package-owned `docs/**` changes do not select npm releases, but package `README.md` changes do. Eve, LangChain, and LangGraph are currently `3.0.0`, so their corrected public package READMEs require clean patch releases `3.0.1` under the established release workflow. Their existing adapter implementation ranges already admit compatible 3.x patches.

### Platform specification repository

- `/home/jesusgraterol/Documents/projects/moldea/platform` was clean on `development` at `63267649` when this plan was revised. Another agent may create unrelated changes; they are not part of this plan and must not be overwritten, reviewed as this work, staged, or published with it.
- `moldea/context/product-and-operating-model.md` explicitly permits repository-dependent agent-system planning before initialization in several locations and still permits the skill to consume website maturity for runtime readiness.
- `moldea/context/agent-skill.md` correctly says initialization is the only repository-dependent pre-adoption operation, but calls its retrieval sequence an “authority order” and still names release `5.0.0`.
- `moldea/context/context-gathering.md` already contains the desired question-specific authority model and rejects universal source-type hierarchies. It is the specification baseline for the portable correction.
- `moldea/context/runtime-compatibility-matrix.md` correctly defines minimum-only `>=x.y.z` ranges and the oldest verified release, but still permits semantic consumers to use website maturity for production-readiness conclusions.
- All ten adapter package specifications contain “complete range” or equivalent wording that overstates what an open-ended minimum-only range proves. LangChain, LangGraph, and Claude Agent SDK contain additional complete-package-range assertions.

### Knowledge-base repository

- `/home/jesusgraterol/Documents/projects/moldea/knowledge-base` was clean on `main` at `39fc62f` when this plan was revised.
- `content/011_frequently-asked-questions/002_getting-started-faq.md` currently tells users that agent-system planning can occur before initialization.
- `content/003_open-source-tools/007_validation-and-diagnostics.md` already describes explicit evidence pinning accurately. It is the appropriate concise public location to explain minimum-based runtime eligibility, exact qualification inputs, and the boundary between best-effort inspection and executed evidence.

## Desired final behavior

### Adoption and planning

- Before adoption, `moldea` answers only repository-independent questions about the product or performs explicit initialization. It does not inspect the repository, load workflow references, run the CLI, or provide repository-specific agent-system planning.
- A request for repository-specific agent-system planning activates only after the canonical project and exact managed README block establish adoption. Planning remains read-only after activation.
- Generic planning owned by the host coding workflow remains available in any repository. The absence of `moldea` adoption disables only `moldea` behavior, not the user's independent task.
- Initialization remains the single transition into repository-dependent `moldea` use. No pre-adoption planning exception, alias, fallback, or legacy route remains.

### Instruction precedence, investigation order, and evidence authority

- Instruction precedence determines which valid instruction governs agent conduct. It does not automatically establish repository facts.
- Investigation order is a cost- and relevance-oriented sequence for retrieving evidence. It is not a truth hierarchy and cannot resolve a contradiction merely because one source was inspected earlier.
- Evidence authority is claim-specific:
  - current developer direction establishes the intended change or explicit current selection;
  - executable code and runtime behavior establish what is implemented;
  - schemas and configuration establish their executable contracts;
  - canonical `moldea` assets establish declared project truth;
  - accepted decisions establish rationale;
  - tests establish expected or verified behavior without automatically overriding implementation or declared truth;
  - runtime-adapter evidence establishes only the runtime-native patterns it proves;
  - source-owned external publication establishes only its declared current public facts.
- Evidence that answers different questions may coexist without contradiction. When two independent sources make incompatible claims about the same fact, the skill investigates a bounded independent resolver or preserves both claims and asks the developer. It does not use recency, labels, canonical status, tests, implementation, or source type alone to invent a winner.

### Runtime eligibility and qualification

- The field name `versionRange` and its canonical `>=x.y.z` machine shape remain unchanged. No bounded major/minor range, verified-version registry, compatibility alias, migration schema, or parallel matrix is introduced.
- A runtime package range means “eligible for deterministic inspection from this verified minimum onward.” Later stable releases are accepted on a best-effort basis and must still match the adapter's documented source patterns. Package metadata alone never proves source compatibility, behavioral fit, production readiness, or successful qualification.
- `lastVerifiedAt` continues to identify the existing technical-target verification date and is not advanced by wording changes.
- Qualification profiles own the exact package versions intended for an execution. Passing immutable attempt provenance owns the exact package closure actually executed and its recorded time.
- Packages documentation and website surfaces label only target runtime package requirements as “Eligible versions,” explain the best-effort boundary, retain links to qualification evidence, and do not call the open-ended interval fully verified. Adapter implementation ranges and compatible Core ranges retain their distinct existing labels and meanings.
- Skill qualification profile pages display exact configured runtime package inputs as inputs, not as passing evidence. Immutable current attempt pages display the exact executed package closure and recorded timestamps as evidence. When qualification is pinned, the existing authenticated source traversal projects a bounded per-target summary containing the source attempt id, exact executed package closure, and recorded evidence time onto the matching current profile as pinned prior evidence. The release envelope remains compact, and no historical attempt route, copied package registry, or current-contract pass is created.
- Website maturity remains presentation metadata only. It may be displayed on the packages website, but neither the skill nor technical matrix consumers use it to choose a runtime or declare technical or production readiness.

## Architecture and ownership

### Skill repository changes

- Update `moldea/references/agent-system-planning.md` to require adoption before repository-specific planning and to distinguish activated `moldea` planning from generic host planning.
- Replace the fixed hierarchy in `moldea/references/context-gathering.md` with an investigation-order section aligned with the platform's claim-specific authority contract. Keep `moldea/SKILL.md` as the activation and conflict-resolution authority, adjusting only wording needed to make the three concepts explicit and noncontradictory.
- Update `moldea/references/runtime-compatibility.md` and directly affected wording in `moldea/references/agent-design.md` so publication ranges establish package eligibility rather than universal package compatibility.
- Synchronize `README.md`, `docs/planning-agent-systems.md`, `docs/how-it-works.md`, `docs/compatibility-and-local-tooling.md`, `docs/designing-agents.md`, `docs/adapter-qualification.md`, and `docs/release-evidence.md` where they describe adoption, authority, package-range meaning, exact qualification provenance, or the reason for the 5.0.1 evidence pin.
- Strengthen `fixtures/conformance-cases.json`, `fixtures/semantic-evaluation-coverage.json`, and `tests/conformance.test-unit.mjs` to prove that repository-dependent planning has no pre-adoption exception, retrieval order is not evidence precedence, conflicting same-fact claims remain unresolved without an allowed resolver, and minimum-only ranges are eligibility rather than blanket compatibility. Update `tests/semantic-evaluation-runner.mjs` and its focused unit coverage only where evaluator-owned publication wording still says package compatibility. Keep exactly 74 semantic cases and do not add a paid-evaluation requirement.
- Extend `website/src/lib/qualification/types.ts` and `website/src/lib/qualification/loader.ts` so `IQualificationProfileModel` exposes the profile's exact configured `runtimePackages` without inventing evidence. Include those inputs in `website/src/lib/generation/generation.ts` search text.
- Refactor the qualification branch of `tooling/release-identity/release-evidence-source.mjs` so the same bounded traversal that authenticates each pinned attempt returns a compact per-target projection of its attempt id, `result.provenance.packages`, `createdAt`, and `completedAt`. Extend `website/src/lib/release-evidence/types.ts` and `website/src/lib/release-evidence/loader.ts` with a qualification-specific pinned section model that exposes this already-authenticated projection. Do not copy it into `fixtures/release-evidence.json`, weaken source authentication, perform repository reads outside the established bounded source loader, or introduce a second evidence authority.
- Update `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro` to show exact configured runtime package inputs with pending/current-state wording and, when applicable, the matching authenticated pinned-source package closure and evidence time as prior evidence. Update `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/attempts/[attemptId]/index.astro` to show current `result.provenance.packages`, `createdAt`, and `completedAt` as the exact executed closure and evidence time. Do not restore obsolete attempt routes or relabel pinned evidence as current.
- Update `tooling/release-identity/evidence.test-integration.mjs`, `website/src/lib/release-evidence/loader.test-integration.ts`, `website/src/lib/qualification/loader.test-integration.ts`, `website/src/lib/generation/generation.test-unit.ts`, and `website/src/pages/evidence/qualification/_index.test-e2e.ts` for source authentication, bounded provenance projection, rejection of tampered provenance, model propagation, honest labels, exact visible versions, timestamps, accessibility, responsive table behavior, and current-versus-pinned separation.
- Regenerate `fixtures/release-evidence.json` after every portable-skill byte change with `--scope all --from v5.0.0`. Keep the same direct qualification and semantic sources, update the target portable digest, and use one reason covering the initialization, maturity, adoption, authority, and eligibility corrections plus the deterministic checks replacing fresh model work.

### Packages repository changes

- Update `scripts/runtime-compatibility/generator.ts` and `scripts/runtime-compatibility/generator.test-unit.ts` to generate “Eligible versions” rather than “Verified range” only for target runtime package requirements, add one concise explanation that the minimum is verified while later stable releases are admitted on a best-effort source-pattern basis, and regenerate `docs/runtime-compatibility.md` through the existing generator. Preserve distinct adapter implementation and compatible-Core terminology.
- Update `apps/website/src/components/adapter-details.astro` to label only runtime package requirements “Eligible versions” and explain that exact executed versions and dates live in qualification evidence. Preserve the separate maturity badge as website-only presentation and preserve existing adapter implementation and compatible-Core labels.
- Update the existing runtime-publication website tests, including `apps/website/src/lib/runtime-compatibility-publication/runtime-compatibility-publication.test-unit.ts` and `apps/website/src/lib/runtime-compatibility-response/runtime-compatibility-response.test-integration.ts`, only where visible terminology or response-to-presentation behavior changes. The public JSON field remains `versionRange` and its values remain unchanged.
- Correct `projects/adapter-eve/README.md`, `projects/adapter-langchain/README.md`, and `projects/adapter-langgraph/README.md` so they name the verified minimum and documented pattern family without presenting an upper-bounded `x` series as the compatibility contract. Apply the same correction to each package's `docs/index.md` and `docs/verified-target.md`.
- Correct “verified range” diagnostic prose in `projects/adapter-openai/docs/evidence-and-diagnostics.md` and `projects/adapter-openai-agents-sdk/docs/evidence-and-diagnostics.md` where it describes a package eligibility mismatch. Do not change diagnostic codes or runtime messages unless inspection shows the public code itself contains the same overclaim.
- Bump only the release-selected adapter manifests from `3.0.0` to `3.0.1`: `projects/adapter-eve/package.json`, `projects/adapter-langchain/package.json`, and `projects/adapter-langgraph/package.json`. Update `pnpm-lock.yaml` only if the repository's package manager deterministically changes workspace-version metadata. Do not change dependency ranges solely for these patch releases.
- Correct the Core and CLI version descriptions in the root `README.md` to `4.0.1` and `8.0.0` and verify every other current-version statement against package manifests.
- Do not modify `compatibility/runtimes.yaml`, its minimum versions, `lastVerifiedAt`, adapter pattern claims, `apps/website/content/runtime-target-maturity.yaml`, adapter runtime behavior, or qualification URLs unless a direct deterministic drift check proves a generated copy must change.

### Platform specification changes

- Update `moldea/context/product-and-operating-model.md` so repository-dependent planning requires initialization, generic planning remains host-owned, and website maturity cannot enter skill runtime selection or readiness conclusions.
- Update `moldea/context/agent-skill.md` to name release `5.0.1`, call its ordered retrieval sequence an investigation order, state that the sequence is not evidence precedence, and align planning and runtime-range language with the portable skill.
- Use `moldea/context/context-gathering.md` as the claim-specific authority source. Add only the smallest wording needed to define efficient investigation order separately; do not replace its existing question-specific authority model.
- Update `moldea/context/runtime-compatibility-matrix.md` so minimum-only ranges are explicitly eligibility ranges, exact executed versions belong to qualification evidence, and website maturity is display-only rather than an input to semantic, technical, runtime-selection, or production-readiness conclusions.
- Replace complete-range overclaims in `moldea/context/adapter-anthropic-package.md`, `adapter-claude-agent-sdk-package.md`, `adapter-cloudflare-agents-package.md`, `adapter-eve-package.md`, `adapter-google-genai-package.md`, `adapter-langchain-package.md`, `adapter-langgraph-package.md`, `adapter-openai-package.md`, `adapter-openai-agents-sdk-package.md`, and `adapter-vercel-ai-sdk-package.md`. Each specification will state that fixtures qualify an exact package closure and documented source-pattern claims, while later eligible versions remain subject to deterministic source inspection.
- Preserve Hosted platform behavior and every unrelated platform file. Before editing, recheck the worktree and the exact affected paths. If concurrent changes overlap one of these files, inspect and integrate without overwriting them; if unrelated changes exist elsewhere, isolate this work on a dedicated branch or worktree so the other agent's files cannot enter this task's commit.

### Knowledge-base changes

- Correct `content/011_frequently-asked-questions/002_getting-started-faq.md` to say users initialize `moldea` before repository-specific agent-system planning and that ordinary planning remains available independently.
- Extend `content/003_open-source-tools/007_validation-and-diagnostics.md` with one concise public explanation of eligible minimum versions, best-effort later-release inspection, exact versions in qualification evidence, and the fact that pinned evidence remains prior evidence rather than a fresh run.
- Regenerate `content/manifest.json` only if the established validator or content-generation workflow requires it for these body-only edits. Do not alter slugs, ordering, categories, relationships, or unrelated articles.

## Public contracts and release effects

- Skill release identity remains `5.0.1`; the existing unpublished candidate is corrected before merge and tag rather than creating `5.0.2`.
- The portable skill digest changes, so the 5.0.1 release-evidence envelope must be regenerated. Its prior qualification tag and semantic source commit remain unchanged.
- The technical compatibility publication schema remains version `2`, and `versionRange` remains its field name. This is a semantic clarification, not a schema migration.
- The qualification protocol, profiles, runtime package versions, attempt artifacts, result schemas, release-envelope schema, semantic protocol, and 74-case count remain unchanged. Website model projection adds already-recorded configured inputs plus an authenticated, bounded view of pinned and current attempt provenance, but no evidence mutation or duplicate persistence.
- Eve, LangChain, and LangGraph receive documentation-only patch releases `3.0.1` because their npm-visible READMEs are corrected. No adapter behavior, compatibility minimum, verification date, or implementation-major range changes.
- There is no database, persisted customer data, environment, authentication, authorization, billing, queue, webhook, or Cloud deployment change.

## Ordered implementation steps

1. Preserve the completed skill commits and establish clean, non-overlapping task branches or isolated worktrees for the packages, platform, and knowledge-base repositories as needed. Record each repository's base commit and changed-path scope before editing; never reset, stash, clean, or absorb unrelated agent work.
2. Correct the platform specifications first so one canonical contract defines adoption, claim-specific authority, minimum-only eligibility, exact qualification evidence, and display-only maturity. Run the platform documentation validator and a focused contradiction search, but do not publish yet.
3. Correct the packages generator, generated technical document, packages website presentation, three bounded-family package documentation sets, two diagnostic documents, root version overview, and the three required patch versions. Verify that the canonical matrix, maturity registry, runtime code, minimums, and verification dates remain byte-identical.
4. Correct and validate the two knowledge-base articles against the revised platform specification. Preserve slugs, relationships, and manifest structure.
5. Align the portable skill references, top-level wording, public skill documentation, conformance fixtures, and deterministic tests with the canonical contract. Keep the current 74-case suite and prior immutable evidence untouched.
6. Expose exact configured and executed qualification package versions and evidence times through the existing skill website model and pages. Refactor the authenticated pinned-source traversal to return its bounded per-target provenance projection, then join it to current profiles for public presentation. Reuse existing table, typography, status, theme, and responsive patterns; do not introduce a new component system, duplicate evidence persistence, or legacy attempt pages.
7. Run focused skill tests, semantic preflight, qualification dry runs, website tests, and the full deterministic release boundary. Regenerate the dual-domain 5.0.1 evidence pin only after all portable bytes are final, verify its unchanged source provenance and changed target digest, then rerun every check affected by the regenerated envelope.
8. Perform a cross-repository contradiction audit for pre-adoption planning, “authority order,” universal evidence hierarchies, technical use of maturity, “Verified range,” bounded `x` compatibility claims, complete-range claims, stale Core/CLI versions, and lowercase `moldea`. Review every repository diff against its recorded scope and exclude unrelated work.
9. Review and publish the repositories through their established branch protections in dependency order: prepare all reviewed candidates first; publish the platform specification correction, packages correction and selected patch releases, and knowledge-base correction; then review the complete skill `development` range against refreshed `main`, merge the exact candidate, create immutable tag `v5.0.1`, and require tag-bound release and website verification. Do not publish the skill tag while a directly affected public repository still contains a known contradiction.

## Tests and verification

### Skill repository

Run focused tests while implementing, then run:

```bash
npm run managed-readme:check
npm run test:unit
npm run test:integration
npm run eval:semantic:preflight
npm run qualification:dry-run:all
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run path:check
npm run release:evidence:pin -- --scope all --from v5.0.0 --reason "<honest 5.0.1 maintainer reason>"
npm run website:check
npm run release:check
```

Run the skill website end-to-end suite through its established package script when it is not already included by `website:check`. Verify profile and attempt pages at 320 px and desktop widths, keyboard access, focus visibility, light and dark themes, readable overflow for package tables, and no serious accessibility violations. The UI change adds no animation and must not add avoidable client-side rendering work.

Focused release-evidence coverage must prove that an authenticated pinned qualification target supplies the exact source attempt id, executed package closure, and recorded time to the public model; that the matching current profile renders those values explicitly as pinned prior evidence while remaining pending under the current contract; and that tampered source attempt provenance is rejected before any public model is returned.

Do not run `npm run eval:semantic -- --record`, any non-recording paid semantic diagnostic, `npm run qualification` without `--dry-run`, or any other model-backed semantic or adapter-qualification command. Do not edit a result, disposition, attempt, or historical evidence file to manufacture a pass.

### Packages repository

Run focused generator and runtime-publication tests first, regenerate through the established command, and then run:

```bash
pnpm compatibility:generate
pnpm compatibility:check
pnpm docs:check
pnpm website:check
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Confirm regeneration is deterministic, `git diff --check` passes for touched files, the three package manifests are exactly `3.0.1`, release selection contains only the intended packages, packed artifacts contain the corrected READMEs, and no runtime matrix or maturity-registry bytes changed. The pull-request and main-branch release workflows remain the final cross-platform and npm-publication boundaries.

### Platform specification repository

Run:

```bash
pnpm docs:moldea:check
```

Run the installed Prettier check against only the touched specification files and `git diff --check`. Application, browser, database, and Hosted-platform tests are unnecessary because this scope changes specifications only and no executable platform behavior.

### Knowledge-base repository

Run:

```bash
npm run validate
npm test
```

Run formatting only if the repository exposes an established formatter, then inspect the generated manifest state and `git diff --check`. No browser or application test is required for body-only content whose repository validator and tests pass.

### Cross-repository verification

- Re-run bounded searches in only the affected current files for every prohibited contradictory phrase and inspect each remaining match semantically rather than deleting technically correct uses.
- Verify that platform specifications, package documentation, packages website labels, skill references, skill website evidence, and knowledge-base prose use the same definitions.
- Verify exact source provenance in `fixtures/release-evidence.json`: qualification remains `v5.0.0` / `c3416c52ae69a3f26d2e38c07ba98aa8531e358d`, and semantic evidence remains `926907e26feac6a55929f68ca134aeaf41a6a4b5`.
- Verify that every pinned qualification summary displayed for 5.0.1 is derived from the authenticated immutable source attempt, not from the current profile, compatibility matrix, maturity registry, or a copied release-envelope field.
- Verify that `compatibility/runtimes.yaml`, qualification profiles, immutable attempts, historical evidence, maturity registry, Hosted-platform files, and `skill-mock` are unchanged.

## Failure handling, compatibility, and rollback

- A deterministic failure is triaged against the agreed contracts before production code or expectations change. Stale wording tests are updated only when current implementation and canonical specifications establish the new intended behavior.
- A paid-evidence mismatch is not repaired by running models. Correct deterministic pin validation or public representation while retaining source provenance; if the prior source itself fails immutable cryptographic or passing-result validation, stop because the no-rerun constraint cannot produce valid release evidence. Missing or malformed package provenance in a pinned source fails closed rather than falling back to current profile inputs.
- Package patch publication failure leaves already-published packages intact. Retry only the exact unchanged release candidate through the documented recovery path; do not lower versions, reuse an occupied version, or broaden ranges.
- Before the skill tag exists, rollback is a normal corrective commit on the affected task branch. After any repository release, corrections use new commits and versions according to that repository's release rules. Do not move tags, force-push, rewrite published history, or restore contradictory compatibility paths.
- No compatibility shim is required because the machine range schema and behavior remain stable. Remove superseded wording and assertions outright rather than retaining aliases or dual definitions.

## Risks and controls

- **Pinned evidence may be mistaken for fresh evidence.** Keep the prior source label, source link, maintainer reason, source attempt id and time, and current-contract pending state visible. Exact current profile inputs must not be labeled as executed until an attempt records them.
- **Open-ended ranges may be read as unconditional support.** Every public surface will pair runtime-package “Eligible versions” with the verified-minimum, best-effort later-release, and source-pattern boundary. Adapter implementation and compatible-Core ranges retain distinct labels. `lastVerifiedAt` will remain unchanged.
- **Qualification package data may be duplicated as a second authority.** Website pages will project current profile inputs, current attempt provenance, or authenticated pinned-source attempt provenance directly. No `verifiedVersions` registry, copied release-envelope package ledger, or packages-repository ledger will be added.
- **Authority wording may weaken conflict handling.** Deterministic tests will distinguish question-specific facts from same-fact contradictions and preserve the existing requirement for a current developer selection or independent resolver.
- **Strict adoption may accidentally disable generic planning.** Skill and knowledge-base wording will explicitly scope abstention to `moldea`; host-owned planning continues normally.
- **README corrections trigger package releases.** Only the three npm-visible READMEs that currently contradict the matrix will select patch releases. Adapter code, package minimums, and verification dates remain unchanged.
- **Concurrent platform work may be bundled accidentally.** Recheck status and touched paths before every edit, review, commit, and publication. Use isolation when unrelated work is present and never use a complete-worktree publication command in a worktree containing another agent's changes.
- **Cross-repository publication is not atomic.** Prepare and review every candidate before the first merge, publish authoritative and public documentation before the skill tag, and keep the temporary transition limited to wording that does not change executable compatibility.

## Acceptance criteria

- Every current skill, platform specification, and knowledge-base statement requires initialization before repository-dependent `moldea` planning while preserving generic host planning.
- No active document calls an investigation sequence an authority hierarchy or uses source type, retrieval order, recency, tests, implementation, or canonical status alone to resolve a same-fact contradiction.
- The platform and portable skill use the same claim-specific authority model and preserve unresolved conflicts when no allowed resolver exists.
- All canonical runtime package requirements remain minimum-only `>=x.y.z`; the field remains `versionRange`; no upper bounds or duplicate verified-version registry are introduced.
- Packages documentation and websites call target runtime package requirements eligible versions, identify the verified minimum and best-effort later-release boundary, and do not claim complete empirical verification of an open-ended range. Adapter implementation ranges and compatible Core ranges retain separate, accurate labels.
- Exact configured runtime package inputs are visible on qualification profile pages. Exact executed package closures and evidence timestamps are visible on current immutable attempt pages and, for pinned releases without current attempts, on the matching current profile through an authenticated bounded projection of the immutable source attempt. Labels distinguish inputs, executed evidence, current status, and pinned prior provenance.
- Pinned qualification provenance is not copied into the release envelope or another registry, and deterministic coverage rejects tampered source provenance before rendering it.
- Website maturity remains display-only and is absent from skill runtime selection, compatibility, qualification, and readiness logic.
- `compatibility/runtimes.yaml`, its `lastVerifiedAt` values, adapter runtime behavior, qualification profiles, historical attempts, and historical semantic evidence remain unchanged.
- Platform release references name skill `5.0.1`; the packages root README names Core `4.0.1` and CLI `8.0.0`.
- Eve, LangChain, and LangGraph are prepared as documentation-only patch releases `3.0.1`, and no other package is selected without a release-relevant change.
- The current semantic suite remains exactly 74 cases. All required deterministic skill checks pass without any paid semantic or adapter-qualification execution.
- The regenerated 5.0.1 envelope pins both evidence domains to the same previously accepted sources and explicitly says that prior models did not evaluate the revised contracts.
- Knowledge-base validation, platform specification validation, packages compatibility generation/checks, packages website checks, package regression boundaries, skill website checks, and release checks pass for the exact reviewed candidates.
- No Hosted-platform behavior, `skill-mock`, Eve adapter implementation, historical evidence, immutable tag, protected coding instruction, or unrelated concurrent-agent file is modified or published.
- The final implementation contains one current contract with no pre-adoption planning exception, fixed evidence hierarchy, bounded-family compatibility claim, maturity-based skill branch, legacy evidence page, alias, fallback, or parallel registry.

## Assumptions and developer decisions

- The developer has selected strict adoption, claim-specific evidence authority, minimum-only best-effort eligibility, and explicit dual-domain evidence pinning. No material product decision remains open.
- The package patch versions are required by the packages repository's documented README release-selection contract. If repository or npm state changes before implementation, recompute the smallest valid stable versions without changing the agreed compatibility semantics.
- Repository states recorded above are revision-time evidence. Revalidate them before implementation because another agent is active in the platform repository.
- The developer has renewed the existing end-to-end autonomous sequence through publication of the corrected skill. After this revision is challenged successfully, execution proceeds through breakdown, sequential implementation, read-only review and correction loops, repository publication, final skill merge, tag, and release verification without further approval unless a genuine blocker arises.

## Execution scope

Preserve the completed `moldea` 5.0.1 runtime-maturity and canonical-README work, then synchronize the skill, packages, platform specifications, packages and skill websites, and knowledge base around three final contracts: initialization precedes all repository-dependent `moldea` work, investigation order never substitutes for claim-specific evidence authority, and minimum-only runtime package ranges express best-effort eligibility while immutable qualification attempts own exact executed versions and expose them through an authenticated bounded public projection. Publish three required adapter documentation patch releases and the corrected skill 5.0.1 only after deterministic cross-repository verification, while pinning both evaluation families to their existing immutable evidence and running no paid evaluations or qualifications.
