---
title: Validate project structure
navigationTitle: Validate structure
description: A deterministic example that distinguishes structural diagnostics from operational failures and semantic readiness.
section: examples
order: 150
---

# Ask for structural evidence only

The requests and reports below illustrate the workflow. They are not recorded coding-agent outcomes.

## Developer and coding agent

**Developer**

> Validate the `moldea` project.

**Coding agent**

```text
I ran the verified repository-local validation boundary. The project is structurally invalid because one registered mirror differs from its canonical instruction. No repository files were changed. This result does not assess broader semantic alignment.
```

## Coding agent and `moldea` under the hood

1. The coding agent selects read-only validation.
2. It checks repository-root-local package identity, containment, and supported installed versions through the installed skill’s closed launcher.
3. It runs the launcher’s bounded `validate` operation. The launcher owns the child-process resource limits and invokes the verified executable directly.
4. It validates the current release’s schema identity, CLI version, command, status, payload, diagnostic totals, and exit-code consistency before reading diagnostics.
5. It treats `status: invalid` as completed deterministic evidence and an operational or resource-limit failure as an incomplete operation.
6. It reports the diagnostic without editing the mirror or claiming semantic alignment.

## Read the result precisely

The CLI reports aggregate totals for the complete validation snapshot, even when diagnostic records continue onto another page. These selected fields illustrate the current result contract; they are not complete JSON responses or recorded model outcomes.

| Situation                                                           | Status and validity                                      | Inspection                      | What it establishes                                                                                                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI tool parameters are replaced after construction              | `status: valid`, `valid: true`, zero errors, one warning | `runtimeInspection: incomplete` | `OPENAI_RUNTIME_RELATIONSHIP_UNVERIFIED` names the `tool-input-schema` relationship and `unsupported-source-pattern` reason. Registration evidence remains, while the obscured schema evidence is not retained. |
| A supported OpenAI request bypasses its declared instruction loader | `status: invalid`, `valid: false`                        | The proven mismatch is an error | `OPENAI_INSTRUCTION_LOADER_NOT_WIRED` identifies the disconnected consumer. Another correctly wired request does not hide it.                                                                                   |
| A declared exact mirror differs from its canonical instruction      | `status: invalid`, `valid: false`                        | The mirror comparison completes | The mirror diagnostic establishes a normalized-text mismatch, independently of broader runtime behavior.                                                                                                        |
| Source inspection exceeds its process resource limit                | Operational failure                                      | Incomplete operation            | No completed validity result is invented. Report the failed operation and remaining scope.                                                                                                                      |

The OpenAI adapter integration fixtures exercise the first two situations. An unverified warning leaves only its named relationship unproved; it is not a confirmed defect. A demonstrated mismatch needs correction. Output pagination bounds returned records, not the memory needed to parse one source file.

To authorize a repair, the developer can later request reconciliation or a focused write-capable correction. A valid result still does not prove semantic alignment or production readiness.
