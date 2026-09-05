---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: How the current portable skill is tested for relevance, bounded evidence use, read-only behavior, and concise reporting.
section: reference
order: 172
---

# Semantic evaluation

Deterministic tests can prove schemas, files, commands, and byte limits. Semantic evaluation tests whether a coding agent applies those contracts correctly inside realistic repository tasks.

The current suite contains 18 cases. It is intentionally small enough to audit and broad enough to protect the behavior that caused the clean-slate redesign.

## What the suite proves

The cases cover:

- silent abstention for unrelated documentation and source reviews
- silent abstention for README changes outside the managed block
- host planning and review command precedence
- no activation from generic durable-knowledge language
- direct activation for canonical files and the managed README block
- bounded relationship activation for exact bindings and `affectedBy` paths
- explicit `moldea` validation
- valid zero-agent projects
- large canonical inventories without full-content inspection
- read-only evaluation across repository and Git control state

Each case defines a natural developer request, sourced repository facts, expected behavior, prohibited behavior, and a resource budget. The actor receives the request and the portable skill. It does not receive the answer criteria.

A separate judge receives the declared criteria plus runner-owned evidence. No actor response can manufacture command evidence, repository state, or byte counts.

## Resource evidence

For every completed actor command, the runner observes the command and output in memory, projects only safe facts, and discards raw command text and output bodies.

The committed result records:

- number and order of recognized `moldea` operations
- emitted `moldea` bytes
- maximum bytes emitted by one recognized invocation
- total model-visible tool-output bytes
- whether a non-content command attempted to return canonical content

Abstention cases require zero recognized `moldea` commands and zero `moldea` bytes. Ordinary activation cases allow at most four recognized commands and 262,144 bytes. The dedicated large-context case allows at most 16 commands and 1 MiB while still requiring paginated, purpose-bounded traversal.

The command and byte budgets are owned by `tooling/resource-calibration/profiles.mjs` and backed by `fixtures/resource-calibration.json`. The corpus records three-sample distributions for ordinary, 1,024-path, large-Unicode, diagnostic-heavy, and adversarial inputs, with at least 25 percent cumulative headroom for non-attack cases.

Recognized machine commands must invoke the repository-local CLI directly with `--json --max-output-bytes 65536`. Unbounded, indirect, or output-filtered forms do not count as valid proof.

## Repository controls

The actor works in an isolated writable repository. The installed skill, Git control state, and evaluator-owned boundaries are read-only. The runner captures pre- and post-execution evidence for:

- ordinary repository files
- the Git index and refs
- repository and Git configuration
- submodule control state
- the installed portable skill
- any declared related repository mount

The read-only case fails if evaluation changes any protected or ordinary repository state, even when the actor's final message claims otherwise.

## Current-only evidence

Semantic protocol 22 accepts only evidence produced by the current suite, current portable bytes, current CLI closure, current runner, current coverage map, and current host contract.

Evidence applies only to the exact current behavior-bearing inputs. Any change to those inputs requires a fresh run.

Attempt storage remains append-only during one current release cycle. Failed initial trials remain visible, and a failed case can recover only after two passing confirmations. Operational host retries do not consume semantic trials.

## Run the free preflight

```bash
npm run eval:semantic:preflight
```

Preflight validates all case definitions, source evidence, portable skill structure, CLI identity, resource budgets, and repository setup without making a model call.

## Record and verify

```bash
npm run eval:semantic -- --record
npm run eval:semantic:verify
```

Recording writes the current result and its attempt artifacts. Verification recalculates every digest and rejects missing, stale, incomplete, over-budget, or mutated evidence.

## Relationship to adapter qualification

Semantic evaluation owns universal skill behavior and runs once. Adapter qualification owns current adapter-specific compatibility and repair behavior.

The Custom qualification profile contains the universal qualification journeys. Every published adapter profile contains only its adapter-specific cases. This separation prevents the same universal work from being multiplied across all adapter targets.
