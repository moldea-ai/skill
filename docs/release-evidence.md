---
title: Release evidence
navigationTitle: Release evidence
description: How maintainers select fresh or pinned semantic and qualification evidence for a release.
section: reference
order: 178
---

# Release evidence

Each completed `moldea` Agent Skill release carries one compact `fixtures/release-evidence.json` envelope. Semantic evaluation and adapter qualification are independent sections, and each selects either fresh current evidence or one explicit immutable source. The envelope stores bounded descriptors, digests, and provenance, not transcripts or source documents.

## Record fresh evidence

Fresh evidence is the normal path. Run semantic evaluation, Custom qualification, and every adapter qualification against the exact candidate. After both current-only verifiers pass, record the all-fresh envelope:

```bash
npm run release:evidence:record
```

Recording fails when current evidence is missing, stale, incomplete, failed, over budget, or inconsistent with the portable skill, suite, CLI closure, evaluator, or targets. It never selects a prior run automatically.

## Pin passing evidence

When a maintainer determines that rerunning one evidence domain would not justify its cost, select the domain and one immutable source:

```bash
npm run release:evidence:pin -- --scope semantic --from-commit <full-commit> --reason "Release tooling only; portable behavior is unchanged."
npm run release:evidence:pin -- --scope qualification --from v5.0.0 --reason "Qualification behavior is unchanged."
```

`--scope` accepts `semantic`, `qualification`, or `all`. `--from` resolves an exact stable release tag; `--from-commit` accepts a full commit, including committed prerelease evidence without a tag. The command validates only the selected source section and requires every unselected section to have valid fresh current evidence. A source already pinned to earlier evidence is flattened to its original source.

Pinning is an explicit, repository-bound maintainer risk decision. The reason must identify what changed, name the deterministic candidate checks used instead of a fresh paid run, and avoid claiming that the source models tested new contracts. It accepts at most 1,024 UTF-8 bytes. The complete envelope accepts at most 65,536 bytes. Limit failures report the observed and allowed values.

Public pages present authenticated pinned and fresh evidence through the same replay and project-journey interface. Technical disclosures retain immutable source identity, pin reason, executed package closure where applicable, and current-contract distinction.

Semantic authentication verifies the complete passing case inventory, resource evidence, attempt linkage, immutable artifact digests, and bounded source snapshot used to render local attempt and replay pages. The release envelope keeps only attempt identity, timestamps, status, artifact digest, and result counts.

Qualification authentication derives a content-free projection for every target and hydrates validated build-time project evidence. Each adapter page combines 12 shared Custom journeys with 2 direct journeys; Custom presents 12. There is no separate public qualification-attempt route. Exact closure, attempt identity, and immutable links remain in technical details. No copied ledger, transcript, source document, or parallel provenance store enters the envelope.

A pin bypasses current freshness and identity only for its selected section. It never bypasses source existence, optional tag identity, portable skill identity, descriptor integrity, artifact digests, passing resource state, signed target release, or publication credentials. There is no administrator account, approval service, same-major restriction, hidden carry-forward mode, or local evidence registry.

Immutable semantic sources are authenticated against their committed suite and coverage digests, unique result inventory, resource limits, attempt linkage, and raw evidence hashes. Current evaluator vocabulary does not retroactively invalidate an older passing publication when a scenario field changes. New current evidence still uses the complete current schema.

Clear a prepared pin with:

```bash
npm run release:evidence:pin -- --clear
```

This removes only an envelope containing at least one pinned section. It does not delete semantic or qualification attempt evidence.

## Check the release

```bash
npm run release:check
```

The check is read-only. It validates release identity and dependency closure, then each evidence section independently. A fresh section runs its current-only verifier and requires an exact descriptor match. A pinned section authenticates its immutable source without invoking a model or the current-only verifier for that domain. Public semantic and qualification pages disclose only the provenance relevant to their own evidence.
