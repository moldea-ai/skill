---
title: Evaluate and reconcile drift
navigationTitle: Evaluate and reconcile
description: A paired example showing read-only evidence first and a later authorized correction of canonical instruction provenance.
section: examples
order: 140
---

# Find drift before deciding how to fix it

The requests and reports below illustrate the workflow. They are not recorded coding-agent outcomes.

## First request: evaluate

**Developer**

```text
Evaluate the support agent's instruction path. Do not change files.
```

**Coding agent**

```text
For this supported OpenAI source pattern, validation reported OPENAI_INSTRUCTION_LOADER_NOT_WIRED: a runtime request bypasses its declared canonical instruction loader. Evaluation also compared the active instruction with the approved support policy. No material ambiguity changes the correction direction. No repository files were changed.
```

### Under the hood

1. The coding agent selects read-only evaluation.
2. It confirms adoption and requests the named agent's canonical content through the installed skill's bounded launcher. Metadata inspection is added only when necessary.
3. It follows the registered runtime-agent relationship into every material invocation path.
4. It compares canonical instructions, runtime construction, tests, and adapter evidence.
5. It reports the proven source relationship error separately from semantic findings and states that no files changed. If a custom source pattern cannot be proved, it reports the specific unverified warning instead of assuming the same defect.

## Second request: reconcile

**Developer**

```text
Reconcile that instruction drift.
```

**Coding agent**

```text
I changed the runtime loader to derive the active instruction from the canonical file, removed the superseded inline source, updated focused tests, and ran project verification followed by final structural validation.
```

### Under the hood

The coding agent begins from the same evidence, verifies that intended behavior is established, and applies the smallest coherent correction across canonical provenance, runtime loading, tests, and any affected relationship or guidance. It does not use reconciliation as permission for unrelated cleanup.
