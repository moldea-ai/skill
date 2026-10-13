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

Either platform can run selected whole journeys from the same immutable full bundle. One fresh chat follows requests issued by a local harness, records each response and repository patch, and attaches checkpoints. These are scripted requests within a chat, not separate human turns or a measure of multi-turn reliability. A run describes its recorded models, dates, and settings; it does not establish a general pass rate or vendor endorsement.

## Prepare a run

Maintainer packing and assessment require Linux or macOS, Node.js 24.15, npm, Git, `zip`, and `unzip`. The bundled harness supports Node.js 22.11 or later. No evaluation API credentials are required.

```bash
npm run eval:journeys -- pack --commit HEAD
```

Packing reads the skill from the specified Git commit, builds a minimal offline npm cache for its exact CLI repair version, prepares fixtures and lockfiles, and bundles four standalone scripts. Criteria remain local; only requests and definition hashes enter the bundle. The command prints the bundle path, SHA-256, and start messages. Keep the printed SHA-256 separately as the assessment trust anchor. The bundle is stored under ignored `.evidence/journeys/`.

For candidate testing, substitute the full committed candidate SHA for `HEAD`. The skill need not be tagged, but its exact CLI repair version must be available from npm for cache preparation. Packing does not include uncommitted skill edits.

The cache is prepared with lifecycle scripts disabled. Adopted fixtures receive a generated lockfile; fixtures that enable CLI setup also receive an offline install. The boundaries fixture deliberately leaves the CLI uninstalled. The sandbox uses a writable copy of the cache, preserving the original bundle. npm's hash-addressed `_cacache/content-v2/sha512/` paths have a narrow filename-length exception; other exchanged paths retain the normal portable limits.

Publish the new bundle to a dedicated release for Claude to download:

```bash
npm run eval:journeys -- publish-bundle --run 20261012-abcdef --bundle .evidence/journeys/journeys-bundle-20261012-abcdef.zip --sha256 <bundle-sha256>
```

The command refuses an existing release rather than replacing its bytes. This publishes input material, not evaluated results.

## Configure the selected projects

Use the dedicated ordinary project named `moldea scripted journeys` on both ChatGPT and Claude. The name matches this workflow, `src/scripted-journeys/`, and `eval:journeys`. These projects were previously named `moldea smoke test`. Find them through the platform's project list and verify the project heading before changing settings or starting a chat. Local operators may keep their project IDs and setup observations in ignored `.evidence/journeys/operator-projects.md`; do not publish private project or chat links in documentation or evidence. If the name is ambiguous, use the locally recorded identity rather than selecting a similarly named project or creating a replacement.

Install the complete contents of `src/scripted-journeys/instructions/project-instructions.md` as custom instructions on each selected project. Save, reopen, and compare the complete text before every new campaign. Keep unrelated project files and instructions out of the evaluation project. Attach the current bundle to its trial chat rather than adding it as a shared project source. Preserve prior chats and exports; a project rename or instructions update does not upgrade their evidence.

