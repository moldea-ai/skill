---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: Understand how the release gate proves portable skill behavior through natural requests, sourced scenarios, independent judgment, and protected repositories.
section: reference
order: 172
---

# Semantic evaluation

Semantic evaluation tests whether the portable `moldea` skill behaves correctly in difficult repository situations. It complements deterministic conformance and adapter qualification. It does not replace either one.

The current suite contains 48 scenarios. Each initial trial uses one actor call and one independent judge call, for up to 96 model calls when every scenario passes initially. One bounded confirmation sequence can add up to four calls. Both processes use `gpt-5.6-terra` at `medium` reasoning effort and have a five-minute per-call timeout by default.

## What each scenario proves

Every case declares four separate contracts:

- a natural developer direction that is the actor's complete prompt
- an evaluator-only scenario and requested operation
- sourced repository evidence that the runner materializes before execution
- explicit expected and forbidden criteria that only the judge receives

The actor never receives the evaluator scenario, operation, evidence declarations, labels, or answer criteria. This tests ordinary skill activation and reasoning instead of response matching against a test description.

The natural direction still identifies information a developer would need to supply, such as a required related-repository path, an intended artifact location, or the product-specific surface under discussion. Materializing hidden evaluator state does not make that state fair actor input, and scenario wording does not disclose the expected conclusion.

Repository evidence must identify an inspectable source. Supported sources include the developer direction, applicable host instructions, Git state, a path in the evaluation repository, or a path in an explicitly mounted related repository. The model-free preflight creates every repository and rejects missing, mismatched, unsafe, or unsourced evidence before a paid run can begin.

## Repository controls

Actors can edit the ordinary working tree when a scenario authorizes changes. Bubblewrap overlays the repository's `.git` metadata and installed `.agents/skills/moldea` tree as read-only. The runner captures Git metadata, HEAD, refs, staged state, local configuration, and the installed skill before and after every actor.

A case cannot pass when any protected control changes, even if the judge otherwise approves the response. Judges run in separate read-only workspaces. After every success, failure, timeout, or cancellation, the host destroys active relay tunnels, gives the relay five seconds to exit, then kills only that exact child if necessary and waits for it to close.

## Coverage and release identity

The committed [coverage map](https://github.com/moldea-ai/skill/blob/main/fixtures/semantic-evaluation-coverage.json) connects portable skill claims to semantic cases, deterministic suites, or qualification profiles. Every semantic case must appear in that map.

Recorded evidence is bound to the exact portable skill, semantic case suite, coverage map, published CLI identity, protocol, confirmation policy, and actor and judge hosts. A compatible local candidate checkpoints each completed trial. Input changes invalidate reuse. The canonical result exists only after all 48 cases pass initially or satisfy the bounded recovery policy.

Every terminal recorded run is published under `fixtures/semantic-evaluation-results/attempts/` with a derived summary and the exact source checkpoint or result. `latest.json` tracks the newest attempt and the last passing attempt independently. Failed and incomplete history remains public but cannot satisfy the release gate. The canonical result is never assembled or edited by hand.

Every full recording stops at the first failed initial trial. The runner writes the checkpoint, publishes the failure, exits nonzero, and requires a separate decision before any more paid work.

When inspection establishes plausible model variance, a separately authorized `--confirm <case-id> --record` operation runs at most two confirmations. Both must pass. Either confirmation failure is terminal, the second confirmation is skipped when recovery is already impossible, and the original failure is never replaced. A recovered case and all its trials remain visible. Resuming the remaining suite requires another explicit authorization.

After correcting a source, fixture, or evaluator defect, or when a confirmation rejects the candidate, `--record --restart` begins a new full attempt. Restart removes only the ignored local checkpoint and preserves the published attempt history.

An interrupted checkpoint remains resumable locally. `--record-checkpoint` can publish it without a model call, and `npm run eval:semantic:verify` validates every immutable evidence digest, summary, directory identity, and pointer.

## Run the free preflight

Maintainers can verify all scenario contracts without model calls:

```bash
npm run eval:semantic:preflight
```

This command validates the coverage map, materializes all 48 repositories, collects every declared evidence source, verifies protected repository controls, and confirms that every actor prompt is exactly the natural developer direction.

The [semantic evidence page](/evidence/semantic/) presents the latest status, last passing attempt, complete history, provenance, methodology, coverage map, and current case criteria. Actor transcripts, runner-owned commands, and workspace artifacts remain available in each raw committed evidence artifact rather than being indexed as ordinary documentation.

## Relationship to adapter qualification

Semantic evaluation asks whether the portable skill follows its behavioral contract across controlled repository situations. [Adapter qualification](/docs/adapter-qualification/) runs the skill against transparent mock projects and exact published package compositions, with deterministic checks around Repository, Repository FS, Core, CLI, and the selected adapter implementation.

A release needs both forms of evidence. A semantic pass does not prove an adapter package composition, and an adapter qualification does not replace broad skill behavior coverage.
