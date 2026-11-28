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

The report gives the support owner a structure verdict and reconciles the kept, removed and unchecked counts with its declarations when the assessment began. It reports any additions separately.

## Read a paused Fix report

> **You**
>
> Fix moldea.

In a publishing project, the delivery owner starts with three declarations. Its report includes these entries:

- **Checked.** Delivery is cohesive. Of 3 starting declarations, 1 was kept for sponsor disclosure, 1 removed and 1 unchecked.
  - `/website/src/layouts/article.astro` alone enforces the rule that sponsored articles display the sponsor name above the article body.
- **Fixed.**
  - Removed `/docs/release-procedure.md` because it is a human procedure. The delivery owner links to it.
  - Added `/website/astro.config.mjs` after confirming it alone enforces the trailing slash on production edition URLs.
- **Not checked.** `/website/package-lock.json` for the delivery owner. The relationship between the local lockfile and the hosted image encoder could not be established.

The Resume point carries the lockfile, its owner and the evidence gap. A later round uses the current manifest for its new count and keeps the guide removal in Changes so far. See [Check, fix, and validate](/docs/check-fix-validate/) for the full report and continuation procedure.
