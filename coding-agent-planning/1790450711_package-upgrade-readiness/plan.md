# Skill package upgrade and evaluation readiness

## Objective and scope

Prepare the next skill version to use the upgraded packages, consume the corrected Website UI release, and leave semantic evaluation and adapter qualification ready for subsequent execution.

The implementation will:

- Correct the Astro dependency mismatch in `../packages`, verify the affected package and website, and publish Website UI `1.10.2` through the established release workflow.
- Prepare skill `6.0.0` for CLI `9.0.0`, Core `5.0.0`, and CLI JSON schema `5`.
- Teach the skill and its deterministic consumers to distinguish confirmed errors from scoped unverified-relationship warnings.
- Update semantic cases, qualification profiles, fixtures, deterministic verification, and evidence contracts for the new packages.
- Upgrade the skill website, verify its examples and shared interactions, and synchronize affected documentation.
- Run deterministic checks, semantic preflight, and model-free qualification dry runs. Finish with a concrete handoff for the later model-backed runs.

This phase excludes model-backed semantic evaluation, model-backed qualification, provider calls, evidence publication or selection, skill release tagging, and skill production website deployment. It also excludes new adapter targets, Hosted Agents API work, changes in the platform repository, general dependency modernization, and redesign of the skill's activation or authorization behavior.

No API key is needed for this preparation. Registry access, GitHub release infrastructure for Website UI, and local browser binaries are separate prerequisites.

## Current evidence

Inspection on 2026-09-26 established the following `development` baselines. The revision rechecked the same commits: packages remains clean, and the skill worktree contains only the untracked planning directory. Implementation has not started.

| Repository | Inspected HEAD                             | Relevant current state                                                                                |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `packages` | `5a76d3d6c058bfaa79790f5b0527b817fd65957f` | CLI 9, Core 5, schema 5 and the adapter upgrades exist. Website UI is 1.10.1.                         |
| `skill`    | `fccd044ba62bff6be176bdfb3544c73c9ad72554` | Skill 5.0.13 uses CLI 8.0.0, supports Core `^4.0.1`, expects schema 4, and consumes Website UI 1.9.1. |

The plan is grounded in both root READMEs; package manifests and lockfiles; package CLI/Core contracts and adapter documentation; `src/portable/`; `src/release/`; semantic execution and case setup; qualification contracts, profiles, compatibility loading, project preparation and deterministic verification; website generation, shared-component consumers and Playwright configuration; and the existing release/evidence workflows.

Specific findings that determine the implementation:

1. Website UI pins Astro `7.2.2` in both peer and development dependencies. The packages website also uses `7.2.2`. The skill website uses `7.2.8` with a root override to accommodate the old UI peer. Astro's advisory identifies versions below `7.2.8` as affected when processing attacker-controlled AVIF images; `7.2.8` contains the fix. This does not establish that either static website has been exploited. [Astro security advisory](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2)
2. The portable launcher validates local package eligibility, command arguments and process/output boundaries. It deliberately does not interpret the complete CLI result. `src/semantic/execution/actor-evidence.ts` separately projects safe facts for evaluation.
3. The release updater currently names generated `moldea/scripts/repository-package.mjs` in its replacement lists, while the authoring constants live in `src/portable/repository-package.ts`. Updating the generated file alone cannot survive regeneration, and other bundled helpers can retain old constants.
4. The semantic CLI fixture currently shares an incomplete result shape between `inspect` and `validate`. Updating its manifest version alone would leave incorrect examples of the machine contract.
5. Qualification's direct verifier compares validity, diagnostics and evidence, but omits the new error/warning totals. Scenario expectations primarily match diagnostic codes and evidence kinds, which cannot distinguish a correctly unresolved relationship from unrelated positive evidence of the same kind. The direct verifier also reduces its emitted records to codes and kinds. Cloudflare and Vercel expose deferred-loading state in evidence details; LangGraph exposes interrupt form and resume-schema role there; version-dependent warnings expose package, declaration and boundary context. These claims require explicit metadata assertions against direct Core results, because matching a record kind and identity alone cannot establish the reported interpretation.
6. There are 14 qualification targets, including Custom and multiple implementations of some adapters. Their compatibility snapshot and probes predate the package upgrades. The snapshot updater validates profile coverage before writing, so profiles must be reconciled with the new publication before the refresh can succeed.
7. Qualification installs exact profile runtime packages and requires matching root fixture declarations. That reproducibility contract should remain intact.
8. `evidence/selection.json` has both domains set to `null`. Synthetic and development website checks are available; production generation and complete release assurance require selected official evidence.

