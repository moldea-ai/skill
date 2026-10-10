---
title: Limitations and how they’re handled
navigationTitle: Limitations
description: Understand incomplete checks, large inputs, custom code, repair boundaries, and what to do next.
section: concepts
order: 32
---

# Limitations and how they’re handled

`moldea` reports what it can establish from the available project evidence. Start with the result, then check any remaining warnings or unfinished work.

## Read the result

| Result         | What it means                                                                              | Next step                                                                     |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Completed**  | The operation finished. It can still contain errors or unverified relationships.           | Read validity, diagnostic totals, and runtime inspection separately.          |
| **Error**      | A check established a broken rule or relationship.                                         | Correct the identified problem using intended project behavior.               |
| **Unverified** | An applicable relationship could not be proved. It is a warning, not proof of faulty code. | Inspect the named relationship and its available evidence.                    |
| **Unfinished** | A limit, cancellation, or operational failure prevented a conclusion.                      | Preserve work and resolve the reported obstacle before relying on that check. |

`valid: true` means **zero errors**. Runtime inspection can still be `incomplete` or `not-run`. Unresolved requirements describe missing project decisions separately. None of these fields certifies business readiness or production correctness.

## Common situations

| What happened                                  | How it is handled                                                                       | Next step                                                                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Custom wiring is correct but unverified        | Static adapters recognize supported source patterns, not every possible implementation. | Review the relationship. Keep healthy custom code; a warning alone does not justify rewriting it.                               |
| A changed file received no maintenance         | Ordinary work uses declared relationships; the host must also select the skill.         | Check the relevant owner’s declarations and [host activation](/docs/how-it-works/#activation).                                  |
| A file or traversal exceeds a budget           | The operation refuses explicitly instead of returning a fabricated clean result.        | Ask the coding agent to identify the named limit and required scope using the [resource references](#large-projects-and-files). |
| Analysis runs out of memory or time            | Fixed worker safeguards end the attempt without declaring the project invalid.          | Review the input shape and failure evidence. Do not repeatedly retry unchanged input or split healthy source automatically.     |
| Capacity is busy                               | Another inspection holds the same installed Core owner.                                 | Let that inspection finish, then retry.                                                                                         |
| Work is cancelled or the worker fails          | No successful inspection is inferred.                                                   | Resume deliberately after cancellation; investigate a process failure before retrying.                                          |
| Files change during inspection or continuation | Snapshot checks refuse to combine incompatible states.                                  | Finish the edits and begin a fresh inspection; discard the old cursor.                                                          |
| A complete record cannot fit an output page    | Records remain whole; output pagination can refuse.                                     | Let the coding agent assess the page budget within the invocation’s allowed bounds.                                             |

See [deterministic examples](https://packages.moldea.ai/capabilities/) and the [inspection contracts](https://packages.moldea.ai/packages/core/repository-inspection/) for concrete results.

## Large projects and files

The current Core 6 and CLI 10 defaults allow **8 MiB per file read**, **2 MiB for the manifest**, **100,000 entries**, and **128 MiB of source reads per operation**. These measure different things. An entry can be a directory or a requested path; this is not a universal file-count limit. A large file’s presence alone does not mean an adapter reads it.

| Boundary                   | What to know                                                                                                                                                           | Numeric authority                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Input and prepared results | File, manifest, entry, total-read, diagnostic, evidence, and logical retained-byte budgets are independent.                                                            | [Core limits](https://packages.moldea.ai/packages/core/repository-inspection/#resource-limits)              |
| CLI output                 | Metadata pages and canonical text chunks bound responses. They do not reset traversal budgets or make full source parsing unlimited.                                   | [CLI budgets](https://packages.moldea.ai/packages/cli/output-and-operations/#resource-budgets)              |
| Isolated analysis          | Fixed heap settings and a 120-second lifetime contain analysis. Logical accounting is not total process RAM. An allowed 8 MiB source can still exceed worker capacity. | [Worker controls](https://packages.moldea.ai/packages/core/repository-inspection/#isolated-node-inspection) |
| Filesystem reader          | Scan, page, range-read, cache, active-operation, and queue ceilings have separate scopes. The CLI supplies its own reader limits.                                      | [Reader limits](https://packages.moldea.ai/packages/repository-fs/security-and-limits/#resource-limits)     |

Users do not need to configure packages for ordinary work. Ask the coding agent to explain the exact refusal and smallest useful next action. Raising a configurable input budget does not raise the fixed analysis profile or guarantee success on every device.

## Judgment and repair

Static checks establish structure and supported relationships. Meaning, policy, and arbitrary application behavior require the coding agent’s assessment and relevant tests.

`Fix moldea` uses established intended behavior, respects host permissions, and reports checks it could not complete. It cannot invent missing policy, guarantee every repair, or silently initialize an unrelated project. Its validated CLI recovery target belongs to the installed skill; healthy newer compatible tooling is preserved. See [repair](/docs/evaluate-reconcile-validate/#repair-a-project) and [local tooling](/docs/compatibility-and-local-tooling/).

## Compatibility and evidence

A supported package range establishes eligibility. A recognized source pattern establishes what static inspection can check. Qualification covers **exact tested versions and projects**. These are separate claims; consult the [runtime catalog](https://packages.moldea.ai/compatibility/) and [published evidence](/evidence/).

Release-evaluation command, token, and output profiles constrain assurance trials. They are not universal limits on users’ repositories or coding-agent sessions. See [resource profiles](/docs/compatibility-and-local-tooling/#resource-profiles).

## Trust and privacy

Local deterministic checks call no model or provider and require no Moldea Cloud account. The skill itself does not upload repository content to Moldea Cloud. Your coding-agent host’s provider, permissions, and privacy settings still apply.

The CLI selects Git paths; a raw filesystem reader can expose ignored files and dependencies. Path/link checks require a tree trusted against hostile concurrent replacement. Unsupported Git content transforms are refused, and continuation stays within one snapshot. Use the [reader trust contract](https://packages.moldea.ai/packages/repository-fs/security-and-limits/), [snapshot contract](https://packages.moldea.ai/packages/repository/reader-contract/#snapshot-consistency), and [privacy guide](/docs/safety-and-privacy/) before choosing another data source.
