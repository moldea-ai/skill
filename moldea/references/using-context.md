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

Normalize and deduplicate logical paths starting with `/`. On stdin send each as UTF-8 followed by NUL, up to 2 MiB total. Accept only exit 0, expected schema 8 and command, `error: null`, `status: valid`, `result.valid: true`, and `result.relevant: true`. A failed or incomplete response covers no new path. Do not retry unchanged failures or paginate to reestablish relevance. If the CLI cannot run after a hit, name the unverified check in one line and continue the host task without canonical reads for that batch.

Reuse the successful `scope` owner inventory. Do not run `inspect` after it. Use exact direct canonical paths and managed README hunks without `scope`; send only ordinary paths to find additional owners. An ordinary miss never cancels established direct relevance.

Treat routing as coverage for the normalized checked batch and adoption/relationship evidence. When host work finds new files, gate only the new batch, scope its hits, retain earlier matches and silently skip its misses. No Git status scans or discovery solely to widen moldea scope. Recheck the known batch only when independent evidence establishes changed adoption or relationships, or coverage became invalid or unavailable. If it cannot be restored, stop canonical work and report outstanding verification. Reuse owner identities while current. Reread only materially changed evidence and discard cursors after writes or source changes.

## Select metadata before content

For direct work, start from a known exact owner or one content-free `inspect` when metadata is needed. Open only the selected canonical `asset.path`, such as a context file or a registered agent's instruction. Prefer exact relevance over broad overlapping declarations unless both contracts change. Compare the actual diff and the relevant implementation, tests or contract before deciding whether there is material drift. A relationship match is a reason to assess, not write authority.

Reuse bounded host reads, known byte lengths and the smallest useful passage. Batch independent known paths within the command cap. Exclude VCS internals, dependencies, generated output, caches, archives and backups before narrowing a search. Never substitute an unbounded traversal or complete dependency listing for an unavailable search. Read only relevant lockfile entries. Do not inspect the entire canonical corpus or reconstruct a project dump. Select at most the necessary pages of one asset per `content` call sequence. Use a mechanical summary of already-read records for a requested aggregate without discarding records or mixing snapshots.

Normally start with current developer statements, then relevant executable behavior/tests, authoritative docs, canonical assets and declarations, history when necessary, and external source-owned facts when needed. Investigation order does not resolve conflicting claims. Identify the owner or independent governing evidence for each claim. Incomplete reads do not establish absence.

Ordinary work aims for four CLI calls, uses 65,536-byte pages and keeps aggregate moldea output within 524,288 bytes per cycle, shared across scope expansion, reads and verification. Use [Validating](validating.md) for caps, cursors, failures and final validation. When the budget runs out, report the narrow gap without restarting. For authorized changes, [Maintain](maintaining-context.md) owns persistence and relationship rules. Assessment of an accurate affected owner can end with one line identifying what was checked and why no canonical edit was needed.
