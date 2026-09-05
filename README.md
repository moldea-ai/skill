![moldea](assets/cover.png)

# `moldea` Agent Skill

[Get `moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea) or read the complete documentation at [skill.moldea.ai](https://skill.moldea.ai).

The current release is `5.0.0`. Install the latest version from `main`:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin the release:

```bash
npx skills add "moldea-ai/skill#v5.0.0"
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

Ordinary engineering work remains ordinary engineering work. The skill abstains silently when a task does not concern `/moldea/**`, the managed README block, an exact declared binding, an `affectedBy` relationship, or an explicit `moldea` request.

Initialization writes a concise managed README block that tells repository-aware hosts to select the installed skill for its two-byte gate before ordinary repository work. This is a discovery bridge, not broad activation: a gate miss continues the host task without a CLI call, workflow-reference load, progress update, or final-report mention.

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

Release `5.0.0` supports exactly:

- Git `>=2.30.0`
- Node.js `>=22.11.0`
- stable `@moldea.ai/core` releases satisfying `^3.0.0`
- stable `@moldea.ai/cli` releases satisfying `^7.0.0`
- repository format version 1
- CLI JSON schema 4

The CLI must be a repository-root-local development dependency. Its manifest declaration and exact lockfile-selected stable version must satisfy the supported CLI 7 range. The skill never falls back to a global installation, another workspace, or a transient download.

Tooling establishment belongs only to write-capable `moldea` work. Read-only evaluation, validation, planning, and host-owned review workflows do not install dependencies or alter package-manager state.

## Relevance gate

The entrypoint decides relevance before loading references or running the CLI:

1. Answer a non-repository informational question concisely without inspection.
2. Before initialization, continue moldea only for an explicit initialization request. Every other host-owned repository task continues normally while moldea abstains silently.
3. After initialization, activate directly for an explicit repository-dependent moldea request, a changed `/moldea/**` path, or a changed hunk inside the full-line managed README markers.
4. The managed README block tells repository-aware hosts to select this entrypoint for every repository task. For every other known task-path set, run the skill's deterministic two-byte relevance gate. It invokes repository-local Core directly and returns only `0` or `1`.
5. Only after `1`, run one bounded CLI relationship query to identify the matching canonical owners. Otherwise continue the host-owned task normally with no moldea CLI command, reference load, progress update, or final-report mention.

The gate accepts the ordinary repository-relative paths produced by Git as well as leading-slash repository-logical paths. It normalizes that host boundary before calling Core, so a harmless path-spelling difference cannot create a false abstention. The subsequent CLI query receives the normalized leading-slash form.

Host commands such as planning, reviewing, committing, and publishing retain ownership of their workflows. Their names alone never activate `moldea`, and the skill's local tooling rules never replace host-owned Git or package-manager procedures.

Broad ideas such as “potentially durable knowledge” do not activate the skill. Relevance must be established by the current task and canonical relationship graph.

## Bounded CLI evidence

Compatible CLI 7 releases emit schema 4 JSON only.

- `inspect` returns content-free metadata, counts, diagnostics, paths, digests, relationships, and a bounded page.
- `scope` matches one path or one NUL-delimited path set against declared relationships.
- `content` reads one explicitly selected canonical asset in bounded Unicode-safe chunks.
- `validate` reports structural validity without embedding canonical document bodies.
- `composition` reports the installed package and adapter composition.

Every machine invocation uses `--json --max-output-bytes 65536`. Ordinary work stops after the relevant record or diagnostic is found and keeps aggregate `moldea` output at or below 262,144 bytes. Explicit large-context traversal may use additional pages when the task genuinely requires them, but each invocation remains below the CLI's 1 MiB hard maximum and traversal remains purpose-bounded.

The 64 KiB page and 256 KiB ordinary aggregate are operating targets, not repository-size limits. Large projects remain usable because metadata is paginated and content is requested separately. Evaluation hosts also impose generous failure-containment ceilings: 32 `moldea` invocations, 8 MiB of `moldea` command output, and 16 MiB of total model-visible tool output per model stage. Crossing a ceiling fails the stage with the observed value and limit instead of truncating silently or producing an ambiguous result.

These targets are source-controlled in `tooling/resource-calibration/profiles.mjs` and checked against the reproducible three-sample corpus in `fixtures/resource-calibration.json`. Run `npm run resource:check` for deterministic verification or `npm run resource:calibrate` to regenerate the measured environment, fixture shapes, latency and memory distributions, temporary-disk peaks, output bytes, token estimates, command counts, and completion states.

## Natural-language operations

| Outcome          | Example request                                                  |
| ---------------- | ---------------------------------------------------------------- |
| Initialize       | `Initialize moldea for this repository.`                         |
| Create an agent  | `Create a support agent grounded in the current project policy.` |
| Maintain context | `Update moldea context for the approved refund policy.`          |
| Evaluate         | `Evaluate the current moldea project.`                           |
| Reconcile        | `Reconcile the billing agent with its declared implementation.`  |
| Validate         | `Validate moldea.`                                               |

Evaluation is read-only. It may inspect canonical metadata and explicitly required chunks, but it must not change repository files, the Git index, refs, configuration, submodules, or object storage.

Initialization writes the complete manifest, project document, and managed README block before making one final `validate` call. With no evidenced relationships, the manifest is exactly `version: 1` plus its final LF; it contains no invented metadata or empty mappings. A successful validation ends the operation without `inspect`; a structural failure permits one bounded diagnostic-driven repair and one final retry.

## Portable skill

The released artifact is:

```text
moldea/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
    ├── agent-design.md
    ├── agent-system-planning.md
    ├── context-compression.md
    ├── context-gathering.md
    ├── continuous-maintenance.md
    ├── evaluate-and-reconcile.md
    ├── local-tooling.md
    ├── runtime-compatibility.md
│   └── skill-design.md
└── scripts/
    └── relevance-gate.mjs
```

`SKILL.md` owns activation, operation selection, evidence limits, boundaries, and reporting. `scripts/relevance-gate.mjs` performs the bounded pre-activation decision without a CLI invocation or canonical content output. References are loaded only after relevance is established and only when the selected operation needs them. `agents/openai.yaml` adds optional host metadata without redefining the portable contract.

## Project blueprint

- `moldea/` is the complete distributed Agent Skill.
- `docs/` contains concise public concepts and workflows. It does not document APIs or HTTP endpoints.
- `tests/` and `fixtures/` contain deterministic conformance and semantic cases.
- `tooling/codex-evaluation-host/` owns isolated model execution and privacy-safe resource accounting.
- `tooling/semantic-evaluation/` owns the current semantic evidence contract.
- `tooling/release-identity/` owns exact release identity plus the fresh or explicitly pinned evidence selection.
- `qualification/` owns adapter-specific qualification. Universal skill behavior runs once in the Custom profile; published adapters retain only adapter-specific probes and cases.
- `website/` validates and renders current documentation and current committed evidence.
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

Run the current semantic evaluation and verify its committed attempt:

```bash
npm run eval:semantic -- --record
npm run eval:semantic:verify
```

Run Custom qualification first, then each published adapter profile. Every official run records fresh evidence for the current protocol, exact skill bytes, CLI closure, evaluator, target, and environment.

After current semantic and qualification evidence passes, record the compact fresh release envelope:

```bash
npm run release:evidence:record
```

When a maintainer has established that a release does not affect evaluated behavior, pin it to an earlier passing release that carries the stable evidence envelope:

```bash
npm run release:evidence:pin -- --from v5.0.0 --reason "Release tooling only; portable behavior is unchanged."
```

The pin is explicit, local, reasoned, and visible on public evidence pages. It validates the exact source tag, source commit, compact envelope, referenced artifact digests, passing states, and resource limits. It bypasses only current evidence freshness and identity equality. It does not bypass release signing or publication credentials. Run the same command with `--clear` to remove a prepared pin.

## Releases

The skill uses independent semantic versioning. Every release must:

- record its exact version in `moldea/SKILL.md`
- declare the compatible CLI major and bind the exact evaluated CLI closure plus CLI JSON schema in release evidence
- pass current conformance and select either verified fresh evidence or an explicit valid pin to an earlier passing release
- preserve identical `moldea/` bytes across official distribution channels
- use an immutable `v<version>` tag

Release `5.0.0` uses tag `v5.0.0`.

See [Release evidence](docs/release-evidence.md) for the exact fresh and pinned workflows. `npm run release:check` is read-only and selects the evidence mode before running any current-only verifier.

## License

[MIT](LICENSE)