## Target contracts

### Versions and support policy

| Surface                | Planned value or policy                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Skill candidate        | `6.0.0`; synchronized metadata, without creating a release tag in this phase                                                        |
| Development CLI        | Exact `@moldea.ai/cli@9.0.0`, with the resolved published closure recorded in `package-lock.json`                                   |
| Eligible project CLI   | Stable versions satisfying `^9.0.0`                                                                                                 |
| Eligible project Core  | Stable versions satisfying `^5.0.0` and the installed CLI's Core declaration                                                        |
| CLI JSON schema        | `5`                                                                                                                                 |
| Repository format      | `1`, unchanged                                                                                                                      |
| Portable runtime       | Existing Git `>=2.30.0` and Node.js `>=22.11.0` contracts                                                                           |
| Development runtime    | Existing Node.js 24 and repository package-manager contracts                                                                        |
| Website UI             | Exact `1.10.2` in both skill consumers after publication                                                                            |
| Astro                  | Exact `7.2.8` in the UI peer, UI development fixture and both websites; remove the skill override after verifying normal resolution |
| Evaluator protocols    | Semantic `26`; qualification evidence `12`                                                                                          |
| Public evidence bundle | Format `1`, unchanged                                                                                                               |

Website UI `1.10.2` was absent from the registry during inspection. Recheck before release preparation; a conflicting intervening publication requires updating the proposed patch identity before proceeding.

The skill major changes because its required CLI/Core major contracts change. This does not introduce exact-version eligibility for user projects. Compatible CLI patches and minors remain eligible without a new skill release. Provider SDK eligibility retains the packages' minimum-only ranges; qualification uses exact versions for reproducibility. No freshness deadline, maximum provider version, automatic dependency upgrade, or automatic switch to Custom is added.

The Astro correction preserves the current exact-peer policy and aligns it with the version already used by the skill website. Broadening framework peer support is outside this change.

### Native handling of warnings

| Observed result                                              | Required interpretation                                                                                                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completed valid result, zero errors and zero warnings        | Structural validation passed. This alone does not prove semantic alignment or provider behavior.                                                                       |
| Completed valid result, zero errors and one or more warnings | Structural validation passed with specific unverified relationships. Continue authorized work that those unknowns do not prevent, and report the material limitations. |
| Completed invalid result with confirmed errors               | Validation failed. Repair only supported defects within the authorized scope, then validate the changed state.                                                         |
| Malformed, contradictory, interrupted or unsupported output  | No validation conclusion. Preserve the existing failure and output-boundary handling.                                                                                  |

Warnings must neither trigger an automatic repair loop nor disappear behind a success claim. A request to verify the affected relationship remains unresolved until suitable evidence establishes it. An unrelated warning does not authorize broad investigation or block unrelated work. A warning must not cause dependency pinning, a manifest rewrite or a runtime change merely to obtain a clean result.

Use the actual command contracts:

- `validate`: complete `diagnosticCount`, `errorCount`, `warningCount`, `valid`, and a bounded diagnostic page.
- `inspect`: complete `counts.diagnostics`, `counts.errors`, `counts.warnings`, other inventory totals, `valid`, and the selected bounded record page.
- Diagnostic records: required `severity`; warning context uses the package's closed relationship/reason contract. Error records do not gain arbitrary `details`.
- `scope`: its own relevance and diagnostic-count contract. It does not run adapters and must not be given invented warning-total fields.
- `content` and `composition`: retain their existing command-specific result contracts.

Totals describe the complete result on every page. An empty page or a page containing only warnings does not establish that the complete result has no errors. Reading all pages remains necessary only when the task requires complete records, not merely to recover totals already provided.

## Architecture and ownership

Keep the existing boundaries:

1. Packages own SDK interpretation, diagnostics, evidence and compatibility publication.
2. Portable TypeScript sources own the launcher and package resolver. The generator owns shipped `.mjs` artifacts.
3. Skill instructions own the coding agent's decisions about scope, evidence, uncertainty and communication.
4. The existing semantic evidence projector owns bounded, privacy-safe facts about completed commands.
5. Qualification owns exact installations, realistic fixtures, direct Core/Repository FS verification, CLI checks and future judge criteria.
6. Website UI owns shared interactions. The skill website owns its examples and evidence presentation.

