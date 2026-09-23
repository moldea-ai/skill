![moldea](assets/cover.png)

# `moldea` Agent Skill

[Get `moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea) or read the complete documentation at [skill.moldea.ai](https://skill.moldea.ai).

The current release is `5.0.10`. Install the latest version from `main` inside each repository that will use it:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin the immutable release:

```bash
npx skills add "moldea-ai/skill#v5.0.10"
```

Both commands install the portable skill named `moldea`. They do not install the CLI globally or require a hosted account. See [Getting started](docs/getting-started.md) for initialization, updates, and removal.

## What `moldea` is

`moldea` keeps durable project context and agent behavior in a Git repository. Adopted projects own a canonical `/moldea/**` tree containing project truth, focused context, decisions, agent instructions, implementation relationships, runtime guidance, mirrors, and unresolved requirements.

The skill helps a coding agent:

- initialize the minimum useful project state when explicitly requested
- plan agent-enabled systems and decide what should remain ordinary software
- create and maintain grounded agents and reusable Agent Skills
- keep affected canonical knowledge aligned with implementation work
- evaluate, reconcile, repair, and structurally validate established state

After initialization, ask naturally to plan, build, review, or maintain AI agents. You do not need to name `moldea`, know its paths, or create bindings first. Ordinary engineering continues normally unless it concerns canonical state, the managed README block, a declared relationship, or an explicit `moldea` operation. Only explicit initialization creates a new setup.

### Common requests

| Outcome          | Example request                                                  |
| ---------------- | ---------------------------------------------------------------- |
| Initialize       | `Initialize moldea`                                              |
| Plan             | `Plan the agents for this project's support-triage workflow.`    |
| Create an agent  | `Create a support agent grounded in the current project policy.` |
| Maintain context | `Update moldea context for the approved refund policy.`          |
| Evaluate         | `Evaluate the current moldea project.`                           |
| Reconcile        | `Reconcile the billing agent with its declared implementation.`  |
| Repair           | `Fix moldea.`                                                    |
| Validate         | `Validate moldea.`                                               |

Evaluation is read-only. Repair corrects established errors without inventing policy, upgrading dependencies, or treating structural validity as proof that every behavior is correct.

## Documentation

| Need                                                               | Authority                                                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install, initialize, update, or remove the skill                   | [Getting started](docs/getting-started.md)                                                                                                                                      |
| Understand activation, operations, evidence, and change boundaries | [Workflow reference](docs/how-it-works.md)                                                                                                                                      |
| Explore supported outcomes and examples                            | [Capabilities](docs/capabilities.md) and [examples](docs/examples/index.md)                                                                                                     |
| Understand canonical project state and its repository layout       | [Project state](docs/project-state.md) and [repository format](docs/repository-format.md)                                                                                       |
| Plan an agent system                                               | [Planning agent systems](docs/planning-agent-systems.md)                                                                                                                        |
| Design agents or Agent Skills                                      | [Designing agents](docs/designing-agents.md) and [designing skills](docs/designing-skills.md)                                                                                   |
| Maintain or compress accumulated context                           | [Continuous maintenance](docs/continuous-maintenance.md)                                                                                                                        |
| Evaluate, reconcile, validate, or repair                           | [Evaluate, reconcile, and validate](docs/evaluate-reconcile-validate.md)                                                                                                        |
| Inspect compatibility, local tooling, and resource limits          | [Compatibility and local tooling](docs/compatibility-and-local-tooling.md)                                                                                                      |
| Review instruction-loading behavior                                | [Reference-reading checks](docs/reference-reading.md)                                                                                                                           |
| Run semantic evaluation or adapter qualification                   | [Semantic evaluation](docs/semantic-evaluation.md), [adapter qualification](docs/adapter-qualification.md), and the [qualification operator reference](qualification/README.md) |
| Select fresh or pinned release evidence                            | [Release evidence](docs/release-evidence.md)                                                                                                                                    |
| Browse all public documentation                                    | [Documentation index](docs/index.md)                                                                                                                                            |

## Compatibility

Release `5.0.10` supports exactly:

- Git `>=2.30.0`
- Node.js `>=22.11.0`
- stable `@moldea.ai/core` releases satisfying `^4.0.1`
- stable `@moldea.ai/cli` releases satisfying `^8.0.0`
- repository format version 1
- CLI JSON schema 4

The CLI must be a repository-root-local development dependency whose manifest declaration and installed stable version satisfy the supported range. The launcher also checks that installed Core satisfies both the CLI's declared Core range and moldea's supported range. The package manager and repository setup or CI own lockfile consistency; the launcher does not check target-project lockfiles. The skill never falls back to a global installation, another workspace, a package-manager launcher, or a transient download. Tooling establishment belongs only to authorized write-capable work. See [Compatibility and local tooling](docs/compatibility-and-local-tooling.md) for the complete launcher, machine-output, resource, and runtime contracts.

## How it works

Initialization creates the minimum canonical foundation and uses the bundled deterministic writer to manage one README awareness block. That block tells repository-aware hosts to select the installed skill so its two-byte relevance gate can check known task paths. Selection is only a discovery bridge: a gate miss continues the host task without a CLI call, workflow-reference load, progress update, or final-report mention.

After adoption, clear AI-agent planning, creation, runtime integration, behavior maintenance, or review uses the adoption-only route. Explicit `moldea` operations, canonical paths, and changes inside the managed README block also activate directly. Other known task paths use declared relationship matching. Host planning, review, commit, and publication workflows keep control of their own procedures. Generic documentation, context, SDK, product-name, or agent terminology does not activate the skill by itself.

The entrypoint keeps routing and essential boundaries compact. It loads only the operation-specific references needed for the selected work. Complete unchanged instructions may be reused while available; missing instructions after compaction must be read again, and summaries never replace instructions, repository evidence, or authorization. See the [workflow reference](docs/how-it-works.md) and [reference-reading checks](docs/reference-reading.md).

Mechanical repository evidence uses the installed skill's closed launcher. It exposes bounded `inspect`, `scope`, `content`, `validate`, and `composition` operations without making canonical document bodies part of ordinary metadata output. Detailed invocation, pagination, failure, and runtime-compatibility behavior belongs to [Compatibility and local tooling](docs/compatibility-and-local-tooling.md).

Semantic execution may project one fixed repository-root direct Node correctness-test invocation into aggregate pass/fail facts. Package-manager commands cannot contribute correctness evidence, and the projection never retains test names, assertions, paths, durations, or output bodies.

### Safety and authority boundaries

Before adoption, a non-repository informational question is answered without repository inspection. Only explicit initialization creates canonical project state. An explicit repair request may diagnose and recover an established but damaged setup, but it cannot silently turn an unrelated repository into a new `moldea` project. If no independent host task remains after abstention, the coding agent reports only a neutral repository outcome. A changed topic resets relevance and authorization instead of inheriting them from earlier agent work.

For ordinary repository paths, the relevance gate accepts the relative spellings produced by Git, normalizes them to repository-logical paths, and emits only `0` or `1` without executing repository dependencies. A hit permits one bounded relationship query; it does not authorize loading every canonical record. The coding agent selects the smallest affected owner set, reads only the content needed for the task, stops when the evidence is sufficient, and validates material canonical writes. A miss returns control to the host workflow without additional `moldea` activity.

Evaluation is read-only across ordinary repository files, Git state, configuration, submodules, the installed portable skill, and declared related repositories. Structural validation proves repository shape, not behavioral completeness. Claims still require repository evidence, and unresolved developer decisions remain explicit instead of being converted into invented policy.

Tooling establishment occurs only during authorized write-capable work and only after sufficient project context exists. Executable package-manager extensions stop automatic setup rather than being bypassed. Package identity and containment checks protect the launcher boundary, but they do not authenticate executable contents or provide an operating-system sandbox; the host's trust and execution controls remain authoritative.

## Project blueprint

`moldea` is a portable Agent Skill with deterministic conformance, semantic evaluation, adapter qualification, evidence publication, and documentation tooling. The website renders selected evidence snapshots and has no evaluator responsibility.

| Area                                      | Responsibility                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `moldea/`                                 | Complete distributed Agent Skill: entrypoint, focused references, host metadata, managed README asset, and bounded generated scripts.                  |
| `src/`                                    | Maintained TypeScript for portable generation, isolated execution, semantic evaluation, evidence assets, release checks, and shared developer tooling. |
| `qualification/`                          | Reviewed published compatibility snapshot, adapter profiles, and TypeScript execution. Attempts retain private local state below `.evidence/`.         |
| `evidence/selection.json`                 | Independent maintainer selections for the semantic and qualification bundles shown on the website.                                                     |
| `website/`                                | Static presentation of prepared selected evidence. It preserves the public sections and detailed replay, project, evidence, and technical views.       |
| `fixtures/`                               | Deterministic source fixtures and calibration records. Recorded evaluation and qualification attempts are not committed.                               |
| `docs/`                                   | Concise public concepts and durable workflows. API and HTTP endpoint documentation does not belong here.                                               |
| `.github/workflows/conformance.yml`       | Portable generation, runtime, path, release, and installation checks.                                                                                  |
| `.github/workflows/release-candidate.yml` | Exact package-candidate validation without publication.                                                                                                |

The distributed artifact is exactly `moldea/`; development-only tooling is not installed with the skill. Run `npm run matcher:generate` after changing the relevance gate's locked inputs and `npm run matcher:check` to verify the committed artifact.

## Development

Repository development requires Node.js `^24.15.0` and npm `>=10.9.0`. The distributed `moldea/` artifact keeps its documented Node.js `>=22.11.0` runtime contract.

Install every workspace dependency from the repository root without lifecycle scripts:

```bash
npm ci --ignore-scripts
```

The private qualification workspace installs its exact pnpm 11.27.1 dependency through this command. Qualification invokes that copy directly; a globally installed pnpm is not required.

After packages are published, refresh the reviewed qualification catalog with `npm run qualification:compatibility:update`, inspect and commit `qualification/compatibility/snapshot.json`, then run `npm run qualification:compatibility:check` before paid qualification. Ordinary qualification commands use the committed local snapshot and do not need an adjacent packages checkout.

The root manifest temporarily overrides Astro to `7.2.8` because Website UI `1.9.1` declares the vulnerable `7.2.2` release as an exact peer. Remove the override after Website UI publishes compatible peer metadata; the clean install and website checks verify the patched combination in the meantime.

Run the deterministic boundaries:

```bash
npm run runtime:build
npm run portable:check
npm run test:unit
npm run test:integration
npm test
npm run qualification:test
npm run qualification:compatibility:check
npm run typecheck
npm run lint
npm run format:check
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run path:check
npm run docs:check
npm run website:check
```

`npm test` includes the website browser suite. Production `website:build`, `release:check`, and Pages deployment require both evidence selections to be populated and prepared. Development website checks exercise both the clean current catalogs without recorded results and isolated synthetic evidence.

Specialized workflows have focused operator references:

| Workflow                                                   | Start here                                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Resource profiles and calibration                          | [Compatibility and local tooling](docs/compatibility-and-local-tooling.md)                                             |
| Semantic preflight, diagnosis, recording, and verification | [Semantic evaluation](docs/semantic-evaluation.md)                                                                     |
| Custom and adapter qualification, batches, and diagnosis   | [Adapter qualification](docs/adapter-qualification.md) and [qualification operator reference](qualification/README.md) |
| Fresh or explicitly pinned release evidence                | [Release evidence](docs/release-evidence.md)                                                                           |

## Releases

The skill uses independent semantic versioning. Every release must:

- record its exact version in `moldea/SKILL.md`
- declare the compatible CLI major and bind the exact evaluated CLI closure plus CLI JSON schema in release evidence
- pass current conformance and select verified fresh or explicitly pinned evidence independently for semantic evaluation and qualification
- preserve identical `moldea/` bytes across official distribution channels
- use an immutable `v<version>` tag

Release `5.0.10` uses tag `v5.0.10`. See [Release evidence](docs/release-evidence.md) for the exact workflows. `npm run release:check` is read-only and validates each selected evidence path.

## License

[MIT](LICENSE)
