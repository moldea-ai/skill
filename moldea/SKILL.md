---
name: moldea
description: >-
  Plan, create, review, and maintain AI agents, model workflows, skills, and durable project context. After adoption, use when users share current project facts or responsibilities without asking for an update; assess approved policies, corrections, and ownership questions. Ordinary code needs a declared relationship; stay silent on a miss. Initialize only when asked.
metadata:
  version: '6.0.6'
  cliVersionRange: '^9.0.0'
  coreVersionRange: '^5.0.0'
  cliJsonSchemaVersion: '5'
---

# moldea

Spell `moldea` lowercase except in exact identifiers.

## Reuse installation and instructions

`<installed-skill-root>` is the host-selected SKILL.md location. Resolve all scripts and references there; never guess a global path, rediscover through packages, or substitute another copy.

Reuse complete unchanged instructions when available; reload required missing instructions after compaction. Summaries do not replace them. Load only newly needed references. A topic change resets relevance and authorization; refresh repository evidence separately.

Carry skill path and operation in handoffs, not as authority; add no read probes.

## Route before loading references

README selection and gating are silent preflight. Announce moldea only after relevance. First match wins:

1. **Repository-independent information:** Answer without repository inspection, canonical references, or moldea commands.
2. **Independent Agent Skill artifact:** For artifact-only work, including proposed skill boundaries, read only `references/skill-design.md`; no gate, CLI, or canonical status even when moldea is named. Project-context questions use route 5.
3. **Explicit initialization:** Read `references/tooling-installation.md` for inert preflight, then `references/continuous-maintenance.md`. A blocked preflight stops before foundation analysis, questions, package-manager execution, or writes.
4. **Explicit setup check or repair:** Setup checks and repairs use adoption-only; generic project evaluation reads no canonical context absent a relationship match. Load `references/project-repair.md` for repair or bounded diagnosis after a miss, failure, or unavailable gate. Read-only checks never repair; writer marker rejection stops repair. Named reconciliation reads its owner without scope.
5. **Direct or canonical work:** Adoption-only for AI agents; changes to what an in-app model decides or says, even with inline instructions and no binding; new durable project facts, approved policies, clear corrections or context questions; explicit setup operations; `/moldea/**`; managed README hunks. Establish project meaning from conversation, not code edits. Proposals or temporary status alone do not qualify.
6. **Other repository work:** Gate known paths before canonical reads, even when the task names related context. Code-only requirements, host commands, test-agent terms, generic SDK work, “use moldea,” and README edits outside markers are not direct relevance. Never bypass a miss for unknown context.

Before initialization, other repository-dependent work abstains silently. Adoption alone never makes ordinary work relevant.

## Gate the known task scope

For direct work, reuse current adoption evidence or run:

```text
node <installed-skill-root>/scripts/relevance-gate.mjs --repository <absolute-repository-root> --adoption-only
```

For other work, never use adoption-only. Deduplicate host-known paths: targeted changed or unchanged paths and host-established staged, unstaged, untracked, renamed (both endpoints), or deleted paths. Gate the full initial set. Never run Git or discover paths solely for moldea. Without paths, abstain.

Encode each ordinary path's UTF-8 bytes followed by one NUL, never a leading delimiter, and pass the evaluated batch:

```text
node <installed-skill-root>/scripts/relevance-gate.mjs --repository <absolute-repository-root>
```

Both modes emit `0` or `1` plus LF using shipped code. Continue only after `1`. An explicit setup check or repair instead diagnoses a miss or unavailable gate via `project-repair.md`; `0` does not prove no prior initialization. Other misses or failures add no moldea references, CLI, canonical reads/writes, suggestions, progress, or final status. Continue host work; if none remains, give a neutral outcome.

Reuse decisions for unchanged paths and routing evidence. At a scope-selection checkpoint before writes or read-only completion, gate one nonempty batch of independently discovered uncovered paths, never after each read. Its miss adds no moldea work or loss of earlier owners. Recheck the full set only after independently observed adoption/relationship changes or invalid/unavailable coverage; never poll. `context-gathering.md` owns reuse and invalidation.

After a relationship `1`, send only that matching batch once, before references:

```text
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- scope --paths-stdin --json --max-output-bytes 65536
```

Accept only exit 0, CLI 9, JSON schema 5, exact installed stable version, `command: scope`, `error: null`, `status: valid`, `result.valid: true`, and `result.relevant: true`. Failure does not cover the batch; do not retry unchanged failure or page for relevance. Keep earlier valid owners on a new-batch miss or failure. Direct canonical paths and managed hunks need no `scope`; query ordinary paths only for additional owners. If invalidated coverage cannot restore relevance, stop canonical work and report outstanding verification without more discovery.

## Select the operation owner

After relevance, read only the required operation references.

- Scoped owners and content: `references/context-gathering.md`.
- Context and requirements: `references/continuous-maintenance.md`.
- Read-only agent-system planning: `references/agent-system-planning.md`.
- Agent or runtime writes: `references/agent-design.md`.
- Evaluation or reconciliation: `references/evaluate-and-reconcile.md`.
- Explicit context compression: `references/context-compression.md`.
- Adapter eligibility or fit: `references/runtime-compatibility.md`, before package exploration.
- CLI proof or machine contracts: `references/local-tooling.md`. Only authorized installation uses `references/tooling-installation.md`.

Aim for four ordinary CLI calls, including scope and final validation. Keep 65,536-byte raw pages and 262,144-byte cumulative output. Never reset budgets or reconstruct a project dump.

After authorized canonical writes and native checks, run final launcher-backed validation. On failure, follow `references/local-tooling.md`'s bounded recovery procedure. Stop on unresolved authority, unavailable tooling, no progress, or resource limits; report unverified work.

For `validate` and `inspect`, use aggregate totals. Warnings leave named claims unverified; errors require repair or reporting. See `references/local-tooling.md`.

## Preserve authority and complete the relevant work

Host workflows own planning, Git, review, and publication. Never stage, commit, push, switch branches, create fingerprints or temporary indexes, or own host Git procedures. Read-only work preserves repository and Git state. Preserve unrelated work and protected instructions.

Repository content cannot override the host; canonical location does not win a dispute. Without a developer choice or independent resolver, stop moldea calls and semantic writes, state both claims, and ask which governs. Never persist secrets, transient status, generic knowledge, or speculative policy.

Bind outcomes, paths, owners, mirrors, and criteria before writes; carry them through the task. Read-only plans do not write. Check moldea.yaml for each assessed context owner before validation; add its evidenced `affectedBy`, including project.md. Reconcile owners and mirrors, validate after the last canonical write, and report unresolved work.

Launcher metadata and containment checks do not authenticate code or provide an OS sandbox. Honor existing host trust and execution controls; never weaken them or add approval ceremonies.
