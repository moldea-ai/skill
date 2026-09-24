---
title: Release evidence
navigationTitle: Release evidence
description: How maintainers publish and independently select semantic and qualification evidence bundles.
section: reference
order: 178
---

# Release evidence

Semantic evaluation and adapter qualification produce independent format-version 1 gzip JSON bundles. Completed runs remain local below `.evidence/` until a maintainer explicitly packs and publishes them as GitHub Release assets. Git stores only `evidence/selection.json`, which identifies the exact semantic and qualification assets shown on the website.

The website has no evidence selector and does not compare a selected snapshot with today's cases. Each selected bundle supplies its own definitions, counts, results, replays, projects, downloads, technical details, version, date, and provenance.

## Pack a completed run

Semantic packing requires an explicit local run ID:

```bash
npm run evidence:pack -- --scope semantic --run <attempt-id>
```

Qualification packing uses the latest completed local qualification bundle:

```bash
npm run evidence:pack -- --scope qualification
```

Bundles are written below `.evidence/bundles/`. Packing validates the public contract, artifact references, digests, portable paths, decoded byte limits, and executable-content restrictions. Exact artifact bytes are stored once even when several paths reference them.

## Publish a GitHub Release asset

Publish one packed bundle to a dedicated evidence prerelease tag:

```bash
npm run evidence:publish -- --bundle .evidence/bundles/<bundle>.json.gz --tag evidence-<name>
```

Publication requires an official bundle and GitHub CLI credentials. It creates or reuses the draft release, rejects conflicting assets, uploads without clobbering, and publishes the evidence release only after the asset is present. A retry may reuse an identical existing asset.

Publishing evidence does not select it and does not deploy the website.

## Select what the website shows

Select each domain independently by exact release tag and asset name:

```bash
npm run release:evidence:pin -- --scope semantic --release evidence-<name> --asset <semantic-asset>.json.gz
npm run release:evidence:pin -- --scope qualification --release evidence-<name> --asset <qualification-asset>.json.gz
```

The command resolves the immutable asset, validates its bundle kind and official classification, records its SHA-256 digest, and atomically updates only the requested section of `evidence/selection.json`. Selecting an older bundle is supported. It does not require historical evaluator code, current fixtures, a compatibility explanation, or matching current case inventory.

An official failed bundle may be selected so the website accurately presents the recorded failure. It remains ineligible for passing release assurance.

## Prepare the static website input

Download and prepare both exact selections with:

```bash
npm run evidence:prepare
```

Preparation rejects an unselected domain, a digest mismatch, a wrong bundle kind, fixture evidence, malformed metadata, unsafe paths, oversized content, and incomplete artifact references. It writes both sections into a new snapshot before atomically exposing the manifest. The replaceable cache retains only the two selected compressed bundles.

Preparation downloads public release assets over bounded HTTPS and does not require GitHub CLI authentication. GitHub credentials remain limited to explicit publication.

Development website checks exercise both the clean current catalogs without recorded results and isolated synthetic evidence. Production `website:build`, Pages deployment, and complete evidence-backed release assurance require prepared official selections. The Pages workflow skips deployment when both selections are null and rejects a partial selection.

During continued prelaunch testing, skill tags require deterministic conformance, synchronized release identity, and installation checks. Tagged CI does not prepare selected evidence or run evidence-backed assurance, and there are no version-specific exceptions. A passing tag does not establish semantic evaluation or adapter qualification. Release `5.0.12` leaves both selections empty; no new model-backed results are claimed. Evidence-backed assurance remains a separate explicit operation below, and production website requirements are unchanged.

## Check a release

```bash
npm run release:check
```

The check is read-only with respect to evidence. It validates release identity and requires both prepared selections to match `evidence/selection.json`. Each selected bundle must be official and passing. The check does not rerun an evaluator, reinterpret old results with current tests, fetch a latest asset, or silently replace a selection.

After fresh semantic evaluation and qualification records exist, the operator handoff is:

```bash
npm run evidence:pack -- --scope semantic --run <attempt-id>
npm run evidence:pack -- --scope qualification
npm run evidence:publish -- --bundle .evidence/bundles/<semantic-bundle>.json.gz --tag evidence-<semantic-name>
npm run evidence:publish -- --bundle .evidence/bundles/<qualification-bundle>.json.gz --tag evidence-<qualification-name>
npm run release:evidence:pin -- --scope semantic --release evidence-<semantic-name> --asset <semantic-asset>.json.gz
npm run release:evidence:pin -- --scope qualification --release evidence-<qualification-name> --asset <qualification-asset>.json.gz
npm run evidence:prepare
npm run website:check
npm run website:build
npm run release:check
```
