![moldea](assets/cover.png)

# `moldea` Agent Skill

[Get `moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea) or read the complete documentation at [skill.moldea.ai](https://skill.moldea.ai).

The current release is `5.0.4`. Install the latest version from `main`:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin the release:

```bash
npx skills add "moldea-ai/skill#v5.0.4"
```

Both commands install the portable skill named `moldea`. They do not install the CLI globally or require a hosted account.

## What `moldea` is

`moldea` keeps durable project context and agent behavior in a Git repository. Adopted projects own a canonical `/moldea/**` tree containing project truth, focused context, decisions, agent instructions, implementation relationships, runtime guidance, mirrors, and unresolved requirements.

The skill helps a coding agent:

- initialize the minimum useful canonical project state when explicitly requested
- create and maintain grounded agents and reusable Agent Skills
- update canonical knowledge when the requested work directly affects it
- evaluate and reconcile established relationships
- validate repository structure with the exact local CLI

Ordinary engineering work remains ordinary engineering work. In an adopted repository, the skill abstains silently when a task does not concern `/moldea/**`, the managed README block, an exact declared binding, an `affectedBy` relationship, or an explicit `moldea` request. Before adoption, initialization is the only repository-dependent `moldea` operation; host-owned planning and engineering continue independently.

Initialization uses the bundled deterministic writer to create one canonical managed README block. It tells repository-aware hosts to select the installed skill for its two-byte gate before ordinary repository work. This is a discovery bridge, not broad activation: a gate miss continues the host task without a CLI call, workflow-reference load, progress update, or final-report mention. The writer rejects unsafe README structures and preserves every byte outside the managed region.

## Installation

```bash
npx skills add moldea-ai/skill
```

Install the skill inside each repository that will use it so the selected version travels with the project. A global installation does not establish repository adoption and is not a supported `moldea` installation path.

### Update or remove

Run the installation command again to refresh a branch-tracking installation. Change the tag in the pinned command to move between releases.

Remove a project installation with:

```bash
npx skills remove moldea
```

## Compatibility

Release `5.0.4` supports exactly:

- Git `>=2.30.0`
- Node.js `>=22.11.0`
- stable `@moldea.ai/core` releases satisfying `^4.0.1`
- stable `@moldea.ai/cli` releases satisfying `^8.0.0`
- repository format version 1
- CLI JSON schema 4

The CLI must be a repository-root-local development dependency. Its manifest declaration and exact lockfile-selected stable version must satisfy the supported CLI 8 range. Every invocation goes through the installed skill's closed repository-local launcher. The skill never falls back to a global installation, another workspace, a package-manager launcher, or a transient download.

Published runtime-target `versionRange` values are best-effort eligibility gates for deterministic source-pattern inspection, not blanket compatibility guarantees. Their lower bounds record verified minimums. Qualification evidence identifies the exact package closure and verification date that actually ran.

Tooling establishment belongs only to write-capable `moldea` work. Read-only evaluation, validation, planning, and host-owned review workflows do not install dependencies or alter package-manager state.

## Relevance gate

The entrypoint decides relevance before loading references or running the CLI:

1. Answer a non-repository informational question concisely without inspection.
2. Before initialization, continue moldea only for an explicit initialization request. Every other host-owned repository task continues normally while moldea abstains silently. If no independent host task remains, report only a neutral repository outcome such as `No files were changed.` without naming moldea, describing an unavailable operation or result, or recommending initialization.
3. After initialization, activate directly for an explicit repository-dependent moldea request, a changed `/moldea/**` path, or a changed hunk inside the full-line managed README markers.
4. The managed README block tells repository-aware hosts to select this entrypoint for every repository task. For every other known task-path set, run the skill's deterministic two-byte relevance gate. It uses Core's release-bundled matcher and returns only `0` or `1`, without executing repository dependencies.
5. Only after `1`, run one bounded launcher-backed CLI relationship query to identify the matching canonical owners. Otherwise continue the host-owned task normally with no moldea CLI command, reference load, progress update, or final-report mention.

The gate accepts the ordinary repository-relative paths produced by Git as well as leading-slash repository-logical paths. It normalizes that host boundary before calling Core, so a harmless path-spelling difference cannot create a false abstention. The subsequent CLI query receives the normalized leading-slash form.

Host commands such as planning, reviewing, committing, and publishing retain ownership of their workflows. Their names alone never activate `moldea`, and the skill's local tooling rules never replace host-owned Git or package-manager procedures.

Broad ideas such as “potentially durable knowledge” do not activate the skill. Relevance must be established by the current task and canonical relationship graph.

## Bounded CLI evidence

Compatible CLI 8 releases emit schema 4 JSON only. The portable `scripts/moldea-cli.mjs` launcher accepts an absolute repository root and a closed argument surface, verifies the installed CLI/Core closure and resolved-path containment, invokes Node without a shell, enforces the declared stdout boundary and a separate stderr boundary, relays cancellation, force-terminates a child that ignores termination for five seconds, and preserves completed child exit status. Agents do not repeat package, link, `PATH`, or parent-workspace discovery around it.

- `inspect` returns content-free metadata, counts, diagnostics, paths, digests, relationships, exact agent-to-runtime assignment records, and a bounded page.
- `scope` matches one path or one NUL-delimited path set against declared relationships.
- `content` reads one explicitly selected canonical asset in bounded Unicode-safe chunks.
- `validate` reports structural validity without embedding canonical document bodies.
- `composition` reports the installed package and adapter composition.

Every paged machine invocation uses `--json --max-output-bytes 65536`; `composition` uses the launcher's fixed 65,536-byte boundary. Ordinary work stops after the relevant record or diagnostic is found and keeps aggregate `moldea` output at or below 262,144 bytes. Explicit large-context traversal may use additional pages when the task genuinely requires them, but each invocation remains below the CLI's 1 MiB hard maximum and traversal remains purpose-bounded.

The 64 KiB page and 256 KiB ordinary aggregate are operating targets, not repository-size limits. Large projects remain usable because metadata is paginated and content is requested separately. Qualification scenarios explicitly select an operating profile. Both profiles limit the output from one completed host command to 128 KiB. `ordinary` allows 64 completed host commands, 16 moldea calls, 256 KiB of moldea output, 1 MiB of aggregate model-visible tool output, and 1,625,000 model tokens. `largeTraversal` allows the same command, moldea-call, and token totals with 1 MiB of moldea output and 4 MiB of aggregate model-visible tool output. Each dimension remains an independent final failure with the profile, observed value, and limit. An otherwise safe cumulative command-count or token overage may reach the judge so semantically accepted behavior can calibrate a realistic profile, but it does not pass until the active profile accepts it. Missing token usage and output-volume, deterministic, workspace, or command-policy failures skip judging. Higher absolute ceilings, including the separate 16 MiB complete-stage output ceiling, remain process containment, not normal targets.

Semantic execution evidence discards raw command text and output. A fixed repository-root direct Node correctness-test invocation may contribute only its test level and native aggregate totals, and only when every discovered test passes with no failures, cancellations, skips, or todo results. Package-manager commands cannot contribute correctness evidence. The projection never retains test names, assertions, paths, durations, or output bodies.

The numeric profile is source-controlled in `tooling/resource-calibration/profiles.mjs`. `fixtures/resource-calibration.json` provides reproducible deterministic CLI and repository-operation evidence; it does not substitute for complete model-stage evidence. `fixtures/model-stage-resource-calibration.json` is a self-contained safety-calibration record with only accepted trial identity, evidence digests, pass states, aggregate resource counts, and token categories from judged qualification. It is not current qualification assurance, does not load an active result directory, and contains no commands, paths, prompts, output bodies, repository content, credentials, or hidden reasoning. Run `npm run resource:check` to verify both calibration sources and active-profile headroom, or `npm run resource:calibrate` to regenerate the deterministic environment, fixture shapes, latency and memory distributions, temporary-disk peaks, output bytes, token estimates, command counts, and completion states.

## Natural-language operations

| Outcome          | Example request                                                  |
| ---------------- | ---------------------------------------------------------------- |
| Initialize       | `Initialize moldea for this repository.`                         |
| Plan             | `Use moldea to plan an agent system for this adopted project.`   |
| Create an agent  | `Create a support agent grounded in the current project policy.` |
| Maintain context | `Update moldea context for the approved refund policy.`          |
| Evaluate         | `Evaluate the current moldea project.`                           |
| Reconcile        | `Reconcile the billing agent with its declared implementation.`  |
| Validate         | `Validate moldea.`                                               |

Evaluation is read-only. It may inspect canonical metadata and explicitly required chunks, but it must not change repository files, the Git index, refs, configuration, submodules, or object storage.

Initialization writes the complete manifest and project document, then runs the bundled `scripts/managed-readme.mjs` writer before making one final `validate` call. The writer creates or normalizes the canonical block atomically and never asks the model to reproduce it. With no evidenced relationships, the manifest is exactly `version: 1` plus its final LF; it contains no invented metadata or empty mappings. A successful validation ends the operation without `inspect`; a structural failure permits one bounded diagnostic-driven repair and one final retry.

## Portable skill

The released artifact is:

```text
moldea/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   └── managed-readme-block.md
├── references/
│   ├── agent-design.md
│   ├── agent-system-planning.md
│   ├── context-compression.md
│   ├── context-gathering.md
│   ├── continuous-maintenance.md
│   ├── evaluate-and-reconcile.md
│   ├── local-tooling.md
│   ├── runtime-compatibility.md
│   └── skill-design.md
└── scripts/
    ├── managed-readme.mjs
    ├── manifest-scope.cjs
    ├── manifest-scope.license.txt
    ├── moldea-cli.mjs
    ├── relevance-gate.mjs
    ├── repository-files.mjs
    └── repository-package.mjs
```

`SKILL.md` owns activation, operation selection, evidence limits, boundaries, and reporting. `assets/managed-readme-block.md` owns the canonical managed text, and the generated `scripts/managed-readme.mjs` performs the bounded atomic README update during explicit initialization. `scripts/relevance-gate.mjs` reuses that script's canonical parser and the release-bundled `manifest-scope.cjs` matcher without a CLI invocation, repository dependency execution, or canonical content output. `scripts/repository-files.mjs` bounds reads and checks resolved containment. `scripts/moldea-cli.mjs` owns the closed CLI launch boundary; `scripts/repository-package.mjs` verifies the CLI and Core from inert metadata before invocation. The dependency directory itself must remain inside the repository; npm and pnpm layouts inside that boundary are supported. These checks do not authenticate executable contents or provide an OS sandbox. References are loaded only after relevance is established and only when the selected operation needs them. `agents/openai.yaml` adds optional host metadata without redefining the portable contract.

## Project blueprint

- `moldea/` is the complete distributed Agent Skill.
- `docs/` contains concise public concepts and workflows. It does not document APIs or HTTP endpoints.
- `tests/` and `fixtures/` contain deterministic conformance and semantic cases.
- `tooling/codex-evaluation-host/` owns isolated model execution and privacy-safe resource accounting.
- `tooling/semantic-evaluation/` owns the current semantic evidence contract.
- `tooling/release-identity/` owns exact release identity plus the fresh or explicitly pinned evidence selection.
- `tooling/relevance-gate/` generates the portable matcher from the locked Core API and dependencies, with license notices and only Node built-in runtime imports. Run `npm run matcher:generate` after changing its locked inputs and `npm run matcher:check` to verify committed output. The artifact has a 1 MiB build limit; it is executed rather than loaded into model context. Each gate reads one bounded manifest and needs no persistent cache.
- `qualification/` owns adapter-specific qualification. Universal skill behavior runs once in the Custom profile; published adapters retain only adapter-specific probes and cases.
- `website/` validates documentation and authenticated fresh or pinned evidence, then presents semantic decisions and combined adapter journeys with technical provenance behind progressive disclosure.
- `.github/workflows/conformance.yml` runs portable correctness checks.
- `.github/workflows/release-candidate.yml` validates exact package candidates without publishing them.

Development-only tooling is not part of the installed `moldea/` artifact.

## Development

Install dependencies without lifecycle scripts:

```bash
npm ci --ignore-scripts
npm --prefix qualification ci --ignore-scripts
npm --prefix website ci --ignore-scripts
```

Run the deterministic boundaries:

```bash
npm test
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run path:check
npm run docs:check
npm run website:check
npm run website:build
```

Run semantic preflight without a model call:

```bash
npm run eval:semantic:preflight
```

Preflight reports the ordered paid case IDs with the exact reuse and resource boundary so source invalidation is visible before any model stage starts.

Run one non-recording diagnostic when a specific case needs investigation:

```bash
npm run eval:semantic -- --case <case-id>
```

The diagnostic prints one content-free result containing the verdict, criterion identifiers, a bounded rationale excerpt, separate actor and judge command-policy aggregates, and aggregate resource evidence. Policy aggregates retain only statuses, bounded reason codes, and counts. Its UTF-8 JSON output is limited to 65,536 bytes. Running `npm run eval:semantic` without `--case` or `--record` fails before host discovery, so it cannot accidentally start the complete paid suite.

When a semantic correction may affect several cases, run every suspected case once through the bounded non-recording batch and collect the complete compact failure set before editing. Correct shared causes together, rerun only the failures, then make one official recording after the targeted gate passes. The official run covers all 74 current cases through newly executed stages or exact identity-bound reuse from committed evidence.

Use the resumable batch runner instead of starting separate commands for each case:

```bash
npm run eval:semantic:diagnose -- --all
npm run eval:semantic:diagnose -- --cases <comma-separated-case-ids>
npm run eval:semantic:diagnose -- --claims <comma-separated-claim-ids>
npm run eval:semantic:diagnose -- --unresolved-from <attempt-id>
```

The batch completes one initial trial for every selected case, continues across semantic failures, and emits a compact final ledger. It accepts one, two, or four isolated workers and defaults to four. Worker count is operational, aggregate writes remain in fixture order, and exact completed stages resume at another accepted count after interruption. Because concurrent token admission reserves each possible next stage conservatively, an admission stop does not by itself prove actual candidate exhaustion. Resume the exact checkpoint with two workers, then one if necessary, before recalibrating the stop-loss; completed worker stages must not run again. `--restart` explicitly discards the current diagnostic batch. The coordinator, content-free ledger, and each private worker checkpoint are independently limited to 1 MiB, for a 6 MiB four-worker metadata ceiling. The ledger retains criterion IDs, a deterministic content-free explanation, and aggregate resources, never the model-authored rationale. Final stdout is limited to 16 KiB. Each worker is limited to 2 GiB of temporary storage, the batch reserves no more than 8 GiB, and dispatch preserves a 2 GiB free-space floor. The per-worker limit includes independent snapshots, attempt-local pnpm metadata, user configuration, package content, and installed dependencies; a healthy model-free Claude Agent SDK qualification measured about 1.25 GiB.

Run the current semantic evaluation and verify its committed attempt only with explicit recording:

```bash
npm run eval:semantic -- --record --workers 4
npm run eval:semantic:verify
```

Official recording also completes all missing initial cases before confirmations and records one complete attempt even when failures remain. Actors and independent judges run at `xhigh`, and every stage has a fifteen-minute ceiling. Semantic and qualification stages receive the same runner-owned closed-host developer instruction before their natural task. Host skill discovery is disabled, and the sandbox overlays an empty read-only host-skill tree, so external skill files cannot alter the closed fixture or expose evaluator-home content. The host rejects caller overrides and binds the instruction's SHA-256 digest into model-stage identity without storing its body in public evidence. Semantic and qualification runtime work shares the no-network policy; no compatibility-publication probe or per-case network exception is installed. Semantic, resource, command-policy, repository-control, read-only-mount, and operational dimensions are recorded separately. Only semantic-only failures receive confirmations. Confirmations run sequentially until two pass or two fail, with at most three confirmations, so one isolated verdict cannot decide recovery or terminal failure and no work runs after a quorum. Independently passing or recovered case groups from a configured valid committed attempt may be reused only when their complete actor and judge inputs still match. Reused stages retain their original provenance and do not count as new model work. Before every paid stage, the runner reserves the 2,097,152-token per-invocation maximum and refuses to exceed the 32,000,000-token direct-work ceiling for one candidate. A stage that exhausts its one automatic retry is persisted as terminally stopped before the command exits. An ordinary rerun refuses to repeat it; use `--resume-stopped-stage` to authorize exactly one additional attempt without discarding the candidate. A compatible resume clears the superseded interruption marker after identity validation so terminal evidence cannot retain stale interruption state. Every failed invocation is charged conservatively against the same ceiling.

Run free qualification preflight and Custom first. Custom cases accept one, two, or four isolated workers and default to four. After Custom passes, run all 13 adapters with one bounded profile batch. It continues across semantic failures while the host remains operationally safe, preserves each isolated attempt and result root, and commits summaries in profile-index order:

```bash
npm run qualification:dry-run:all
npm run qualification -- run --adapter custom --implementation custom --workers 4
npm run qualification -- run-batch --all --workers 4
npm run qualification -- run-batch --targets anthropic/typescript-messages-api-0-117,openai/typescript-responses-api-7 --workers 4
npm run qualification -- run-batch --unresolved-from <batch-id> --workers 4
```

Use the bounded non-publishing batch for complete or targeted diagnosis:

```bash
npm run qualification -- diagnose-batch --adapter custom --implementation custom --all
npm run qualification -- diagnose-batch --adapter <adapter> --implementation <implementation> --cases <comma-separated-case-ids>
npm run qualification -- diagnose-batch --adapter <adapter> --implementation <implementation> --claims <comma-separated-claim-ids>
npm run qualification -- diagnose-batch --adapter <adapter> --implementation <implementation> --unresolved-from <attempt-id>
```

The diagnostic batch gives every selected case one private attempt, runs up to four initials concurrently, writes a content-free completed ledger in declared order, and never changes official evidence. The coordinator and each private checkpoint are limited to 1 MiB, the aggregate metadata ceiling is 6 MiB, and final output is limited to 16 KiB. Correct the consolidated failure set, rerun only unresolved cases, then rerun only failed or exact-identity-invalidated official profiles. Every official run records evidence for the current protocol, exact skill bytes, CLI closure, evaluator, target, and environment.

Qualification batches use the same 2 GiB per-worker, 8 GiB aggregate, and 2 GiB free-space boundaries as semantic batches. The guard measures complete worker roots at model-stage boundaries and monitors filesystem free space during active stages without repeatedly traversing large dependency trees. Operational or capacity failure stops new dispatch, drains active siblings, and preserves exact resumable progress. Resume a conservative concurrent-admission stop at two workers, then one if needed, without replaying completed stages; do not raise a candidate ceiling from that event alone. One batch presents one aggregate paid boundary immediately before its first direct model call, including candidate count, planned and maximum calls, and the sum of independent per-candidate token ceilings.

After current semantic and qualification evidence passes, record the compact fresh release envelope:

```bash
npm run release:evidence:record
```

When a maintainer decides that rerunning one evidence domain would not provide enough additional assurance to justify its cost, pin only that domain to a verified earlier source. Use an exact release tag or an exact full commit:

```bash
npm run release:evidence:pin -- --scope semantic --from-commit <full-commit> --reason "Release tooling only; portable behavior is unchanged."
npm run release:evidence:pin -- --scope qualification --from v5.0.0 --reason "Qualification behavior is unchanged."
```

The scope may be `semantic`, `qualification`, or `all`. Every unselected section must have valid fresh current evidence. A pin is an explicit repository-bound maintainer risk decision. Its reason must identify what changed, name the deterministic checks used for the candidate, and avoid claiming that the earlier model run evaluated the new contracts. Public evidence pages present authenticated pinned and fresh results through the same human-readable journey interface. Immutable source identity, the maintainer reason, and the distinction from current-contract assurance remain available in the technical details. The pin validates the immutable source commit, optional source tag, portable skill digest, committed suite and coverage digests, complete passing inventory, referenced artifacts, attempt linkage, and resource limits without reinterpreting the source through the current evaluator vocabulary. It does not bypass release signing or publication credentials. Run the same command with `--clear` to remove an envelope containing a pin.

## Releases

The skill uses independent semantic versioning. Every release must:

- record its exact version in `moldea/SKILL.md`
- declare the compatible CLI major and bind the exact evaluated CLI closure plus CLI JSON schema in release evidence
- pass current conformance and select verified fresh or explicitly pinned evidence independently for semantic evaluation and qualification
- preserve identical `moldea/` bytes across official distribution channels
- use an immutable `v<version>` tag

Release `5.0.4` uses tag `v5.0.4`.

See [Release evidence](docs/release-evidence.md) for the exact fresh and pinned workflows. `npm run release:check` is read-only and validates each section through its selected path before running current-only verification for fresh sections.

## License

[MIT](LICENSE)
