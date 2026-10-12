---
title: Scripted journeys
navigationTitle: Scripted journeys
description: Run the portable skill in ordinary ChatGPT and Claude projects and assess exported outcomes locally.
section: reference
order: 174
---

# Scripted journeys

Scripted journeys evaluate the portable skill in ordinary ChatGPT and Claude chat projects using subscription compute. Six journeys contain 21 requests. The suite is independent of semantic evaluation.

| Journey                                | Requests | Outcomes checked                                                                                                         |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| An unrelated code change               | 1        | Requested source edit with the adopted foundation preserved                                                              |
| From first question to adoption        | 5        | Read-only facts, initialization, purpose correction, unrelated work, validation                                          |
| Keep everyday policy aligned           | 3        | Approved policy changes in code and context, read-only policy answer                                                     |
| Diagnose and repair integration        | 4        | Read-only evaluation and validation, managed-block repair, repeated repair without changes                               |
| An agent through its lifecycle         | 4        | Read-only planning, grounded registration, policy maintenance, retirement                                                |
| Respect authority and read-only limits | 4        | Unresolved contradiction, hostile repository note, unavailable tooling with installation forbidden, read-only correction |

The health fixture has a damaged explanatory README region and a stale AGENTS.md managed block. The CLI reports `MOLDEA_INTEGRATION_BLOCK_STALE` while the project remains valid. README drift is checked by skill-owned repair, not a CLI diagnostic. The boundaries fixture declares the CLI and has a generated lockfile, but setup leaves it uninstalled.

Each platform receives identical bundle bytes. One chat follows requests issued by a local harness, records each response and repository patch, and attaches checkpoints. These are scripted requests within a chat, not separate human turns or a measure of multi-turn reliability. A run describes its recorded models, dates, and settings; it does not establish a general pass rate or vendor endorsement.

## Prepare a run

Maintainer packing and assessment require Linux or macOS, Node.js 24.15, npm, Git, `zip`, and `unzip`. The bundled harness supports Node.js 22.11 or later. No evaluation API credentials are required.

```bash
npm run eval:journeys -- pack --commit HEAD
```

Packing reads the skill from the specified Git commit, builds a minimal offline npm cache for its exact CLI repair version, prepares fixtures and lockfiles, and bundles four standalone scripts. Criteria remain local; only requests and definition hashes enter the bundle. The command prints the bundle path, SHA-256, and start messages. Keep the printed SHA-256 separately as the assessment trust anchor. The bundle is stored under ignored `.evidence/journeys/`.

The cache is prepared with lifecycle scripts disabled. Adopted fixtures receive a generated lockfile; fixtures that enable CLI setup also receive an offline install. The boundaries fixture deliberately leaves the CLI uninstalled. The sandbox uses a writable copy of the cache, preserving the original bundle. npm's hash-addressed `_cacache/content-v2/sha512/` paths have a narrow filename-length exception; other exchanged paths retain the normal portable limits.

Publish the new bundle to a dedicated release for Claude to download:

```bash
npm run eval:journeys -- publish-bundle --run 20261012-abcdef --bundle .evidence/journeys/journeys-bundle-20261012-abcdef.zip --sha256 <bundle-sha256>
```

The command refuses an existing release rather than replacing its bytes. This publishes input material, not evaluated results.

## Configure both projects

Create or select an ordinary project on each platform. Install the complete contents of `src/scripted-journeys/instructions/project-instructions.md` as its custom instructions. Keep unrelated project files and instructions out of the evaluation project. Record the displayed model, date, enabled tools, memory and personalization settings, and any interventions with the run. Do not infer a model from its reply.

Attach the zip to the ChatGPT chat. In Claude, supply the printed release download URL through its start message. Use one clean chat per platform and send the corresponding start message once. Do not edit that start or regenerate completed steps. The project instructions authorize the agent to apply installed skills and to treat each request printed by `next` as a developer request.

The agent extracts the bundle, creates an empty workspace, runs `setup`, then repeats `next`, task work, `record`, and each requested `export`. After each journey it zips and attaches the checkpoint before advancing. At completion it attaches a final export. Requests, replies, and activity files are small; replies are limited to 65,536 bytes. Archives allow at most 8,192 entries, 16 MiB per file, and 64 MiB expanded in total.

Send `continue` only after the response has visibly finished at a tool limit or truncation. A missing Stop control alone does not establish completion. While the platform says it is checking for a response, wait or recover the view without submitting another message. Retrying an unresolved turn can create overlapping histories that share one workspace. If that occurs, reject the attempt and start the whole platform run in a fresh chat with the same bundle; never combine step captures from different attempts.

