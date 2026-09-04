---
name: moldea
description: >-
  Use when the developer explicitly invokes moldea or asks to initialize, inspect, validate, evaluate, reconcile, design, or maintain moldea project context or agents. Also use in an adopted repository when the task directly changes /moldea/**, changes the README hunk between the moldea markers, or changes a repository path matched by a declared moldea binding or affectedBy relationship. Do not use for unrelated code, documentation, planning, review, Git, commit, or publication work.
metadata:
  version: "5.0.0"
  cliVersion: "6.0.0"
  cliJsonSchemaVersion: 3
---

# moldea

Maintain Git-owned project context and agent systems without taking control of unrelated engineering workflows.

## Decide relevance before loading resources

Use one of these activation paths:

- **Explicit:** the developer invokes `$moldea`, names moldea, or directly requests a moldea operation.
- **Canonical:** the task changes a path under `/moldea/**`.
- **Managed README:** a changed README hunk intersects the content between `<!-- moldea:start -->` and `<!-- moldea:end -->`. A path-only README match or a hunk outside the block does not activate.
- **Declared relationship:** in an adopted repository, a known task path matches an exact binding or `affectedBy` declaration.

For explicit, canonical, or managed-README activation, do not run `scope`. For possible relationship activation, pass the complete known task-path set once to the root-local CLI:

```bash
moldea scope --paths-stdin --json --max-output-bytes 65536
```

The input is NUL-delimited and repository-root-absolute, such as `/src/example.ts`. Interpret only a completed CLI JSON schema 3 envelope from CLI 6.0.0. Continue only when `status` is `valid`, `result.valid` is `true`, and `result.relevant` is `true`. Follow `result.page.cursor` only when the current task needs additional matching owners. A malformed path, operational error, invalid result, or stale cursor establishes no relevance.

If none of the activation paths matches, stop silently: do not load a reference, run another moldea command, mention moldea, recommend initialization, or change canonical state. Host planning, review, implementation, Git, commit, and publication workflows retain control.

## Select the operation

- **Initialize:** create the minimum valid project-owned foundation after explicit adoption intent.
- **Plan:** design an agent-and-software system only when the developer explicitly asks for moldea agent-system planning. Zero agents is valid.
- **Maintain:** update directly affected canonical truth, agents, relationships, requirements, or mirrors.
- **Compress:** consolidate an explicitly selected canonical context scope without losing unique current truth.
- **Design:** create or materially change a moldea agent, runtime declaration, or Agent Skill.
- **Evaluate:** inspect structural and semantic alignment without writing.
- **Reconcile:** repair established drift under explicit write authority.
- **Validate:** run deterministic structural checks without writing.

Do not reinterpret a host command as a moldea operation. Reuse the host workflow's repository root, changed paths, diffs, branch state, and verification evidence rather than reconstructing them.

## Load only the owning reference

After relevance is established, read only what the selected operation needs:

- CLI establishment and machine envelopes: `references/local-tooling.md`
- evidence and canonical content selection: `references/context-gathering.md`
- initialization or ordinary synchronization: `references/continuous-maintenance.md`
- agent-system planning: `references/agent-system-planning.md`
- context compression: `references/context-compression.md`
- agent and runtime design: `references/agent-design.md`
- Agent Skill design: `references/skill-design.md`
- evaluation or reconciliation: `references/evaluate-and-reconcile.md`
- current adapter target compatibility: `references/runtime-compatibility.md`

Never read every reference by default. A reference may route to one additional reference only when the current operation reaches that boundary.

## Use bounded canonical evidence

CLI metadata is content-free by default:

```bash
moldea validate --json --max-output-bytes 65536
moldea inspect --json --max-output-bytes 65536
```

Use `inspect` only when the operation needs project inventory beyond `validate`. Follow metadata pages only while they can change the current conclusion. Read one required canonical asset explicitly:

```bash
moldea content --path /moldea/project.md --json --max-output-bytes 65536
```

Follow its cursor only until the needed passage is complete. Do not request or reconstruct a full-project content dump. Keep ordinary relevant moldea output at or below 262,144 bytes in aggregate and every invocation at or below 1 MiB; page traversal may exceed the ordinary aggregate only when the task explicitly requires it. The host's 16 MiB process ceiling is a crash guard, not a normal budget.

Treat deterministic output as evidence, not semantic truth. Distinguish observed current state, developer-confirmed truth, intended future state, accepted decisions, and unresolved questions. Never infer missing policy or invent relationships.

## Preserve boundaries

- Evaluation and validation are read-only. Preserve worktree files, index, refs, Git configuration, submodules, and the Git object database.
- This skill never stages, commits, pushes, switches branches, rewrites history, or owns host Git safety procedures.
- Preserve unrelated developer work and unrelated canonical state.
- Do not persist secrets, transient status, generic knowledge, or easily rediscovered implementation details.
- Write only when the selected operation and host task authorize it. Re-run the narrowest relevant metadata validation after writes.

## Report proportionally

- On abstention, say nothing about moldea.
- When relevant but canonical state remains correct, use at most one line unless the developer requested detail.
- Report detailed scope, diagnostics, changes, unresolved conflicts, and checks only for material canonical work or a requested moldea evaluation.
- Never use moldea-derived commit wording for unrelated work.
