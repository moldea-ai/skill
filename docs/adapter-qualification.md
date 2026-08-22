---
title: Adapter qualification
navigationTitle: Adapter qualification
description: Understand the transparent support gate that exercises exact adapter implementations through realistic projects, deterministic checks, and independent semantic judgment.
section: reference
order: 175
---

# Adapter qualification

Adapter qualification is the evidence gate for moving one exact adapter implementation toward Supported maturity. It tests whether the current `moldea` skill and exact local package artifacts can understand and safely maintain realistic projects. It does not invoke the provider, run the agent, or replace provider integration tests.

Every profile, project, requirement, attempt, failure, and artifact is stored in this repository. The [qualification evidence index](/qualification/) presents that committed state without requiring a hosted service.

## What the gate exercises

Every case uses the same production composition developers rely on:

1. Repository FS reads the real Git working tree.
2. An independent Repository memory reconstruction must produce equivalent evidence.
3. Core validates and inspects Repository format state.
4. The exact packed CLI runs `compatibility`, `validate`, and `inspect` from the project-local dependency.
5. The selected adapter contributes its normal static evidence.
6. The project typechecks, and read-only inspection must leave it unchanged.

The portable skill is installed at `.agents/skills/moldea`, its real discovery location. Candidate packages are built and packed from the selected local packages checkout, then installed with lifecycle scripts disabled and exact checksums recorded.

## Three evidence layers

Matrix probes map every behavior-affecting compatibility claim to one or more project cases. A missing claim, an unknown claim, or an uncovered case fails before model execution.

Deterministic verification runs before and after the actor. It checks package provenance, repository-reader equivalence, Core and CLI behavior, project validity, typechecking, dependency integrity, and workspace preservation.

Semantic evaluation uses separate actor and judge processes with a fixed balanced-tier model at `medium` reasoning effort (`gpt-5.6-terra`). The actor receives a natural project task, not the grading criteria. The judge receives a read-only copy of the final workspace and the explicit case requirements.

A case passes only when its deterministic checks, workspace assertions, and semantic judgment all pass. No layer can override a failure in another layer.

## Why the projects are demanding

The universal catalog currently includes three distinct journeys:

- Evaluate an aligned project and avoid unnecessary edits.
- Maintain a dirty project while preserving unrelated tracked and untracked work byte-for-byte.
- Reconcile implementation drift without fabricating a relationship that static evidence cannot prove.

Three is not a permanent limit. A profile must add a project when an adapter introduces a materially different binding, package, provider, limitation, or source-analysis risk that the universal journeys do not cover.

Each project commits its scenario, natural task, baseline, optional dirty overlay, expected model-free outcome, workspace assertions, and judge requirements. Anyone can inspect those inputs before reading an outcome.

## Attempts and status

Terminal paid attempts are recorded whether they pass, fail, or stop with an execution error. An interrupted attempt remains local and resumable unless the operator explicitly records it as incomplete.

Each profile distinguishes:

- Latest status, which always reports the newest recorded attempt.
- Last passing attempt, which preserves the newest successful baseline even when a later attempt fails.
- Complete history, which links every immutable attempt and raw committed artifact.

Failures remain first-class evidence. Attempt pages show source cleanliness, host identity, exact package checksums, stage outcomes, deterministic results, workspace assertions, semantic judgment, cache provenance, token usage when available, and actionable failures.

## Checkpoints and cache integrity

Local checkpoints are written atomically after each meaningful stage. Resume requires the exact skill, qualification engine, profile, packages checkout, candidate closure, model configuration, host boundary, and tool versions that created the attempt.

Candidate and model caches are separate. A cache hit must validate its complete identity and artifact digests, restore the actor workspace exactly, and continue through deterministic checks and result verification. Dry runs never use model caches and never publish results.

## Supported maturity eligibility

Qualification is necessary evidence for Supported maturity, not an automatic promotion. The Custom profile must pass as the universal baseline, and the selected adapter implementation must pass its complete current profile. The profile must cover every applicable compatibility claim and every distinct adapter risk.

Maturity itself is recorded only as context. Promoting an adapter from Experimental to Supported does not invalidate otherwise exact passing evidence.

Review the [complete profile and attempt index](/qualification/) or inspect the [qualification source](https://github.com/moldea-ai/skill/tree/main/qualification) directly.
