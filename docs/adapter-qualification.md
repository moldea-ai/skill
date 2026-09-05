---
title: Adapter qualification
navigationTitle: Adapter qualification
description: How current adapter implementations are tested against the portable skill and exact published package closure.
section: reference
order: 175
---

# Adapter qualification

Adapter qualification determines whether one exact published adapter implementation is ready for Supported maturity. It tests the current `moldea` skill and current package closure against realistic repositories without invoking a provider API or running an agent.

## Evidence ownership

Universal portable-skill behavior is qualified once through the Custom profile. Its 12 cases cover evaluation, initialization, creation, maintenance, reconciliation, retirement, ambiguity handling, resistance to untrusted repository instructions, informational use before adoption, abstention before and after adoption, and declared-relationship activation.

Each published adapter profile owns only its adapter-specific probes and repair cases. This keeps provider and runtime boundaries visible without multiplying the universal suite across every target.

The profile index contains 14 current targets: Custom plus 13 published adapter implementations.

## What one case exercises

Each case combines:

1. a transparent seed repository and natural developer task
2. the exact registry-verified CLI and adapter package closure
3. deterministic pre-actor validation
4. an isolated actor using the installed portable skill
5. deterministic post-actor validation and workspace assertions
6. an independent judge for semantic requirements
7. resource, privacy, repository-control, and package-provenance evidence

The actor never receives grading criteria. The judge cannot replace deterministic package, schema, filesystem, or resource evidence with prose.

## Resource limits

Each actor or judge stage records:

- completed tool-command count
- recognized `moldea` invocation count
- `moldea` command-output bytes
- total model-visible tool-output bytes
- input, cached-input, and output token counts when the host reports them
- stage duration

The stage ceilings are 32 `moldea` invocations, 8 MiB of `moldea` output, and 16 MiB of total model-visible tool output. They are deliberately higher than the ordinary skill targets so large repositories can be handled through bounded pagination. Crossing a ceiling is an explicit stage failure with the measured value and limit.

Each completed actor or judge stage also permits at most 1,048,576 cumulative input-plus-output tokens. This ceiling contains a complete tool-using Codex stage rather than one internal model turn, and it is not a consumption target. Before the first uncached model call, the CLI reports the planned stages, the maximum stages including one operational retry per stage, the per-stage token ceiling, and the corresponding aggregate maximum. Cached input remains visible in evidence but is not added to input a second time.

The ceilings are imported from the same source-controlled profile used by semantic evaluation and host execution. Deterministic boundary tests prove explicit failure above each containment ceiling, while the calibration corpus establishes normal and intentional large-traversal consumption without treating those host ceilings as targets.

Qualification results retain these numeric aggregates but never raw command text, raw command output, credentials, hidden reasoning, or arbitrary workspace content.

## Fresh evidence by default

Qualification protocol 7 accepts only evidence matching the current:

- portable skill bytes
- CLI and package closure
- qualification runner and host
- profile, probes, and selected cases
- target identity
- execution environment
- Custom baseline relationship

Every current target must have a fresh passing attempt for its exact current inputs.

This is the normal release path. An explicit release evidence pin may reuse the original passing qualification evidence from an earlier immutable release when a maintainer has established that the new release does not affect evaluated behavior. The pin is disclosed publicly and does not relabel the source attempt as current. See [Release evidence](/docs/release-evidence/).

An adapter attempt requires a passing current Custom baseline. A Custom attempt does not require another baseline.

## Results and replay

Current results use the target keys declared in `qualification/profiles/index.yaml`. Each target has an append-only current attempt directory and a `latest.json` pointer. Artifact manifests bind every recorded file by SHA-256.

The website validates these current artifacts before rendering evidence pages. Replays are bounded reconstructions from validated outputs and projected execution facts, not terminal transcripts.

## When qualification must run again

| Changed input                                                                | Required fresh evidence                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| Portable skill, semantic activation contract, or CLI closure                 | Semantic evaluation, Custom, and every adapter        |
| Shared qualification runner, host, universal cases, or execution environment | Custom and every adapter                              |
| One adapter package, profile, probes, or adapter case                        | That adapter after the current Custom baseline passes |
| New adapter target                                                           | Its complete profile and fresh run after Custom       |
| Documentation-only wording outside behavior and evidence identity            | No model rerun unless an owned digest changes         |

## Commands

Run free deterministic validation first:

```bash
npm run qualification:dry-run
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
```

Machine-readable run output is intentionally compact: it reports terminal case states, counts, and the checkpoint directory. Complete evidence stays in attempt storage and is loaded only when a human or tool explicitly inspects it.

Run the Custom profile before adapters:

```bash
npm run qualification -- run --adapter custom --implementation custom
```

Then run each adapter and verify all committed current evidence:

```bash
npm run qualification -- verify
```

See the [qualification source](https://github.com/moldea-ai/skill/tree/main/qualification) for profiles, probes, scenarios, and the complete local operator workflow.
