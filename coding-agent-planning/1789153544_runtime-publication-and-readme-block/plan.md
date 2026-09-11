# Plan: Remove runtime maturity coupling and standardize README initialization

## Task contract

This change fixes two release-blocking defects in the `moldea` Agent Skill:

1. Runtime evaluation must no longer expect, retrieve, validate, report, or reason from a target `maturity` field. The packages website may own presentation labels such as experimental or supported, but those labels are not part of the technical runtime publication consumed by this repository.
2. Every successful initialization must create the same managed root-README block. Existing repository content outside the managed markers must remain unchanged, and malformed marker layouts must fail safely rather than being guessed or partially rewritten.

The implementation is confined to `/home/jesusgraterol/Documents/projects/moldea/skill`. The observed `/home/jesusgraterol/Documents/projects/moldea/skill-mock` repository is evidence of the defect only and must not be modified. The platform, packages, and knowledge-base repositories are also outside this implementation scope. Eve adapter improvements are deferred to the already discussed future work and are not part of this release.

The release will be a clean `5.0.1` implementation. It will not retain maturity aliases, deprecated semantic-case identifiers, alternate README templates, compatibility shims, or parallel initialization paths. It will not run another paid semantic evaluation or adapter qualification. Instead, it will run the complete deterministic verification available in this repository and invoke the existing explicit release-evidence pin mechanism through `v5.0.0` with an honest maintainer reason. The pin will preserve direct source provenance: qualification resolves to `v5.0.0`, while semantic evidence remains flattened to its original verified source commit rather than creating a reference chain.

Immutable release evidence must be verified against the protocol that produced it, not reinterpreted through the current semantic-case schema. Source verification will validate stable cryptographic and passing-result invariants directly from the source commit without executing historical code or adding version-specific parsers. Strict current-schema validation remains mandatory for current evidence creation and verification.

## Current state and repository evidence

