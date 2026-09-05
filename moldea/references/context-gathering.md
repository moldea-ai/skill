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

## Select metadata before content

For relationship-gated work, reuse the successful `scope` result as the complete relevant-owner inventory. Do not run `inspect` after `scope`. The scope call is the first of at most four ordinary CLI calls, leaving no more than three calls for necessary structural validation and explicitly selected owner content.

Use `validate` when structure is the only question. Use content-free `inspect` only when the operation needs canonical paths, digests, counts, relationships, requirements, mirrors, runtimes, or diagnostics. Process the first 65,536-byte page directly and follow its cursor only while another page can change the conclusion.

Use `content` for one canonical path only after metadata identifies the owner or the direct task already names it. Read only the chunks needed to answer or edit the relevant contract. Never obtain every canonical body for orientation.

Treat a path, digest, relationship, or declaration as routing evidence, not proof that the prose and implementation agree. Follow only the exact referenced implementation, consumer, test, or documentation boundary needed for the active operation.

## Evidence hierarchy

Prefer, in order:

1. explicit current developer statements
2. executable behavior and tests in the task scope
3. current authoritative project documentation
4. canonical moldea assets and declared relationships
5. history when the current meaning remains ambiguous
6. external sources only when current published compatibility matters

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
