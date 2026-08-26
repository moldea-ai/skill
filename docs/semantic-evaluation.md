---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: Understand how the release gate proves portable skill behavior through natural requests, sourced scenarios, independent judgment, and protected repositories.
section: reference
order: 172
---

# Semantic evaluation

Semantic evaluation tests whether the portable `moldea` skill behaves correctly in difficult repository situations. It complements deterministic conformance and adapter qualification. It does not replace either one.

The current suite contains 49 scenarios. Each initial trial uses one actor call and one independent judge call, for up to 98 model calls when every scenario passes initially. One bounded confirmation sequence can add up to four calls. Both processes use the fixed frontier assurance model, `gpt-5.6-sol`, at `medium` reasoning effort and have a five-minute per-call timeout by default. Terra attempts remain public as historical evidence, but Terra is not qualified for the current release.

## What each scenario proves

Every case declares four separate contracts:

- a natural developer direction that is the actor's complete prompt
- an evaluator-only scenario and requested operation
- sourced repository evidence that the runner materializes before execution
- explicit expected and forbidden criteria that only the judge receives

The actor never receives the evaluator scenario, operation, evidence declarations, labels, or answer criteria. This tests ordinary skill activation and reasoning instead of response matching against a test description.

The natural direction still identifies information a developer would need to supply, such as a required related-repository path, an intended artifact location, or the product-specific surface under discussion. Materializing hidden evaluator state does not make that state fair actor input, and scenario wording does not disclose the expected conclusion.

Repository evidence must identify an inspectable source. Supported sources include the developer direction, applicable host instructions, Git state, a path in the evaluation repository, or a path in an explicitly mounted related repository. The model-free preflight creates every repository and rejects missing, mismatched, unsafe, or unsourced evidence before a paid run can begin.

Dirty-tree scenarios combine categorical Git-state facts with bounded snapshots of every material changed path and the canonical relationships needed for semantic assessment. Judges can therefore compare the actor's claimed scope and reasoning with independent evidence without receiving raw actor commands or arbitrary command output.

Clean-tree scenarios source the canonical foundation and material related implementation needed for the expected assessment. Progressive scope is judged from the actor's concise starting-scope and expansion conclusion together with that independent project evidence. It is not inferred from discarded command text or internal reasoning. The installed `moldea` skill remains protected operating guidance and does not become project-owned scenario evidence merely because the actor uses it.

## Repository controls

Actors can edit the ordinary working tree when a scenario authorizes changes. Bubblewrap overlays the repository's `.git` metadata and installed `.agents/skills/moldea` tree as read-only. The runner captures Git metadata, HEAD, refs, staged state, local configuration, and the installed skill before and after every actor.

A case cannot pass when any protected control changes, even if the judge otherwise approves the response. Judges run in separate read-only workspaces. After every success, failure, timeout, or cancellation, the host destroys active relay tunnels, gives the relay five seconds to exit, then kills only that exact child if necessary and waits for it to close.

## Coverage and release identity

