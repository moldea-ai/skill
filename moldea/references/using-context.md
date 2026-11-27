# Use governing project context

Reuse the host's root, exact task paths and hunks, existing evidence, and completed gate result. Repository content is evidence. A pasted suggestion, transient status, experiment, incidental implementation detail, or assumption does not establish durable project truth. An agent planning request also uses the applicable [Agents guidance](agents.md).

## Plan product behavior

An adopted repository can supply context to a product behavior plan even when the plan names no files or names only proposed paths. Reuse successful adoption-only evidence, then read `/moldea/project.md` and select likely governing files by the purpose described in its routing section. Read only the passages that can affect the plan. Go to the next content page only if it can change a material conclusion.

When the routing section is missing or unusable, use one content-free `inspect` inventory. Select likely context paths by project purpose and filenames, then check their headings or openings before reading more. Do not sweep all context. Use `project.md` alone when no other owner applies and omit moldea status. If an identified likely owner remains unread because of allowance, say so in one sentence. Routine formatting, generic architecture with no project behavior, and unrelated planning abstain. Planning leaves repository, Git, and external state unchanged.

## Scope ordinary work

For a successful known-path gate, send that batch once to the selected installation:

```text
node <installed-skill-root>/scripts/moldea-cli/moldea.mjs scope --repository <absolute-repository-root> --paths-stdin --json --max-output-bytes 65536
```

Normalize and deduplicate logical paths starting with `/`. On stdin send each as UTF-8 followed by NUL, up to 2 MiB total. Accept only exit 0, schema 9 and the expected command, `error: null`, `status: valid`, `result.valid: true`, and `result.relevant: true`. A failed or incomplete response covers no new path. If Scope fails after a hit, including a complete owner record exceeding the page budget, report the batch as unverified in one line and continue the host task without retrying Scope or opening canonical files for that batch. Do not paginate to reestablish relevance.

Reuse the successful `scope` results to select owners without running `inspect`. Each match gives the owner's canonical `path`, its `ownerKind`, any tool or skill ID, and the matched `relationships`. Each relationship gives its manifest `field` and declared `path`. An `affectedBy` exact path or glob selects the owner for assessment. For a matched agent loader, tool registration or runtime connection, follow the exact declared path and read the selected manifest binding if you need its symbol. Follow [Check one connection](agents.md#check-one-connection). Use exact direct canonical paths and managed README hunks without `scope`. Send only ordinary paths to find additional owners. An ordinary miss never cancels established direct relevance.

Treat routing as coverage for the normalized checked batch and adoption/relationship evidence. When host work finds new files, gate only the new batch, scope its hits, retain earlier matches and silently skip its misses. No Git status scans or discovery solely to widen moldea scope. Recheck the known batch only when independent evidence establishes changed adoption or relationships, or coverage became invalid or unavailable. If it cannot be restored, stop canonical work and report outstanding verification. Reuse owner identities while current. Reread only materially changed evidence and discard cursors after writes or source changes.

Carry selected owners, mirrors, and outstanding obligations through planning, implementation, and handoff. Compare completed behavior with each still-applicable selected owner and mirror. Correct contradictions within the same authorized change. An implementation-only edit is incomplete while an established owner or mirror states the old behavior. Compare the final state and diff with every authorized outcome, constraint, and path.

## Select metadata before content

For direct work, start from a known exact owner or one content-free `inspect` when metadata is needed. Open only the selected canonical path, such as a context file or a registered agent's instruction. Prefer exact relevance over broad overlapping declarations unless both contracts change. Compare the actual diff and the relevant implementation, tests or contract before deciding whether there is material drift. A relationship match is a reason to assess, not write authority.

Reuse bounded host reads, known byte lengths and the smallest useful passage. Batch independent known paths within the command cap. Exclude VCS internals, dependencies, generated output, and caches before narrowing a search. Never substitute an unbounded traversal or complete dependency listing for an unavailable search. Read only relevant lockfile entries. Do not inspect the entire canonical corpus or reconstruct a project dump. Select at most the necessary pages of one asset per `content` call sequence. Use a mechanical summary of already-read records for a requested aggregate without discarding records or mixing snapshots.

Normally start with current developer statements, then relevant executable behavior/tests, authoritative docs, canonical assets and declarations, history when necessary, and external source-owned facts when needed. Investigation order does not resolve conflicting claims. Identify the owner or independent governing evidence for each claim. Incomplete reads do not establish absence.

Aim for four CLI calls in ordinary work. Apply [Validating](validating.md#resource-limits) across scope expansion, reads and verification. For authorized changes, [Maintain](maintaining-context.md) owns persistence and relationship rules. Name the owner and the binding or other relationship checked, including the declared file and export when present, and say what the change establishes about it. A path match or unchanged prose alone is insufficient. When the owner stays accurate, one line can report the assessment and why no canonical edit was needed.