Record the displayed model, date, enabled tools, memory and personalization settings, and any interventions with each trial. Do not infer a model from its reply. A fresh chat establishes a new conversation, not memory isolation. ChatGPT projects retain shared context across chats ([OpenAI project guidance](https://learn.chatgpt.com/docs/projects)); observe the actual memory and context controls and retain any limitations in the record. Recheck settings when starting confirmations. Do not silently change account-wide settings to obtain isolation.

### Autonomous operator checklist

Browser operation carries out the same operator protocol; it does not replace local assessment. Before running, establish the exact committed skill candidate, selected providers, and whole-journey scope. Use the requested candidate SHA rather than a moving branch tip, and wait when the candidate is still being built.

1. Check the selected project identities, saved instructions, shared sources, displayed model, tools, and memory/personalization controls. Report unavailable observations explicitly. Do not use earlier trial settings as current observations.
2. Pack the exact candidate, preserve the printed bundle SHA-256 separately, and publish the immutable input bundle when Claude needs the download URL. Keep evaluator inputs unchanged throughout the campaign. Changed evaluator inputs require a new campaign.
3. Create a campaign-specific local operator record containing `{"trials": {}}`. The prepared `.evidence/journeys/operator-record.json` is an empty starter, not an attestation. Never overwrite observations from an earlier campaign.
4. Start one fresh chat per trial in the selected project. Send the generated start message once, preserving all selection and confirmation arguments. Use the current bundle attachment for ChatGPT and its immutable download URL for Claude. Observe completion before any `continue` or recovery action.
5. Save each checkpoint and final export without replacing earlier attempts. Hash the downloaded final archive locally. Add its observations under that exact digest only after observing the fresh chat and actual configuration. Keep private navigation details outside the public operator record.
6. Assess the accumulated exports locally. Run only the fresh confirmations requested by assessment, using the same bundle and model/settings for that provider/journey group. Stop confirming that group at quorum or a blocked-only confirmation and retain every admitted export. Other selected groups can proceed independently.
7. Compose only the requested provider/journey groups. Leave other providers' selected results intact, and preserve explicit Not run cells for new tests without observations.
8. Publish and pin only the evidence selected for publication, using the commands below and the current authorization. Prepare the website evidence and run its required verification before reporting publication complete. Report the candidate, scope, trial resolutions, retained limitations, and any remaining publication or deployment work.

### Run each trial

Attach the zip to the ChatGPT chat. In Claude, supply the printed release download URL through its start message. Use one clean chat per trial and send the corresponding start message once. Do not edit that start or regenerate completed steps. The project instructions authorize the agent to apply installed skills and to treat each request printed by `next` as a developer request.

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

Persistent admission requires an operator record with a `trials` map keyed by each export archive's SHA-256. Each entry records the displayed model or explicit `null`, string settings, interventions, an ISO observation time or explicit `null`, and `freshChat: true`. These fields enter public evidence: omit private chat URLs and account information. Never infer a model from its reply.

```json
{
  "trials": {
    "<export-archive-sha256>": {
      "configuration": { "model": null, "settings": { "mode": "Chat" }, "interventions": [] },
      "observedAt": null,
      "freshChat": true
    }
  }
}
```

Missing observations reject admission before reconstruction and print the archive digests. Complete the record and admit the same archive bytes without repeating the chat. `assess --diagnostic` (or programmatic `persist:false`) inspects initial exports without writing a campaign, admitting observations, resolving confirmations, or requesting more trials. Only diagnostics accept the legacy provider-level operator fields and `--chatgpt-model`/`--claude-model` flags. Unknown observations stay explicit. Diagnostic status is always incomplete; inspect each trial's raw outcomes.

A trusted failed criterion makes a step fail even when another check is blocked. For example, a missing required lockfile fails its path check while validation remains blocked. Otherwise failed dependencies, unavailable checks, or missing check evidence block the step. A step passes only when its required checks and prerequisites pass; dependent criteria are evaluated only after their prerequisites pass. A journey passes only when every step passes.

The assessed record is stored under `.evidence/runs/journeys/<run-id>.json`. Reassessment must include every admitted export and its unchanged observations. One operator assesses a campaign at a time. Invalid batches replace nothing. The admitted-scope status is separate from catalog coverage: unresolved or blocked groups are incomplete, resolved groups with a confirmed failure are failed, and all passing or recovered groups are passed. Public evidence remains incomplete when either provider lacks current-catalog coverage.

## Select journeys and confirm failures

Append repeated `--journey <id>` arguments to the start message's existing setup command to select a nonempty initial subset. Omission runs the full catalog. Selection follows bundle order, executes every request in each selected journey, and prepares only those fixtures. Final exports are complete relative to that selection. Separate initial exports on one provider must cover disjoint journeys. Unselected cells are Not run.

A trusted initial failure is eligible for fresh confirmations immediately, independently of the other provider. Assessment prints a complete next start message with the original immutable URL/SHA, exactly one `--journey <id>`, and `--confirmation 1`, `2`, or `3`. Each confirmation uses a fresh chat and original fixture, replays the whole journey, and keeps the same displayed model/settings. On reset, preserve those selection arguments and use the latest checkpoint. Restart events are not votes.

The initial failure does not vote. Stop after two passing confirmations (Recovered after failure) or two failing confirmations (Confirmed failure), with at most three confirmations. A blocked-only confirmation stops resolution without a vote or replacement attempt. Initially passing journeys require no confirmations. Gaps, duplicate slots, post-quorum trials and changed settings are rejected. Preserve every initial and confirmation export; provide them together on reassessment. With N catalog journeys, at most 8N exports can enter a campaign.

Failure quorum applies to the whole journey. Exact failed step/check identities remain recorded; different failing criteria do not prove one reproduced defect or an instruction-level cause. Failure-only confirmations are not a reliability estimate. Selected trials also omit the preceding conversation context of unselected journeys.

Version 2 binds source, policy, harness, definition and per-journey fixture identities. Changed evaluator inputs require a new campaign. Historical version 1 public records remain readable with their original sources and single-observation meaning; old raw exports cannot join a version 2 campaign. Historical records gain no fabricated fresh-chat attestations or confirmation history.

## What the record establishes

Trusted checks establish file outcomes and reply facts against local criteria. Reply checks use explicit patterns for selected facts and result phrases. Patches, timestamps, environment details, CLI presence, restart counts, and harness self-checks are sandbox-captured facts from a model-controlled workspace. They are not independent proof of process. Replies and activity are agent-reported. Declared procedural expectations remain explicitly unverified.

The model can inspect or modify its workspace. Instructions forbid opening the harness or future request files, but this cannot be enforced. File hashes detect inconsistencies against the operator-held bundle; they do not authenticate model behavior. No command monitoring or tool-call timeline is collected.

The model knows it is being tested, and the future-step file exists in its workspace. Retirement checks require removal of the focused test, reject literal retired-file references in `package.json`, and reject the fixture's stale README claims about the current invocation and test. Accurate README retirement history may name removed files. These checks do not establish complete semantic cleanup. Actual canonical-instruction consumption and removal of every superseded consumer remain unverified in the agent journey. Preserve reported procedural deviations and observed defects alongside passing outcomes; do not describe a passing run as proof that every instruction was followed.

Diagnose harness, fixture, or assessment defects and rerun after correction. Changed criteria require fresh exports for the affected selected journeys against a new bundle. An integrity failure invalidates that platform export and requires a fresh whole-platform attempt. Report defects in the distributed skill separately; this suite does not modify it to make a run pass. Observed model behavior alone does not establish a defect in the skill instructions. Keep failed diagnostic records for investigation. Evidence selection and website presentation are separate publication steps.

## Update one combined snapshot

Compose explicitly named local records after assessment. Start a snapshot from one campaign, then replace only selected whole provider/journey groups:

```bash
npm run eval:journeys -- compose --run <assessed-run-id>
npm run eval:journeys -- compose --from <snapshot-id> --run <assessed-run-id> --platform chatgpt
npm run eval:journeys -- compose --from <snapshot-id> --run <assessed-run-id> --platform chatgpt --journey <journey-id>
```

Omitted filters select precisely the incoming campaign's recorded cells. Repeat `--journey` for several whole journeys. Unknown, duplicate or absent selections are rejected. The incoming record must be an admitted version 2 campaign. The optional base may be a snapshot or supported historical assessed record. Composition reads only those IDs; it never searches history or consults the production selection.

A selected group replaces its baseline, all confirmations, resolution and observations together. Votes never cross campaigns or providers. Unselected groups keep their original evidence. Every composition creates a new `journey-snapshot-<timestamp>-<token>` record and refuses an existing destination. Source assessments and earlier snapshots remain unchanged. Use one local operator at a time.

The incoming full catalog becomes the current target. New tests can be recorded in ChatGPT alone, with Claude explicitly Not run. Earlier-only rows retain their original catalog and requests. Changed definition or fixture identities receive separate request sequences; earlier skill versions and evaluation methods remain visible. Historical fixture identity and confirmation policy stay unavailable.

Sources are identified by their exact raw assessment SHA-256. Artifacts retain their bytes and hashes under `sources/<16-character-digest-token>/`; prefix collisions are rejected. Only projected links change. Referenced sources are stored once, and only unreferenced sources are omitted from the new snapshot. Existing limits remain 8,192 artifacts, 64 MiB of unique decoded artifact bytes and 128 MiB expanded/compressed bundles. Composition uses Node filesystem APIs and does not require `zip` or `unzip`.

Public status is incomplete for unresolved groups, partial coverage or mixed target inputs. Terminal confirmed failures remain failed. Passing requires both providers to cover the complete current catalog with terminal passing resolutions and matching skill, test and method identities. Provider models and observation dates remain separate provenance. Historical observations cannot earn version 2 confirmation assurance.

## Publish assessed evidence

Use the shared evidence pipeline to publish an explicitly chosen admitted campaign or composed snapshot. Substitute its exact ID below. Partial, pending, mixed and failed evidence can be displayed; release assurance still requires a complete passing public envelope:

```bash
npm run evidence:pack -- --scope journeys --run <run-id>
npm run evidence:publish -- --bundle .evidence/bundles/journeys-<run-id>.json.gz --tag evidence-journeys-<run-id>
npm run release:evidence:pin -- --scope journeys --release evidence-journeys-<run-id> --asset journeys-<run-id>.json.gz
npm run evidence:prepare
```

This release contains assessed output, separate from the input bundle release. The optional `journeys` selection can remain null while semantic evidence is selected. Release verification requires selected journeys evidence to be official and passing. See [Release evidence](../release-evidence/) for download integrity, preparation, and selection rules.

The website preserves initial failures, ordered confirmations, blocked-check details and source-specific raw downloads. Coverage and recovered/pending counts stay separate. Overviews contain at most 16 journey rows per static page; the compact evidence preview shows four. Missing provider evidence is labeled Not run, including on mobile and without JavaScript.