- `moldea/SKILL.md` routes runtime work through `moldea/references/runtime-compatibility.md` and currently instructs the actor to retrieve and report target maturity. `moldea/references/agent-system-planning.md` and `moldea/references/agent-design.md` also use maturity as a runtime-selection or readiness input.
- `tooling/runtime-compatibility-publication/publication.mjs` currently rejects a target unless `maturity` is exactly `experimental` or `supported`. Its fixture and unit test encode that obsolete requirement even though the packages publication no longer provides it.
- Seven current semantic scenarios still mention maturity. Two are maturity-shaped cases: `published-supported-target-not-installed` and `experimental-target-not-production-ready`. `tests/semantic-evaluation-runner.mjs`, `tests/conformance.test-unit.mjs`, `fixtures/semantic-evaluation-coverage.json`, and `website/src/lib/semantic-evaluation/constants.ts` retain the same old vocabulary.
- `moldea/references/continuous-maintenance.md` already contains the desired README wording, including the blank line after the opening marker, but the semantic evaluator and conformance fixtures omit that blank line. Thirty-three initialized qualification seed or expected README files use older managed text, while two additional Custom seeds contain another shortened variant.
- `moldea/scripts/relevance-gate.mjs` treats any single ordered marker pair as adopted. It does not verify that the managed content is the canonical block, so legacy and divergent blocks can silently remain authoritative.
- Every regular file under `moldea/` is part of the installed portable skill and its artifact digest. The root `test:unit` script discovers colocated tests under one-level `tooling/*/` modules, so the README writer can keep its authoritative source and primary tests together outside `moldea/` while publishing a deterministically generated runtime artifact without shipping test files.
- `docs/release-evidence.md` and the root `README.md` document the existing repository-bound evidence pin. `tooling/release-identity/pin-evidence.mjs` supports `--scope all --from v5.0.0 --reason ...` and flattens a selected section that is already pinned. The `v5.0.0` envelope contains fresh qualification evidence but semantic evidence pinned directly to commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`.
- The current source verifier imports the current semantic-case validator before checking an immutable source commit. Four valid cases at the flattened `v5.0.0` semantic source use probe variants that were later removed, so pinning fails before writing even though the source result, attempt, artifact digests, complete 74-case inventory, resource budgets, and prior envelope are passing and self-consistent. This is a provenance-boundary defect: current schema evolution must not invalidate already published evidence.
- The website currently resolves a pinned semantic source through the current semantic attempt model. Once the obsolete cases are replaced, the suite digest changes and the old attempt is intentionally excluded from current-contract history. `website/src/lib/generation/generation.ts` would therefore throw while trying to find that old attempt unless pinned provenance is represented independently.
- The same identity change affects qualification presentation. Once initialized profile fixtures change, every current profile digest changes and current attempts disappear from the current-contract model. The qualification overview and profile pages currently render `profile.currentStatus`, `currentLatest`, and attempt counts even when release evidence is pinned, which would contradict the pinned-passing release notice unless prior provenance and current pending state are separated.
- Milestone 1 is complete and published on `development` as `fc49341e30505ee53063302152d731bbdb6d7aed`. Milestone 2 implementation and its free pre-pin checks are complete in the worktree. The first `v5.0.0` pin attempt failed before writing because of the source-verifier defect above; no release-evidence envelope or historical artifact was changed.

## Desired behavior

### Technical runtime compatibility

Runtime evaluation will keep four independent, technical evidence boundaries:

1. canonical `moldea` state establishes the declared runtime assignment and relationships;
2. repository source, wiring, contracts, and tests establish behavioral and integration fit;
3. local CLI composition establishes executable adapter availability and exact local package closure;
4. the current packages publication establishes published technical targets, package ranges, patterns, provider limits, runtime guidance, implementation state, repository-format support, and verification dates.

No boundary will establish or require maturity. Runtime readiness will be a scoped conclusion from a matching technical target, compatible package versions, local adapter availability, and sufficient repository-owned behavioral and integration evidence. It will not be a blanket stability or product-readiness claim. An unavailable or malformed publication will block only conclusions that require its current technical fields. It will not erase a canonical runtime assignment, local adapter availability, or repository behavior established independently, and it will never force the actor to invent or fall back to `custom`.

The runtime publication validator will require only the technical fields it consumes. Additive website-only fields will be tolerated but ignored. The repository-owned publication fixture will omit `maturity`, ensuring that future tests cannot accidentally depend on it.

### Canonical managed README block

The one canonical logical block will be:

```markdown
<!-- moldea:start -->

