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

## Evaluation protocol 49

Protocol 49 meets the pre-run counting and final-validation requirements stated above: it grades each cycle on moldea's own work and recognizes the ordinary final-validation exception from ordered Codex events, as described in [resource accounting](/docs/semantic-evaluation/#resource-accounting). It changes no selected evidence; it applies to the next recording.

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