Do not introduce a second SDK analyzer, a full JSON parser inside the portable launcher, a new compatibility service, or duplicate UI primitives. Remove superseded schema-4 examples and current-consumer code paths. Preserve intentional negative fixtures and immutable historical evidence with their original identities.

## Ordered implementation strategy

### 1. Correct and publish the Website UI prerequisite

In `../packages`, change:

- `projects/website-ui/package.json`: version `1.10.2`, Astro peer and development dependency `7.2.8`.
- `projects/website-ui/src/index.test-integration.ts`: packed version assertion and isolated Astro consumer dependency.
- `projects/website-ui/README.md`: installation and exact peer contract.
- `apps/website/package.json` and `pnpm-lock.yaml`: the aligned Astro dependency and resolved closure.
- The directly affected current handoff in `docs/launch-readiness.md`; preserve historical results as historical, without assigning old test results to the new patch.

Verify the real packed UI package in an isolated Astro consumer, the packages website build and browser interactions, and the resolved Astro/Sharp closure. Do not suppress peer failures with a new override. No UI API change or adapter republishing is required for this prerequisite.

Use the existing release relevance check, signed commits, review, main-branch release workflow and trusted npm publication. Confirm the published manifest, tarball identity, peer version and registry availability before the skill installs it. The packages website's existing main-branch deployment may run as part of this prerequisite; the skill website deployment remains deferred.

**Review checkpoint:** only the intended UI package is newly selected for publication; the packed artifact uses the corrected framework contract; affected CI passes; the release is available; development retains all completed work.

### 2. Upgrade the skill identity and repair the update path

Update `package.json`, `package-lock.json`, `moldea/SKILL.md`, `src/portable/repository-package.ts`, `src/release/constants.ts`, `src/release/updater.ts`, `src/release/identity.ts`, their relevant tests, and the managed identity references enumerated by the release module.

Make the release updater target the authoring TypeScript constants and maintained metadata instead of editing generated helper text. Make `updateCliRelease` asynchronous and await the existing portable generator before its final identity assertion; update `src/release/update-cli.ts` and callers accordingly. Include the generator-owned outputs in the updater's captured state, conflict detection and rollback so a failed update cannot leave source and shipped helpers inconsistent. Do not introduce a second generator. Identity verification must check the authoring ranges and shipped resolver, while `portable:check` verifies every generated artifact, including helpers that bundle the resolver.

Use the corrected `npm run release:update-cli -- 9.0.0` flow, then synchronize the skill candidate version to `6.0.0`. Update the semantic CLI fixture manifest from the actual published CLI dependency inventory. Preserve intentionally incompatible versions and schemas in negative cases; do not globally replace every old number.

Regenerate through `npm run portable:generate`; do not hand-edit generated `.mjs` files. Build ignored evaluator helpers through `npm run runtime:build` after their sources change.

Extend the updater integration test to exercise update, generation, identity verification and the shipped launcher together. Verify compatible CLI 9 patches/minors remain accepted, incompatible majors/prereleases fail closed, and generated artifacts cannot silently restore CLI 8/Core 4.

**Review checkpoint:** one authoritative source of identity; repeatable generation; exact development closure; unchanged local-provider, package-manager and authorization rules.

### 3. Update the portable instructions and current examples

Revise the relevant portions of:

- `moldea/SKILL.md`.
- `moldea/references/local-tooling.md` and `runtime-compatibility.md`.
- `moldea/references/evaluate-and-reconcile.md`, `project-repair.md`, `agent-design.md`, and `continuous-maintenance.md` where their existing conclusions or repair instructions are affected.
- `README.md`, `docs/compatibility-and-local-tooling.md`, `docs/evaluate-reconcile-validate.md`, `docs/getting-started.md`, and affected examples under `docs/examples/`.

Keep the entrypoint compact: the essential warning rule belongs there, and detailed command shapes and boundary interpretation belong in the existing conditional references. Preserve routing, read-only behavior, host-command precedence, relevant-owner selection, authorization, and the ordinary output budgets.

Explain that a known behavioral boundary can leave one relationship unverified while the package remains eligible. Use source and package evidence to resolve that relationship when necessary. Do not require an online lookup for ordinary compatible SDK releases or describe an open-ended range as proof of every future behavior.

Update current CLI examples to schema 5. Prefer results derived from real fixtures. Any shortened presentation must be labeled as an excerpt and visibly indicate omitted fields; an excerpt must not be offered as complete copyable JSON. Include a concise warning-only example and an invalid example showing that confirmed errors still fail.

