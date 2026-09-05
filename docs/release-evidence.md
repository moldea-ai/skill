---
title: Release evidence
navigationTitle: Release evidence
description: How maintainers record fresh release evidence or explicitly pin a release to an earlier passing source.
section: reference
order: 178
---

# Release evidence

Every completed `moldea` Agent Skill release carries one compact `fixtures/release-evidence.json` envelope. The envelope identifies the release and selects either fresh evidence or an explicit pin. It contains digests and provenance, not model transcripts, source documents, or copied result payloads.

## Record fresh evidence

Fresh evidence is the normal path. Run the semantic evaluation, Custom qualification, and each adapter qualification against the exact candidate. After their current-only verifiers pass, record the envelope:

```bash
npm run release:evidence:record
```

Recording fails when current evidence is missing, stale, incomplete, failed, over budget, or inconsistent with the current portable skill, suite, CLI closure, evaluator, or qualification targets. It does not select evidence from a prior run automatically.

## Pin an earlier passing release

When a maintainer has established that the release cannot affect evaluated behavior, use one local command:

```bash
npm run release:evidence:pin -- --from v5.0.0 --reason "Release tooling only; portable behavior is unchanged."
```

The source may be from an earlier major and has no age limit, but it must carry the stable release evidence envelope. The command resolves the exact tag to its commit, validates the original fresh envelope, checks its portable skill and dependency identities, verifies referenced semantic and qualification artifacts, confirms passing resource states, and records only compact provenance. Pinning a release that is already pinned resolves to its original fresh source so reference chains do not accumulate.

The reason accepts up to 1,024 UTF-8 bytes. The complete envelope accepts up to 65,536 bytes. These limits bound one small release manifest and do not limit repository size, evaluation history, or the number of source files a coding agent can inspect on demand. Limit failures report the observed value and applicable limit.

A pin deliberately bypasses current evidence freshness, current suite identity, current CLI closure, and current qualification target identity. It does not bypass source existence, source tag and commit identity, envelope integrity, artifact digests, passing resource state, the signed target release, or the credentials required to publish it. There is no separate administrator account, approval service, same-major restriction, or hidden carry-forward mode.

Clear a prepared pin with:

```bash
npm run release:evidence:pin -- --clear
```

The command removes only a pinned envelope. It will not erase fresh evidence selection.

## Check the release

```bash
npm run release:check
```

The check is read-only. It validates release identity, reads the selected mode, and then follows only that mode. Fresh mode runs current-only semantic and qualification verification and requires an exact envelope match. Pinned mode validates the immutable original source without invoking current-only verifiers or a model. Public evidence pages state `Evidence pinned from v<version>` and show the reason instead of presenting the evidence as fresh.
