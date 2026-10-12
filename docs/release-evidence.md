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

Development checks exercise the current semantic catalog without recorded results and isolated synthetic evidence. Production `website:build` and Pages deployment require a prepared official selection. Pages skips deployment when the semantic selection is null. After selection and Pages configuration succeed, synthetic and clean-development verification runs alongside the official build using identical site settings. Deployment requires both verification and the production build to succeed; fixture output is never uploaded.

Skill tags require deterministic conformance, synchronized release identity, and installation checks. Tagged CI does not prepare selected evidence or run a model. A passing tag does not establish semantic behavior. The selected historical semantic snapshot remains presentation-only until fresh evaluation establishes current behavior.

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
