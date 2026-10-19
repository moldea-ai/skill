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

> **You**
>
> Validate the moldea project.

> **Coding agent**
>
> I ran the verified repository-local validation boundary. The project is structurally invalid because one registered mirror differs from its canonical instruction. No repository files were changed. This result does not assess broader semantic alignment.

### Compared content in this illustration

| Source                                             | Instruction excerpt                               |
| -------------------------------------------------- | ------------------------------------------------- |
| `moldea/agents/support/instruction.md` (canonical) | Explain that returns are accepted within 30 days. |
| `instructions/support.md` (declared mirror)        | Explain that returns are accepted within 60 days. |

The mirror must match the canonical instruction after text normalization. These excerpts differ, so validation reports the mismatch without choosing a business policy or editing either file.

## Coding agent and `moldea` under the hood

1. The coding agent selects read-only validation.
2. It checks repository-root-local package identity, containment, and supported installed versions through the installed skill’s closed launcher.
3. It runs the launcher’s bounded `validate` operation. The launcher owns the child-process resource limits and invokes the verified executable directly.
4. It validates the current release’s schema identity, CLI version, command, status, payload, diagnostic totals, and exit-code consistency before reading diagnostics.
5. It treats `status: invalid` as completed deterministic evidence and an operational or resource-limit failure as an incomplete operation.
6. It reports the diagnostic without editing the mirror or claiming semantic alignment.

## Read the result precisely

The CLI reports aggregate totals for the complete validation snapshot, even when diagnostic records continue onto another page. These selected fields illustrate the current result contract; they are not complete JSON responses or recorded model outcomes.

| Situation                                                                                  | Status and validity                        | What it establishes                                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| A declared runtime export is absent from a complete TypeScript or JavaScript ESM inventory | `status: invalid`, `valid: false`          | `MOLDEA_REFERENCE_EXPORT_MISSING` and failed coverage establish the missing export only.                                         |
| A binding points to CommonJS or an inconclusive export inventory                           | `status: valid` when no other error exists | Not-checked coverage identifies the unsupported or unresolved export check. It does not claim missing exports or runtime wiring. |
| A declared exact mirror differs from its canonical instruction                             | `status: invalid`, `valid: false`          | The mirror diagnostic establishes a normalized-text mismatch.                                                                    |
| AGENTS.md has no managed block                                                             | `status: valid` when no other error exists | `MOLDEA_INTEGRATION_BLOCK_MISSING` identifies the integration warning separately from canonical validity.                        |
| `.claude/CLAUDE.md` is the only Claude Code file and does not import AGENTS.md             | `status: valid` when no other error exists | `MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING` names `/.claude/CLAUDE.md`, the file that needs `@../AGENTS.md`.                      |
| AGENTS.md is a broken symbolic link                                                        | `status: valid` when no other error exists | `MOLDEA_INTEGRATION_UNVERIFIED` reports that the integration cannot be verified, without the link text or target.                |
| A supported warning has an exact manifest acceptance                                       | Errors still determine validity            | The warning remains with its developer-supplied reason, and `acceptedWarningCount` increases while `warningCount` excludes it.   |
| Source inspection exceeds its process resource limit                                       | Operational failure                        | No completed validity or partial coverage result is returned.                                                                    |

Coverage names each file or export check performed. It never establishes runtime consumption, registration, or SDK compatibility. Output pagination bounds returned records rather than source parsing.

Ask the coding agent to fix a warning, or explicitly accept a supported warning with your own reason. The agent never chooses acceptance. If AGENTS.md is protected, repair renders the installed block with `managed-agents.mjs --print` and hands it off for a separate instruction update. Acceptance is offered for an integration warning only when its file is shared and tracked by Git; accepting a warning about `CLAUDE.local.md` or an ignored file would report `MOLDEA_ACCEPTANCE_UNMATCHED` on every other checkout. Remove an obsolete acceptance after fixing its cause, then validate again.

To authorize a repair, the developer can later request reconciliation or a focused write-capable correction. A valid result still does not prove semantic alignment or production readiness.
