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

When a maintainer has established that the release cannot affect one evidence domain, select that domain and one exact source:

```bash
npm run release:evidence:pin -- --scope semantic --from-commit <full-commit> --reason "Release tooling only; portable behavior is unchanged."
npm run release:evidence:pin -- --scope qualification --from v5.0.0 --reason "Qualification behavior is unchanged."
```

`--scope` accepts `semantic`, `qualification`, or `all`. `--from` resolves an exact stable release tag. `--from-commit` accepts an exact full commit, including a committed prerelease evidence state that does not yet have a tag. The command validates only the selected source section and requires every unselected section to have valid fresh current evidence. A tagged section that already points to an earlier source is flattened to that original source so reference chains do not accumulate.

The reason accepts up to 1,024 UTF-8 bytes. The complete envelope accepts up to 65,536 bytes. These limits bound one small release manifest and do not limit repository size, evaluation history, or the number of source files a coding agent can inspect on demand. Limit failures report the observed value and applicable limit.

A pin bypasses current freshness and identity checks only for its selected section. It does not bypass source existence, optional tag identity, portable skill identity, descriptor integrity, artifact digests, passing resource state, the signed target release, or publication credentials. There is no administrator account, approval service, same-major restriction, hidden carry-forward mode, or local evidence registry. The selection is committed with the repository.

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
