---
title: Evaluate, reconcile, and validate
navigationTitle: Evaluate and reconcile
description: Choose the right read-only or write-capable operation for structural validation and semantic alignment.
section: workflows
order: 80
---

# Three operations, three different promises

## Evaluate

Use evaluation when you want a read-only assessment of project and agent alignment:

```text
Evaluate the refund agent and do not change repository files.
```

The coding agent runs deterministic inspection first, verifies the machine envelope, then compares relevant canonical state, implementation, contracts, tests, runtime wiring, adapter evidence, developer intent, and unresolved state.

The report separates deterministic diagnostics, confirmed semantic problems, material ambiguities, relevant unresolved requirements, and evidence limitations. It explicitly states that no repository files changed.

## Reconcile

Use reconciliation when you want confirmed drift corrected:

```text
Reconcile the refund agent with the current implementation.
```

Reconciliation begins with the same evidence model, then establishes intended state. If multiple plausible directions would materially change behavior, the coding agent asks one focused question before writing.

The resulting correction is the smallest coherent change across all genuinely affected canonical, runtime, implementation, schema, test, mirror, and documentation surfaces.

## Validate

Use validation for deterministic structural evidence:

> Validate the `moldea` project.

Validation runs the root-local CLI's structural boundary. A structurally invalid result is a completed diagnostic result, not an operational failure. Validation does not prove that instructions are useful, runtime behavior consumes them, or implementation semantics match them.

## Quick comparison

| Need                                            | Operation | Writes | Semantic assessment |
| ----------------------------------------------- | --------- | ------ | ------------------- |
| Check repository-format structure               | Validate  | No     | No                  |
| Investigate structural and behavioral alignment | Evaluate  | No     | Yes                 |
| Correct established drift                       | Reconcile | Yes    | Yes                 |
