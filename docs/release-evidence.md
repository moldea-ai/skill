---
title: Release evidence
navigationTitle: Release evidence
description: How maintainers select fresh or pinned semantic and qualification evidence for a release.
section: reference
order: 178
---

# Release evidence

Every completed `moldea` Agent Skill release carries one compact `fixtures/release-evidence.json` envelope. Semantic evaluation and adapter qualification are independent sections. Each section selects either fresh current evidence or one explicit immutable source. The envelope contains compact descriptors, digests, and provenance, not model transcripts or source documents.

## Record fresh evidence

Fresh evidence is the normal path. Run semantic evaluation, Custom qualification, and each adapter qualification against the exact candidate. After both current-only verifiers pass, record an all-fresh envelope:

```bash
npm run release:evidence:record
```

Recording fails when current evidence is missing, stale, incomplete, failed, over budget, or inconsistent with the current portable skill, suite, CLI closure, evaluator, or qualification targets. It does not select evidence from a prior run automatically.

## Pin earlier passing evidence

When a maintainer decides that rerunning one evidence domain would not provide enough additional assurance to justify its cost, select that domain and one exact source:

```bash
npm run release:evidence:pin -- --scope semantic --from-commit <full-commit> --reason "Release tooling only; portable behavior is unchanged."
npm run release:evidence:pin -- --scope qualification --from v5.0.0 --reason "Qualification behavior is unchanged."
```

`--scope` accepts `semantic`, `qualification`, or `all`. `--from` resolves an exact stable release tag. `--from-commit` accepts an exact full commit, including a committed prerelease evidence state that does not yet have a tag. The command validates only the selected source section and requires every unselected section to have valid fresh current evidence. A tagged section that already points to an earlier source is flattened to that original source so reference chains do not accumulate.

Pinning is an explicit repository-bound maintainer risk decision. The reason must identify what changed, name the deterministic candidate checks used instead of a fresh paid run, and avoid claiming that the source models evaluated the new contracts. Public evidence presents an authenticated pinned result through the same replay and project-journey interface as fresh evidence. Source identity, the pin reason, and the separate current-contract state remain available in technical disclosures rather than interrupting the primary evidence story.

For semantic pins, the source authenticator validates the complete passing case inventory, resource evidence, attempt linkage, and immutable artifact digests. Website generation then reads the bounded authenticated source snapshot and renders local attempt and replay pages from those validated artifacts. The release envelope itself remains a compact projection containing only attempt identity, timestamps, status, artifact digest, and result counts.

For qualification pins, the bounded authenticated source traversal derives a content-free projection for every target and hydrates the validated project evidence needed at build time. Each adapter profile becomes the canonical combined result: 12 shared Custom journeys plus 2 adapter-specific journeys, or the 12 Custom journeys for the Custom profile. There is no separate public qualification-attempt route. Attempt identity, exact package closure, and immutable source links remain in the profile's technical details. No copied evidence ledger, transcript, source document, or parallel provenance store is added to the release envelope.

The reason accepts up to 1,024 UTF-8 bytes. The complete envelope accepts up to 65,536 bytes. These limits bound one small release manifest and do not limit repository size, evaluation history, or the number of source files a coding agent can inspect on demand. Limit failures report the observed value and applicable limit.

A pin bypasses current freshness and identity checks only for its selected section. It does not bypass source existence, optional tag identity, portable skill identity, descriptor integrity, artifact digests, passing resource state, the signed target release, or publication credentials. There is no administrator account, approval service, same-major restriction, hidden carry-forward mode, or local evidence registry. The selection is committed with the repository.

Immutable semantic sources are authenticated from their committed suite and coverage digests, complete unique result inventory, resource limits, attempt linkage, and raw evidence hashes. They are not revalidated through the current evaluator vocabulary, so removing or renaming a current scenario field cannot retroactively invalidate a passing published source. Current evidence creation still uses the complete current schema.

Clear a prepared pin with:

```bash
npm run release:evidence:pin -- --clear
```

The command removes only an envelope containing at least one pinned section. It does not delete semantic or qualification attempt evidence.

## Check the release

```bash
npm run release:check
```

The check is read-only. It validates the release identity and dependency closure, then validates each evidence section independently. A fresh section runs its current-only verifier and requires an exact descriptor match. A pinned section validates its immutable source without invoking a model or the current-only verifier for that domain. Public semantic and qualification pages disclose only the provenance relevant to their own evidence.
