---
title: Check and fix drift
navigationTitle: Check and fix
description: Check canonical instruction provenance, then authorize a focused correction.
section: examples
order: 140
---

# Find drift, then authorize the fix

## Check the support agent

> **You**
>
> Check whether the support model uses its canonical instructions. Leave files as they are.

The coding agent compares `moldea/agents/support/instruction.md` with the support request path. The binding identifies a real file, but the outgoing call still contains a separately written instruction. The report names the drift and confirms that files were left untouched.

## Fix the established mismatch

> **You**
>
> Fix the support workflow so the canonical instruction governs every model call.

With that authority, the coding agent connects the real loader, removes independent duplicate instructions and runs the existing support connection test. It validates after the last write and reports the observed file/export checks separately from runtime consumption. If the canonical and inline instructions disagree on who can authorize a refund and the request does not resolve it, the agent asks which rule governs before editing.

See [Check, fix, and validate](/docs/check-fix-validate/) for the whole-project procedure.
