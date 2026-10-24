---
title: Release evidence
navigationTitle: Release evidence
description: How maintainers publish and select exact semantic and scripted-journey evidence bundles.
section: reference
order: 178
---

# Release evidence

Semantic evaluation and scripted journeys produce format-version 1 gzip JSON bundles. Completed runs remain local below `.evidence/` until a maintainer explicitly packs and publishes them as GitHub Release assets. Git stores `evidence/selection.json`, which identifies the required semantic asset and an optional journeys asset. Independently recorded project runs have their own website selection.

The website renders the selected bundle's definitions, counts, results, replays, downloads, version, date, and provenance. It does not rerun evaluation or compare that snapshot with today's cases. A historical presentation-only bundle retains its original versions, dates, and sources and provides no current-release assurance. New or materially revised cases require a fresh semantic run before they can support a behavioral claim.

The 10.0.2 preparation now has an explicit [candidate identity and diagnostic selection](../semantic-evaluation/#prepared-1002-campaign-handoff) and [native procedure pack](../reference-reading/#native-campaign-admission-and-records). Both installation-routing prerequisites must finish before semantic model execution. Preparation adds no recorded result or release assurance and changes neither the two private exclusions nor the historical selection. Diagnostics, the public recording, native campaigns, bundle publication, selection replacement and deployment retain their separate authorization boundaries.

## Pack a completed run

Packing requires an explicit local run ID:

```bash
npm run evidence:pack -- --scope semantic --run <attempt-id>
```

Use `--scope journeys --run <run-id>` to pack a locally assessed scripted-journey run through the same command. See [Scripted journeys](../scripted-journeys/) for selective admission, failure confirmations, and current-catalog coverage.

A journeys public envelope stays incomplete for partial coverage, pending confirmations or blocked evidence. Scoped campaign success alone cannot satisfy release assurance. Historical records retain their original single-observation meaning without a fabricated confirmation quorum.

To update one provider or selected whole journeys, first use `eval:journeys -- compose` with explicit incoming and optional base record IDs. Pack the newly generated snapshot ID through the same single journeys asset pipeline. Retained cells preserve their original requests, skill/test/method identities, observations and source downloads. Mixed or historical coverage cannot become a passing current-target claim. Composition changes no production selection and publishes nothing by itself.

A journeys input release contains the portable skill, fixtures, and harness for cloud execution. The assessed output bundle is a separate release asset. Preserve its recorded models, settings, interventions, unverified expectations, and diagnostic findings when deciding what to publish. Trusted-check success does not certify procedural adherence or every requested behavior.

Bundles are written below `.evidence/bundles/`. Packing validates the public contract, artifact references, digests, portable paths, decoded byte limits, and executable-content restrictions. Exact artifact bytes are stored once even when several paths reference them.

## Publish a GitHub Release asset

Publish one packed bundle to a dedicated evidence prerelease tag:

```bash
npm run evidence:publish -- --bundle .evidence/bundles/<bundle>.json.gz --tag evidence-<name>
```

Publication requires an official bundle and GitHub CLI credentials. It creates or reuses the draft release, rejects conflicting assets, uploads without clobbering, and publishes the evidence release only after the asset is present. A retry may reuse an identical existing asset. Publishing evidence does not select it or deploy the website.

## Select what the website shows

Select the exact release tag and asset name:

```bash
npm run release:evidence:pin -- --scope semantic --release evidence-<name> --asset <semantic-asset>.json.gz
```

Use `--scope journeys` with a journeys asset to select that independent section. A `null` journeys selection omits it; semantic selection remains required.

The command resolves the immutable asset, validates its kind and official classification, records its SHA-256 digest, and atomically updates the selection. Selecting an older bundle is supported without historical evaluator code or matching current cases. An official failed bundle may be selected to show the recorded failure; it is ineligible for a passing release check.

## Prepare the static website input

Download and prepare the exact selection:

```bash
npm run evidence:prepare
```

Preparation rejects a missing selection, digest mismatch, wrong bundle kind, fixture evidence, malformed metadata, unsafe paths, oversized content, and incomplete artifact references. It materializes a new snapshot before atomically exposing its manifest. The replaceable cache retains only the selected compressed bundles. A null journeys section produces no prepared journeys section. Public release assets are downloaded over bounded HTTPS without GitHub CLI authentication.

The website serves semantic downloads under `/evidence-assets/semantic/records/` so Pages includes them in its uploaded artifact; the bundle's internal `.evidence/` paths, file bytes and hashes remain unchanged.

Development checks exercise the current semantic catalog without recorded results and isolated synthetic evidence. Production `website:build` and Pages deployment require a prepared official selection. Pages skips deployment when the semantic selection is null. After selection and Pages configuration succeed, synthetic and clean-development verification runs alongside the official build using identical site settings. Deployment requires both verification and the production build to succeed; fixture output is never uploaded.

Skill tags require deterministic conformance, synchronized release identity, and installation checks. Tagged CI does not prepare selected evidence or run a model. A passing tag does not establish semantic behavior. The selected 8.2.3 snapshot records fresh and exactly reused passing observations. Historical presentation-only snapshots remain separate and do not establish current behavior.

## Skill 8.2.4 evidence reuse

Skill 8.2.4 retains the exact semantic evidence recorded on Skill 8.2.3 with CLI 11.0.6. The selected bundle remains `semantic-sem-20261018051032668-1465f9ee.json.gz` under `evidence-8.2.3-20261018`, with compressed SHA-256 `baa883450e1087efafbf3c685e311859fb63575dfa839761c20db48de292342d`. Its 120 cases contain 115 passes and five recoveries. The two disclosed exclusions, original observations and historical journeys selection remain unchanged.

The counting clarification applies to ordinary work, initialization and repair; the final-validation exception applies only to ordinary work. Neither change was re-evaluated. Every number and the large-traversal definition remain unchanged, and initialization and repair retain their stop-and-continue behavior. Deterministic conformance and installation checks do not prove model adherence to the new wording.

The original 8.2.3 full recording covered 122 cases and 141 trials. Its highest recorded host-command counts were 46 of 64 for ordinary work, 29 of 64 for initialization and 54 of 64 for repair, including repair trials from both profiles. The ordinary maximum spans three requests with 20, 13 and 13 commands; the maximum ordinary cycle was 30. These are historical whole-trial measurements, not reclassified counts under the new moldea-only rule.

Before the next paid evaluation, the evaluator must count only moldea's own work against these limits: moldea CLI calls and output, bundled helpers, and canonical file reads and writes. Project-required commands and their output must not consume those allowances. No evaluator, case, protocol or profile change is included in 8.2.4.

## Skill 8.2.5 evidence reuse

Skill 8.2.5 keeps the same 8.2.3 selection described above. Its only behavioral change concerns repair tooling: explicit repair now updates a compatible CLI older than the skill's `cliRepairVersion`, or an installed CLI that does not satisfy its root declaration, and reports both versions. Other explicit operations only report that mismatch, and ordinary work stays silent about it. Downgrades and explicit version policies still need direction.

This change was not re-evaluated. Every evaluated case declares and installs the CLI at the evaluated version 11.0.6, which is also the repair target, so no recorded scenario exercises it. Deterministic conformance and installation checks do not prove model adherence to the new wording.

## Skill 8.2.6 evidence reuse

Skill 8.2.6 keeps the same 8.2.3 selection. Its only behavioral change concerns how explicit repair reads canonical documents. Repair reads a document from the completed `inspect` inventory directly as a regular repository file when `inspect` reports no diagnostic for that path and the document fits one host command's output limit, never through a symbolic link; otherwise it uses `content`. Each read counts as a completed host command, and its bytes count toward the aggregate moldea-output allowance. It is not a moldea CLI call. Every limit and the continuation behavior are unchanged.

This change was not re-evaluated. The selected evidence's 64-owner `repair-continuation-partial-coverage` case passed under the previous procedure with an honest partial stop at 12 of 64 owners. Skill 8.2.6 may change how many owners that case checks per cycle; its criteria accept either an honest complete pass or an honest partial stop. The next paid run must re-run the repair cases, including that one, and must count each direct canonical read as a host command and its bytes under the pending moldea-only counting rule.

## Skill 8.2.7 evidence reuse

Skill 8.2.7 keeps the same 8.2.3 selection. It corrects installation and repair guidance:

- Yarn installation follows the executing Yarn line. Yarn Classic 1.x installs with `--ignore-scripts`, Yarn 3 and later with `--mode=skip-build`, and Yarn 2.x stops for the repository's trusted setup workflow. A `yarnPath`, `yarn-path` or non-registry `packageManager` value blocks automatic installation like an executable plugin. One `yarn --version` check runs just before an installation that will proceed.
- Repair recovers an installed CLI without a supported root declaration to the exact target as a root development dependency, and never lowers a newer declared version.
- Ordinary work still runs final validation for its canonical writes at a limit.
- A partial or truncated canonical read never supports a completed repair assessment.
- In explicit repair and initialization, source reads made for the assessment count toward host commands and model-visible output, not the aggregate moldea-output allowance.

These changes were not re-evaluated. The package-manager harness covers Yarn installation mechanics: release-candidate CI now runs Yarn Classic 1.22.22 alongside npm, pnpm and Yarn 4, it was also run locally with Yarn 3.8.7 for this release, and every run proves that root and dependency lifecycle scripts never execute. Whether a coding agent chooses the correct Yarn command is not evaluated. Deterministic conformance and installation checks do not prove model adherence to the new wording.

## Skill 8.2.8 evidence reuse

Skill 8.2.8 keeps the same 8.2.3 selection. It closes gaps an external review found in 8.2.7:

- The repair Git helper never fetches missing objects or contacts a remote. Every helper Git read disables lazy fetching and allows no transport protocol, so an object missing from a partial clone becomes unavailable evidence and every completed owner is reassessed. Its file-monitor override is now empty, which disables the monitor on every supported Git; Git 2.35 and earlier ran the previous `false` value as a program.
- Initialization, setup checks and repair check Claude Code's instruction files. When a root `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` exists, Claude Code does not load AGENTS.md by default unless one of them imports it or is a symbolic link to it, and a shared file must carry that integration. The coding agent adds the import only when host instructions permit and otherwise reports the exact line.
- Yarn Classic 1.x installs and removes with `-W`, which a workspace root requires.
- A CLI declared in `dependencies` or another section is moved to an exact root development dependency by a targeted removal and re-add, both with scripts disabled. Adding alone did not move it: Yarn Classic left the declaration in `dependencies`, and Yarn 4 refuses to add a development dependency that is already a regular one.

These changes were not re-evaluated. Deterministic coverage:

- Repair Git integration tests run on current Git on Linux, Windows and macOS and, in a new conformance job, on Debian Bullseye's Git 2.30. In a blobless partial clone, continuation returns unavailable evidence and leaves Git storage unchanged, while a plain Git read of the same object does fetch. A stored file-monitor index extension never runs a `false` program from `PATH`. Debian's Git 2.30 package backports `GIT_NO_LAZY_FETCH`, so that job cannot show the empty protocol list working alone; locally, removing each setting in turn showed that either one blocks the fetch, and the test fails when both are removed.
- The package-manager harness now installs Yarn at a real workspace root and, for every manager, moves a CLI declared in `dependencies` while preserving an unrelated dependency's declaration and lock entries. It passed locally with the published CLI 11.0.6 closure on every release-candidate matrix entry and Yarn 3.8.7, and removing Yarn Classic's `-W` makes the workspace run fail.

Whether a coding agent checks Claude Code's files or chooses the correct import or package-manager command is not established by the selected evidence. Deterministic conformance and installation checks do not prove model adherence to the new wording.

## Skill 8.3.0 evidence reuse

Skill 8.3.0 keeps the same 8.2.3 selection, recorded with CLI 11.0.6. It moves the Claude Code integration check from instruction text into Core 7.1.0 and the bundled writer:

- `validate` checks a linked AGENTS.md on its regular-file target, inside or outside the repository, and reports a Claude Code instruction file that does not load AGENTS.md as `MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING`. A link it cannot verify reports `MOLDEA_INTEGRATION_UNVERIFIED`. CLI 11.1.0 passes Git-ignored instruction files to this check and to no other.
- `managed-agents.mjs` updates a linked AGENTS.md through its regular-file target inside the repository, keeping the link, and refuses every other link with its reason. `--claude <file>` appends the import line to an existing Claude Code instruction file, and `--claude <file> --print` prints only that line.
- The coding agent offers acceptance of an integration warning only for a shared instruction file that Git tracks. An accepted warning about a personal or ignored file would report `MOLDEA_ACCEPTANCE_UNMATCHED` on every other checkout.
- The supported ranges rise to CLI `^11.1.0` and Core `^7.1.0`, and the repair target is CLI 11.1.0.

These changes were not re-evaluated. Deterministic coverage:

- Real-link writer tests compare each written file with the file the operating system opens through the link. They cover refusals of outside, broken, looping and network targets, `..` after a directory link, Claude Code import insertion, idempotence and CRLF, the `--print` forms, and never creating a Claude Code file.
- Disposable repositories driven through the launcher with the published CLI 11.1.0 cover initialization, repair and warning acceptance; a `CLAUDE.md` link to AGENTS.md, an AGENTS.md link to `CLAUDE.md`, and `.claude/CLAUDE.md` with `@../AGENTS.md`; an AGENTS.md linked outside the repository; and an accepted `/CLAUDE.local.md` warning that reports `MOLDEA_ACCEPTANCE_UNMATCHED` on a checkout without that file.
- The package-manager harness passed locally with the published CLI 11.1.0 closure on every release-candidate matrix entry and Yarn 3.8.7.

Whether a coding agent uses the new helper modes or follows the acceptance rule is not established by the selected evidence.

## Skill 9.0.0 evidence reuse

Skill 9.0.0 keeps the same 8.2.3 selection, recorded with CLI 11.0.6. It applies one rule to instruction links in Core 8.0.0, CLI 12.0.0 and the bundled writer:

- `validate` follows a linked instruction file only inside the repository, by reading each link's stored text. Real links, Git links checked out as plain files and hosted repositories resolve the same way. A link that doesn't lead to a file in the repository reports `MOLDEA_INTEGRATION_LINK_UNRESOLVED`, which replaces `MOLDEA_INTEGRATION_UNVERIFIED`, with its reason (`outside`, `missing`, `loop`, `not-file` or `unsupported`) as the qualifier, and an acceptance matches only that reason.
- `managed-agents.mjs` follows links exactly as `validate` does. It asks Git how each visited path is stored, with the configuration files the CLI reads, and refuses every other link with its reason and next step.
- Repair guidance gives one next step per reason, including absolute links and links to ignored or uncommitted files.
- The supported ranges rise to CLI `^12.0.0` and Core `^8.0.0`, and the repair target is CLI 12.0.0.

These changes were not re-evaluated. Deterministic coverage:

- Writer tests with real Git cover inside links, Git links checked out as plain files with their bytes unchanged, a committed link replaced by a real file, conflicting index modes, every refusal reason, absolute links, ignored targets and ignored instruction files, Git failures, a name with pathspec magic, exact-path output matching, global `core.symlinks` and `core.excludesFile` settings, the recorded Git calls and filesystem containment.
- Disposable repositories driven through the launcher with the published CLI 12.0.0 cover initialization, repair, acceptance by reason, the three Claude Code link chains, absolute and ignored-target links with the writer's next steps, an ignored `CLAUDE.local.md` and a Git link checked out as a plain file.
- The package-manager harness passed locally with the CLI 12.0.0 candidate closure, byte-identical to the published packages, on every release-candidate matrix entry and Yarn 3.8.7.

Whether a coding agent follows the per-reason guidance is not established by the selected evidence.

## Skill 10.0.0 evidence reuse

Skill 10.0.0 keeps the same 8.2.3 selection, recorded with CLI 11.0.6. It moves the bundled helpers, CLI 13.0.0 and Core 9.0.0 onto JG Packages:

- The bundled helpers read Git through jg-git-commands, and write files, run processes and parse their arguments through jg-fs, jg-process and jg-utilities. A failed repair Git read reports jg-git-commands' failure message instead of Git's own output.
- A cancelled `--save-response` capture stops before its atomic write starts; a write already started may complete, and the invocation still fails with no stdout.
- Git 2.32.0 or later is required, up from 2.30.0.
- The supported ranges rise to CLI `^13.0.0` and Core `^9.0.0`, and the repair target is CLI 13.0.0.

These changes were not re-evaluated. Deterministic coverage:

- Recomputing the 6 journey definition digests, the 125 case definition digests and the case suite digest with the new deterministic JSON serialization reproduces the 9.0.0 values.
- Repair Git and writer integration tests run on current Git on Linux, Windows and macOS and, in a conformance job that builds Git 2.32.7 from source, on the new minimum.
- The sandbox Git policy tests run jg-git-commands' reads of the bundled helpers and of CLI 13 through the wrapper, and the integration suite drives the published CLI 13.0.0 through the launcher and the evaluator's sandbox.
- The package-manager harness passed in the release-candidate workflow with the CLI 13.0.0 candidate closure, byte-identical to the published packages, on every matrix entry.

Whether a coding agent follows the reworded cancellation rule is not established by the selected evidence.

## Skill 10.0.1 evidence reuse

Skill 10.0.1 keeps the same 8.2.3 selection, recorded with CLI 11.0.6. It adopts CLI 13.0.1 as the repair target and corrects the skill's guidance:

- CLI 13.0.1 inventories a directory link in the working tree, such as a skill directory junction or symbolic link, as one link entry, so `validate` and `inspect` no longer fail with `ENTRY_NOT_DIRECTORY` on paths beneath it.
- When the inventory's `ls-files` listing, `config` read of `core.symlinks` or `check-attr` check fails, the error's `details.subcommand` names that subcommand.
- The launcher reports a missing `node_modules` or CLI package in one sentence that names the install step, and refuses a Node.js version outside the CLI's `engines.node` range.
- After a relationship hit, an ordinary task whose launcher cannot run the CLI reports that in one line with the launcher's message and the next step, makes no canonical reads, and continues the host task.
- Running a project-owned Agent Skill is host work, and only the paths the run touches use the ordinary precheck. The AGENTS.md block routes planning, creating, reviewing or changing agents or skills to SKILL.md.
- Validation recovery reports the path of a `repository`-source error and stops; it never validates a copy, clone or snapshot of the repository.
- SKILL.md names reference files without the `references/` prefix to stay within its 8,192-byte ceiling.
- The new `ordinary-hit-launcher-unavailable` case is defined and has no recorded trials.

These changes were not re-evaluated. Deterministic coverage:

- Launcher integration tests cover a missing `node_modules`, a missing CLI package and an unsupported Node.js range, and a launcher run against a missing install exits 3 with the install sentence.
- The new case's setup test shows that the relevance gate still matches in a checkout without dependencies while the launcher refuses `scope` with that sentence.
- The integration suite drives the published CLI 13.0.1 through the launcher and the evaluator's sandbox.
- The packages pull request ran the exact-artifact skill consumer jobs with the CLI 13.0.1 candidate closure on every npm, pnpm and Yarn matrix entry, and the CLI runtime suite on Linux, macOS and Windows. The published CLI 13.0.1 tarball matches that candidate's checksum.

Whether a coding agent gives the one-line notice, treats a project-owned skill run as host work or stops on a `repository`-source error is not established by the selected evidence.

## Skill 10.0.2 evidence reuse

Skill 10.0.2 retains the exact Skill 8.2.3/CLI 11.0.6 selection described above, including its 115 passes, five recoveries, and two disclosed exclusions. CLI 13.0.1, Core 9.0.0, schema 7, supported ranges, and the inherited Website UI 4.5.1 dependency closure are unchanged. The merged source-preview behavior is inherited from the preceding website change.

This release corrects contained-directory-link attribute inspection, instruction-consumption routing before both bridge branches, standalone validation versus repair, continuation of pending authorized context maintenance, integration refresh and protected-file handoff, warning eligibility explanations, Claude-file precedence guidance, and operation-specific digest interpretation. It changes no Core diagnostic, acceptance, hashing, schema, or cloud-check contract.

Current-host deterministic checks exercise source and generated repair helpers, including 32 contained skill-directory links over indexed descendants, unsafe-link/filter refusals, resource bounds, and preserved repository state. Real CLI/writer fixtures cover fresh integration, the frozen 10.0.1 bridge becoming stale, exact refresh/print behavior, line endings and outside bytes, ignored local AGENTS.md, and nested/shared versus local Claude imports. The entrypoint remains within 8,192 bytes. Four skip-link browser cases passed three runs each without retries, covering light/dark themes, 320px/desktop widths, client navigation, an earlier hidden non-page link, visible focus, the main target, and subsequent focus in main content.

One parallel browser regression run timed out in three unchanged mobile artifact/dialog accessibility tests. Each passed three isolated runs with retries disabled; the original timeout traces were retained. No timeout, assertion, scanner severity, or workflow was relaxed. This remains a disclosed timing-flakiness finding, not a passing initial run.

CI then exposed absolute-link containment failures on macOS and Windows, plus fixture link-length and background-maintenance defects before publication. The helper now retains only the supplied root spelling and its already-verified physical root for absolute target prefixes, without following unknown outside aliases. Regression fixtures preserve the same traversal-budget exhaustion with shorter link text and disable automatic maintenance during fixture Git writes, retaining complete storage snapshots. Cross-platform CI results for this correction are reported in the release handoff.

No fresh model trials or mock-project campaign ran for this release publication. The subsequent private 10.0.2 qualification campaign and completed native-routing prerequisites are recorded in [Semantic evaluation](../semantic-evaluation/#authorized-diagnostic-follow-up) and [Reference-reading checks](../reference-reading/#native-campaign-admission-and-records); they do not replace the selected historical recording. The `ordinary-hit-launcher-unavailable` semantic case remains unrecorded. Deterministic checks do not establish instruction adherence, complete owner assessment or Windows host observations. CI matrices, tagged-installation equality, Pages deployment, and deployed scanner/keyboard observations remain publication gates whose actual results belong in the release handoff. Cloudflare settings remain unchanged; report any remaining live scanner warning separately from keyboard behavior and do not identify an injecting feature without evidence.

## Evaluation protocol 50

Protocol 50 meets the pre-run counting and final-validation requirements stated above: it grades each cycle on moldea's own work and recognizes the ordinary final-validation exception from ordered Codex events, as described in [resource accounting](/docs/semantic-evaluation/#resource-accounting). It corrects protocol 49, which no recording used, so that a patch whose paths cannot be read never earns that exception. It changes no selected evidence; it applies to the next recording.

## Evaluation protocol 51

Protocol 51 recognizes the writer's `--claude <file>` and `--claude <file> --print` forms as bundled-helper operations, and the sandbox Git policy admits CLI 11.1.0's instruction-file probe. `setup-check-claude-instructions` now expects Core's warning and the exact `@../AGENTS.md` line. Resource accounting and evidence schema 15 are unchanged. It changes no selected evidence; it applies to the next recording.

## Evaluation protocol 52

Protocol 52 admits the bundled writer's two Git reads in the sandbox Git policy: how one visited path is stored, as `ls-files --cached --others --exclude-standard --stage -z --` with one plain path, and the `core.symlinks` setting. The wrapper still reads only the repository's own config. Resource accounting, evidence schema 15 and every case criterion are unchanged. It changes no selected evidence; it applies to the next recording.

## Evaluation protocol 53

Protocol 53 admits jg-git-commands' command lines in the sandbox Git policy, now that the bundled helpers and CLI 13 read Git through it. The repair helper's reads still ignore the system and global config, and the writer asks how one visited path is stored with an index listing and an untracked listing of that plain path. CLI 13's reads run in the repository with plain paths instead of `-C` and `:(top,literal)` pathspecs, and CLI 12's command lines are no longer admitted. The hardened status, diff and attribute-source commands an actor may type are classified as before. Resource accounting, evidence schema 15 and every case criterion are unchanged. It changes no selected evidence; it applies to the next recording.

## Evaluation protocol 54

Protocol 54 independently enforces helper-only repair Git in every explicit repair case, including blocked and healthy-no-op controls. The wrapper observes only the immediate parent executable and a bounded argument vector against exact read-only mounted helper, managed-writer and repository-local CLI entrypoints. Direct actor reads fail even when their arguments pass mechanical execution safety. Only approved actual repair-helper subprocesses earn positive comparison credit; approved CLI/writer calls and direct trusted-host calls do not. Missing or inconclusive provenance earns no helper credit. The two comparison-dependent continuation cases retain their positive-read requirement; conservative inert/no-Git fallback does not acquire one. Static direct-Git syntax is checked independently, while opaque text alone does not fail complete capture with no disallowed call. Temporary raw capture is removed after projection; persisted evidence keeps only its existing content-free counts and finite reasons. This is cooperative compliance, with no tamper-proof audit claim. The original protocol-54 candidate subsequently entered the private diagnostic campaign described in Semantic evaluation; corrected fixture inputs require renewed authorization. Historical observations above retain their original contract. Evidence schema 15, checkpoint schema 3, resource profiles, the distributed Skill 10.0.2 artifact and the selected historical evidence are unchanged. Protocol-53 records cannot resume or supply reuse under this grading contract.

## Skill 10.0.3 candidate qualification

The initial 10.0.3 follow-up kept CLI 13.0.1/Core 9.0.0/schema 7, protocol 54, evidence schema 15, checkpoint schema 3 and resource limits. It clarifies direct validation in two references, corrects the actor-visible boundary path and two reporting criteria, and requires composition evidence in two counterpart controls. Version metadata and all candidate input identities are recomputed. Managed templates and generated portable helpers remain unchanged. The entrypoint now requires quoting the unavailable launcher's full message and next step; installation authority is unchanged. Historical native applicability permits this exact reporting difference, but those conversations and the completed recording do not verify the new wording.

The original 10.0.2 diagnostic retains all 32 passing and seven failing cases, its confirmations and charges. Later assessment distinguishes the validation-reference ambiguity, legitimate ledger discovery, two over-specific reporting criteria and the independent unexplained token overage. The three previously repaired fixture scenarios received changed-input trials in the 10.0.3 private diagnostic. No old verdict is converted into a pass.

The [nine-case private diagnostic](/docs/semantic-evaluation/#prepared-1003-follow-up) completed with seven passed, one recovered and one failed. The maintainer retained `repair-stale-integration` privately, preserving its strict criteria and failed writer-proof/resource observations, and authorized a fresh complete 140-case public recording with the diagnostic gate waived. Those three cases were not included in that historical recording; launch preparation restores them to the current public catalog. [Native applicability](/docs/reference-reading/#1003-candidate-applicability) remains historical and outside semantic counts. Codex version is observational and cannot block checkpoint admission. Non-version checkpoint identities and safety controls remain strict, original version observations are preserved, and the original stage/reuse identities are preserved in that historical evidence. Phase-version provenance limits are disclosed.

The complete 140-case recording retained 128 passed, eight recovered and four failed cases, using 65,010,976 reported tokens across 168 trials and 344 paid invocations. Its terminal checkpoint was exported and locally verified without another model stage. Compact private-evidence JSON preserves the recorded data within the existing artifact limit. The failed overall result is not passing assurance for later candidate corrections.

The selected 8.2.3 evidence remains historical. The completed local recording is unselected and unpublished; no release tag, evidence-selection replacement or deployment is established.

Current launch preparation uses protocol 55 and restores all 143 cases to public selection without weakening their 643 criteria or resource limits. Shared version-free host contracts apply to current checkpoint/stage reuse, while recorded host versions remain intact. Reference and evaluator corrections have deterministic checks only; the failed 140-case result and historical native observations do not establish their behavior. Candidate package versions, fresh native prerequisites, separately authorized diagnostics and a full zero-failure recording remain outstanding. Private command traces and Git stderr sidecars must never be packed or published.

## Check a release

```bash
npm run release:check
```

The check validates release identity and requires the prepared selection to match `evidence/selection.json`, with official passing bundles for semantic evidence and any selected journeys evidence. It is read-only with respect to evidence. It does not rerun an evaluator, reinterpret old results with current tests, fetch a latest asset, or replace the selection. Passing this mechanical check does not turn historical presentation-only evidence into current-release assurance.

After a fresh semantic record exists, the operator handoff is:

```bash
npm run evidence:pack -- --scope semantic --run <attempt-id>
npm run evidence:publish -- --bundle .evidence/bundles/<semantic-bundle>.json.gz --tag evidence-<semantic-name>
npm run release:evidence:pin -- --scope semantic --release evidence-<semantic-name> --asset <semantic-asset>.json.gz
npm run evidence:prepare
npm run website:check
npm run website:build
npm run release:check
```
