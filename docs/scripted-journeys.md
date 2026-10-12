---
title: Scripted journeys
navigationTitle: Scripted journeys
description: Run the portable skill in ordinary ChatGPT and Claude projects and assess exported outcomes locally.
section: reference
order: 174
---

# Scripted journeys

Scripted journeys evaluate the portable skill in ordinary ChatGPT and Claude chat projects using subscription compute. The current pilot covers an unrelated code change in an adopted repository, then initialization and read-only validation in a new project. The suite is independent of semantic evaluation.

Each platform receives identical bundle bytes. One chat follows requests issued by a local harness, records each response and repository patch, and attaches checkpoints. These are scripted requests within a chat, not separate human turns or a measure of multi-turn reliability. A run describes its recorded models, dates, and settings; it does not establish a general pass rate or vendor endorsement.

## Prepare a run

Maintainer packing and assessment require Linux or macOS, Node.js 24.15, npm, Git, `zip`, and `unzip`. The bundled harness supports Node.js 22.11 or later. No evaluation API credentials are required.

```bash
npm run eval:journeys -- pack --commit HEAD
```

Packing reads the skill from the specified Git commit, builds a minimal offline npm cache for its exact CLI repair version, prepares fixtures and lockfiles, and bundles four standalone scripts. Criteria remain local; only requests and definition hashes enter the bundle. The command prints the bundle path, SHA-256, and start messages. Keep the printed SHA-256 separately as the assessment trust anchor. The bundle is stored under ignored `.evidence/journeys/`.

The cache is prepared with lifecycle scripts disabled. Adopted fixtures receive an offline install and a generated lockfile. The sandbox uses a writable copy of the cache, preserving the original bundle. npm's hash-addressed `_cacache/content-v2/sha512/` paths have a narrow filename-length exception; other exchanged paths retain the normal portable limits.

Publish the new bundle to a dedicated release for Claude to download:

```bash
npm run eval:journeys -- publish-bundle --run 20261012-abcdef --bundle .evidence/journeys/journeys-bundle-20261012-abcdef.zip --sha256 <bundle-sha256>
```

The command refuses an existing release rather than replacing its bytes. This publishes input material, not evaluated results.

## Configure both projects

Create or select an ordinary project on each platform. Install the complete contents of `src/scripted-journeys/instructions/project-instructions.md` as its custom instructions. Keep unrelated project files and instructions out of the evaluation project. Record the displayed model, date, enabled tools, memory and personalization settings, and any interventions with the run. Do not infer a model from its reply.

Attach the zip to the ChatGPT chat. In Claude, supply the printed release download URL through its start message. Send the corresponding start message once. The project instructions authorize the agent to apply installed skills and to treat each request printed by `next` as a developer request.

The agent extracts the bundle, creates an empty workspace, runs `setup`, then repeats `next`, task work, `record`, and each requested `export`. After each journey it zips and attaches the checkpoint before advancing. At completion it attaches a final export. Requests, replies, and activity files are small; replies are limited to 65,536 bytes. Archives allow at most 8,192 entries, 16 MiB per file, and 64 MiB expanded in total.

If a turn truncates, send `continue`. A surviving workspace reissues the pending request without dropping edits. After a sandbox reset, the agent extracts the original bundle and latest checkpoint, runs setup with `--resume`, and restarts the first unfinished journey from its fixture. Restart counts survive in the export. Setup refuses to overwrite live state. With no checkpoint, a reset requires restarting the run and recording that intervention.

## Assess exports

Download the final zip from each platform. Use the original bundle and the independently saved SHA-256:

```bash
npm run eval:journeys -- assess --bundle <bundle.zip> --sha256 <bundle-sha256> --export <chatgpt.zip> --export <claude.zip> --operator-record <operator-record.json>
```

Assessment verifies archive paths, sizes, file types, every exported file hash, bundle identity, harness hashes, and current definition digests. It reconstructs each step from the trusted fixture and recorded patches, rejects unsafe paths and non-regular file modes, and compares the reconstructed final tree with the export. Changed-path checks can compare with the preceding step or the original fixture.

Validation executes only a CLI closure installed locally from the original bundle cache and proved through the skill's closed launcher. Exported dependency declarations and lockfiles are inspected as data. They never select executable dependencies. Exported npm configuration is ignored. A missing exact declaration or lockfile blocks validation rather than triggering an install from exported metadata.

The optional operator record contains `chatgpt` and/or `claude` entries, each with `model` (the displayed name, or `null`), `settings` (a string-to-string map), and `interventions` (an array of strings). Record dates, settings, resets, and operator messages here. The optional `--chatgpt-model` and `--claude-model` flags override the corresponding model name. Missing observations remain empty or null rather than being inferred.

A step passes only when its trusted checks pass; failed dependencies or unavailable validation evidence block dependent work. A journey passes only when every step passes. A run passes only when both platforms are present and every journey passes on both. Two-platform failures are `failed`; one-platform diagnostic runs are `incomplete`. The assessed record, artifacts, and assessor identity are stored under `.evidence/runs/journeys/<run-id>.json`.

## What the record establishes

Trusted checks establish file outcomes and reply facts against local criteria. Patches, timestamps, environment details, CLI presence, restart counts, and harness self-checks are sandbox-captured facts from a model-controlled workspace. They are not independent proof of process. Replies and activity are agent-reported. Declared procedural expectations remain explicitly unverified.

The model can inspect or modify its workspace. Instructions forbid opening the harness or future request files, but this cannot be enforced. File hashes detect inconsistencies against the operator-held bundle; they do not authenticate model behavior. No command monitoring or tool-call timeline is collected.

Diagnose harness, fixture, or assessment defects and rerun after correction. Report defects in the distributed skill separately; this suite does not modify it to make a run pass. Keep failed diagnostic records for investigation. Evidence selection and website presentation are separate publication steps.