The committed [coverage map](https://github.com/moldea-ai/skill/blob/main/fixtures/semantic-evaluation-coverage.json) connects portable skill claims to semantic cases, deterministic suites, or qualification profiles. Every semantic case must appear in that map.

Recorded evidence is bound to the exact portable skill, semantic case suite, coverage map, published CLI identity, semantic protocol 15, confirmation policy, and fixed Codex, `gpt-5.6-sol`, medium host contract. Each completed trial records the exact actor and judge Codex CLI versions independently. A CLI version update alone does not discard compatible paid work, but a host-name, model, reasoning, protocol, artifact, suite, coverage, or release-CLI change still invalidates reuse. The canonical result exists only after all 49 cases pass initially or satisfy the bounded recovery policy.

Every terminal recorded run is published under `fixtures/semantic-evaluation-results/attempts/` with a derived summary and the exact source checkpoint or result. `latest.json` tracks the newest attempt and the last passing attempt independently. Failed and incomplete history remains public but cannot satisfy the release gate. The canonical result is never assembled or edited by hand.

Every full recording stops at the first failed initial trial. The runner writes the checkpoint, publishes the failure, and exits nonzero before any more paid work. A maintainer may grant standing authorization for bounded confirmations and compatible resume within one candidate. That scope must be established before execution and never carries across a restart, source correction, changed evidence boundary, or additional candidate.

When inspection establishes plausible model variance, a separately authorized `--confirm <case-id> --record` operation runs at most two confirmations. Applicable standing authorization lets the operator run this sequence without interrupting the maintainer and resume the remaining cases automatically when both confirmations pass. Either confirmation failure is terminal, the second confirmation is skipped when recovery is already impossible, and no further model call is made. The operator then reports the failed case, actor response, runner facts, workspace evidence, repository controls, judge rationale, likely failure class, recommended next action, and available options with their evidence-invalidating or paid-call consequences. The original failure is never replaced, and a recovered case and all its trials remain visible.

After correcting a source, fixture, or evaluator defect, or when a confirmation rejects the candidate, `--record --restart` begins a new full attempt. Restart removes only the ignored local checkpoint and preserves the published attempt history. Protocol-14 and earlier checkpoints cannot resume or migrate because their command facts were produced under an earlier invocation-projection contract. Historical attempts remain valid history, but they cannot satisfy the current release gate.

For a final release-candidate cycle, maintainers first review, commit, and push the source correction, then freeze the portable skill, semantic cases, coverage map, runner, qualification engine, and ready profiles. An initial failure is classified from the actor response, runner facts, workspace evidence, repository controls, and judge rationale before any next action. Plausible model variance may use the separately authorized bounded confirmation policy. A deterministic violation, terminal confirmation failure, repeated material product failure, or genuinely undecidable evaluator contract blocks that candidate and ends the cycle. It does not trigger another automatic source edit and restart.

An interrupted protocol-compatible checkpoint remains resumable locally. `--record-checkpoint` can publish it without a model call, and `npm run eval:semantic:verify` validates every immutable evidence digest, summary, directory identity, and pointer. A schema-3 local checkpoint on the current semantic protocol can be converted once with `npm run eval:semantic -- --migrate-checkpoint`. The model-free migration validates current inputs, preserves the exact source in an ignored digest-named recovery file, attributes the former actor and judge identities to every existing trial, and writes schema 4 atomically. It does not publish evidence or invoke Codex.

## Command-result evidence

The runner reads Codex JSONL command events directly. A completed command records its safe integer exit code, but its raw output is never placed in a checkpoint, judge prompt, attempt, canonical result, log, or website model.

Started commands, command text, command identifiers, and MCP events are discarded. Output is inspected only in memory and only when it stays within the projection bound. The invocation must match an exact evaluator-owned repository-local command contract before the runner creates a fact. `moldea` envelope projection recognizes only a finite set of security-equivalent complete commands: the direct repository-local binary or installed CLI entry point, an optional `./` prefix, a fixed `node` or `/opt/node` launcher, the existing pnpm Plug'n'Play form, and exact single-quoted or double-quoted `/bin/bash -lc` wrappers around those commands. Environment assignments, command substitution, pipes, redirects, output filters, directory changes, package-manager execution fallbacks, extra arguments, multiple commands, and other paths remain unrecognized.

Recognized facts include:

- the evaluator-owned pnpm Plug'n'Play CLI package root, executable path, or both, published without the sandbox's `/mnt` prefix
- the release-bound Yarn package identity and exported binary from the exact safe package-info inspection
- the conflicting effective Yarn binary provider from the exact safe provider inspection, without retaining its sandbox path
- one `moldea` JSON envelope matching the release CLI version and schema, reduced to `schemaVersion`, `cliVersion`, `command`, `status`, `resultPresent`, and `errorPresent`
- the pass/fail result for the exact `node --test src/support-agent.test-integration.js` runtime-provenance test, reduced to its repository path and exit-code-derived status

Path, package-manager, and envelope facts require the complete output to match their recognized shape. The focused runtime-test fact requires bounded non-empty output; the test source remains visible in workspace evidence so a passing command cannot substitute for meaningful coverage. Empty, unrecognized, mismatched, and oversized outputs retain only a byte count and an explicit disposition. They provide no result fact. A result-dependent criterion can pass only when the judge receives the relevant completed event, exit code, and projected fact. Actor prose cannot prove execution. Conversely, runner-owned evidence cannot prove what the actor reported. Criteria that require status or diagnostic reporting must be established by the actor response, while workspace and repository-control evidence establish resulting state. The Yarn conflict case additionally proves non-invocation by combining an initially missing evaluator-owned sentinel with workspace evidence showing that the probe did not create it. A concise response need not repeat the literal command when runner-owned evidence proves the exact invocation.

Criteria require the actor to report material semantic conclusions and their reasons. They do not require internal manifest paths or relationship identifiers when sourced scenario and workspace evidence establish those details and repeating them would not improve the developer's decision.

## Run the free preflight

Maintainers can verify all scenario contracts without model calls:

```bash
npm run eval:semantic:preflight
```

This command validates the coverage map, materializes all 49 repositories, collects every declared evidence source, verifies protected repository controls, and confirms that every actor prompt is exactly the natural developer direction.

The [semantic evidence page](/evidence/semantic/) presents the latest status, last passing attempt, complete history, per-trial actor and judge versions, methodology, coverage map, and current case criteria. Actor transcripts, safe completed-command facts, and workspace artifacts remain available in each raw committed evidence artifact rather than being indexed as ordinary documentation. Actor-controlled command and MCP metadata and arbitrary command output are intentionally absent.

## Relationship to adapter qualification

Semantic evaluation asks whether the portable skill follows its behavioral contract across controlled repository situations. [Adapter qualification](/docs/adapter-qualification/) runs the skill against transparent mock projects and exact published package compositions, with deterministic checks around Repository, Repository FS, Core, CLI, and the selected adapter implementation.

A release needs both forms of evidence. A semantic pass does not prove an adapter package composition, and an adapter qualification does not replace broad skill behavior coverage.