A surviving workspace reissues the pending request without dropping edits. After a sandbox reset, including a ChatGPT reset, the agent extracts the original bundle and latest checkpoint, runs setup with `--resume`, and restarts the first unfinished journey from its fixture. Restart counts survive in the export. Setup refuses to overwrite live state. With no checkpoint, a reset requires restarting the run and recording that intervention. Keep each replacement attempt and its interventions distinguishable from the rejected attempt.

## Assess exports

Download the final zip from each platform. Use the original bundle and the independently saved SHA-256:

```bash
npm run eval:journeys -- assess --bundle <bundle.zip> --sha256 <bundle-sha256> --export <chatgpt.zip> --export <claude.zip> --operator-record <operator-record.json>
```

Assessment verifies archive paths, sizes, file types, every exported file hash, bundle identity, harness hashes, and current definition digests. It reconstructs each step from the trusted fixture and recorded patches, rejects unsafe paths and non-regular file modes, and compares the reconstructed final tree with the export. Changed-path checks can compare with the preceding step or the original fixture. Path existence checks include files and directories inferred from recorded descendants; empty directories are not recorded.

Validation executes only a CLI closure installed locally from the original bundle cache and proved through the skill's closed launcher. Exported dependency declarations and lockfiles are inspected as data. They never select executable dependencies. Exported npm configuration is ignored. A missing exact declaration or lockfile blocks validation rather than triggering an install from exported metadata.

The optional operator record contains `chatgpt` and/or `claude` entries, each with `model` (the displayed name, or `null`), `settings` (a string-to-string map), and `interventions` (an array of strings). Record dates, settings, resets, and operator messages here. These fields enter public evidence, so omit private chat URLs and inspect the record, replies, patches, and activity for sensitive content before publication. The optional `--chatgpt-model` and `--claude-model` flags override the corresponding model name. Missing observations remain empty or null rather than being inferred.

A step passes only when its trusted checks pass; failed dependencies or unavailable validation evidence block dependent work. A journey passes only when every step passes. A run passes only when both platforms are present and every journey passes on both. Two-platform failures are `failed`; one-platform diagnostic runs are `incomplete`. The assessed record, artifacts, and assessor identity are stored under `.evidence/runs/journeys/<run-id>.json`.

## What the record establishes

Trusted checks establish file outcomes and reply facts against local criteria. Reply checks use explicit patterns for selected facts and result phrases. Patches, timestamps, environment details, CLI presence, restart counts, and harness self-checks are sandbox-captured facts from a model-controlled workspace. They are not independent proof of process. Replies and activity are agent-reported. Declared procedural expectations remain explicitly unverified.

The model can inspect or modify its workspace. Instructions forbid opening the harness or future request files, but this cannot be enforced. File hashes detect inconsistencies against the operator-held bundle; they do not authenticate model behavior. No command monitoring or tool-call timeline is collected.

The model knows it is being tested, and the future-step file exists in its workspace. A passing check does not verify every requested behavior: actual canonical-instruction consumption and removal of every superseded consumer remain unverified in the agent journey. Preserve reported procedural deviations and observed defects alongside passing outcomes; do not describe a passing run as proof that every instruction was followed.

Diagnose harness, fixture, or assessment defects and rerun after correction. Changed criteria require fresh exports from both platforms against the corrected bundle. An integrity failure invalidates that platform export and requires a fresh whole-platform attempt. Report defects in the distributed skill separately; this suite does not modify it to make a run pass. Observed model behavior alone does not establish a defect in the skill instructions. Keep failed diagnostic records for investigation. Evidence selection and website presentation are separate publication steps.

## Publish assessed evidence

After a complete passing run on both platforms, use the shared evidence pipeline:

```bash
npm run evidence:pack -- --scope journeys --run <run-id>
npm run evidence:publish -- --bundle .evidence/bundles/journeys-<run-id>.json.gz --tag evidence-journeys-<run-id>
npm run release:evidence:pin -- --scope journeys --release evidence-journeys-<run-id> --asset journeys-<run-id>.json.gz
npm run evidence:prepare
```

This release contains assessed output, separate from the input bundle release. The optional `journeys` selection can remain null while semantic evidence is selected. Release verification requires selected journeys evidence to be official and passing. See [Release evidence](../release-evidence/) for download integrity, preparation, and selection rules.
