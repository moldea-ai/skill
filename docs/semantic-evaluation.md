---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: Understand how the release gate proves portable skill behavior through natural requests, sourced scenarios, independent judgment, and protected repositories.
section: reference
order: 172
---

# Semantic evaluation

Semantic evaluation tests whether the portable `moldea` skill behaves correctly in difficult repository situations. It complements deterministic conformance and adapter qualification. It does not replace either one.

The current suite contains 48 scenarios. Each scenario uses one actor call and one independent judge call, for up to 96 model calls in a complete run. Both processes use `gpt-5.6-terra` at `medium` reasoning effort and have a five-minute per-call timeout by default.

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

Recorded evidence is bound to the exact portable skill, semantic case suite, coverage map, published CLI identity, protocol, and actor and judge hosts. A compatible local candidate checkpoints each completed case. Input changes invalidate reuse. The committed result is replaced only after all 48 cases pass.

Failures remain in the local checkpoint for inspection and correction. The official result is never assembled or edited by hand.

For a bounded full recording, `--stop-on-failure` writes the first failed case to the checkpoint, stops before another case begins, and exits nonzero. It requires `--record`, cannot be combined with `--case` or `--preflight`, and does not authorize a later resume.

## Run the free preflight

Maintainers can verify all scenario contracts without model calls:

```bash
npm run eval:semantic:preflight
```

This command validates the coverage map, materializes all 48 repositories, collects every declared evidence source, verifies protected repository controls, and confirms that every actor prompt is exactly the natural developer direction.

The [semantic evidence page](/evidence/semantic/) presents the current passing result, provenance, methodology, coverage map, and case criteria. Actor transcripts and workspace artifacts remain available in the raw committed result rather than being indexed as ordinary documentation.

## Relationship to adapter qualification

Semantic evaluation asks whether the portable skill follows its behavioral contract across controlled repository situations. [Adapter qualification](/docs/adapter-qualification/) runs the skill against transparent mock projects and exact published package compositions, with deterministic checks around Repository, Repository FS, Core, CLI, and the selected adapter implementation.

A release needs both forms of evidence. A semantic pass does not prove an adapter package composition, and an adapter qualification does not replace broad skill behavior coverage.