**Review checkpoint:** the instructions neither block all work on warnings nor claim affected wiring has been verified; no duplicated adapter manual or new mandatory discovery loop is introduced.

### 4. Make evaluator facts and deterministic verification warning-aware

Extend `src/semantic/execution/types.ts` and `actor-evidence.ts` at their existing boundary. Add nullable `errorCount` and `warningCount` to the safe CLI fact: populate them from complete `validate`/`inspect` totals and use `null` where the command or error result has no such contract. Validate nonnegative safe integers, total relationships, `result.valid`, envelope status and exit-code agreement before projecting a recognized fact.

Retain the existing bounded output and content checks. Do not persist diagnostic messages, paths, declarations, source text or arbitrary warning payloads in these command facts. Missing or contradictory totals must not be normalized to zero. Existing current-protocol validators, host-output handling, checkpoints, reuse and replay projection must accept exactly the new fact contract.

Correct `fixtures/tooling/semantic-cli/bin/moldea.js` to emit distinct complete command shapes. Update relevant `fixtures/conformance-cases.json`, execution fixtures and tests. Add real-CLI integration comparisons for the consumed fields so permissive hand-authored fixtures cannot become the sole contract authority.

In `qualification/src/deterministic/direct-verifier.ts`, include complete error/warning totals in filesystem-versus-memory comparison and project the diagnostic/evidence fields required by the selectors below from the real Core results. Preserve severity, record identity, references and only the specified metadata fields. In `verifier.ts`, validate this direct-result contract, match the selectors, and validate the actual CLI command-specific aggregate fields against direct Core totals, independent of page contents. Keep metadata assertions at the direct Core boundary; CLI `inspect` does not expose arbitrary adapter evidence details.

Extend each `deterministicEvidence.before`/`after` object in `qualification/src/contracts/types.ts` with optional `errorCount`, `warningCount`, `requiredDiagnostics`, `forbiddenDiagnostics`, `requiredEvidence`, and `forbiddenEvidence`. Diagnostic selectors require `code` and `severity`, with optional `agentId`, `capabilityKind`, `capabilityId`, `relationship`, and `reason`. Evidence selectors require `kind`, with optional `agentId`, `capabilityKind`, `capabilityId`, and `reference` containing `path` and optional `symbol`. Keep existing simple kind/code assertions for scenarios where they are sufficient.

Both selector families may additionally contain a nonempty, closed `details` object with only these optional fields:

| Selector   | Allowed detail fields and values                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnostic | `packageName` and `boundaryVersion`: nonempty strings; `declaredRange`: a nonempty string or explicit `null`. These match the actual warning context.                                                |
| Evidence   | `declaredDeferredLoading`: `absent`, `enabled`, `disabled`, or `unknown`; `patternId`: a nonempty package-defined identifier; `interruptForm`: `two-argument`; `responseSchemaRole`: `resume-value`. |

Reuse the package's identifier, relationship and reason meanings. Match every specified field exactly on one diagnostic or evidence record; do not assemble a match from different records. A reference selector must match one actual evidence reference. An omitted selector field imposes no condition, while a specified missing field, wrong value or wrong type fails to match. Explicit `null` is different from absence, and the `absent` deferred-loading value must actually be reported. Required selectors need a matching record; forbidden selectors must have none. These checks must prove the expected warning and absence of positive evidence for that same relationship.

The fixed metadata projection must not copy arbitrary `details`, source bodies or diagnostic messages. Reject unsupported selector keys and invalid known values; unrelated additional producer fields must not break the projection. Do not add generic nested matching, JSONPath, an adapter analyzer, extra CLI requests, or these metadata fields to semantic command facts.

Synchronize `qualification/src/deterministic/verifier.ts`, `direct-verifier.ts`, their owning types and necessary public exports, `qualification/src/contracts/types.ts`, and the scenario reader in `qualification/src/public-evidence/types.ts`. Put the growing pure evidence-matching logic in the deterministic module's `validations.ts`, consumed by the verifier without expanding the module's public API solely for testing. Preserve the assertions through the existing public projection and bundle-reader path without weakening historical presentation validation. Document the scenario syntax in `qualification/README.md`. Add colocated `validations.test-unit.ts` and `verifier.test-integration.ts` for matching and the real verification path, extend `contracts/types.test-unit.ts`, and extend the existing public-evidence projection/loader tests. Keep the existing test categories and build exclusions.

