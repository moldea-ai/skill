---
title: Evaluate, reconcile, and validate
navigationTitle: Evaluate and reconcile
description: Choose the right read-only or write-capable operation for structural validation and semantic alignment.
section: workflows
order: 80
---

# Three operations, three different promises

## Evaluate

Use evaluation when you want a read-only assessment of project, Agent Skill, and agent alignment:

```text
Evaluate the refund agent and do not change repository files.
```

The coding agent runs deterministic inspection first, verifies the machine envelope, then compares relevant canonical state, Agent Skill authoritative source, activation, resources, scripts, host metadata, installed or distributed copies, consumers, implementation, contracts, tests, runtime wiring, adapter evidence, developer intent, and unresolved state.

The report separates deterministic diagnostics, confirmed semantic problems, material ambiguities, relevant unresolved requirements, and evidence limitations. Each material limitation names the unestablished fact and, when knowable, the smallest reliable evidence that would resolve it. The report explicitly states that no repository files changed.

## Reconcile

Use reconciliation when you want confirmed drift corrected:

```text
Reconcile the refund agent with the current implementation.
```

Reconciliation begins with the same evidence model, then completes an intended-state gate before editing. Permission to reconcile does not authorize choosing between unresolved policies. A material conflict is a pre-write stop: no asset type wins automatically, and deterministic checks can expose the conflict but cannot decide whether code, tests, context, or instructions express the intended policy. The coding agent asks one focused question before any correction when reliable evidence has not resolved the alternatives.

The resulting correction is the smallest coherent change across all genuinely affected canonical, Agent Skill source, resource, metadata, copy, consumer, runtime, implementation, schema, test, mirror, and documentation surfaces.

## Validate

Use validation for deterministic structural evidence:

> Validate the `moldea` project.

Validation runs the root-local CLI's structural boundary. A structurally invalid result is a completed diagnostic result, not an operational failure. Validation does not prove that instructions or skills are useful, runtime behavior consumes them, or implementation semantics match them.

## Quick comparison

| Need                                            | Operation | Writes | Semantic assessment |
| ----------------------------------------------- | --------- | ------ | ------------------- |
| Check repository-format structure               | Validate  | No     | No                  |
| Investigate structural and behavioral alignment | Evaluate  | No     | Yes                 |
| Correct established drift                       | Reconcile | Yes    | Yes                 |
