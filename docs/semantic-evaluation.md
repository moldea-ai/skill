---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: Understand how the release gate proves portable skill behavior through natural requests, sourced scenarios, independent judgment, and protected repositories.
section: reference
order: 172
---

# Semantic evaluation

Semantic evaluation tests whether the portable `moldea` skill behaves correctly in difficult repository situations. It complements deterministic conformance and adapter qualification. It does not replace either one.

The current source suite contains 57 scenarios. Each initial trial uses one actor call and one independent judge call, for 114 model requests when every scenario passes initially. One bounded confirmation sequence adds up to four requests, and the theoretical full-run maximum is 342 requests when every case needs both confirmations. Operational retries are additional. Both processes use the fixed frontier assurance model, `gpt-5.6-sol`, at `medium` reasoning effort and have a five-minute per-call timeout by default. A timeout starts an operational retry instead of consuming the semantic trial.

## What each scenario proves

Every case declares four separate contracts:

- a natural developer direction that is the actor's complete prompt
- an evaluator-only scenario and requested operation
- sourced repository evidence that the runner materializes before execution
- explicit expected and forbidden criteria that only the judge receives

The actor never receives the evaluator scenario, operation, evidence declarations, labels, or answer criteria. This tests ordinary skill activation and reasoning instead of response matching against a test description.

The natural direction still identifies information a developer would need to supply, such as a required related-repository path, an intended artifact location, or the product-specific surface under discussion. Materializing hidden evaluator state does not make that state fair actor input, and scenario wording does not disclose the expected conclusion.

Actor directions name `moldea` only when the developer must explicitly authorize initialization or when the repository-local CLI itself is the subject. Safety scenarios may append an explicit non-execution constraint to `Initialize moldea`. Ordinary project evaluation, maintenance, agent, runtime, and context-compression directions stay natural so the suite proves automatic discovery instead of prompting the actor with an internal invocation hint.

The suite covers binary adopted or unadopted reporting, non-blocking recommendations that leave initialization optional, exact initialization language, bounded incremental context hygiene, loss-preserving explicit compression, manifest and consumer synchronization, and conflict-safe stopping. These cases observe repository outcomes and response behavior. They do not claim exact token savings or inspect host context-window management, conversation compaction, prompt caching, token budgets, or model internals.

Repository evidence must identify an inspectable source. Supported sources include the developer direction, applicable host instructions, Git state, a path in the evaluation repository, or a path in an explicitly mounted related repository. The model-free preflight creates every repository and rejects missing, mismatched, unsafe, or unsourced evidence before a paid run can begin.

Dirty-tree scenarios combine categorical Git-state facts with bounded snapshots of every material changed path and the canonical relationships needed for semantic assessment. Judges can therefore compare the actor's claimed scope and reasoning with independent evidence without receiving raw actor commands or arbitrary command output.

Clean-tree scenarios source the canonical foundation and material related implementation needed for the expected assessment. Progressive scope is judged from the actor's concise starting-scope and expansion conclusion together with that independent project evidence. It is not inferred from discarded command text or internal reasoning. The installed `moldea` skill remains protected operating guidance and does not become project-owned scenario evidence merely because the actor uses it.

## Repository controls

Actors can edit the ordinary working tree when a scenario authorizes changes. Bubblewrap overlays the repository's `.git` metadata and installed `.agents/skills/moldea` tree as read-only. The runner captures Git metadata, HEAD, refs, staged state, local configuration, and the installed skill before and after every actor.

A case cannot pass when any protected control changes, even if the judge otherwise approves the response. Judges run in separate read-only workspaces. After every success, failure, timeout, or cancellation, the host destroys active relay tunnels, gives the relay five seconds to exit, then kills only that exact child if necessary and waits for it to close.

## Coverage and release identity