For every repository task, select the repository-installed `moldea` skill so its two-byte relevance gate can test the host-known paths. If the gate does not match, continue without `moldea`.
Canonical moldea project state lives under `/moldea/**`; start at `/moldea/project.md`.
<!-- moldea:end -->
```

The blank line after `<!-- moldea:start -->` is intentional source formatting. It separates the ownership marker from the paragraph and makes the managed region readable as Markdown; it is not a separate heading or functional activation signal. The canonical asset will end with one newline.

Initialization will use one deterministic bundled writer rather than asking the model to reproduce the block. The writer will:

- accept only an absolute repository root and operate only on its root `README.md`;
- read at most the established 2 MiB README limit, reject invalid UTF-8, symbolic links, and non-regular files, and never follow a file-level link;
- create a missing README with only the canonical block;
- append the block when neither marker exists, without altering existing bytes;
- replace exactly one ordered managed region with the canonical block, allowing explicit initialization to normalize an older block without preserving its old wording;
- reject duplicate, unpaired, or reversed markers before writing;
- validate the decoded UTF-8 structure but splice the original byte prefix and suffix around the replacement so a BOM, mixed line endings, and every other byte outside the managed region remain untouched;
- render the inserted block consistently with the opening marker's line ending when replacing a region, use CRLF when an appended README consistently uses CRLF, and otherwise use LF, including for a new or newline-free README; never normalize unrelated existing line endings;
- use one same-directory temporary file and atomic replacement, preserve an existing file mode, remove temporary artifacts on failure, and produce only a compact success or error result;
- make a second invocation a byte-identical no-op.

The relevance gate will reuse the same canonical parser and template. A repository will count as adopted only when both canonical files are bounded regular files and the README contains exactly one canonical managed region. Legacy or malformed blocks will return the existing two-byte miss, while an explicit initialization request can invoke the writer to normalize them.

## Architecture and ownership

### Portable skill files

- Add `moldea/assets/managed-readme-block.md` as the sole source for the canonical managed text. No other fixture or instruction will own an independently written template.
- Add `tooling/managed-readme/managed-readme.template.mjs` as the authoritative writer implementation and valid importable source template. It will own bounded byte-preserving README parsing, newline-aware rendering, exact validation, safe replacement, and the closed direct-CLI contract. Its exported construction boundary will accept the canonical managed-block text explicitly so its colocated unit tests exercise the real implementation without depending on generated files.
- Add `tooling/managed-readme/managed-readme.template.test-unit.mjs` beside that implementation for the complete writer behavior matrix. Add `tooling/managed-readme/generate-portable.mjs` and `tooling/managed-readme/generate-portable.test-unit.mjs` in the same directory. The generator will read the authoritative implementation template and `moldea/assets/managed-readme-block.md`, replace exactly one reserved literal with the JSON-escaped canonical block, and either atomically write or check the self-contained `moldea/scripts/managed-readme.mjs` artifact. Missing or duplicate replacement points, invalid canonical asset bytes, or any generated-byte drift will fail closed.
- Add `moldea/scripts/managed-readme.mjs` only as that deterministic generated runtime artifact. It will contain no development-only test code, import no development tooling, and expose the closed initialization command required by `moldea/SKILL.md`. The generated header will identify its authoritative inputs and regeneration command; manual edits are invalid.
- Add `managed-readme:generate` and `managed-readme:check` package scripts and make `release:check` require `managed-readme:check` before tests or evidence validation. Update the portable-skill identity checks to reject test artifacts anywhere under `moldea/`. The source template is the sole implementation authority, the Markdown asset is the sole managed-text authority, and the generated script is the only shipped execution path.
- Update `moldea/scripts/relevance-gate.mjs` to import the managed-block validator instead of checking marker ordering itself. Its invocation and `1\n` or `0\n` output contract remain unchanged.
- Update `moldea/SKILL.md` and `moldea/references/continuous-maintenance.md` so successful initialization invokes the managed-README writer after foundation sufficiency is established and before the final launcher-backed `validate`. The helper is not a substitute for structural validation and does not increase the bounded moldea CLI-call allowance.
- Update `moldea/references/runtime-compatibility.md`, `moldea/references/agent-system-planning.md`, and `moldea/references/agent-design.md` to use only the technical evidence model above. Remove every maturity decision branch rather than retaining alternate wording.

### Runtime-publication tooling and semantic coverage

- Update `tooling/runtime-compatibility-publication/publication.mjs` and `fixtures/tooling/runtime-compatibility-publication.json` so target validation no longer requires or interprets `maturity`. Retain validation for target identity, kind, language, verification date, packages, adapter implementation, runtime guidance, and repository-format support.
- Update `tooling/runtime-compatibility-publication/publication.test-unit.mjs` to prove that a publication without maturity is valid, duplicate identities and malformed technical fields still fail closed, and arbitrary additive website metadata does not influence the validated technical contract.
- Rewrite maturity wording in the existing runtime scenarios `plan-runtime-inventory-insufficient-evidence`, `available-runtime-insufficient-behavioral-evidence`, `runtime-publication-unavailable`, `runtime-publication-malformed`, and `installed-adapter-without-published-target` without weakening their evidence-separation or safe-refusal requirements.
- Rename `published-supported-target-not-installed` to `published-target-not-installed` and rename its evaluator publication variant accordingly. It will continue to prove that a published target does not imply local executable availability or repository wiring.
- Replace `experimental-target-not-production-ready` with `published-target-version-mismatch`. The replacement will provide a valid OpenAI target whose required package range excludes the repository's installed provider version. The expected result will preserve the canonical runtime identity, report local adapter availability separately, identify the exact package-range mismatch, withhold a positive technical-compatibility conclusion, make no writes, and avoid inventing maturity or selecting `custom`.
- Update `tests/semantic-evaluation-runner.mjs`, `tests/semantic-evaluation-runner.test-unit.mjs`, `tests/semantic-evaluation-runner.test-integration.mjs`, `tests/conformance.test-unit.mjs`, `fixtures/semantic-evaluation-coverage.json`, and `website/src/lib/semantic-evaluation/constants.ts` to use only the new case and variant identifiers. The current suite will remain at 74 cases; obsolete identifiers will be removed, not aliased.
- Update the evaluator host command classifier in `tooling/codex-evaluation-host/execution-evidence.mjs` and its unit tests so only the exact bundled managed-README invocation is recognized as a local, non-networking skill operation. Near matches, arbitrary Node programs, alternate paths, extra arguments, or shell compositions will continue to fail closed. The writer will not be counted as a moldea CLI evidence call, while the final `validate` will remain required.

### Initialization fixtures and qualification coverage

- Replace every live initialized qualification seed block under `qualification/profiles/t*/cases/*/seed/README.md` with the canonical block, including the shortened Custom `c11` and `c12` variants. Preserve each fixture's project-specific README content outside the markers.
- Replace the initialized expected block in `qualification/profiles/t5/cases/c2/expected/README.md` with the same canonical block. Leave intentionally uninitialized Custom fixtures without markers.
- Strengthen `qualification/src/compatibility/loader.test-integration.ts` so adopted fixtures must contain the exact canonical logical block rather than merely both markers, while explicitly unadopted case IDs must contain neither marker.
- Update the Custom profile documentation and any current qualification fixture descriptions that call the old block standard. Do not rewrite recorded qualification results or attempt artifacts; they remain immutable evidence at their source commit and will not be presented as current-contract attempts.
- Update semantic project seeding and initialization assertions so initialized synthetic repositories begin with the exact canonical block, and successful initialization must produce it regardless of whether the root README originally existed or already contained unrelated project content.

### Pinned evidence and website presentation

- Keep the existing release-evidence envelope and pin command as the single provenance mechanism. Do not add an override flag, legacy evidence resolver, duplicated registry, or hidden bypass.
- Refactor `tooling/release-identity/release-evidence-source.mjs` so immutable semantic sources are authenticated from their committed files, recorded digests, unique case inventory, passing result, bounded resource evidence, attempt linkage, and direct source provenance without applying the current case-definition or coverage schema. Recompute the stable suite and coverage hashes directly from source JSON records. Do not execute source-owned code or introduce protocol-version branches, historical schema copies, aliases, migrations, or fallback acceptance. Keep the current strict semantic validators in the current-evidence path.
- Extend `tooling/release-identity/evidence.test-integration.mjs` with source-schema-drift coverage that proves a valid published source remains pinnable after current evaluator vocabulary changes, while malformed inventories, digest drift, failed cases, and over-budget evidence remain rejected.
- Update `docs/release-evidence.md` and the root release documentation to describe pinning as an explicit maintainer risk decision. The reason must state what changed and what deterministic checks replace a fresh paid run; the public site must not imply that the earlier model evidence exercised the new candidate.
- Rename the internal website model field `semanticReleaseAssurance` to `currentSemanticAssurance`. In `website/src/lib/generation/generation.ts`, resolve only current-contract assurance through the current semantic attempt loader. A pinned section will remain verified release provenance but will not be looked up in or coerced into the current 74-case attempt model.
- Update `website/src/pages/evidence/semantic/index.astro`, `website/src/pages/evidence/index.astro`, and `website/src/components/home-page/home-page.astro` so pinned semantic evidence displays verified prior provenance and its resolved source label without a fabricated `74/74` claim. The semantic page will show the current 74-case contract as pending until it is evaluated, retain only current-contract attempt history, and link the immutable source through the existing release-evidence notice. It will not recreate pages, labels, or case rows for the obsolete suite.
- Apply the same distinction to qualification. Update `website/src/pages/evidence/qualification/index.astro`, `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro`, the evidence overview, and the home-page qualification metric so the pinned aggregate is identified as verified prior evidence while all changed current profiles, attempt counts, and effective results remain visibly pending. Prior attempts will be inspected only through the immutable source link and will not be loaded or relabeled as current profile attempts.
- Update `website/src/lib/model/types.ts`, `website/src/lib/generation/generation.test-unit.ts`, the semantic, qualification, evidence-overview, and home-page end-to-end tests, generated LLM text, and directly affected release-evidence loader assertions. Existing accessible components and design-system primitives will be reused; no new UI primitive or visual redesign is needed.

## Documentation synchronization

Update current-state documentation wherever it still presents maturity as technical runtime input or shows a noncanonical initialization block:

- `README.md`, including the portable tree, initialization contract, compatibility summary, evidence-pin explanation, and release version;
- `docs/getting-started.md` for the exact initialization result and `v5.0.1` install examples;
- `docs/how-it-works.md`, `docs/planning-agent-systems.md`, `docs/compatibility-and-local-tooling.md`, `docs/adapter-qualification.md`, and `docs/designing-agents.md` for the technical runtime evidence boundary;
- `docs/release-evidence.md` for transparent maintainer-selected evidence reuse;
- `qualification/profiles/t5/README.md` for the Custom qualification boundary after maturity removal.

Documentation will state clearly that packages-website maturity labels are presentation metadata and do not affect skill behavior, technical compatibility, qualification, or canonical unresolved state. It will not instruct users to retrieve missing maturity or create a custom adapter because a label is absent.

## Release identity and evidence

1. Bump the skill release from `5.0.0` to `5.0.1` in `package.json`, the root `package-lock.json`, `moldea/SKILL.md`, `moldea/references/local-tooling.md`, root and getting-started documentation, and current-version assertions. Leave generic parser fixtures that intentionally use `5.0.0` as arbitrary test data unchanged unless they represent the active release identity.
2. Run focused source tests plus the free semantic preflight and qualification dry run that do not require the active release envelope. Then run the existing pin command for both domains from `v5.0.0` before any website or full release check. This ordering is required because the old envelope targets `5.0.0` and website loading must reject it after the `5.0.1` version bump.
3. Use a concise pin reason that explicitly identifies the removal of website-owned maturity coupling and deterministic README standardization, states that prior passing evidence is retained by maintainer decision, and does not claim that the old evidence evaluated the new semantic or qualification contracts. Verify the resulting target version, portable-skill digest, dependency-closure digest, qualification source tag, and flattened semantic source commit before public generation.
4. Commit the resulting `fixtures/release-evidence.json`. Do not modify historical semantic attempt data, qualification attempts, source evidence, or immutable tags. Any later change that affects the target portable skill or dependency-closure digest requires regenerating the pin before website and release checks.
5. Run website validation and the full release check without a target-tag environment variable before publication. After the reviewed commit is published through the repository workflow, merge through the established branch process, create the immutable `v5.0.1` tag on the exact reviewed release commit, and run the tag-bound release check in the publication workflow. No force-push, moved tag, or history rewrite is required.

There is no data migration, rolling compatibility period, or application rollback path. Before tagging, rollback is removal or correction of the candidate changes on the development branch. After tagging, any defect is corrected in a new release rather than restoring maturity logic or alternate README templates.

## Ordered implementation steps

1. Introduce the canonical managed-block asset, authoritative writer source template, colocated writer and generator tests, deterministic portable-artifact generator, and checked-in generated script. Add the package generation and drift-check commands, require the check from the release boundary, reject portable test artifacts, and then make the relevance gate consume the generated script's exact parser. Complete adversarial writer, generator, artifact-drift, and gate tests before changing fixtures.
2. Update skill initialization instructions and every live semantic and qualification initialization fixture to use the writer-owned block. Strengthen fixture and exact-output assertions while preserving unrelated README content.
3. Remove maturity from portable runtime guidance, the technical publication validator, its fixture, and public current-state documentation. Replace the two maturity-shaped semantic cases and synchronize all evaluator variants, coverage mappings, titles, and conformance assertions while retaining 74 total cases.
4. Update evaluator command-policy recognition for the closed writer command and verify that unsafe near matches remain rejected.
5. Decouple pinned semantic and qualification provenance from current-contract attempt rendering, then update both evidence detail areas, the overview, home-page metrics, model types, generated LLM text, and focused unit/end-to-end coverage.
6. Make immutable semantic source verification independent of the current evaluator schema while retaining cryptographic linkage, complete passing inventory, resource containment, and attempt-evidence checks. Synchronize release identity to `5.0.1`, run focused source checks plus free semantic preflight and qualification dry-run checks, pin both evidence sections through `v5.0.0` with the honest release-specific reason, verify the flattened direct sources and target digests, and only then run website and complete release verification.
7. Review the complete diff for obsolete maturity terminology, alternate current README blocks, old semantic IDs, accidental historical-evidence edits, unexpected paths, and version drift before publication.

## Tests and verification

### Managed README behavior

Focused tests will cover:

- missing README creation;
- insertion after unrelated LF and CRLF README content;
- replacement of one legacy managed region;
- exact canonical no-op behavior;
- preservation of bytes, content, and file mode outside the region;
- final newline behavior, deterministic inserted-block line endings, BOM preservation, and byte-identical preservation of pre-existing mixed line endings outside the block;
- duplicate, unpaired, and reversed markers;
- symbolic-link, non-regular, invalid-UTF-8, and over-limit README inputs;
- write failure without target corruption or abandoned temporary files;
- exact adoption-gate success and legacy or malformed gate misses;
- closed argument parsing and compact output.

`tooling/managed-readme/managed-readme.template.test-unit.mjs` will own the writer's behavior tests beside its authoritative implementation. The colocated generator test will own deterministic generation, exact single-point asset injection, write and check modes, and stale-artifact rejection. The established `tests/conformance.test-unit.mjs` portable-artifact boundary will separately exercise the generated installed script and relevance-gate integration. Portable identity tests will prove that no `*.test-unit.*`, `*.test-integration.*`, `*.test-e2e.*`, or `*.test-bench.*` artifact can enter `moldea/`. This satisfies test co-location without shipping tests or creating a second implementation authority.

### Runtime and evaluator behavior

Focused tests will prove:

- publications without maturity validate;
- additive website-only fields do not become technical inputs;
- malformed technical fields and duplicate target identities still fail closed;
- unavailable, malformed, absent-target, locally unavailable, and version-mismatch scenarios preserve independent facts and withhold only unsupported technical claims;
- the removed semantic IDs and probe variants no longer exist;
- the replacement suite still has 74 unique, covered cases;
- the deterministic managed-README command is classified safely only in its exact form;
- current-contract semantic history cannot resolve or relabel an earlier-suite pinned attempt;
- current qualification profiles cannot resolve or relabel prior-profile pinned attempts;
- pinned qualification pages distinguish verified source provenance from pending current profile status and attempt counts;
- pinning through `v5.0.0` resolves qualification to the release tag and flattens semantic evidence to commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`.
- immutable semantic source verification tolerates source-schema vocabulary that is no longer accepted for new current cases, while rejecting digest drift, duplicate or incomplete inventories, failed cases, and resource-budget violations.

### Commands

Run the narrowest focused tests while implementing, followed by these repository boundaries:

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
npm run release:evidence:pin -- --scope all --from v5.0.0 --reason "<honest release-specific reason>"
npm run website:check
npm run release:check
```

`npm run eval:semantic` and non-dry-run `qualification` commands are explicitly excluded. The pin source itself remains fully validated by `release:check`; no result will be edited or marked passed by hand.

Formatting will use the repository's installed Prettier configuration on only touched files before the final checks. Website verification must retain keyboard accessibility, focus visibility, 320 px responsiveness, light and dark themes, and the existing no-serious-axe-violations checks. The UI change contains no new motion and no React runtime code.

## Risks and controls

- **Pinned evidence could be mistaken for current-contract evidence.** Semantic and qualification pages will keep source provenance and current contract state separate, omit fabricated current counts and statuses, and never load old cases or attempts through current definitions.
- **A chained pin could obscure the actual semantic source.** The pin verifier's existing flattening behavior remains authoritative, the generated envelope is checked for the direct semantic source commit and qualification source tag, and public copy uses those resolved labels rather than assuming both came directly from `v5.0.0`.
- **Current schema evolution could invalidate immutable evidence.** The source verifier will enforce protocol-independent cryptographic, inventory, passing-result, budget, and attempt-linkage invariants without executing historical code or accepting data through a permissive fallback. Strict current-schema validation remains isolated to current evidence.
- **Strict adoption could strand an old block.** This is intentional clean-slate behavior. The cheap gate abstains on a noncanonical block, while explicit initialization can normalize exactly one safe marker pair through the deterministic writer.
- **README replacement could damage user content.** Parsing completes before any write, replacement splices the original raw-byte prefix and suffix, only the bounded marker region can change, existing BOM and mixed line endings remain untouched outside that region, the file mode is preserved, and adversarial failure cases are tested.
- **Generated runtime code could drift from its source or canonical text.** Generation has one exact replacement point, the produced file identifies its inputs, colocated tests cover deterministic output, the check-only command compares complete bytes, portable identity rejects development tests, and `release:check` fails before evidence validation when the committed artifact is stale.
- **Removing maturity could accidentally weaken technical checks.** Package ranges, target identity, provider limits, patterns, verification dates, runtime guidance, implementation state, local composition, repository wiring, and behavioral evidence remain independently required and tested.
- **Changing live fixtures invalidates current evidence identities.** That is expected. Historical qualification evidence remains at `v5.0.0`, historical semantic evidence remains at its flattened original commit, the current suite and qualification profiles become pending, and the release pin records the maintainer decision without pretending the identities match.
- **A version bump could drift across artifacts.** Existing release identity checks remain authoritative and will run after the pin is recorded.

## Acceptance criteria

- No active portable-skill instruction, current documentation, technical publication validator, live fixture, current semantic case, coverage mapping, or website label treats runtime maturity as a technical input.
- A missing maturity field cannot block official adapter selection, and its absence cannot cause the skill to invent a custom adapter or unresolved maturity requirement.
- Technical target, package-range, local-composition, repository-behavior, and integration-evidence failures remain explicit and fail closed.
- Every successful initialization produces the canonical managed block shown in this plan, including the blank line after the opening marker and one final newline, while preserving README content outside the markers.
- The checked-in portable writer is deterministically generated from its sole implementation and managed-text authorities, the release check rejects any byte drift, and no test artifact is distributed under `moldea/`.
- The relevance gate reports adoption only for that canonical block plus the two required bounded regular canonical files.
- All live initialized semantic and qualification fixtures use the same block; intentionally uninitialized fixtures remain uninitialized.
- The semantic suite contains exactly 74 unique current cases, includes the new package-version-mismatch boundary, and contains no obsolete maturity case IDs or aliases.
- Pinned prior evidence remains visible with its direct provenance: qualification resolves to `v5.0.0` and semantic evidence resolves to commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`. No public page reports either source as current-contract evidence, fabricates current semantic or qualification counts, or recreates obsolete case or attempt pages.
- Published evidence remains pinnable across evaluator-schema evolution only when its committed definitions, stable digests, complete result inventory, resource budgets, attempt files, and envelope linkage are self-consistent and passing.
- Release `5.0.1` passes unit, integration, free semantic preflight, qualification dry-run, qualification static checks, website checks, path checks, and `release:check` without invoking a paid model evaluation.
- Historical result and attempt artifacts, external repositories, and `skill-mock` remain unchanged.
- The final diff contains one authoritative implementation for each behavior and no backward-compatible maturity or alternate-block path.

## Execution scope

Implement and release `moldea` skill `5.0.1` entirely within this repository by removing runtime-maturity coupling, adding one authored and colocated-tested raw-byte-preserving README writer with a deterministically generated test-free portable artifact and exact adoption check, synchronizing all live semantic and qualification fixtures and current documentation, replacing obsolete maturity semantic coverage while retaining 74 cases, separating pinned semantic and qualification provenance from pending current-contract website evidence, pinning through `v5.0.0` while preserving each section's flattened direct source, and completing all deterministic verification and normal reviewed publication steps without modifying external repositories, historical evidence, or the Eve adapter.