Tests must cover warning-only validity, mixed errors and warnings, a warning alongside an independently verified relationship, totals on a nonterminal page, malformed/contradictory totals, safe projection, and mismatched relationship assertions. Add controls proving that the right kind/identity with wrong metadata fails: each deferred-loading state versus an incorrect expectation, wrong or missing interrupt metadata, and a version-dependent warning with the right relationship but incorrect package, declaration or boundary. Cover explicit null versus absence, forbidden metadata matches, fields split across records, rejected unsupported selector keys, and assertion preservation through public projection. Exercise real Repository FS, Core, CLI and owned projection paths; deliberately incorrect expectations against real results can test failure detection without replacing adapter behavior. Use test doubles only at external/model boundaries.

**Review checkpoint:** neither a warning, unrelated evidence nor a matching record with incorrect metadata can produce a false positive; confirmed errors remain failures; result interpretation has not moved into the launcher or expanded semantic command facts.

### 5. Reconcile semantic cases and all qualification targets

#### Semantic preparation

Review the affected cases under `src/semantic/cases/`, particularly runtime eligibility, Eve source boundaries, validation, repair, read-only evaluation and scope expansion. Update their setup in `src/semantic/workspace/setup.ts` and its integration tests. Use existing case discovery and coverage ownership.

Prepare a bounded set of scenarios covering:

- A warning-only result reported accurately while authorized unrelated work completes.
- A requested relationship that remains unverified across a known version boundary, without forced pinning or runtime replacement.
- A mixed error/warning result requiring repair of the actual defect.
- A read-only warning assessment that preserves files and does not expand scope.

Reuse existing cases when they already own the scenario. Add new case modules only for genuinely distinct behavior. Retain later-stable eligibility and incompatible-package negative controls. Run fixture setup and deterministic assertions independently of actor/judge execution; preflight alone does not exercise fixture setup.

#### Qualification preparation

Retain the 14 existing target IDs in `qualification/profiles/index.yaml`. Update their `profile.yaml`, `probes/claims.yaml`, affected `cases/*/scenario.yaml`, tasks, seed/expected sources and package manifests, plus the corresponding profile READMEs. Custom continues to own universal journeys; adapter profiles continue to own adapter-specific behavior.

The finite coverage review is:

| Profiles              | Required reconciliation                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| t1 Anthropic          | Direct create/parse/stream request family, agent output schema, and effective request options, including invalid wiring controls.                                                                           |
| t2 Claude Agent SDK   | Current direct query/system prompt forms, programmatic definitions and existing delegation/MCP boundaries.                                                                                                  |
| t3–t4 Cloudflare      | Deferred-loading declarations and Think instruction precedence, including `configureContext` and a declaration spanning the 0.18.0 boundary.                                                                |
| t5 Custom             | New CLI/Core result interpretation while retaining the shared universal journey ownership.                                                                                                                  |
| t6 Eve                | Workspace agents/subagent references, workflow declarations, tool exposure/default namespaces, test-source exclusions, and removal of agent `outputSchema` at 0.67.0. Tool output schemas remain supported. |
| t7 Google Gen AI      | Current direct generation/streaming forms and explicit unsupported chat/live/interaction boundaries.                                                                                                        |
| t8 LangChain          | Preserve supported strategies/tools and conservative middleware conclusions under Core 5; change cases only where outputs or expectations require it.                                                       |
| t9–t10 LangGraph      | Current interrupt form, graph/functional boundaries and absence of unsupported routing claims.                                                                                                              |
| t11 OpenAI            | Responses create/parse/stream, output schema and effective request options.                                                                                                                                 |
| t12 OpenAI Agents SDK | Preserve direct agents, handoffs and routing-description uncertainty with current packages.                                                                                                                 |
| t13–t14 Vercel AI SDK | Deferred-loading declaration evidence and existing preparation/override boundaries.                                                                                                                         |

Use the exact current SDK versions already verified by the packages upstream suite: Anthropic `0.128.0`, Claude Agent SDK `0.3.282`, Think `0.19.0` with agents `0.24.0`, Eve `0.67.0`, Google Gen AI `2.24.0`, LangChain `1.5.12`, LangGraph `1.4.18`, OpenAI `7.23.0`, OpenAI Agents SDK `0.18.0`, and AI SDK `7.0.116`. Match their applicable reviewed companion pins, including LangChain Core `1.2.12`, MCP SDK `1.30.1` for Claude, and Zod `4.3.6`. Retain AIChat `0.10.2` and its existing target unless its actual integration fails. Synchronize directly related fixture-development dependencies in `qualification/package.json` and the root lockfile; do not update unrelated tools.

