![moldea](assets/cover.png)

# `moldea` Agent Skill

[Get `moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea) or explore the complete documentation at [`skill.moldea.ai`](https://skill.moldea.ai).

The current release is `2.0.0`. Install the latest version from `main` in the current project with:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin the immutable release tag:

```bash
npx skills add "moldea-ai/skill#v2.0.0"
```

Both sources install the portable skill as `moldea`. They do not install `@moldea.ai/cli` globally or require a `moldea` Cloud account.

## What `moldea` is

`moldea` is a Git-native system for project context and agent behavior. A client repository owns its canonical `/moldea/**` state, including project truth, focused context, decisions, runtime guidance, agent instructions, implementation relationships, runtime variables, mirrors, and unresolved requirements.

This Agent Skill is the portable semantic operating layer used by a compatible coding agent to:

- initialize a context-first `moldea` project
- plan the smallest appropriate system of agents, deterministic software, services or tools, data contracts, and human control for an AI-enabled objective
- continuously maintain affected project and agent state during ordinary development
- create and refine grounded agent behavior
- evaluate structural and semantic alignment without writing
- reconcile confirmed drift through authorized repository changes
- invoke deterministic repository-local validation

Local work is filesystem-first and private by default. The skill does not send repository content to `moldea` Cloud, and Cloud is not required for installation or local operation.

## Installation

The primary public distribution page is [`moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea). It provides the current listing and installation path for compatible coding agents.

### Project installation (recommended)

The preferred path uses the open-source [`skills` CLI](https://github.com/vercel-labs/skills). Its default project scope keeps the skill with the repository so the team can share it through version control:

```bash
npx skills add moldea-ai/skill
```

This source follows `main`. To install the current release reproducibly, use its immutable tag:

```bash
npx skills add "moldea-ai/skill#v2.0.0"
```

The `skills` CLI supports Agent Skills-compatible hosts including Codex, Claude Code, Cursor, OpenCode, GitHub Copilot, Cline, and many others. Host detection and installation location are handled by the installer; the portable skill itself remains vendor-neutral.

### Global installation (optional)

Developers who want the latest version from `main` available across all projects can add `-g`:

```bash
npx skills add moldea-ai/skill -g
```

Add `-g` to the release-tag command instead when a reproducible global installation is required.

### Update or remove

Refresh an installation by rerunning its `skills add` command. The unversioned source follows `main`; a release-pinned installation remains on its immutable tag until the command is changed to another tag.

Remove the project installation with:

```bash
npx skills remove moldea
```

Add `-g` to remove the global installation instead.

## Prerequisites

Installing the skill has no `moldea` runtime prerequisite. Using it for deterministic client-repository operations requires:

- Git `>=2.30.0`
- Node.js `^22.11.0 || ^24.11.0`
- an established supported package manager, or npm when none is established
- a repository-local exact `@moldea.ai/cli` development dependency in the supported range

Release `2.0.0` supports:

- `@moldea.ai/cli >=2.0.0 <2.1.0`
- CLI JSON schema `1`
- npm `>=10.9.0 <12.0.0`
- pnpm `>=11.20.0 <12.0.0`
- Yarn `>=4.0.0 <5.0.0`

The recommended repository-local CLI version for this release is `2.0.0`. Existing compatible exact pins remain valid unless the authorized work materially requires a supported capability they do not provide.

Write-capable workflows establish or reconcile the exact compatible repository-local CLI dependency without executing lifecycle scripts or repository-supplied package-manager hooks and plugins. `evaluate` is strictly read-only and reports missing or incompatible tooling instead of installing it. Agent-system `plan` is also read-only and may run before adoption or local tooling exists. The skill never falls back to a global CLI or transient CLI download.

## Quick start

1. From the project root, install the skill.
2. Open a Git repository in a compatible coding agent.
3. Ask your coding agent naturally:

```text
Create support agent
```

The first-use journey is `developer -> coding agent -> moldea skill when relevant -> grounded agent system`. The skill understands the project before inventing behavior, uses existing `moldea` context or establishes the minimum useful foundation when adoption is authorized, then creates or maintains the requested agent system. The developer does not need to initialize `moldea` separately or invoke its local CLI directly.

To establish project context without creating an agent, ask:

```text
Initialize moldea for this repository.
```

Standalone initialization first understands the project, then creates the minimum valid foundation:

```text
/moldea/moldea.yaml
/moldea/project.md
```

It does not create an agent automatically. Additional context, decisions, runtime guidance, agents, or unresolved requirements are created only when project evidence justifies them.

To design an AI-enabled system before implementation or `moldea` adoption, ask:

```text
Plan an agent system for personalized ecommerce promotions and decide what should remain ordinary software.
```

Planning starts from the objective and may recommend zero, one, or multiple agents. It changes no repository, dependency, Git, or external state and does not create a canonical plan artifact.

## Natural-language operations

| Outcome           | Example request                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| Plan a system     | `Plan which parts of this workflow should be agents versus normal code.`    |
| Initialize        | `Initialize moldea for this repository.`                                    |
| Maintain context  | `Update the project context for the new refund policy.`                     |
| Create an agent   | `Create a customer-support agent grounded in the current implementation.`   |
| Maintain an agent | `Add the order lookup tool to the support agent and align its instruction.` |
| Evaluate          | `Evaluate the current moldea project.`                                      |
| Reconcile         | `Reconcile the billing agent with the implementation.`                      |
| Validate          | `Validate the moldea project.`                                              |

`evaluate` reports deterministic diagnostics, confirmed semantic problems, material ambiguities, relevant unresolved requirements, and evidence limitations without modifying any repository file. `reconcile` begins from the same evidence model and applies only the smallest authorized coherent correction.

## Continuous maintenance

Once a repository has adopted `moldea`, ordinary behavior-affecting development work may activate the skill even when the request does not mention `moldea`. The coding agent reconsiders the relevant canonical state through explicit and semantic relationships and updates affected representations only when project truth or declared behavior actually changed.

Relevance does not mean automatic documentation churn. A legitimate result is no `/moldea/**` edit when the established state remains accurate. Relevance-triggered activation also never initializes `moldea` in an unrelated repository without explicit developer intent.

## Portable skill

The released runtime artifact is:

```text
moldea/
├── SKILL.md
├── references/
│   ├── agent-design.md
│   ├── agent-system-planning.md
│   ├── context-gathering.md
│   ├── continuous-maintenance.md
│   ├── evaluate-and-reconcile.md
│   └── local-tooling.md
└── agents/
    └── openai.yaml
```

`SKILL.md` contains the universal activation, authority, compatibility, operation-selection, and reporting rules. Focused references are loaded only for the workflows that need them, including the objective-first agent-system planning method. `agents/openai.yaml` is an optional host extension and is not a semantic dependency of the portable core.

## Project blueprint

- `moldea/` is the complete distributed Agent Skill artifact.
- `docs/` contains concise, durable public concepts, workflows, references, and paired interaction examples. It does not document APIs or HTTP endpoints.
- `website/` is the isolated private Astro application that validates and renders `/docs/**`, local search, and generated `llms.txt` for [`skill.moldea.ai`](https://skill.moldea.ai).
- `CNAME` declares `skill.moldea.ai` as the GitHub Pages custom domain.
- `tests/` contains deterministic metadata, packaging, published-package, candidate-release, reference, and semantic-contract checks.
- `fixtures/` contains development-only conformance cases, a hostile lifecycle-script fixture, and a narrow synthetic compatibility fixture.
- `.github/workflows/conformance.yml` runs portable conformance across supported Node.js lines and representative minimum/latest package-manager versions.
- `.github/workflows/release-candidate.yml` manually packs an exact packages-repository ref and runs the real CLI candidate closure across the same package-manager matrix without publishing it.
- `README.md` documents public installation, adoption, development, and release behavior.

Development-only tests and fixtures are not required runtime inputs and are not included by the direct `moldea/` installation target.

## Development

Run the portable skill and conformance correctness checks:

```bash
npm test
```

Run the categories separately:

```bash
npm run test:unit
npm run test:integration
```

The documentation website uses an isolated Node.js 24.15.0 dependency boundary. Install its exact dependency closure with `npm --prefix website ci --ignore-scripts`, then use:

```bash
npm run docs:check
npm run website:check
npm --prefix website run test:e2e
```

Run the local website with:

```bash
npm run website:dev
```

The static build defaults to `SITE_URL=https://skill.moldea.ai` and `BASE_PATH=/`. The build derives documentation routes, navigation, local search, and public `llms.txt` from repository-owned sources; generated model output is ignored and must not be edited directly.

The Pages deployment reads the repository's configured origin and base path before building. Keep the GitHub Pages custom-domain setting and DNS record aligned with `CNAME`; the canonical production origin is [`https://skill.moldea.ai`](https://skill.moldea.ai).

The complete integration suite requires Bubblewrap and defaults to the available npm executable and published `@moldea.ai/cli@2.0.0`. Portable CI jobs provision Bubblewrap, load Ubuntu's packaged Bubblewrap AppArmor profile, and run the complete suite. The package-manager matrices run the focused package-manager integration boundary across npm `10.9.0` and `11.19.0`, pnpm `11.20.0` and `11.21.0`, and Yarn `4.0.0` and `4.18.0` against every supported published CLI release, currently `2.0.0`, without repeating unrelated sandbox checks. Yarn versions with a minimum-release-age gate use their command-scoped override only inside the isolated conformance install so newly published exact package versions remain testable.

The ordinary package-manager integration suite first serves the adversarial lifecycle fixture through an isolated local registry with faithful package metadata. That fixture intentionally contains lifecycle scripts and remains the security proof for exact pinning and lifecycle suppression. A separate mandatory path installs the selected exact published CLI from npm, proves local executable provenance, and executes deterministic `compatibility --json` and `inspect --json` checks against a custom-runtime project.

When `MOLDEA_CLI_ARTIFACT_DIRECTORY` identifies one packed artifact for each of `@moldea.ai/cli`, `@moldea.ai/adapter-openai`, `@moldea.ai/core`, `@moldea.ai/repository`, and `@moldea.ai/repository-fs`, the same suite derives their versions and internal dependency composition from the packed manifests. It then builds a scoped loopback registry and runs the shared real-CLI checks. The packages may version independently, but the CLI must exact-pin the four supplied internal artifacts. Set `MOLDEA_REQUIRE_REAL_CLI_ARTIFACTS=1` at the release boundary so a missing artifact directory fails instead of skipping that candidate-only case. The manual Release Candidate workflow accepts an exact `moldea-ai/packages` ref, records the resolved commit, packs the artifacts, and runs this path across every supported package-manager version without publishing or tagging either repository.

`fixtures/conformance-cases.json` contains package-manager, CLI-envelope, README-marker, planning, runtime, security, and semantic forward-evaluation scenarios. Deterministic tests execute the mechanical decisions and validate every semantic case's evidence, requested operation, expected outcomes, and forbidden outcomes. CI also installs the portable artifact into an isolated Agent Skills home and compares the installed tree byte-for-byte with `moldea/`.

Semantic evaluation is intentionally lengthy and can consume a significant number of model tokens because every case runs separate actor and judge processes. Do not start a full or targeted semantic evaluation without first explaining to the developer why fresh semantic evidence is important for the current change, why existing evidence or deterministic verification is insufficient, and the expected time and token cost when known. Obtain the developer's explicit approval before running it.

Semantic behavior is evaluated through an Agent Skills-capable host and recorded against the exact portable artifact digest. The runner always pins both the actor and judge to `gpt-5.6-terra` at `medium` reasoning effort; caller-provided host commands must not select their own model or reasoning effort. This fixed configuration avoids per-run model and effort decisions. To refresh that evidence, provide a non-interactive host command that accepts the evaluation prompt on standard input and returns the requested JSON object, then run:

```bash
MOLDEA_EVAL_ACTOR_COMMAND_JSON='["codex","exec","--ignore-user-config","--ignore-rules","--ephemeral","--skip-git-repo-check","--dangerously-bypass-approvals-and-sandbox","-c","shell_environment_policy.inherit=none","-"]' npm run eval:semantic -- --record
```

Recording writes `fixtures/.semantic-evaluation-candidate.json` atomically after every completed case. The candidate is ignored by Git and is bound to the exact portable artifact digest, complete semantic case-suite digest, and actor and judge identities, including their fixed model and selected reasoning effort. Repeating the same full command resumes a compatible candidate: already passing cases are skipped, while missing and failing cases are evaluated again. If any bound input changes, the runner rejects the candidate instead of mixing evidence; after confirming that the old evidence should be discarded, start a new full candidate with `--record --restart`.

After an approved full run leaves only a small number of failing or interrupted cases, rerun one case into the same candidate with:

```bash
MOLDEA_EVAL_ACTOR_COMMAND_JSON='["codex","exec","--ignore-user-config","--ignore-rules","--ephemeral","--skip-git-repo-check","--dangerously-bypass-approvals-and-sandbox","-c","shell_environment_policy.inherit=none","-"]' npm run eval:semantic -- --case <case-id> --record
```

A targeted recorded rerun replaces only that case's compatible candidate evidence. The runner promotes the candidate atomically to `fixtures/semantic-evaluation-result.json` and removes the candidate only after every required case passes. Missing or failing evidence never replaces the committed result.

The runner requires Bubblewrap and `socat`, and validates the Codex command before execution. Bubblewrap builds an empty filesystem root from a minimal set of read-only runtime paths, creates fresh process, IPC, network, cgroup, device, and temporary-filesystem boundaries, drops capabilities, and exposes only a fresh evaluation repository plus copied authentication state as writable. It does not mount host runtime or socket directories. Codex runs in its documented externally sandboxed automation mode because this machine's kernel cannot create a nested user namespace; the flag never runs outside Bubblewrap. Generated shells inherit none of the host environment, and sessions are not persisted.

The isolated network namespace has no direct host or internet route. A repository-external CONNECT relay permits only HTTPS port `443`, exact configured hostnames, and DNS results containing exclusively public addresses. The default allowlist is `api.openai.com`, `auth.openai.com`, and `chatgpt.com`; add an exact model endpoint with `MOLDEA_EVAL_ALLOWED_HOSTS` when required. Localhost, private, link-local, and undeclared destinations remain inaccessible. Each actor or judge process is killed after 120 seconds by default; set a positive `MOLDEA_EVAL_HOST_TIMEOUT_MS` only when a deliberate evaluation requires a different bound.

The runner installs the exact portable tree into a fresh project for every actor case, withholds the evaluation criteria from that actor, captures repository-visible changes, and starts a separate judge process in another workspace. Ordinary adopted-project cases receive a copied, locked production closure from the root `@moldea.ai/cli@2.0.0` dependency without running a package manager. Only `dedicated-repository-runtime-selection` and `runtime-adapter-lifecycle` use the synthetic compatibility CLI because they require hypothetical adapter states that the published matrix cannot expose. Set `MOLDEA_EVAL_JUDGE_COMMAND_JSON` to use a different safely configured Codex judge command; otherwise the actor command is reused in a fresh process and workspace.

Use `--case <case-id>` without `--record` for a standalone diagnostic that must not update candidate or committed evidence. A targeted run with `--record` requires an existing compatible candidate and cannot promote it until the complete case suite passes.

The sandbox exposes the exact host Node.js executable at `/opt/node` so the verified repository-local CLI can run without mounting a host-managed runtime directory. It provides a non-installing npm probe that reports the fixed evaluation npm version and rejects every non-version command. It also resolves and mounts the exact `codex-code-mode-host` executable shipped beside the selected Codex binary rather than exposing the surrounding installation directory. The committed result records the actor and judge CLI versions and the runner-owned `gpt-5.6-terra` model and `medium` reasoning-effort selections.

The result is invalidated automatically whenever semantic distributed skill content changes. A release-only update may carry forward the latest passing result without repeating model execution only when the exact source artifact digest still matches that result, the changed portable paths are limited to `SKILL.md` and `references/local-tooling.md`, and their deterministic semantic digests remain identical after normalizing only the release-version declarations. The fixture records both exact artifact digests, both semantic digests, the changed paths, reason, and carry-forward time. Development evaluation uses synthetic repository evidence and does not require a `moldea` Cloud account.

The root `AGENTS.md` is an intentional maintainer-only symlink to a sibling coding-instructions checkout. It is not part of the portable `moldea/` artifact and the skill has no runtime dependency on it. External contributors may use their own applicable coding instructions when that sibling checkout is unavailable.

## Releases

The skill uses independent semantic versioning. Every release must:

- record its exact version in `moldea/SKILL.md` metadata
- pass conformance on the release commit
- use an immutable `v<version>` tag
- preserve semantically identical `moldea/` content across every official distribution channel

Release `2.0.0` uses the immutable `v2.0.0` tag.

## License

[MIT](LICENSE)
