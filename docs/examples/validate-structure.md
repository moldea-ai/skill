---
title: Validate project structure
navigationTitle: Validate structure
description: A deterministic example that distinguishes structural diagnostics from operational failures and semantic readiness.
section: examples
order: 150
---

# Ask for structural evidence only

## Developer and coding agent

**Developer**

> Validate the `moldea` project.

**Coding agent**

```text
I ran the verified repository-local validation boundary. The project is structurally invalid because one registered mirror differs from its canonical instruction. No repository files were changed. This result does not assess broader semantic alignment.
```

## Coding agent and `moldea` under the hood

1. The coding agent selects read-only validation.
2. It checks package-manager identity, exact CLI dependency, installed package, executable provider, and supported version.
3. It invokes the verified local executable with `validate --json`.
4. It validates schema version, CLI version, command, status, payload, and exit-code consistency before reading diagnostics.
5. It treats `status: invalid` as completed deterministic evidence and `status: error` as an operational failure.
6. It reports the diagnostic without editing the mirror or claiming semantic alignment.

To authorize a repair, the developer can later request reconciliation or a focused write-capable correction.