Typecheck each prepared project against its exact installed SDK. The current Eve positive fixtures must remove the obsolete agent output option and binding. A negative stale-binding scenario can reference an existing exported schema from the manifest while keeping current SDK source type-correct, then verify the confirmed feature error and its proper repair.

For a declaration-spanning warning, use a realistic nested source-owning package declaration and keep the installed root qualification closure exact. Verify nearest-manifest resolution explicitly. Do not weaken the installer's exact-version checks or add a per-case dependency override system. Historical minimum/boundary compiler matrices remain owned by the packages suite; the skill qualification reports only its exact tested closure.

For each changed compatibility claim observable in Core results, require concrete deterministic fixture assertions. Use narrowly stated semantic criteria for actor judgment and communication; they cannot substitute for checking the adapter's reported metadata. In the existing Cloudflare and Vercel targets, cover `absent`, `enabled`, `disabled` and `unknown` deferred-loading declarations. In the LangGraph functional target, identify `functional-interrupt`, assert the two-argument form and resume-value role where present, and forbid the resume-value claim for empty options. The Think declaration-spanning fixture must assert `@cloudflare/think`, boundary `0.18.0`, and its exact source-owning declaration, alongside the unresolved relationship and absent positive evidence. Include known-side and spanning-declaration controls using the existing exact installed closure, without claiming historical SDK execution.

Mentioning a feature in a task or README is not executable proof. Extend existing cases or bounded fixture variants when coherent; do not create a new paid actor case for every metadata value. Add bounded cases for independent repair or uncertainty decisions, without repeating the universal suite for each SDK version.

After reconciling probes with the published matrix, run `qualification:compatibility:update`, review the complete snapshot diff, then `qualification:compatibility:check`. Update the separate tooling publication fixture only where its current-state contract requires it. Ordinary qualification remains offline with respect to compatibility discovery and must not depend on a sibling checkout.

Run all model-free dry runs and inspect their deterministic results. A fake actor applying expected changes establishes runner/fixture correctness only; judge-owned requirements remain unevaluated.

**Review checkpoint:** all 14 profiles resolve; no stale or orphaned claims remain; changed SDK forms typecheck; deterministic assertions verify the claimed metadata and correct warning relationship/context; no result is presented as semantic qualification.

### 6. Synchronize evidence identity and website consumption

Increment the evaluator protocol constants to semantic `26` and qualification `12` because persisted current-run facts and verification expectations change. Update current producer schemas, literal type extractions, checkpoint/reuse validation, public-evidence generation and synthetic fixtures that depend on those protocols. Preserve raw historical attempts without rewriting, deleting or relabeling them. Old checkpoints must fail current resume/reuse checks with an actionable identity mismatch.

Keep the format-1 public bundle and the documented ability to display an older self-contained selected bundle. The qualification website reader currently imports a schema tied to the current producer protocol. Separate that display validation and its inferred types from current-run eligibility: validate the supported presentation structure and retain the producer protocol as provenance, without reinterpreting raw historical actor facts or accepting them for current evaluator reuse. Do not cast an older result to a current-protocol literal type. This is one presentation contract, without version-specific legacy evaluator branches.

Test that a prior valid presentation remains readable after the producer protocol changes, malformed bundles still fail, and an old raw attempt cannot resume or become current qualification. Preserve digest, path, privacy, byte-limit and official-versus-fixture checks. Leave `evidence/selection.json` unchanged.

In the skill repository, update Website UI to `1.10.2` in root and `website/package.json`, regenerate the lockfile, and remove the Astro override once clean resolution succeeds. Keep Astro `7.2.8` explicit in the website.

Reuse the inspected public exports `@moldea.ai/website-ui/accordion`, `/dialog`, `/file-preview`, `/evaluation-replay`, `/evaluation-replay-model`, `/result-summary`, and existing site/theme utilities. Independent accordions use the existing optional `group` API by omitting a shared group; do not add another component prop or local accordion implementation.

Review `website/src/components/qualification-profile-technical/`, `qualification-profile-page/`, `qualification-case-evidence/`, `semantic-evaluation-case/`, and the landing/getting-started consumers. Verify scrollbar-preserving dialog behavior, scroll reset on reopening, independent accordion expansion, file-preview borders and hash navigation using the shared package. Change local consumers only where their props or composition prevent the intended behavior.

Audit `website/src/lib/landing-example/`, affected visual examples, generated documentation and synthetic replay inputs. Keep the landing example backed by its real CLI integration test. Test clean catalogs and synthetic recorded evidence; do not generate official success records to make pages render.

