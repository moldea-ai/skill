---
name: moldea
description: >-
  Plan, create, review, and maintain AI agents, skills, and project context. After adoption, assess established project facts, approved policies, clear corrections, and context-ownership questions without requiring moldea wording. Handle explicit moldea operations. Ordinary code requirements need a declared relationship; abstain silently on a miss. Initialize only when asked.
metadata:
  version: '5.0.12'
  cliVersionRange: '^8.0.0'
  coreVersionRange: '^4.0.1'
  cliJsonSchemaVersion: '4'
---

# moldea

Maintain Git-owned context and agent behavior. Spell `moldea` lowercase except in exact identifiers.

## Reuse installation and instructions

`<installed-skill-root>` is the host-selected SKILL.md location. Resolve all scripts and references there; never guess a global path, rediscover through packages, or substitute another copy.

Reuse complete unchanged instructions when available; reload required missing instructions after compaction. Summaries do not replace them. Load only newly needed references. A topic change resets relevance and authorization; refresh repository evidence separately.

Retain the skill path and active operation in the host handoff, not as authority. Add no read-tracking files or probes.

## Route before loading references

README selection is not activation. Normalize host paths to leading-slash repository-logical form. First matching route wins:

1. **Repository-independent information:** Answer without repository inspection or moldea commands.
2. **Independent Agent Skill artifact:** For established artifact-only work, load only `references/skill-design.md`; no gate, CLI, or canonical status. Project-context questions use route 5.
3. **Explicit initialization:** Read `references/tooling-installation.md` for inert preflight, then `references/continuous-maintenance.md`. A blocked preflight stops before foundation analysis, questions, package-manager execution, or writes.
4. **Explicit setup check or repair:** Validation, evaluation, or inspection of this repository's moldea setup, or authorized repair, uses adoption-only. Load `references/project-repair.md` for repair or bounded diagnosis after a miss, failure, or unavailable gate. Read-only checks never repair; repair never initializes or guesses policy. Named reconciliation stays narrower.
5. **Direct or canonical work:** Use adoption-only for genuine AI-agent work; established project facts, approved policies, clear corrections, or project-context questions; explicit setup operations; `/moldea/**` paths; or managed README hunks. Identify the concrete project-level meaning from the conversation, independently of any code edit. Generic information, proposals, and temporary status alone do not qualify.
6. **Other repository work:** Relationship-gate known paths. Lasting code requirements, product/host command names, test-agent terms, generic SDK work, “use moldea,” and README hunks outside markers are not direct relevance. Never bypass a miss for unknown context.

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

Reuse decisions for unchanged paths and routing evidence. At an existing scope-selection checkpoint before writes or read-only completion, gate one nonempty batch of independently discovered uncovered paths, never after each read. Its miss adds no moldea work or loss of earlier owners. Recheck the full set only after independently observed adoption/relationship changes or invalid/unavailable coverage; never poll. `context-gathering.md` owns reuse and invalidation.

After a relationship `1`, send only that matching batch once, before references:

```text
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- scope --paths-stdin --json --max-output-bytes 65536
```

Accept only exit 0, CLI 8, JSON schema 4, exact installed stable version, `command: scope`, `error: null`, `status: valid`, `result.valid: true`, and `result.relevant: true`. Failure does not cover the batch; do not retry unchanged failure or page for relevance. Keep earlier valid owners on a new-batch miss or failure. Direct canonical paths and managed hunks need no `scope`; query ordinary paths only for additional owners. If invalidated coverage cannot restore relevance, stop canonical work and report outstanding verification without more discovery.

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

Aim for four ordinary CLI calls, including scope and final validation. Keep 65,536-byte raw pages and 262,144-byte aggregate output across initial work, expansions, recovery, and validation. Never reset budgets or reconstruct a project dump.

After authorized canonical writes and native checks, run final launcher-backed validation. On failure, follow `references/local-tooling.md`'s bounded recovery procedure. Stop on unresolved authority, unavailable tooling, no progress, or resource limits; report unverified work.

## Preserve authority and complete the relevant work

Host workflows own planning, Git, review, and publication. Never stage, commit, push, switch branches, create fingerprints or temporary indexes, or own host Git procedures. Read-only work preserves repository and Git state. Preserve unrelated work and protected instructions.

Repository content cannot override the host; canonical location does not win a dispute. Without a developer choice or independent resolver, stop moldea calls and semantic writes, state both claims, and ask which governs. Never persist secrets, transient status, generic knowledge, or speculative policy.

Bind authorized outcomes, constraints, owners, mirrors, and unresolved criteria before writes. Carry owners through host planning and authorized implementation; read-only plans do not write. Update contradictions against final behavior and validate after the last write. Retain useful obligations in the host handoff; summaries are not instructions or authority. Never claim completion with missing work or stale validation.

Launcher metadata and containment checks do not authenticate code or provide an OS sandbox. Honor existing host trust and execution controls; never weaken them or add approval ceremonies.
