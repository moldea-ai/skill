---
name: moldea
description: >-
  Use for every repository-dependent task, including reviews, plans, and implementation, when this skill is installed in the repository, solely to run the bundled two-byte relevance gate over developer-named paths and host-provided changed paths. A gate miss abstains silently while the host workflow continues; only after adoption and relevance are established may moldea inspect explicit moldea work, /moldea/** changes, managed README hunks, or paths matched by a declared binding or affectedBy relationship. Also answer concise informational questions and initialize moldea only when explicitly requested. Do not use for other uninitialized work.
metadata:
  version: '5.0.0'
  cliVersionRange: '^7.0.0'
  cliJsonSchemaVersion: 4
---

# moldea

Maintain Git-owned project context and agent systems without taking control of unrelated engineering work.

## Establish the entry state first

Classify the request before loading a reference or running the CLI:

1. **Information:** When the developer asks what moldea is or how it works without asking to inspect or change a repository, answer concisely from this entrypoint and stop. Do not inspect the repository, load a reference, or run a moldea command.
2. **Initialization:** Continue only when the developer explicitly asks to initialize or adopt moldea in the current repository. Initialization is the sole repository-dependent operation allowed before adoption.
3. **Other repository work:** Require an initialized repository and choose exactly one gate below. Reuse matching adoption evidence already established by the host. Never run the adoption-only gate before an ordinary relationship gate; the relationship gate proves both adoption and relevance.

Every use of “abstain” below applies only to moldea work. Continue the developer's host-owned request normally without moldea. Never refuse, block, defer, or reframe that request because adoption or relevance is absent.

For every repository-dependent request that is not information, initialization, a direct moldea request, a known canonical path, or a known managed-block hunk, the full deterministic gate is the mandatory first moldea action. Run it from the complete bounded task-path evidence already known to the host before reading the manifest or any canonical document for moldea purposes. This evidence is the union of exact repository paths explicitly named or targeted by the current developer request and the complete changed-path set already established by the host when applicable. Never replace the gate by inspecting canonical state directly, inferring a relationship yourself, or reporting canonical alignment from ungated evidence.

Before adoption, every repository-dependent request other than explicit initialization abstains silently, including explicit validation, canonical-looking paths, host commands, and repositories whose names or partial files resemble moldea. Do not load a reference, run a moldea or package command, recommend initialization, change files, or mention moldea in progress or final reporting.

## Choose one repository gate

Classify the task from the developer request and the path or hunk evidence already established by the host:

- **Direct request:** the developer explicitly names `moldea` and requests one of its repository-dependent operations. Generic requests to verify an agent contract, canonical alignment, durable context, or similar concerns for an ordinary source or documentation path remain relationship-gated.
- **Canonical change:** a known task path is under `/moldea/**`.
- **Managed README change:** a known changed hunk intersects content strictly between the exact markers. A README path or hunk outside the block is not direct relevance.
- **Declared relationship:** another known task path matches an exact binding or `affectedBy` declaration.

For a direct request or canonical or managed-block change, reuse matching adoption evidence or run the adoption-only gate exactly once:

```text
node <installed-skill-root>/scripts/relevance-gate.mjs --repository <absolute-repository-root> --adoption-only
```

Continue directly without `scope` only when complete stdout is exactly `1`. Otherwise abstain silently.

For every other repository task, including a request to verify canonical alignment for an ordinary source or documentation path, do not run the adoption-only gate. Build the gate input only from every exact repository path explicitly named or targeted by the current developer request, whether changed or unchanged, plus the complete changed-path set already established by the host when applicable. Deduplicate their union and pass it once as NUL-delimited UTF-8 input to the full deterministic gate. Do not require an explicitly named target to appear in a diff, and never run Git or broaden repository inspection solely to discover gate paths. When neither source provides a path, abstain silently. The gate accepts ordinary Git-style repository-relative paths such as `src/example.ts` and leading-slash repository-logical paths such as `/src/example.ts`; it normalizes only this task-path boundary and rejects drive-relative paths, UNC paths, traversal, invalid logical paths, and malformed input.

```text
node <installed-skill-root>/scripts/relevance-gate.mjs --repository <absolute-repository-root>
```

Continue only when its complete stdout is exactly `1`. `0`, any other output, or any failure means silent abstention. Both gate modes prove adoption. The full gate additionally reads exact repository-local package metadata, the manifest, and the supplied path set to establish relationship relevance. It invokes Core directly and never runs the moldea CLI.

After `1`, run one bounded relationship query with the exact repository-root-local CLI to recover the matching canonical owners:

```text
moldea scope --paths-stdin --json --max-output-bytes 65536
```

Before `scope`, convert any Git-style path to its leading-slash repository-logical form, then pass the same complete normalized task-path set used by the gate. Interpret only a completed compatible CLI 7/schema-4 envelope with `status: "valid"`, `result.valid: true`, and `result.relevant: true`. The envelope version must equal the exact stable repository-local CLI version selected by the project declaration and lockfile. Do not follow a cursor merely to search for relevance; the first result establishes all matching owners for the bounded input. A missing compatible local CLI, malformed input or envelope, operational error, invalid result, stale cursor, or `relevant: false` establishes no implicit relevance and abstains silently.

Treat this successful `scope` result as the complete relationship inventory for the task. Do not follow it with `inspect`. The scope call counts toward the ordinary four-command limit, leaving at most three CLI calls: normally one `validate` when structural status can affect the conclusion, plus `content` only for the explicitly selected canonical owners needed to review the relationship.

The complete relationship sequence is `scope`, optional `validate`, then only the necessary selected `content` calls. Omit unused steps, never add `inspect`, and stop after four total CLI calls including `scope`.

Do not discover paths merely for moldea, run both gate modes, repeat a gate, or load a reference before the full deterministic gate matches and `scope` confirms its owners. Unrelated work runs zero moldea CLI commands. On abstention, make no moldea progress update or final-report mention.

Host planning, review, implementation, package-manager, Git, commit, and publication workflows always retain ownership. Their names never activate moldea. When a relevant path is found inside one of those workflows, perform only the bounded canonical operation and return control to the host.

## Select one operation

- **Initialize:** create the minimum valid project-owned foundation after explicit adoption intent.
- **Plan:** design an agent-and-software system only after an explicit moldea agent-system request.
- **Maintain:** synchronize directly affected canonical truth, agents, relationships, requirements, or mirrors.
- **Compress:** consolidate an explicitly selected canonical context scope without losing unique current truth.
- **Design:** create or materially change a moldea agent, runtime declaration, or Agent Skill.
- **Evaluate:** inspect scoped structural and semantic alignment without writing.
- **Reconcile:** repair established drift under explicit write authority.
- **Validate:** run scoped deterministic structural checks without writing.

Zero agents, relationships, runtimes, mirrors, decisions, and unresolved requirements are valid states.

## Load only the owning reference

After relevance is established, read only what the selected operation needs:

- initialization or ordinary synchronization: `references/continuous-maintenance.md`
- CLI establishment and machine envelopes: `references/local-tooling.md`
- canonical evidence or explicit content selection: `references/context-gathering.md`
- agent-system planning: `references/agent-system-planning.md`
- context compression: `references/context-compression.md`
- agent and runtime design: `references/agent-design.md`
- Agent Skill design: `references/skill-design.md`
- evaluation or reconciliation: `references/evaluate-and-reconcile.md`
- current adapter-target compatibility: `references/runtime-compatibility.md`

Never read every reference by default. Read a second reference only when the active operation reaches that boundary.

For initialization, load only `references/continuous-maintenance.md`. When no explicit relationship is established, write the manifest exactly as `version: 1` followed by one LF; never invent project metadata, empty mappings, or placeholder relationships. Write the complete three-file foundation before the first CLI call, then invoke exactly one repository-local `validate` for final validation. On success, stop without `inspect` or another moldea command. On structural failure, use its bounded diagnostics to repair the foundation and run `validate` at most once more. When the direct invocation succeeds, do not inspect dependency trees, CLI package internals, executable links, global installations, transient tools, or package-manager configuration. Load `references/local-tooling.md` only when the direct repository-local invocation is unavailable or fails for an operational reason that requires tool establishment.

## Use bounded canonical evidence

Use only a stable repository-root-local CLI satisfying `^7.0.0` and JSON schema 4. Metadata is content-free:

```text
moldea validate --json --max-output-bytes 65536
moldea inspect --json --max-output-bytes 65536
moldea content --path /moldea/project.md --json --max-output-bytes 65536
```

Use `validate` when structure is the question, `inspect` only for necessary inventory, and `content` only for one explicitly selected canonical owner. Follow an opaque cursor only while another page or Unicode-safe content chunk can change the current conclusion. Never request or reconstruct a complete project-content dump.

Keep every ordinary invocation at or below 65,536 output bytes, ordinary aggregate moldea output at or below 262,144 bytes, and every invocation below the CLI's 1 MiB hard maximum. Larger repositories use metadata pages and explicit content chunks; these limits bound peaks, not repository size. If required evidence cannot fit within the task's bounded traversal, report the exact incomplete conclusion and continuation point. Never convert truncated or resource-exhausted evidence into validity or approval.

Treat `OUTPUT_BUDGET_TOO_SMALL`, `RESOURCE_LIMIT_EXCEEDED`, an invalid cursor, cancellation, a signal, or incomplete output as no conclusion. Do not retry with an unbounded value. Report the failure only after direct relevance is established; implicit-gate failures abstain silently.

## Preserve boundaries

- Evaluation and validation are read-only. Preserve worktree files, index, refs, Git configuration, submodules, and Git object storage.
- Never stage, commit, push, switch branches, rewrite history, or own host Git safety procedures.
- Preserve unrelated developer work and unrelated canonical state.
- Do not persist secrets, transient status, generic knowledge, or easily rediscovered implementation details.
- Write only when the selected operation and host task authorize it. Re-run the narrowest relevant validation after writes.

## Report proportionally

- Information requests receive a concise answer.
- Abstention is completely silent.
- Relevant no-change work gets at most one moldea line unless detail was requested.
- Material canonical work reports the activation path, owner, changes, diagnostics, limits, unresolved facts, and checks.
- Never use moldea-derived commit wording or status reporting for unrelated work.
