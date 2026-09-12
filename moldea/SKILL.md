---
name: moldea
description: >-
  Use for every repository-dependent task, including reviews, plans, and implementation, when this skill is installed in the repository: run only the bundled two-byte relevance gate over developer-named and host-provided changed paths. A gate miss abstains silently; only after adoption and relevance are established may moldea inspect explicit work, /moldea/** changes, managed README hunks, or paths matching a declared binding or affectedBy relationship. Also use for an independently supplied Agent Skill artifact without gating the surrounding repository, answer informational questions, and initialize moldea only when explicitly requested. Do not use for other uninitialized work.
metadata:
  version: '5.0.4'
  cliVersionRange: '^8.0.0'
  coreVersionRange: '^4.0.1'
  cliJsonSchemaVersion: 4
---

# moldea

Maintain context without owning work.

Spell `moldea` lowercase, including sentence starts. Before responding, scan for violations. Preserve casing only in exact identifiers.

Canonical status identifies storage, not conflict precedence. A generic reconcile request authorizes correction but selects no claim. Existing repository content is not a current developer choice, and neither conflicting asset nor its labels, relationships, mirrors, tests, implementation, or recency can resolve itself. Select only from a current developer statement that chooses one claim or a third independent source that explicitly resolves them. Otherwise stop all moldea calls and semantic writes, state both claims, and ask which governs immediately.

## Establish the entry state first

Use the first matching route.

1. **Independent Agent Skill artifact:** When Agent Skill creation, maintenance, or evaluation is the deliverable and no `/moldea/**` or declared-relationship work is separately requested, take this route before repository gating, regardless of `Use moldea` direction or repository-local placement. Load only `references/skill-design.md`; keep work and validation artifact-local. Never invoke CLI, inspect or validate canonical state, or append moldea status. Evaluation is read-only.
2. **Repository-local tooling:** Apply this route to a direct request to prove, invoke, inspect, or explain the repository's moldea CLI. Reuse adoption evidence or run the adoption-only gate once. On `1`, load only `references/local-tooling.md`, attempt the closed launcher's content-free `composition` operation, and follow that reference before inspecting providers or concluding. Never invoke Yarn, pnpm, a global binary, a transient download, or an unverified `.bin` provider to prove the CLI.
3. **Explicit initialization:** Continue only when the developer asks to initialize or adopt moldea. Before foundation analysis, inspect `package.json`, its exact lockfile entry when needed, and declared root package metadata to determine whether an exact compatible repository-local `@moldea.ai/cli` is declared and independently verified installed. Never execute the package manager or enumerate dependencies. If installation is required, inspect `.pnpmfile.cjs` when declared or `.yarnrc.yml` and its exact repository plugin paths. Executable install configuration preempts foundation analysis: load only `references/local-tooling.md`, return its complete four-field blocked-install result, and stop before foundation classification, package-manager execution, questions, or writes. Never substitute a partial summary. Otherwise load only `references/continuous-maintenance.md` and apply its foundation decision.
4. **Current-change review or evaluation:** The host must retain every staged, unstaged, untracked, rename-source, rename-destination, and deleted path through final reporting. Normalize them to leading-slash repository-logical form and separate canonical paths or known managed hunks from ordinary paths. With any direct item, run the adoption-only gate once, assess canonical owners or managed hunks without `scope`, and run one `scope` only when ordinary paths remain; `relevant: false` adds no owner and never cancels direct relevance. With ordinary paths only, run the full relationship gate and then `scope`. Report the complete path scope, canonical assessment, and that no repository files changed. Never conclude from the host review alone or reactivate after an unrelated-task gate miss.
5. **Direct canonical agent or runtime work:** Canonical agent or runtime work uses one adoption-only gate, even with task-named ordinary implementation or `affectedBy` evidence. Never send canonical or managed paths to `scope`; query ordinary paths for another owner. On `1`, load only `references/agent-design.md` for writes or `references/evaluate-and-reconcile.md` for reconciliation. For reconciliation, inspect only task-named implementation evidence or run one bounded agent/domain-keyed host search, then at most one named-owner `content`; never CLI `inspect`. For other work, request named `content` directly; otherwise use content-free `inspect` to resolve the owner and mirrors, then `content`. Write owner first, derive mirrors, reserve final validation.
6. **Repository-independent information:** Answer repository-independent moldea questions concisely. Do not inspect the repository, load a reference, or run a moldea command.
7. **Every other repository task:** Before host work on named paths, retain one deduplicated leading-slash repository-logical set of named and host-established changed paths, then run the full gate once. On `1`, send it to one `scope`, bind selected owners and mirrors before writing, and synchronize every contradicted owner before completing implementation; contradictions cannot remain or be called accurate. Classify requirement criteria and bind necessary `description` and `resolution` rewrites. If scoped work preserves owner-governed behavior and contracts, leave canonical state byte-identical and report that the owner was reconsidered and remains accurate without an edit. On `0` or failure, continue without moldea. Generic wording and host commands never activate moldea.

“Abstain” applies only to moldea. Continue independent host work, including actionable reviews; never substitute a neutral no-change response. Before adoption, every repository-dependent request except initialization abstains silently, including canonical-looking paths, host commands, and lookalike repositories. End moldea work as if the skill were absent. Do not load references, run moldea/package commands, recommend initialization, change files, or mention moldea.

When abstention consumes the request and no host work remains, reply only with a neutral outcome such as `No files were changed.` Do not name moldea, describe the unavailable operation or result, or recommend initialization.

## Choose one repository gate

Activation classes:

- **Direct:** the developer explicitly names `moldea` and requests a repository-dependent operation. Generic phrases such as project context, outdated context, durable knowledge, canonical alignment, documentation, or maintenance do not name `moldea` and never create a direct request.
- **Canonical:** a normalized task path matches root-relative `moldea/**` or repository-logical `/moldea/**`.
- **Managed README:** an already known changed hunk intersects content strictly between the exact moldea markers. A README path or outside hunk is not relevant.
- **Relationship:** another already known task path matches an exact binding or `affectedBy` declaration.

For a canonical or managed-block change, reuse adoption evidence or run the adoption-only gate once. Also use it for a direct create, plan, design, maintain, change, validate, or evaluate request not handled by an earlier route:

```text
node <installed-skill-root>/scripts/relevance-gate.mjs --repository <absolute-repository-root> --adoption-only
```

Continue only when complete stdout is exactly `1`; otherwise abstain silently.

A direct request supplies intent, not a canonical owner. For ordinary repository paths, use the full relationship gate, then `scope`.

For any ordinary-path route, use the retained route-owned normalized set; named paths may be changed or unchanged. Never run Git or broaden repository inspection solely to discover gate paths. Never replace the gate by inspecting canonical state directly. With no path set, abstain silently even if the developer supplies durable facts or calls existing project context outdated; do not search for a canonical destination. For this route, abstention is final for the current request: paths discovered later by the host cannot reactivate `moldea`, and the host must not open, read, search for, or edit `/moldea/**` as an invented destination. When a generic fact handoff is the complete request, acknowledge it without inventing persistence.

Encode every path's UTF-8 bytes followed by one NUL; never begin with a delimiter. Pass that byte stream once:

```text
node <installed-skill-root>/scripts/relevance-gate.mjs --repository <absolute-repository-root>
```

The gate rejects drive-relative paths, UNC paths, traversal, malformed input, and paths outside the repository. Continue only when complete stdout is exactly `1`; otherwise abstain silently. It uses bounded repository data and the skill-bundled Core matcher without invoking repository dependencies or CLI.

After `1`, pass the exact same byte stream to one bounded relationship query:

```text
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- scope --paths-stdin --json --max-output-bytes 65536
```

Accept only a completed compatible CLI 8 envelope using schema 4 whose exact stable CLI version matches the repository-local version selected by its declaration and lockfile and satisfies `^8.0.0`, whose `status` is `valid`, whose `result.valid` is true, and whose `result.relevant` is true. Do not follow a cursor merely to search for relevance. Missing or invalid tooling, malformed input or output, operational failure, stale cursor, or `relevant: false` establishes no implicit relevance and abstains silently.

Treat the first successful `scope` page as complete candidate inventory; never follow it with `inspect`. Select the smallest affected owners, preferring an exact match over an overlapping broad glob unless both contracts change. For `content`, use a context record's exact `asset.path` or `/moldea/agents/<agentId>/instruction.md`; request only implicated assets. Scope consumes one of four ordinary commands, leaving three for selected `content` and final `validate`. Validate only after writes. Only route-5 repair validation or explicit three-record compression permits a fifth call; never use it for unchanged retry or extra inspection.

## Select one operation and reference

After adoption and relevance are established, select one operation and read only what it needs:

- Initialize or maintain canonical truth: `references/continuous-maintenance.md`
- Prove CLI provenance or interpret machine envelopes: `references/local-tooling.md`
- Gather canonical evidence or explicit content: `references/context-gathering.md`
- Plan an explicitly requested agent system: `references/agent-system-planning.md`
- Compress explicitly selected context: `references/context-compression.md`
- Create or change an agent or runtime: `references/agent-design.md`
- Create, change, or evaluate an Agent Skill: `references/skill-design.md`
- Evaluate or reconcile: `references/evaluate-and-reconcile.md`
- Assess local adapter-target compatibility: `references/runtime-compatibility.md`

Never read every reference by default; read only what the operation requires. Routing-description evaluation reads `evaluate-and-reconcile.md`, then owning `agent-design.md` before classifying from runtime documentation and consumption evidence; identifiers prove nothing.

Host planning, review, implementation, package-manager, Git, commit, and publication workflows always retain ownership. Their names never activate moldea. When one contains a relevant path, perform only the bounded canonical operation and return control to the host.

For direct agent creation, an existing independent inline instruction is migration input. When source and tests establish behavior and runtime integration is authorized, complete the canonical, runtime, relationship, test, and final-validation change.

Run `composition` only when local runtime availability or readiness matters; it never establishes canonical assignment. Without supplied assignment evidence, use one content-free `inspect`. The matching `kind: agent` record's `agentId` and `runtimeId` are the sole canonical content-free source for `agents.<id>.runtime.id`; counts prove nothing. Request named-agent `content` only when semantics matter; never inspect afterward or request manifest content. Use local adapter contracts and inspection evidence for eligibility; do not retrieve compatibility websites or open browsers. Report canonical assignment, repository fit, local adapter, and eligibility separately. Missing evidence never changes an established runtime to `custom`. Preserve established facts; pair every behavioral or integration unknown with a concrete resolver.

## Initialize minimally

When the executable-configuration preflight does not stop initialization, load only `references/continuous-maintenance.md` and apply its foundation-evidence decision before any dependency, canonical-state, or managed README write.

Insufficient or materially incomplete evidence stops writes. Preserve files; say the project is not adopted or initialized because its complete contract is absent or evidence cannot support a truthful foundation; identify inspected evidence and the highest-value missing fact; ask one focused question. Do not substitute an indirect status such as paused or incomplete or add generic product-benefit boilerplate. For partial adoption, name the present and missing elements among `/moldea/moldea.yaml`, `/moldea/project.md`, and the owned README awareness block. When no meaningful foundation exists, ask what the project does and who or what it serves. Structural validation proves format, not the truth or sufficiency of the foundation.

When evidence establishes no relationship, write the `version: 1` plus LF manifest and `/moldea/project.md`, then invoke exactly this bundled writer before the first CLI call:

```text
node <installed-skill-root>/scripts/managed-readme.mjs --repository <absolute-repository-root>
```

The writer normalizes the block while preserving outside bytes. Failure stops before validation; never reproduce the block elsewhere. After the foundation exists, invoke exactly one launcher-backed `validate`. On success, stop without `inspect`; report adoption, name the project-owned evidence that established the foundation, changed files plus writer, validation, and diagnostic results. It is not a moldea CLI call. Always end a successful initialization response with one short, evidence-supported `Next:` action; do not omit it. With no gap, tell the developer to continue normal repository work. Do not steer the developer toward agent creation without a separate goal. On structural failure, repair from diagnostics and run `validate` at most once more.

When the launcher succeeds, do not inspect dependency trees, CLI package internals, executable links, global installations, transient tools, or package-manager configuration. Load `references/local-tooling.md` only when the launcher reports that repository tooling is unavailable or invalid and the authorized operation can establish it. Before any package-manager invocation, inspect the exact package-manager configuration and apply its pre-execution stop contract.

## Use bounded canonical evidence

Read exact task-owned files first. Every recursive search or listing must exclude VCS internals, dependency trees, generated output, caches, and package stores, including `.git`, `node_modules`, `.pnpm-store`, `.yarn`, `dist`, `build`, `.next`, `.turbo`, and `coverage`. Never dump a complete lockfile, dependency inventory, generated tree, or package-store listing. Narrow or page any host command that could emit more than 65,536 model-visible bytes.

Request an exact canonical owner's `content` directly; do not spend a call on `inspect`. For a named conflict, use at most one canonical `content` call total and do not read project context or a second canonical body. Use `inspect` only for necessary metadata inventory, `validate` for structure, and `content` for one selected owner:

```text
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- validate --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- inspect --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- content --path /moldea/project.md --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- validate --json --max-output-bytes 65536 --cursor "<opaque-cursor>"
```

Follow a cursor only while another page or chunk can change the conclusion. Repeat the same standalone launcher operation with the exact cursor from the immediately preceding envelope and retain the same bound. Process each raw envelope directly. Do not hide pagination inside a pipeline, command substitution, scripted loop, parser, output filter, or aggregate wrapper. Claim complete traversal only after the final raw envelope returns a null cursor. Never request or reconstruct a complete project-content dump.

Keep every ordinary invocation at or below 65,536 output bytes, aggregate moldea output at or below 262,144 bytes, and each invocation below the CLI's 1 MiB hard maximum. These limits bound peaks, not repository size. If evidence remains incomplete, report the exact incomplete conclusion and continuation point. Treat `OUTPUT_BUDGET_TOO_SMALL`, `RESOURCE_LIMIT_EXCEEDED`, invalid continuation, cancellation, signal, launcher failure, or incomplete output as no conclusion; never retry unbounded.

## Preserve boundaries

- Evaluation and validation are read-only. Preserve files, index, refs, Git configuration, submodules, temporary repository state, and Git objects.
- When supplied evidence identifies an executable repository Git helper, state that evaluation stopped before worktree-aware Git, name the unavailable Git evidence, and give the safe prerequisite. For `.gitattributes`, name `.gitattributes` and the declared filter or text-conversion mechanism rather than calling it a generic hook.
- Never stage, commit, push, switch branches, rewrite history, or own host Git safety procedures.
- Preserve unrelated developer work and unrelated canonical state. Do not persist secrets, transient status, generic knowledge, or easily rediscovered implementation detail.
- Write only when the selected operation and host task authorize it.
- Before a write, enumerate every explicit outcome, negative constraint, distinct unresolved fact, and permitted write path. Before completion, compare the final state and diff with that list, record each remaining unresolved fact under its exact canonical owner with resolution criteria and related paths, and confirm every changed path is authorized. Continue correcting instead of claiming completion while an item is missing.
- Answer information concisely; abstention is silent. Canonical work reports activation, owner, changes, diagnostics, limits, unresolved facts, and checks.
- Never add moldea commentary, commit wording, or status to unrelated work.