Synchronize `README.md`, `qualification/README.md`, `website/README.md`, `docs/semantic-evaluation.md`, `docs/adapter-qualification.md`, `docs/release-evidence.md` and affected workflow/example documentation. Describe candidate readiness and unexecuted behavioral checks accurately. Update existing error documentation and reachable `@throws` only when an error contract changes. Protected coding-instruction files remain untouched.

**Review checkpoint:** public examples match schema 5; historical display and current evaluation eligibility remain separate; both empty and synthetic-result pages work; official evidence gates are unchanged.

### 7. Complete verification and the operator handoff

Perform the focused checks as each owning change lands, then the final affected-boundary checks below. Review findings, fix in-scope defects and rerun checks whose inputs changed until no material findings remain. Do not repeat unchanged expensive checks solely for reassurance.

Record the exact candidate commits, package closure, portable artifact digest, compatibility snapshot digest, evaluator protocols, verified profile inventory, commands and results. Clearly separate deterministic readiness from the model-backed assurance still required.

Consolidate authorized changes in each repository's `development` branch through the normal reviewed Git workflow. Preserve other agents' work, uncommitted changes and historical evidence. Before removing any task worktree or branch, prove its commits and intended file changes are retained in development or its required upstream release history. Never reset, force-push or clean unrelated work. Skill publication, tagging and production deployment remain separate later actions.

## Verification commands and acceptance evidence

These are implementation-stage commands, not checks already executed during planning.

### Packages prerequisite

From `../packages`:

```bash
pnpm --filter @moldea.ai/website-ui test
pnpm --filter @moldea.ai/website-ui typecheck
pnpm --filter @moldea.ai/website-ui lint
pnpm website:check
pnpm --filter @moldea.ai/packages-website test:e2e
pnpm docs:check
pnpm format:check
pnpm why astro
pnpm why sharp
```

Run the established `release:check-changes` script with the actual captured base and candidate commits, then require the existing CI, packed-artifact and publication gates for that exact release. Verify `npm view @moldea.ai/website-ui@1.10.2 version peerDependencies dist.integrity --json` after publication.

### Skill and evaluator preparation

After approved dependency and source updates, from the skill root:

```bash
npm ci --ignore-scripts
npm run portable:generate
npm run runtime:build
npm run portable:check
npm run release:identity:check
npm run path:check
npm test
npm run qualification:test
npm run website:check
npm run typecheck
npm run lint
npm run qualification:lint
npm run format:check
npm run qualification:format:check
npm run qualification:compatibility:check
npm run eval:semantic:preflight
npm run qualification:dry-run:all
npm run resource:check
npm ls astro sharp
```

Use the relevant existing granular scripts for focused development checks. The final `npm test` covers root unit/integration tests and both website browser modes; `website:check` adds website unit, artifact, documentation and build checks. Format only touched files, including changed YAML files not covered by an existing format glob.

If CLI output or prepared fixtures change the recorded resource corpus, run the existing `npm run resource:calibrate`, review the measurements and artifact diff, and rerun `resource:check`. Do not raise limits to conceal a regression.

Retain the existing supported-Node, platform, installation and package-manager verification boundaries in CI. The changed generator/update path must pass the portable Node matrix; package installation behavior must remain covered by the existing release-candidate/package-manager harness. Report unavailable platform execution rather than claiming cross-platform proof from Linux alone.

For affected UI, verify at 320px and desktop widths, light and dark themes, keyboard operation, visible focus, accessible names, reduced motion, direct navigation and client navigation. Use the owning browser tests for dialog and accordion behavior. Review real screenshots before accepting visual-baseline changes.

For reliability, distinguish process/build startup limits from test assertion limits. Measure cold builds and expensive package installations before adjusting an inadequate timeout. Keep finite limits, isolated ports and artifact directories, and existing bounded concurrency. Do not add sleeps, blanket retries or longer timeouts to hide an actual failure. Do not run synthetic and development generators concurrently against the same website output.

Do not run `release:check`, production `website:build`, evidence publication/selection commands, or model-backed diagnostic/recording commands as completion gates for this phase. Their missing official evidence is an explicit deferred requirement, not a failing preparation check to bypass.

## Resource use, security and maintainability

