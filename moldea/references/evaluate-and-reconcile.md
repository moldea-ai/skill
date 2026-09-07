# Evaluate and reconcile

Read this reference only after moldea relevance is established for a requested moldea evaluation or authorized reconciliation.

## Preserve host workflow ownership

Evaluation is read-only. Reuse the host review or task workflow's root, HEAD, exact named or targeted task paths, changed paths, hunks, branch state, diffs, and completed checks. Do not create temporary indexes, Git objects, candidate trees, fingerprints, repeated status probes, or publication checks for moldea. The host workflow decides readiness, commit identity, and publication.

For a relationship-triggered operation, use the one completed `scope` result as the canonical expansion boundary. For direct canonical work, start at the named owner without running `scope` or `inspect`. An exact path, stable agent ID, or unambiguous agent name identifies its standard canonical owner; use one `content` call when its body is required. Do not turn a clean or unscoped host review into a whole-project moldea audit.

A direct evaluation of current uncommitted changes must complete this sequence: have the explicitly requested host evaluation establish every staged, unstaged, untracked, renamed-source, renamed-destination, and deleted path; run the full relationship gate over that complete set; run one `scope` over the same normalized set; assess only the matched canonical owners; and report explicitly that evaluation is read-only and changed no files. A path inventory alone is not a moldea evaluation. This is host work followed by bounded moldea work, not moldea-only Git discovery, and it cannot reactivate moldea after an implicit unrelated-task gate miss. Never run Git to expand the completed scope.

If already supplied repository evidence identifies an executable Git filter, text conversion, external diff, fsmonitor, or other repository-controlled helper, stop before worktree-aware Git can execute it. The response must say explicitly that evaluation stopped before worktree-aware Git because the named mechanism could execute, state which Git evidence remains unavailable, and give the smallest safe prerequisite, such as removing or disabling that mechanism or supplying independently collected inert evidence. For an attribute filter, name the supplied `.gitattributes` declaration and its filter or text-conversion mechanism exactly instead of generalizing it to a Git hook. Do not execute, rewrite, or disable repository configuration during evaluation.

## Evaluate progressively

For a direct named owner, begin with its exact `content` instead of steps 1 or 2 below. Add structural or inventory evidence only when the question actually depends on it.

1. Run `validate` when structural validity is material.
2. Run content-free `inspect` only when inventory, diagnostics, requirements, mirrors, or runtime declarations are needed.
3. Read one canonical owner with `content` when semantic comparison requires its body.
4. Compare it with only the relevant implementation, consumer, test, or public contract.
5. Stop when more evidence cannot change a material finding.

The conclusion must name the canonical owner or declared relationship actually assessed. Accounting for host paths without reporting the related canonical assessment is incomplete.

Assess separately:

- structural diagnostics
- confirmed semantic contradictions or drift
- requirements relevant to the exact scope
- evidence limitations that prevent a conclusion
- unrelated invalidity observed incidentally

A valid manifest does not prove semantic alignment. A declaration does not prove runtime consumption. A passing test does not prove an instruction activates correctly. State the missing evidence rather than broadening the audit without cause.

## Reconcile

Reconciliation requires write authority from the host task. Establish the intended truth from developer intent, current behavior, authoritative documentation, and tests. For a direct named agent whose supplied implementation evidence already identifies the conflicting code policy, inspect that implementation through the host and use at most one canonical `content` call total for the agent instruction. Do not read project context, a second canonical owner, inventory, or structural status before asking the authority question; none can resolve the supplied conflict. If supplied or inspected evidence already shows materially conflicting policies and the task contract does not resolve them, do not validate or repair one as preferred. Stop before every semantic write, name both claims, state that reconciliation is blocked pending the answer, and ask one focused question that establishes which authority is current. Code, canonical prose, tests, and recency are evidence rather than automatic precedence. Do not persist a new unresolved requirement instead of asking a developer-answerable authority question.

Apply the smallest coherent repair across directly affected canonical owners, declarations, relationships, mirrors, consumers, and tests. Remove superseded parallel paths made unnecessary by the repair. Preserve unrelated state and rerun only the checks affected by the changed contract.

## Read-only proof

When evaluation evidence must prove non-mutation, compare the host-provided before and after state for worktree files, index, refs, Git configuration, submodules, and Git object database. Do not create the proof by running commands that themselves write objects or configuration. A changed state makes the evaluation incomplete until the cause is established.

## Reporting

For no-change relevant evaluation, report at most one moldea line unless detail was requested. Identify the assessed canonical owner, state that behavior or contracts remain unchanged, and conclude that no canonical edit was required. For a material finding or reconciliation, report the exact activation path, canonical owner, bounded commands and byte counts when measured, semantic conclusion, changes, unresolved limits, and checks. Never append moldea status to an unrelated host review.