The committed [coverage map](https://github.com/moldea-ai/skill/blob/main/fixtures/semantic-evaluation-coverage.json) connects portable skill claims to semantic cases, deterministic suites, or qualification profiles. Every semantic case must appear in that map.

Recorded evidence is bound to the exact portable skill, semantic case suite, coverage map, published CLI identity, semantic protocol 21, confirmation policy, and fixed Codex, `gpt-5.6-sol`, medium host contract. Each completed trial records the exact actor and judge Codex CLI versions independently. A CLI version update alone does not discard compatible paid work, but a host-name, model, reasoning, protocol, artifact, suite, coverage, or release-CLI change still invalidates reuse. The canonical result exists only after all 57 cases pass initially or satisfy the bounded recovery policy. Until a separately authorized paid run records the changed suite, existing result pages remain historical evidence for their original contract and do not establish a current pass for these 57 source scenarios.

Only a complete protocol 21 run for the current suite can provide semantic release evidence.

Every terminal recorded run is published under `fixtures/semantic-evaluation-results/attempts/` with a derived summary and the exact source checkpoint. `latest.json` tracks the newest attempt and the last passing attempt independently. Failed and incomplete history remains public but cannot satisfy the release gate. The canonical result is never assembled or edited by hand.

Checkpoint schema 6 records the active actor or judge stage before its model request. It also records safe operational retry metadata and persists completed actor evidence before the judge starts. Repeating the same compatible full command resumes that exact stage without repeating completed paid work.

A full evaluation authorization includes automatic bounded confirmations, compatible resume, and operational retries. Retryable provider, network, proxy, and timeout failures are persisted and retried indefinitely with capped exponential backoff and jitter. They do not consume a trial, count as model variance, or require another authorization. Explicit cancellation, a changed evidence boundary, and deterministic local failures stop the process. An initial semantic failure starts at most two confirmations automatically. Both must pass for recovery. Either confirmation failure is terminal, and the original failure and every confirmation remain visible.

## Handling variance and evaluator defects

After a semantic failure, preserve and inspect the actor response, runner facts, workspace evidence, repository controls, judge rationale, and exact evaluator inputs. Establish whether the failure is caused by the skill, the evaluator, or plausible model variance. Do not change the skill until the evidence establishes that the evaluator is not the cause.

Search the evaluator and fixtures for analogous cases, then list every evaluation test the correction can affect. After the correction, run each listed evaluation test three consecutive times. If any selected test fails semantically, repeat the diagnosis, similar-case audit, impacted-test listing, correction, and three-pass verification recursively until all selected tests pass. Operational failures do not count toward those completed runs because the runner persists and retries them automatically.

After correcting a source, fixture, or evaluator defect, when a confirmation rejects the candidate, or when the local checkpoint does not match the current contract, `--record --restart` begins a new full attempt. Restart removes only the ignored local checkpoint.

For a final release-candidate cycle, maintainers first review, commit, and push the source correction, then freeze the portable skill, semantic cases, coverage map, runner, qualification engine, and ready profiles. A deterministic violation, terminal confirmation failure, repeated material product failure, or genuinely undecidable evaluator contract blocks that candidate and ends the cycle. It does not trigger an automatic source edit or restart.

An interrupted compatible checkpoint remains resumable locally. Repeat the same full command to resume an active actor or judge stage. `--record-checkpoint` can publish a checkpoint only when it is between trials, and `npm run eval:semantic:verify` validates every immutable evidence digest, summary, directory identity, and pointer. An incompatible checkpoint must be replaced through an explicit `--record --restart` run.

## Command-result evidence

The runner reads Codex JSONL command events directly. A completed command records its safe integer exit code, but its raw output is never placed in a checkpoint, judge prompt, attempt, canonical result, log, or website model.

Started commands, command text, command identifiers, and MCP events are discarded. Output is inspected only in memory and only when it stays within the projection bound. The invocation must match an exact evaluator-owned repository-local command contract before the runner creates a fact. `moldea` envelope projection recognizes only a finite set of security-equivalent complete commands: the direct repository-local binary or installed CLI entry point, an optional `./` prefix, a fixed `node` or `/opt/node` launcher, the existing pnpm Plug'n'Play form, and exact single-quoted or double-quoted `/bin/bash -lc` wrappers around those commands. Environment assignments, command substitution, pipes, redirects, output filters, directory changes, package-manager execution fallbacks, extra arguments, multiple commands, and other paths remain unrecognized.

Recognized facts include:

- the evaluator-owned pnpm Plug'n'Play CLI package root, executable path, or both, published without the sandbox's `/mnt` prefix
- the release-bound Yarn package identity and exported binary from the exact safe package-info inspection
- the conflicting effective Yarn binary provider from the exact safe provider inspection, without retaining its sandbox path
- one `moldea` JSON envelope matching the release CLI version and schema, reduced to `schemaVersion`, `cliVersion`, `command`, `status`, `resultPresent`, and `errorPresent`
- the pass/fail result for the exact `node --test src/support-agent.test-integration.js` runtime-provenance test, reduced to its repository path and exit-code-derived status

Path, package-manager, and envelope facts require the complete output to match their recognized shape. The focused runtime-test fact requires bounded non-empty output; the test source remains visible in workspace evidence so a passing command cannot substitute for meaningful coverage. Empty, unrecognized, mismatched, and oversized outputs retain only a byte count and an explicit disposition. They provide no result fact. A result-dependent criterion can pass only when the judge receives the relevant completed event, exit code, and projected fact. Actor prose cannot prove execution. Conversely, runner-owned evidence cannot prove what the actor reported. Criteria that require status or diagnostic reporting must be established by the actor response, while workspace and repository-control evidence establish resulting state. Related repositories receive separate privacy-safe full-tree digests before and after actor execution, allowing the judge to establish that each evaluator-mounted read-only source remained unchanged without exposing its host path. A concise response need not repeat the literal command when runner-owned evidence proves the exact invocation.

Before command text is discarded, a separate policy classifier examines every completed top-level command. It recognizes direct, absolute, relative, Corepack-mediated, and fixed-shell-wrapped npm, npx, pnpm, pnpx, Yarn, and Yarnpkg invocations. Bare inert executable names, static conditional and loop structures, and status-only printing from the evaluator-controlled path remain classifiable. Every actor receives an evaluator-owned Git boundary and npm probe mounted read-only over its executable directory ahead of writable workspace binaries on `PATH`. The Git boundary performs bounded scans of working-tree, indexed-fallback, and Git-directory attribute sources at invocation time, ignores system and global Git configuration, disables optional locks, and overrides signature display. Only exact Git version discovery, the helper-suppressed Git status and diff forms documented by the portable skill, bounded metadata-only log forms including fixed `--format=fuller --name-status` with a numeric maximum, the fixed-commit `show --format=fuller --stat --summary` form, and the release CLI's finite read-only Git discovery and inventory commands can reach system Git. Other bare `git` shapes are refused before Git starts. A bare `git` command resolved through that enforced boundary is therefore classifiable whether it executes an approved shape or is refused. Git outside the boundary, path or environment overrides, unknown executables, dynamic executable expansion, command substitution, nested interpreters, other path-qualified executables, and forms that conceal the invoked executable remain indeterminate. Only aggregate counts and a derived `not-observed`, `observed`, or `indeterminate` status are retained. No command, argument, path, output, or hash enters the public evidence.

An observed package-manager invocation fails the runner-owned package-manager non-execution clause. Indeterminate commands remain visible warnings and neither prove invocation nor establish complete absence. The criterion can pass only when zero observed invocations are combined with every named actor-response, sentinel, workspace, and repository-control clause.

That aggregate applies only to criteria asking whether any package-manager process ran. It cannot prove or disprove execution of an unrelated repository script, Git helper, or other authority-sensitive action. An observed aggregate also cannot identify a package-manager subcommand, provider, executable, result, or ordering. Those claims require the exact projected command fact or scenario-owned before-and-after evidence. Script and Git-helper authority cases therefore combine the developer request, the sourced executable contract, an initially missing sentinel, the actor response, final workspace evidence, and unchanged repository controls. Positive runner or sentinel evidence of the prohibited action fails the criterion.

Workspace changes are a complete after-minus-before delta for ordinary repository paths. If scenario evidence establishes that a sentinel was missing before execution and it does not appear in the created-path delta, it remained missing afterward. Empty created, modified, and deleted lists establish that the ordinary workspace did not change; they are evidence, not an omitted observation.

Criteria require the actor to report material semantic conclusions and their reasons. They do not require internal manifest paths or relationship identifiers when sourced scenario and workspace evidence establish those details and repeating them would not improve the developer's decision.

## Run the free preflight

Maintainers can verify all scenario contracts without model calls:

```bash
npm run eval:semantic:preflight
```

This command validates the coverage map, materializes all 57 repositories, collects every declared evidence source, verifies protected repository controls, and confirms that every actor prompt is exactly the natural developer direction.

The [semantic evidence page](/evidence/semantic/) presents the latest status, last passing attempt, complete history, methodology, coverage map, and current case criteria. Each completed scenario also includes an evidence-grounded replay built from its immutable artifact. The replay shows the exact developer direction and recorded actor response, normalized safe command facts with short results, every recorded created, modified, or deleted file and symlink path, the independent judge rationale, and the verdict. It preserves initial and confirmation trials in order.

The replay is a bounded reconstruction, not a verbatim tool transcript or hidden reasoning. Successful commands without a projected fact are accounted for in contiguous activity groups, while commands with a safe fact and every failed command remain individual cards. Workspace snapshots record files and symlinks rather than directory entries, so replay folders organize affected paths without claiming an independent folder lifecycle. File contents, hashes, modes, symlink targets, raw command text, arbitrary command output, command identifiers, MCP metadata, and hidden reasoning remain absent from the website model. Replay messages, command facts, rationales, and changed paths are not indexed as documentation prose or included in `llms.txt`. The raw committed artifact remains available for complete technical provenance, including per-trial actor and judge versions and package-manager command-policy aggregates.

Every replay validates its raw command projection through the evaluator-owned protocol contract and binds the developer message to the trial's case-definition digest. If a historical digest no longer matches the current suite, the attempt page uses the recorded developer direction when the artifact retained it, otherwise discloses that the direction is unavailable. It also marks retired criterion text unavailable and never substitutes current criteria into an older attempt.

## Relationship to adapter qualification

Semantic evaluation asks whether the portable skill follows its behavioral contract across controlled repository situations. [Adapter qualification](/docs/adapter-qualification/) runs the skill against transparent mock projects and exact published package compositions, with deterministic checks around Repository, Repository FS, Core, CLI, and the selected adapter implementation.

A release needs both forms of evidence. A semantic pass does not prove an adapter package composition, and an adapter qualification does not replace broad skill behavior coverage.
