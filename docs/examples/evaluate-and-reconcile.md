---
title: Evaluate and reconcile drift
navigationTitle: Evaluate and reconcile
description: A paired example showing read-only evidence first and a later authorized correction of canonical instruction provenance.
section: examples
order: 140
---

# Find drift before deciding how to fix it

## First request: evaluate

**Developer**

```text
Evaluate the support agent's instruction path. Do not change files.
```

**Coding agent**

```text
Evaluation found no structural diagnostics. It confirmed one semantic problem: the runtime uses an independently maintained inline instruction instead of the canonical support-agent instruction. No material ambiguity changes the correction direction. No repository files were changed.
```

### Under the hood

1. The coding agent selects read-only evaluation.
2. It verifies and runs root-local `inspect --json` first.
3. It follows the registered runtime-agent relationship into every material invocation path.
4. It compares canonical instructions, runtime construction, tests, and adapter evidence.
5. It reports the provenance gap separately from deterministic validity and states that no files changed.

## Second request: reconcile

**Developer**

```text
Reconcile that instruction drift.
```

**Coding agent**

```text
I changed the runtime loader to derive the active instruction from the canonical file, removed the superseded inline source, updated focused tests, reran project verification, and confirmed deterministic inspection is valid.
```

### Under the hood

The coding agent begins from the same evidence, verifies that intended behavior is established, and applies the smallest coherent correction across canonical provenance, runtime loading, tests, and any affected relationship or guidance. It does not use reconciliation as permission for unrelated cleanup.
