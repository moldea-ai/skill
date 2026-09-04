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

## Installation

### Project installation

```bash
npx skills add moldea-ai/skill
```

A project installation is recommended because the repository can share the same skill version with its contributors.

### Global installation

```bash
npx skills add moldea-ai/skill -g
```

Use a global installation only when the latest branch version should be available across projects. Add `-g` to the tagged command for a reproducible global installation.

### Update or remove

Run the installation command again to refresh a branch-tracking installation. Change the tag in the pinned command to move between releases.

Remove a project installation with:

```bash
npx skills remove moldea
```

Add `-g` to remove the global installation.

## Compatibility

Release `5.0.0` supports exactly:

- Git `>=2.30.0`
- Node.js `>=22.11.0`
- `@moldea.ai/core` 2.1.0
- `@moldea.ai/cli 6.0.0`
- repository format version 1
- CLI JSON schema 3

The CLI must be a repository-root-local development dependency at the exact version. The skill never falls back to a global installation or a transient download.

Tooling establishment belongs only to write-capable `moldea` work. Read-only evaluation, validation, planning, and host-owned review workflows do not install dependencies or alter package-manager state.

## Relevance gate

The entrypoint decides relevance before loading references or running the CLI:

1. Activate directly for an explicit `moldea` request, a changed `/moldea/**` path, or a change inside the full-line managed README markers.
2. Activate directly for a task path that exactly matches a canonical binding already identified by the host.
3. When an `affectedBy` relationship might apply, send the complete known task-path set through one bounded `scope` invocation.
4. Otherwise abstain silently.

Host commands such as planning, reviewing, committing, and publishing retain ownership of their workflows. Their names alone never activate `moldea`, and the skill's local tooling rules never replace host-owned Git or package-manager procedures.

Broad ideas such as “potentially durable knowledge” do not activate the skill. Relevance must be established by the current task and canonical relationship graph.

## Bounded CLI evidence

CLI 6.0.0 emits schema 3 JSON only.

- `inspect` returns content-free metadata, counts, diagnostics, paths, digests, relationships, and a bounded page.
- `scope` matches one path or one NUL-delimited path set against declared relationships.
- `content` reads one explicitly selected canonical asset in bounded Unicode-safe chunks.
- `validate` reports structural validity without embedding canonical document bodies.
- `composition` reports the installed package and adapter composition.

Every machine invocation uses `--json --max-output-bytes 65536`. Ordinary work stops after the relevant record or diagnostic is found and keeps aggregate `moldea` output at or below 262,144 bytes. Explicit large-context traversal may use additional pages when the task genuinely requires them, but each invocation remains below the CLI's 1 MiB hard maximum and traversal remains purpose-bounded.

The 64 KiB page and 256 KiB ordinary aggregate are operating targets, not repository-size limits. Large projects remain usable because metadata is paginated and content is requested separately. Evaluation hosts also impose generous failure-containment ceilings: 32 `moldea` invocations, 8 MiB of `moldea` command output, and 16 MiB of total model-visible tool output per model stage. Crossing a ceiling fails the stage with the observed value and limit instead of truncating silently or producing an ambiguous result.

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

## Portable skill

The released artifact is:

```text
moldea/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── agent-design.md
    ├── agent-system-planning.md
    ├── context-compression.md
    ├── context-gathering.md
    ├── continuous-maintenance.md
    ├── evaluate-and-reconcile.md
    ├── local-tooling.md
    ├── runtime-compatibility.md
    └── skill-design.md
```

`SKILL.md` owns activation, operation selection, evidence limits, boundaries, and reporting. References are loaded only after relevance is established and only when the selected operation needs them. `agents/openai.yaml` adds optional host metadata without redefining the portable contract.

## Project blueprint

- `moldea/` is the complete distributed Agent Skill.
- `docs/` contains concise public concepts and workflows. It does not document APIs or HTTP endpoints.
- `tests/` and `fixtures/` contain deterministic conformance and semantic cases.
- `tooling/codex-evaluation-host/` owns isolated model execution and privacy-safe resource accounting.
- `tooling/semantic-evaluation/` owns the current semantic evidence contract.
- `tooling/release-identity/` verifies only current release identity and current evidence.
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

Run Custom qualification first, then each published adapter profile. Every official run records fresh evidence for the current protocol, exact skill bytes, CLI closure, evaluator, target, and environment. Release verification accepts only exact current evidence.

## Releases

The skill uses independent semantic versioning. Every release must:

- record its exact version in `moldea/SKILL.md`
- bind the exact CLI version and CLI JSON schema
- pass current conformance, semantic evaluation, Custom qualification, and every current adapter qualification
- preserve identical `moldea/` bytes across official distribution channels
- use an immutable `v<version>` tag

Release `5.0.0` uses tag `v5.0.0`.

## License

[MIT](LICENSE)