- Preserve the ordinary 65,536-byte CLI page, 262,144-byte aggregate target, roughly four ordinary CLI calls, and reserved capacity for final validation. Warning counts come from the existing response and need no extra call.
- Keep detailed adapter guidance conditional. Add concise interpretation rules instead of loading every adapter's capabilities into every task.
- Stream/page growing record collections through existing APIs. Do not fetch all diagnostics or canonical content to compute counts already supplied by Core.
- Keep exact package-closure preparation and existing bounded caches. No new cache is justified: command projection is small, and stale cross-operation validation would be incorrect after repository changes.
- Match metadata against the already obtained Core results using the fixed field allowlist. Reuse existing fixture preparation and output limits; do not add provider requests, extra scans, raw metadata blobs, or paid cases solely for assertion variants.
- Dry runs still consume disk, CPU and registry bandwidth. Respect existing worker/storage reservations and reuse the existing per-run package preparation. Report measured growth from updated SDKs and fixtures.
- Existing model-stage limits are failure-containment ceilings, not normal expected consumption. Do not increase token ceilings, candidate allowances, confirmation counts or model concurrency in this task. Future run cost depends on the final case inventory and actual usage; no paid runs occur here.
- Preserve command allowlists, cancellation, content-free metadata, privacy-safe evidence and path containment. Boundary-focused tests must not require real credentials or provider requests.
- Tests remain colocated with their owners and excluded from production artifacts. No new test framework, general abstraction layer or unrelated CI expansion is planned.

## Risks, dependencies and rollback

1. **Publication ordering:** the skill must not depend on an unpublished UI patch. Complete the packages release first, then install it normally. If a registry or workflow gate blocks publication, preserve the prepared work and report that dependency.
2. **SDK type differences:** current SDK pins can expose stale fixtures. Fix fixtures according to package/source contracts; do not weaken typechecking or overwrite intentional negative scenarios merely to pass.
3. **Compatibility drift during implementation:** use a reviewed publication and exact SDK/package identities. If the live publication changes materially, report the new delta before extending this finite scope.
4. **Evidence identity changes:** new protocols and portable bytes invalidate current-run reuse. Preserve prior files, require fresh later runs, and keep historical display independent of current evaluator execution.
5. **Framework peer policy:** the exact Astro pin remains an intentional maintenance tradeoff. This patch removes the present mismatch; it does not promise compatibility with untested Astro releases.
6. **Readiness terminology:** deterministic checks cannot prove future actors or judges behave correctly. The final report must say that semantic and adapter runs are prepared and unexecuted.

There is no database migration or application-data migration. Source/dependency changes can be reverted through normal reviewed commits. Published npm versions are immutable: a defective UI release requires a corrective version, not overwriting a tarball. Do not roll back to the known affected Astro version. No evidence selection is mutated, so this phase requires no evidence-selection rollback.

## Completion criteria

The work is complete when:

- Website UI `1.10.2` is verified and published with Astro `7.2.8`, and the skill consumes it without the override.
- The skill candidate consistently targets CLI 9/Core 5/schema 5 and its source-driven update/generation path is tested.
- Warning-only results are nonblocking where appropriate, affected claims remain unresolved, and confirmed errors still fail.
- All current examples and executable fixtures match their real command contracts.
- Semantic cases are validated and preflighted, and all 14 qualification targets pass their model-free preparation checks with reviewed coverage.
- Deferred-loading states, interrupt form/resume-schema role, and warning boundary context are verified against real Core results. Negative controls demonstrate that correct record kinds and identities cannot conceal wrong or missing claimed metadata, and public projection preserves the assertions.
- Current-run protocols, evidence validation and independent historical presentation remain coherent.
- Affected automated and UI checks pass, or a genuine external blocker is reported without declaring completion.
- Required documentation is synchronized, no unrelated work is lost, and the reviewed changes are consolidated in development through the authorized workflow.
- The handoff identifies the later sequence: freeze the candidate inputs, execute fresh semantic evaluation and Custom qualification, execute the adapter qualifications against that baseline, review real outcomes, then separately publish/select evidence and perform release/website gates.

No unresolved product decision is required to write this plan. Exact patch availability, published package identity, installation success and CI results remain implementation prerequisites to verify.

## Approval required

Approve the bounded Website UI/Astro correction and publication, skill 6.0.0 package/schema migration, native warning interpretation, semantic and qualification preparation across the existing 14 targets, evidence-contract synchronization including the scoped metadata assertions and their negative controls, website consumption/examples, affected documentation and deterministic verification.

Approval does not authorize model-backed evaluations or qualifications, evidence publication/selection, a skill release tag, or skill production website deployment. This plan has not been implemented. A milestone breakdown may be requested before authorizing development.
