---
title: Release evidence
navigationTitle: Release evidence
description: How maintainers publish and select exact semantic and scripted-journey evidence bundles.
section: reference
order: 178
---

# Release evidence

The skill website presents the official semantic bundle and the independent recorded evidence selected by the repository. These pages show results with their recorded versions, dates, artifacts, and sources. A release claim follows the scope of the recorded evidence.

## Current selection

- [Semantic evidence](/evidence/semantic/) shows 132 qualifying cases for Skill 11.0.2 with bundled CLI 15.0.1. The selection includes 124 initial passes and eight cases that met the confirmation quorum. Composition `sem-20261128114249313-4e74441c` preserves the verdict and provenance of 148 selected trials from official recording `sem-20261128072914793-a3381a7d`. Both evaluation roles used `gpt-6.2-sol` at `xhigh`. Every selected trial ran on the release Skill bytes.
- [Scripted journeys](/evidence/journeys/) shows the provider conversations selected in `evidence/selection.json`. Each journey identifies its recorded skill version, inputs, and outcomes.
- [Project runs](/evidence/project-runs/) shows coding sessions selected by `website/project-runs.json`. Each session identifies its recorded project, source checkpoints, and outcomes.

Use [Semantic evaluation](/docs/semantic-evaluation/) to qualify a candidate and review the results before selecting semantic evidence. Composed evidence identifies the source attempt and artifact digest for each selected trial.

## Pack a completed run

Use the explicit ID of the reviewed official semantic attempt or composition.

```bash
npm run evidence:pack -- --scope semantic --run <attempt-id>
```

The packer validates the public bundle and its artifact references, content limits, and digests. It writes a gzip JSON bundle under `.evidence/bundles/`.

## Publish a GitHub Release asset

Publish the packed bundle under a dedicated evidence prerelease tag.

```bash
npm run evidence:publish -- --bundle .evidence/bundles/<bundle>.json.gz --tag evidence-<name>
```

Publication uses GitHub CLI credentials. The publisher checks the bundle, uploads the asset to the matching release, and publishes after the exact asset is present. A retry can reuse an identical asset.

## Select what the website shows

Pin the exact published tag and asset name, then prepare the website input.

```bash
npm run release:evidence:pin -- --scope semantic --release evidence-<name> --asset <asset>.json.gz
npm run evidence:prepare
```

Pinning records the asset digest in `evidence/selection.json`. Preparation verifies the selected asset hashes, bundle kinds, limits, and artifact references before replacing the prepared website input. The existing scripted-journey pin and independent project-run selections keep their recorded provenance.

## Check a release

```bash
npm run release:check
npm run docs:check
npm run website:check
npm run website:build
```

`release:check` runs essential deterministic verification, checks release identity, and verifies that prepared evidence matches the pinned selection and contains passing official evidence for the selected scopes. Review the rendered evidence pages and procedure links against the selected bundles before release. Website generation uses the prepared records and makes no model calls.

## Repository release preparation

Run `npm run release:update-cli -- <version>` to select an exact published CLI. The updater verifies its checksums and notices, copies the portable build, and regenerates the Core manifest scope. Run `npm ci --ignore-scripts` to apply the updated lockfile, then run `npm run portable:check` and `npm run release:identity:check`.

For an evidence-backed release, complete the campaign and record its final qualified skill artifact digest. Follow the [delivery procedure](/docs/delivery/) to integrate the reviewed source and evidence selection.

Before creating the immutable skill tag, run `git rev-parse HEAD` and `npm run eval:semantic:preflight` from a clean checkout of the exact commit on `main` intended for that tag. Compare `artifactDigest` with the final qualified digest and confirm the checked evidence selection is present at that commit. Match each result described as fresh to that digest. For a composition, use the source digest of each selected trial. Record every selected result from different bytes in the explicit reuse decision. A digest mismatch or missing provenance stops tagging.

Record the checked commit, skill artifact digest, and selected evidence digest in the release verification report. Tag that exact commit after the release gates pass, then verify the official distribution against it.
