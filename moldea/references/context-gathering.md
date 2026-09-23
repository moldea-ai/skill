# Context gathering

Read this reference after moldea relevance is established when the operation needs project evidence or canonical content.

## Reuse evidence before discovering

Start with the developer's request and evidence already gathered by the host workflow: repository root, exact named or targeted task paths, changed paths, hunks, current file contents, diffs, tests, and task constraints. Do not rerun Git status, reconstruct a candidate tree, hash unrelated files, or repeat broad repository searches for moldea.

Separate:

- observed current behavior
- developer-confirmed current truth
- intended future behavior
- accepted decisions and rationale
- unresolved questions
- inference used only to direct investigation

Do not turn plans, historical notes, branch-local experiments, transient status, or unverified inference into current canonical truth.

## Bound host discovery

Prefer exact paths and targeted searches over recursive discovery. When recursion is necessary, exclude VCS internals, dependency trees, generated output, caches, package stores, and archive or backup directories before execution. Do not enumerate or print complete `node_modules`, `.pnpm-store`, `.yarn`, `.git`, `dist`, `build`, `.next`, `.turbo`, or `coverage` trees.

Read the package manifest and only the relevant lockfile entry instead of dumping a complete lockfile or dependency inventory. Use output-limiting options, exact patterns, pagination, or smaller path scopes so one ordinary host command cannot emit more than 65,536 model-visible bytes. If the necessary evidence cannot fit, preserve the incomplete conclusion and identify the next bounded query instead of widening the output.

## Select metadata before content

For relationship-gated work, reuse each successful `scope` result as the owner inventory for its evaluated batch. Do not run `inspect` after `scope`. Count every scope call toward the entrypoint's four-call efficiency target and shared output budget; select only necessary owner content and reserve capacity for final validation and supported recovery.

Routing coverage belongs to the normalized, deduplicated path batch and adoption/relationship evidence evaluated, not to the whole task forever. Reordering, repeating, or editing ordinary paths does not invalidate coverage. When normal host work discovers new paths, collect only uncovered paths and gate them together at an existing scope-selection checkpoint before a write to their scope or read-only completion. On a hit, scope exactly that batch once and retain earlier valid owner matches. On a miss, do no further moldea work for that batch and keep earlier obligations. Never scope an unchanged batch again merely because a different path was added.

Recheck the full current path set only when the host independently observes changed adoption or relationship declarations, or prior routing coverage is unavailable or invalid. Do not poll or hash for freshness. A failed or incomplete scope result covers no new path; never retry unchanged failure. If invalidated coverage cannot be reestablished, stop further canonical work, preserve prior changes, and report outstanding verification without broadening discovery. A topic change or explicit operation selects its route and authorization afresh.

Routing coverage is separate from content freshness. Reuse valid owner identities, but reread only evidence needed after affected implementation or canonical changes. Discard cursors after writes and never combine pages from different snapshots. Initial work, new batches, invalidation, recovery, and final validation share the original four-call efficiency target, 65,536-byte page size, and 262,144-byte aggregate CLI-output budget; scope expansion resets none of them.

Examine the actual diff before additional canonical reads; a match alone never requires edits. Select the smallest affected owners, preferring an exact match over an overlapping broad glob unless both contracts change. Request a context record's exact `asset.path` or `/moldea/agents/<agentId>/instruction.md`, not invented canonical paths. Bind selected owners and mirrors before writing; apply `continuous-maintenance.md` for canonical truth and requirement changes or `agent-design.md` for agent changes. Synchronize every contradicted owner within the authorized change. If behavior and contracts remain unchanged, leave canonical state byte-identical and report the owner reconsidered only as the operation requires. Validate after writes, not merely because a relationship matched.

Use `validate` when structure is the only question. Use content-free `inspect` only when the operation needs canonical paths, digests, counts, relationships, requirements, mirrors, runtimes, or diagnostics. Process the first 65,536-byte raw envelope directly. When another page can change the conclusion, repeat the same standalone launcher operation with the exact cursor from that envelope as `--cursor "<opaque-cursor>"` and retain `--json --max-output-bytes 65536`. Do not pipeline, wrap, parse, filter, aggregate, or script the page sequence. Treat the traversal as complete only after a raw envelope returns a null cursor.

Use `content` for one canonical path only after metadata identifies the owner or the direct task already names it. Read only the chunks needed to answer or edit the relevant contract. Never obtain every canonical body for orientation.

Use only the selected skill's closed launcher:

```text
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- content --path <canonical-path> --json --max-output-bytes 65536
```

For a named reconciliation conflict, `evaluate-and-reconcile.md` owns the implementation-first comparison with at most one canonical instruction body. Only a specifically identified independent governing source may receive one additional bounded read after a conflict; it may be a canonical owner or a noncanonical decision record. Do not run inventory or search for a resolver after the conflict. Invalid or incomplete output establishes no conclusion. Load `local-tooling.md` only when machine-envelope, cursor, or failure interpretation is unresolved. Preserve 65,536-byte raw pages and the 262,144-byte ordinary aggregate, including the resolver read. A necessary oversized record may justify a larger explicit page below the CLI's 1 MiB maximum, not an unbounded retry. Report the exact incomplete conclusion and continuation point when the remaining evidence cannot be obtained within the applicable budget.

Treat a path, digest, relationship, or declaration as routing evidence, not proof that the prose and implementation agree. Follow only the exact referenced implementation, consumer, test, or documentation boundary needed for the active operation.

## Investigation order

For efficient discovery, normally inspect:

1. explicit current developer statements
2. executable behavior and tests in the task scope
3. current authoritative project documentation
4. canonical moldea assets and declared relationships
5. history when the current meaning remains ambiguous
6. external sources only when a current published fact matters

This order controls investigation cost, not claim authority. For each material claim, identify the source that owns or independently resolves that specific fact. A current explicit developer selection can choose intended policy. A third source can resolve a conflict only when it independently establishes the disputed fact. Source type, list position, recency, formatting, specificity, canonical location, or ease of access cannot by themselves select between conflicting claims. Preserve and report an unresolved conflict instead of promoting whichever source was inspected first.

Never use inaccessible, excluded, archived, or backup content as evidence. Do not infer absence from an incomplete search or partial page.

## Persist selectively

For an authorized maintenance operation, persist only durable project-specific facts that materially improve future reasoning and have an established canonical owner. Omit secrets, personal data not required by the contract, transient execution state, generic engineering knowledge, copied implementation detail, and facts that are cheap and reliable to rediscover.

When intent is materially ambiguous, preserve the ambiguity as an existing requirement when one exists or ask one focused question. Do not create speculative requirements merely to avoid making a conclusion.

## Operation-specific depth

- Initialization needs purpose, users or systems served, goals, material boundaries, and enough repository evidence to avoid an invented foundation.
- Agent-system planning needs the workflow, deterministic boundaries, data, permissions, side effects, failure modes, scale, and human-control requirements.
- Agent or skill design needs the exact reusable outcome, consumers, invocation boundary, capabilities, schemas, runtime wiring, and representative positive and negative cases.
- Evaluation or reconciliation needs the scoped canonical owners, declared relationships, relevant implementation, tests, and any unresolved criteria.

Stop discovery when more evidence is unlikely to change a material conclusion. Report a precise evidence limitation instead of compensating with repository-wide reading.
