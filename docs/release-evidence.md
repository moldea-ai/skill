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

Pinning is an explicit repository-bound maintainer risk decision. The reason must identify what changed, name the deterministic candidate checks used instead of a fresh paid run, and avoid claiming that the source models evaluated the new contracts. Public evidence counts an authenticated pinned attempt as verified release evidence and links to its immutable source. Current-contract assurance remains a separate fact and stays pending until matching evidence exists, but that pending state does not erase the retained attempt or turn it into a no-attempt result.

For semantic pins, the source authenticator validates the complete passing case inventory, resource evidence, attempt linkage, and immutable artifact digests before returning one bounded public projection. That projection contains only the attempt identity, timestamps, status, artifact digest, and passed, recovered, failed, pending, and total counts. It does not contain case bodies, model transcripts, or source documents.

For qualification pins, the existing bounded authenticated source traversal also derives a content-free public projection for every target: source attempt ID, start and completion times, and the exact package names and versions that ran. The website joins that projection to the current profile inputs and labels it as verified source evidence. No copied evidence ledger, transcript, source document, or parallel provenance store is added to the release envelope.

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
