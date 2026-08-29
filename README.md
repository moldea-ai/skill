![moldea](assets/cover.png)

# `moldea` Agent Skill

[Get `moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea) or explore the complete documentation at [`skill.moldea.ai`](https://skill.moldea.ai).

The current release is `4.0.0`. Install the latest version from `main` in the current project with:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin the immutable release tag:

```bash
npx skills add "moldea-ai/skill#v4.0.0"
```

Both sources install the portable skill as `moldea`. They do not install `@moldea.ai/cli` globally or require a `moldea` Cloud account.

## What `moldea` is

`moldea` is a Git-native system for project context and agent behavior. A client repository owns its canonical `/moldea/**` state, including project truth, focused context, decisions, runtime guidance, agent instructions, implementation relationships, runtime variables, mirrors, and unresolved requirements.

This Agent Skill is the portable semantic operating layer used by a compatible coding agent to:

- initialize a context-first `moldea` project
- plan the smallest appropriate system of agents, Agent Skills, deterministic software, services or tools, data contracts, and human control for an AI-enabled objective
- continuously maintain affected project, Agent Skill, and agent state as knowledge and implementation evolve
- create and refine grounded agent behavior
- create and refine reusable Agent Skills with focused references, scripts, and assets when they are the right boundary
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
npx skills add "moldea-ai/skill#v4.0.0"
```

The `skills` CLI supports Agent Skills-compatible hosts including Codex, Claude Code, Cursor, OpenCode, GitHub Copilot, Cline, and many others. Host detection and installation location are handled by the installer; the portable skill itself remains vendor-neutral.

### Global installation (optional)

Developers who want the latest version from `main` available across all projects can add `-g`:

```bash
npx skills add moldea-ai/skill -g
```

Add `-g` to the release-tag command instead when a reproducible global installation is required.

### Update or remove

Refresh a branch-tracking project installation from `main` with:

```bash
npx skills add moldea-ai/skill
```

Refresh a branch-tracking global installation with:

```bash
npx skills add moldea-ai/skill -g
```

A release-pinned installation remains on its immutable tag. To update it, replace `v4.0.0` in the following command with the desired newer published tag:

```bash
npx skills add "moldea-ai/skill#v4.0.0"
```

Add `-g` to the tagged command only when updating a global installation.

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
- this skill release's exact repository-local `@moldea.ai/cli` development dependency

Release `4.0.0` supports:

- `@moldea.ai/cli 5.0.0`
- CLI JSON schema `2`
- npm `>=10.9.0 <12.0.0`
- pnpm `>=11.20.0 <12.0.0`
- Yarn `>=4.0.0 <5.0.0`

CLI `5.0.0` is part of this skill release's identity. Another CLI version belongs to another skill release and is not treated as interchangeable.

Write-capable workflows inspect executable package-manager configuration as file data before any package-manager process. A pnpmfile, hook, or Yarn `plugins[].path` declaration counts as executable configuration even when its code remains unread and unrun. Repository-supplied executable configuration blocks manager execution. The report retains every independent blocker even when another clarification also pauses the workflow. It names the exact path, blocked operation, unavailable evidence, and safe prerequisite: remove or disable the extension and retry, or independently verify and invoke an already declared and installed exact local CLI without the manager. It never recommends bypassing or executing the hidden extension merely to continue. For pnpm Plug'n'Play, the coding agent resolves the exact package through `pnpapi`, validates its relative binary and package containment, then invokes that binary through a separate `pnpm node` process. When an accessible repository-specific request asks for local CLI proof, it performs these checks and reports the accepted provider, version, command, and envelope instead of returning only a procedure. Result-dependent safety checks and deterministic CLI commands run as separate processes so each accepted result remains independently attributable. `evaluate` is strictly read-only and reports missing or mismatched tooling instead of installing it. Agent-system `plan` is also read-only and may run before adoption or local tooling exists. The skill never falls back to a global CLI or transient CLI download.

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

Standalone initialization first understands the project, then establishes required local tooling and creates the minimum valid foundation:

```text
/moldea/moldea.yaml
/moldea/project.md
```

It does not create an agent automatically. Additional context, decisions, runtime guidance, agents, or unresolved requirements are created only when project evidence justifies them.

Initialization may become a short clarification conversation. The coding agent classifies high-information project evidence before changing dependency state. Repository names, generic labels, placeholder files, empty exports, and brief or generic package metadata may inform clarification but are not a meaningful foundation by themselves. When evidence does not establish meaningful project context, the coding agent says so and asks a focused foundational question instead of inventing project truth. When a broad consequential claim is supported only by narrower implementation evidence, it reports the narrower conclusion and asks about the unestablished authority, permission, value-bearing, destructive, lifecycle, or external-action boundary. Both outcomes pause before tooling installation, canonical project state, mirrors, or the owned README awareness block, and developer-answerable ambiguity is not stored as an unresolved requirement. A sufficiently grounded repository completes without ceremonial questions, and the final report maps the material sources to the foundation conclusions they established.

After completion, the coding agent summarizes the established foundation, files, and validation, then offers practical options such as reviewing the context, continuing ordinary development, planning an agent system, or creating a specific agent.

To design an AI-enabled system before implementation or `moldea` adoption, ask:

```text
Plan an agent system for personalized ecommerce promotions and decide what should remain ordinary software.
```

Planning starts from the objective and bounded repository discovery across high-information surfaces, a root inventory, and relevant source, documentation, configuration, and tests. Discovery only queues candidate evidence. Before a repository-specific conclusion, absence claim, responsibility allocation, or topology, the coding agent opens every accessible material candidate and maps its path to the fact and responsibility it establishes. The recommendation preserves, combines, or reliably replaces every responsibility. Incompatible private context, permission, trust, or failure boundaries remain separate unless deterministic software replaces one. Repository-established data authority, readers, writers, persistence, model contracts, deterministic enforcement, and approval scope remain explicit. An unresolved authority or topology decision takes priority over downstream configuration questions. If runtime identity is explicitly requested and the exact local CLI is safely available, planning runs `composition --json` for installed availability and validates the packages website publication for current technical targets and maturity. Repository evidence must still establish the actual runtime and behavioral fit. Every recommendation includes an implementation sequence. Planning changes no repository, dependency, Git, or external state and does not create a canonical plan artifact.

## Natural-language operations

| Outcome           | Example request                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| Plan a system     | `Plan which parts of this workflow should be agents versus normal code.`    |
| Initialize        | `Initialize moldea for this repository.`                                    |
| Maintain context  | `Update the project context for the new refund policy.`                     |
| Create an agent   | `Create a customer-support agent grounded in the current implementation.`   |
| Maintain an agent | `Add the order lookup tool to the support agent and align its instruction.` |
| Create a skill    | `Create a reusable release-review skill for coding agents.`                 |
| Maintain a skill  | `Update the release-review skill for the current deployment workflow.`      |
| Evaluate          | `Evaluate the current moldea project.`                                      |
| Reconcile         | `Reconcile the billing agent with the implementation.`                      |
| Validate          | `Validate the moldea project.`                                              |

`evaluate` reports deterministic diagnostics, confirmed semantic problems, material ambiguities, relevant unresolved requirements, and evidence limitations without modifying repository files. Target resolution precedes evidence gathering. In an adopted repository, an unscoped evaluation starts from that project's canonical Moldea system and follows its material relationships. Loading the installed operating skill supplies guidance but does not make it a project-owned Agent Skill, candidate evidence, or the evaluation target unless the request or repository establishes that ownership. A relationship proves scope, not semantic agreement; alignment requires reliable evidence of material behavior, intent, and relevant consumption. Every material runtime limitation names the unknown fact, the smallest reliable resolving artifact and established owner, and what the artifact must prove; unknown ownership stays explicit. `reconcile` begins from the same evidence model. It corrects established drift but does not let implementation, instructions, validation, or synchronized mirrors choose among unresolved policies.

## Continuous maintenance

Potentially durable project knowledge is the first activation signal once a repository has adopted `moldea`, even when it arrives as a bare answer, table, YAML, JSON, prose, or accessible source with no persistence request. Behavior-affecting work also activates the skill when it changes a path referenced by canonical state or an unresolved requirement. The coding agent checks the canonical manifest, project context, and README marker directly rather than inferring non-adoption from search results. Once those checks establish adoption, it does not ask you to adopt again or choose where durable truth belongs. It reconsiders relevant canonical state and persists only material, durable, sufficiently established truth. A material unexplained conflict produces one focused question that distinguishes a current replacement from a proposed or future state before any canonical change. When an explicit correction replaces stale context, the report states the corrected boundary and resulting current truth without unnecessarily repeating obsolete wording.

Activation does not mean automatic persistence or documentation churn. A legitimate result is no `/moldea/**` edit when supplied knowledge is transient or unclear, or when established state remains accurate. The coding agent reports which canonical state it reconsidered, explicitly states that no canonical change was required, and explains why. Knowledge- and relevance-triggered activation never initialize an unrelated repository without explicit developer intent, and an explicitly read-only request remains read-only.

A knowledge handoff may load the skill before adoption is known so it can inspect that boundary. Loading alone never establishes adoption or authorizes persistence. In an unadopted repository, the response says the knowledge was not persisted and no files changed.

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
│   ├── local-tooling.md
│   ├── runtime-compatibility.md
│   └── skill-design.md
└── agents/
    └── openai.yaml
```

`SKILL.md` contains the universal activation, authority, compatibility, operation-selection, and reporting rules. Focused references are loaded only for the workflows that need them, including objective-first agent-system planning and evidence-grounded Agent Skill design. `agents/openai.yaml` is an optional host extension whose presentation and invocation metadata supplements rather than redefines the portable core.

## Project blueprint

- `moldea/` is the complete distributed Agent Skill artifact.
- `docs/` contains concise, durable public concepts, workflows, references, and paired interaction examples. It does not document APIs or HTTP endpoints.
- `website/` is the isolated private Astro application that validates and renders `/docs/**`, complete semantic and qualification history under `/evidence/**`, local search, and generated `llms.txt` for [`skill.moldea.ai`](https://skill.moldea.ai). It consumes the public `@moldea.ai/website-ui` package for shared moldea website foundations while retaining its own content, assets, navigation, SEO identity, and theme storage.
- `CNAME` declares `skill.moldea.ai` as the GitHub Pages custom domain.
- `tests/` contains deterministic metadata, packaging, published-package, candidate-release, reference, and semantic-contract checks.
- `tooling/` contains shared development-only Codex evaluation isolation, sourced scenario and repository-control evidence, semantic coverage validation, source and published package-candidate construction, and exact release-identity management.
- `fixtures/` contains development-only conformance cases, the semantic coverage map, append-only semantic attempt history, the current passing result when one exists, a hostile lifecycle-script fixture, a narrow synthetic composition fixture, and a narrow runtime-compatibility publication fixture.
- `qualification/` contains the isolated local adapter-support qualification runner, transparent mock projects, checkpoints, and committed result history.
- `.github/workflows/pages.yml` verifies and deploys the documentation website, then submits its sitemap to Google Search Console after successful push deployments.
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

Keep the current release bound to one published CLI version with:

```bash
npm run release:update-cli -- <exact-version>
npm run release:identity:check
```

The updater verifies a stable public npm release, updates the exact root dependency and lockfile, synchronizes the portable compatibility contract and conformance fixtures, and records the CLI's complete internal dependency inventory in the synthetic semantic fixture. `npm run release:check` is the final local gate: it runs deterministic verification and additionally requires fresh passing semantic and qualification evidence. It is expected to fail while a release candidate deliberately has no model evidence.

Release evidence must be generated from the committed source that will be tagged. First commit the completed skill, qualification suite, profile, and release identity. Then run and record the complete semantic evaluation, run the Custom qualification, and run each adapter profile only after the exact compatible Custom baseline exists. Inspect and commit every generated result, run `npm run release:check` on that final tree, and tag only after the gate passes. The gate rejects a stale semantic artifact, an incomplete qualification profile, missing or non-passing stages and cases, a package checkout commit or fingerprint mismatch, a behavior-bearing target mismatch, an incomplete or mismatched published package closure, dirty-source evidence, incomplete claim coverage, or an adapter attempt that does not reference the current passing Custom baseline.

Adapter qualification is a separate local workflow and is not included in `npm test` or CI. Install its isolated dependency closure with `npm --prefix qualification ci --ignore-scripts`, then use:

```bash
npm run qualification
npm run qualification:dry-run
npm run qualification:list
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:verify
```

The runner reads the canonical compatibility matrix from the adjacent packages repository at `../packages` by default; explicit runs can select another checkout with `--packages-repository /absolute/path/to/packages`. It resolves the root release's exact published CLI, selected adapter closure, profile-owned runtime packages, and qualification-owned TypeScript compiler from npm, then verifies registry SHA-512 and SHA-1 identities plus downloaded SHA-256 digests. It installs the portable skill through `.agents/skills/moldea` and uses the project-local CLI, runtime packages, and compiler in every project. Paid actor and judge stages always use the fixed frontier assurance model at `medium` reasoning effort (`gpt-5.6-sol`). Both roles use the shared Bubblewrap host in separate workspaces, with the judge workspace mounted read-only. Official runs require clean package, complete qualification-engine, and portable-skill inputs plus the fixed model transport, TLS trust, and egress boundary; violations are recorded as a failed preflight before any paid stage. Paid confirmation occurs only after free preparation and cache lookup, immediately before the first uncached model call. Protocol 6 assigns every requirement to runner checks or declared judge evidence sources, discards raw Codex streams after deriving bounded projected evidence, and permits one checkpointed operational retry per actor or judge stage. A failed completed initial trial recovers only after two fresh passing confirmations. The reusable Custom baseline is keyed to universal evaluator behavior, the Custom target and fixtures, the portable skill, the execution host, and the published package closure, so adding an unrelated adapter profile does not require repeating Custom. The Custom profile exposes 48 planned and 96 retry-inclusive maximum calls; each current ten-case adapter profile exposes 60 planned and 120 maximum calls. Model-free dry runs report semantic requirements as not evaluated. The checkpointed `diagnose` command runs one initial case for two planned and four maximum calls, but cannot be recorded or satisfy a release gate. Protocols 3–5 remain immutable readable history but cannot satisfy the current release gate. See the [adapter qualification guide](qualification/README.md) for profiles, transparent projects, checkpoint recovery, caching, and public result artifacts.

The documentation website uses an isolated Node.js 24.15.0 dependency boundary and exact `@moldea.ai/website-ui` package release. Install its exact dependency closure with `npm --prefix website ci --ignore-scripts`, then use:

```bash
npm run docs:check
npm run website:check
npm --prefix website run test:e2e
```

Run the local website with:

```bash
npm run website:dev
```

The static build defaults to `SITE_URL=https://skill.moldea.ai` and `BASE_PATH=/`. The build derives documentation routes, the `/evidence/**` hierarchy, semantic and qualification attempt routes, navigation, local search, and public `llms.txt` from repository-owned sources. It verifies immutable evidence digests and the independent latest and last-passing pointers, then presents current failures and incomplete runs without treating them as release passes. The separate release gate still requires current passing semantic and qualification evidence. Generated model output is ignored and must not be edited directly.

The Pages deployment reads the repository's configured host and base path, builds for that canonical HTTPS origin, and publishes through GitHub's official Pages artifact flow. Keep the GitHub Pages custom-domain setting and DNS record aligned with `CNAME`; the canonical production origin is [`https://skill.moldea.ai`](https://skill.moldea.ai). After a successful push deployment, the workflow submits `https://skill.moldea.ai/sitemap-index.xml` to the `sc-domain:moldea.ai` Google Search Console property.

Search Console submission requires the `GOOGLE_SEARCH_CONSOLE_CREDENTIALS` Actions secret, configured at the `moldea-ai` organization level with this repository in its selected-repository policy. The secret contains the JSON key for `moldea-sitemap-submitter@moldea-prod.iam.gserviceaccount.com`, which must remain an owner of the Search Console property and retain `Service Account Token Creator` on itself. Manual workflow dispatches deploy the selected ref but do not submit its sitemap. A submission failure is reported after deployment and does not roll back the published Pages artifact.

The complete integration suite requires Bubblewrap and derives the published CLI version from the root exact dependency. Portable CI jobs provision Bubblewrap, load Ubuntu's packaged Bubblewrap AppArmor profile, and run the complete suite. The package-manager matrices run the focused package-manager integration boundary across npm `10.9.0` and `11.19.0`, pnpm `11.20.0` and `11.21.0`, and Yarn `4.0.0` and `4.18.0` against that one release CLI without repeating unrelated sandbox checks. The independent release-candidate workflow can exercise a newly packed exact CLI before the skill adopts it. Yarn versions with a minimum-release-age gate use their command-scoped override only inside the isolated conformance install so newly published exact package versions remain testable.

The ordinary package-manager integration suite first serves the adversarial lifecycle fixture through an isolated local registry with faithful package metadata. That fixture intentionally contains lifecycle scripts and remains the security proof for exact pinning and lifecycle suppression. A separate mandatory path installs the selected exact published CLI from npm, proves local executable provenance, and executes deterministic `composition --json`, `validate --json`, and `inspect --json` checks against a custom-runtime project. It validates a narrow checked-in runtime publication without network access.

When `MOLDEA_CLI_ARTIFACT_DIRECTORY` identifies a packed candidate closure rooted at `@moldea.ai/cli`, the same suite derives package identities, versions, and internal dependency composition from the packed manifests. It rejects missing, duplicate, unreachable, mismatched, and non-exact CLI dependencies before building a scoped loopback registry and running the shared real-CLI checks. Set `MOLDEA_REQUIRE_REAL_CLI_ARTIFACTS=1` at the release boundary so a missing artifact directory fails instead of skipping that candidate-only case. The manual Release Candidate workflow accepts an exact `moldea-ai/packages` ref, records the resolved commit, builds the packages website, validates its generated runtime publication against the Skill contract, discovers the current source package graph, builds local package dependencies in dependency-first order, packs the complete reachable runtime closure, and runs this path across every supported package-manager version without publishing or tagging either repository.

`fixtures/conformance-cases.json` contains package-manager, CLI-envelope, README-marker, planning, Agent Skill, runtime, security, and semantic forward-evaluation scenarios. Deterministic tests execute the mechanical decisions and validate every semantic case's evidence, requested operation, expected outcomes, and forbidden outcomes. CI also installs the portable artifact into an isolated Agent Skills home and compares the installed tree byte-for-byte with `moldea/`.

Semantic evaluation is intentionally lengthy and can consume a significant number of model tokens because every trial runs separate actor and judge processes. The suite contains 54 cases and uses 108 model requests when every case passes initially. One bounded confirmation sequence adds up to four requests, and the theoretical full-run maximum is 324 requests when every case needs both confirmations. Operational retries are additional. Its runtime-selection cases keep repository evidence, local CLI composition, and the public technical and maturity publication separate. Do not start a full evaluation or standalone diagnostic without first explaining why fresh semantic evidence is important, why existing evidence or deterministic verification is insufficient, and the estimated model-request count and expected duration. Obtain the developer's explicit approval for that exact paid operation before running it. Approval for a full evaluation includes its automatic bounded confirmations, compatible checkpoint resume, and operational retries. It never authorizes a restart, source correction, changed evidence boundary, or additional evaluation.

Semantic behavior is evaluated through an Agent Skills-capable host and recorded against the exact portable artifact digest. Before any model execution, validate the complete coverage and scenario boundary for free:

```bash
npm run eval:semantic:preflight
```

The preflight materializes all 54 repositories, verifies every sourced evidence declaration, confirms each actor prompt is exactly the natural developer direction, and proves that evidence collection preserves protected repository controls. The runner always pins both the actor and judge to the frontier assurance model at `medium` reasoning effort (`gpt-5.6-sol`); caller-provided host commands must not select their own model or reasoning effort. This fixed configuration avoids per-run model and effort decisions. To refresh the paid evidence after preflight, provide a non-interactive host command that accepts the evaluation prompt on standard input and returns Codex JSONL events, then run:

```bash
MOLDEA_EVAL_ACTOR_COMMAND_JSON='["codex","exec","--ignore-user-config","--ignore-rules","--ephemeral","--skip-git-repo-check","--dangerously-bypass-approvals-and-sandbox","-c","shell_environment_policy.inherit=none","-"]' npm run eval:semantic -- --record
```

Recording writes `fixtures/.semantic-evaluation-candidate.json` atomically before the actor call, after every retryable operational failure, after the actor completes, after the judge completes, and after the trial enters case history. The ignored candidate uses checkpoint schema `6` and is bound to semantic protocol `21`, confirmation policy `1`, the exact portable artifact digest, release CLI version and registry integrity, package-lock digest, complete semantic case-suite digest, semantic coverage digest, and the fixed Codex, `gpt-5.6-sol`, medium host contract. Each trial separately records the exact actor and judge Codex CLI versions. A routine Codex CLI update can resume the same compatible candidate without repeating completed work, while a host-name, model, reasoning, protocol, artifact, suite, coverage, or release-CLI change still invalidates reuse. Repeating the same full command resumes the exact active actor or judge stage, skips completed successful or recovered cases, and evaluates the remaining cases. A failed initial trial is never replaced.

Retryable provider, network, proxy, and timeout failures never consume a semantic trial or confirmation. The runner records only their safe category, stage, count, time, and delay, then retries the same stage indefinitely with capped exponential backoff and jitter. A completed actor response is persisted before the judge starts, so a judge failure never repeats the actor call. Operational retries require no additional authorization. Explicit cancellation, a changed evidence boundary, and deterministic local failures stop the process instead of being retried.

When an initial semantic trial fails, the same full evaluation automatically runs its bounded confirmation sequence and then continues with the remaining cases when the case recovers. The sequence runs at most two confirmations, and both must pass. Either confirmation failure is terminal for that candidate, the second confirmation is skipped when recovery is already impossible, and no further model call is made. Every confirmation is appended to the checkpoint, and the original failure remains intact.

After a semantic failure, preserve and inspect the actor response, runner-owned execution facts, workspace evidence, repository controls, judge rationale, and exact evaluator inputs. Identify whether the evidence supports a skill defect, evaluator defect, or plausible model variance. Do not change the skill until the evidence establishes that the evaluator is not the cause. Search the evaluator and fixtures for analogous cases, then list every evaluation test the correction can affect before making the change. Run each listed evaluation test three consecutive times after the correction. If any selected test fails semantically, repeat the same diagnosis, similar-case audit, impacted-test listing, correction, and three-pass verification recursively until all selected tests pass. Retryable operational failures are persisted and retried automatically, and do not count toward the three completed runs.

After correcting a source, fixture, or evaluator defect, when a confirmation rejects the candidate, or when the local checkpoint does not match the current contract, start a new full attempt with `--record --restart`. Restart removes only the ignored local checkpoint.

For a final release-candidate cycle, review, commit, and push the source correction before freezing the portable skill, semantic cases, coverage map, runner, qualification engine, and ready profiles. A deterministic violation, terminal confirmation failure, repeated material product failure, or genuinely undecidable evaluator contract blocks that candidate and ends the cycle. It does not trigger an automatic source edit or restart.

If a process is interrupted during an active actor or judge stage, repeat the same full command to resume it. When the checkpoint is between trials, `npm run eval:semantic -- --record-checkpoint` can publish its exact compatible evidence without making a model request. `npm run eval:semantic:verify` recalculates every history digest, summary, directory identity, and latest or last-passing pointer. Missing, failed, and incomplete history never satisfies the release gate.

The runner promotes a candidate atomically to result schema `6` at `fixtures/semantic-evaluation-result.json` and removes the candidate only after every case passes initially or, for a failed initial trial, both confirmations pass. The canonical result retains every initial failure, confirmation, role-specific host identity, operational retry summary, and command-policy aggregate. A stale pass remains in immutable history but cannot replace current release evidence.

Protocol 21 treats indeterminate package-manager classifications as warnings rather than proof of execution. Only a complete protocol 21 run for the current suite can provide current semantic release evidence.

The runner uses the shared development host under `tooling/codex-evaluation-host/`, which validates the Codex command and requires Bubblewrap and `socat` before execution. Bubblewrap builds an empty filesystem root from a minimal set of read-only runtime paths, creates fresh process, IPC, network, cgroup, device, and temporary-filesystem boundaries, drops capabilities, and exposes only a fresh evaluation repository plus copied authentication state as writable. It does not mount host runtime or socket directories. Codex runs in its documented externally sandboxed automation mode because this machine's kernel cannot create a nested user namespace; the flag never runs outside Bubblewrap. Generated shells inherit none of the host environment, and sessions are not persisted.

The isolated network namespace has no direct host or internet route. A repository-external CONNECT relay permits only HTTPS port `443`, exact configured hostnames, and DNS results containing exclusively public addresses. The default allowlist is `api.openai.com`, `auth.openai.com`, and `chatgpt.com`; add an exact model endpoint with `MOLDEA_EVAL_ALLOWED_HOSTS` when required. Localhost, private, link-local, and undeclared destinations remain inaccessible. Each actor or judge process is killed after five minutes by default; set a positive `MOLDEA_EVAL_HOST_TIMEOUT_MS` only when a deliberate evaluation requires a different bound.

The runner installs the exact portable tree into a fresh project for every actor case. The actor receives only `input.developerDirection`, exactly as a developer could naturally write it. That direction identifies any required related repository, requested artifact location, or product-specific surface instead of relying on evaluator-only knowledge. The evaluator-only scenario, requested operation, sourced repository evidence, labels, and criterion descriptions are withheld. Before actor execution, the runner materializes and records each declared developer-direction, host-instruction, Git-state, workspace-path, or related-repository source. It captures hashes and bounded text content for repository-visible changes and starts a separate judge process in another read-only workspace.

Dirty-tree scenarios pair categorical Git-state facts with bounded snapshots of every material changed path and the canonical relationships needed for semantic assessment. This gives the judge independent evidence of the complete scope without retaining actor commands or arbitrary command output.

Bubblewrap keeps the ordinary actor working tree writable while overlaying `.git` and `.agents/skills/moldea` read-only. The runner records Git metadata, HEAD, refs, staged state, local configuration, and the installed skill before and after execution. For each related repository, it also records privacy-safe full-tree digests before and after actor execution so the judge can establish that the read-only source remained unchanged. Any repository-control or related-mount violation forces the case to fail regardless of the judge assessment. Every committed semantic expectation and prohibition pairs a stable evidence label with an explicit evaluator-only criterion. Skill-focused cases also declare evaluator-only artifact roots and activation scenarios. The judge receives the criteria, pre-actor sourced evidence, repository-control evidence, related read-only mount evidence, bounded workspace changes, independent structural and resource-link evidence, and positive or adjacent non-activation requests. Content-level outcomes therefore do not rely on opaque labels, the actor's report alone, or leaked answer criteria.

The runner consumes Codex JSONL events and supplies bounded completed-command facts to the judge and persisted result as runner-owned execution evidence. Started commands, command text, command identifiers, and MCP events are discarded. Completed commands retain only their completion status, exit code, output byte count, disposition, and any recognized result fact. Command output is inspected only in memory and is never copied into evidence. Exact recognized repository-local invocations can produce the two evaluator-owned pnpm Plug'n'Play CLI resolution paths, release-bound Yarn package metadata, the conflicting effective Yarn provider without its sandbox path, the release-bound Moldea envelope fields `schemaVersion`, `cliVersion`, `command`, `status`, `resultPresent`, and `errorPresent`, or the pass/fail result for the exact focused customer-support runtime test. Moldea envelope projection accepts only a finite set of security-equivalent complete commands: the direct repository-local binary or installed CLI entry point, an optional `./` prefix, a fixed `node` or `/opt/node` launcher, the existing pnpm Plug'n'Play form, and exact single-quoted or double-quoted `/bin/bash -lc` wrappers around those commands. Environment assignments, shell composition, redirects, output filters, package-manager execution fallbacks, extra arguments, and other paths remain unrecognized. Path, package-manager, and envelope facts require the complete output to match their contract; the focused test fact requires bounded non-empty output and derives only its status from the exit code. Empty, unrecognized, mismatched, and oversized output records only its byte count and disposition. Those dispositions provide no result fact. A result-dependent criterion therefore requires a matching completed event, exit code, and projected fact. An actor's final response cannot create or replace that evidence. Conversely, runner-owned execution evidence cannot prove what the actor reported. Criteria that require response content must be established by the actor response, while workspace and repository-control evidence establish resulting state.

Before discarding each completed command, the runner also classifies its top-level executable for package-manager policy evidence. It recognizes direct, absolute, relative, Corepack-mediated, and fixed-shell-wrapped npm, npx, pnpm, pnpx, Yarn, and Yarnpkg invocations. Bare inert executable names, static conditional and loop structures, and status-only printing from the evaluator-controlled path are classifiable without retaining their text. Every semantic actor receives an evaluator-owned Git boundary and npm probe ahead of immutable system executables on a `PATH` that excludes workspace binary directories. The Git boundary performs bounded scans of working-tree, indexed-fallback, and Git-directory attribute sources at invocation time, ignores system and global Git configuration, disables optional locks, and overrides signature display. Only exact Git version discovery, the helper-suppressed Git status and diff forms documented by the portable skill, bounded metadata-only log forms including fixed `--format=fuller --name-status` with a numeric maximum, the fixed-commit `show --format=fuller --stat --summary` form, and the release CLI's finite read-only Git discovery and inventory commands can reach system Git. The boundary refuses every other bare `git` shape before Git starts. A bare `git` command resolved through that enforced boundary is therefore classifiable whether it executes an approved shape or is refused. Git outside the boundary, path or environment overrides, unknown executables, dynamic executable expansion, unquoted pathname expansion, command substitution, nested interpreters, execution-capable utility modes, untrusted or unrecognized path-qualified executables, and forms that conceal the invoked executable remain indeterminate. The persisted aggregate contains only completed, indeterminate, and package-manager invocation counts plus the derived `not-observed`, `observed`, or `indeterminate` status. An observed package-manager invocation fails a package-manager non-execution criterion. Indeterminate commands remain visible warnings and neither prove execution nor establish complete absence. The criterion also requires its named actor response, sentinel, workspace, and repository-control evidence.

The package-manager aggregate applies only to criteria asking whether any package-manager process ran. It cannot prove or disprove an unrelated repository script, Git helper, or other authority-sensitive action, and it cannot identify a package-manager subcommand, provider, executable, result, or ordering. Those claims require an exact projected command fact or scenario-owned before-and-after evidence. Script and Git-helper authority cases combine the developer request, sourced executable contract, initially missing sentinel, actor response, final workspace evidence, and unchanged repository controls. Positive runner or sentinel evidence of the prohibited action fails the criterion.

Workspace changes are a complete after-minus-before delta for ordinary repository paths. A sentinel that is independently missing before execution and absent from the created-path delta remains missing afterward. Empty created, modified, and deleted lists establish that the ordinary workspace did not change; they are evidence, not an omitted observation.

Scenario-specific package-manager cases may add evaluator-owned, non-installing probes to the same read-only actor executable directory. The actor cannot replace those probes. They emit the supported manager's inspection shape, keep permitted inspection read-only, reject executable or installation paths outside the scenario contract, and leave repository-visible evidence if a prohibited CLI invocation occurs. They test the actor's decision under controlled conflicting evidence; the real package-manager integration matrix remains the authority for actual installation, resolution, and execution behavior. Ordinary adopted-project cases, including compatibility-sensitive runtime cases, receive a copied, locked production closure from the root exact published `@moldea.ai/cli` dependency without running a package manager. Set `MOLDEA_EVAL_JUDGE_COMMAND_JSON` to use a different safely configured Codex judge command; otherwise the actor command is reused in a fresh process and workspace. See [Semantic evaluation](docs/semantic-evaluation.md) for the public methodology and the role of the committed coverage map.

Use `--case <case-id>` without `--record` for a standalone diagnostic that must not update the candidate or committed evidence. Recorded targeted reruns are intentionally unsupported because they could replace a failure with a later pass. Only the bounded confirmation command can add evidence to a failed case.

The sandbox exposes the exact host Node.js executable at `/opt/node` so the verified repository-local CLI can run without mounting a host-managed runtime directory. It provides a non-installing npm probe that reports the fixed evaluation npm version and rejects every non-version command. It also resolves and mounts the exact `codex-code-mode-host` executable shipped beside the selected Codex binary rather than exposing the surrounding installation directory. Every committed trial records its exact actor and judge CLI versions alongside the runner-owned frontier assurance configuration: `gpt-5.6-sol` at `medium` reasoning effort.

The result is invalidated automatically whenever any distributed skill byte changes, including release-version declarations. Development evaluation uses synthetic repository evidence and does not require a `moldea` Cloud account.

The root `AGENTS.md` is an intentional maintainer-only symlink to a sibling coding-instructions checkout. It is not part of the portable `moldea/` artifact and the skill has no runtime dependency on it. External contributors may use their own applicable coding instructions when that sibling checkout is unavailable.

## Releases

The skill uses independent semantic versioning. Every release must:

- record its exact version in `moldea/SKILL.md` metadata
- pass conformance on the release commit
- use an immutable `v<version>` tag
- preserve semantically identical `moldea/` content across every official distribution channel

Release `4.0.0` will use the immutable `v4.0.0` tag.

## License

[MIT](LICENSE)
