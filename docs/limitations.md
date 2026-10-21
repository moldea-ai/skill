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

| Result          | What it means                                                                                          | Next step                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Completed**   | The operation finished. It can still contain errors, warnings, or not-checked bindings.                | Read validity, diagnostic totals, and binding coverage separately.            |
| **Error**       | A check established a broken rule or relationship.                                                     | Correct the identified problem using intended project behavior.               |
| **Not checked** | A declared file or export check was unsupported or inconclusive. This alone is not a warning or error. | Inspect the named check and establish any required behavior separately.       |
| **Unfinished**  | A limit, cancellation, or operational failure prevented a conclusion.                                  | Preserve work and resolve the reported obstacle before relying on that check. |

`valid: true` means **zero errors**. Warnings and not-checked binding checks can remain. Accepted warnings retain their identity and the developer’s reason in a separate count. Unresolved requirements describe missing project decisions separately. None of these fields certifies business readiness or production correctness.

Ask the coding agent to fix a warning, or explicitly accept a supported warning with your own reason. Acceptance does not fix its cause or change errors. Remove an obsolete acceptance after its warning disappears, then validate again. Integration warnings identify a missing or stale AGENTS.md block or installed skill assets. If your instructions protect AGENTS.md, repair supplies the exact block for you to add.

## Common situations

| What happened                                   | How it is handled                                                               | Next step                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Runtime wiring needs separate evidence          | Core checks declared files and explicit TypeScript or JavaScript ESM exports.   | Review the relationship and test the actual instruction connection. Keep healthy custom code.                                   |
| A changed file received no maintenance          | Ordinary work uses declared relationships; the host must also select the skill. | Check the relevant owner’s declarations and [host activation](/docs/how-it-works/#activation).                                  |
| A bound source is too large for export analysis | Its export check is not checked, with `resource-limit` as the reason.           | Read the coverage record and establish the export by another focused check if needed.                                           |
| Another input or traversal exceeds a budget     | The operation reports the limit instead of returning a fabricated clean result. | Ask the coding agent to identify the named limit and required scope using the [resource references](#large-projects-and-files). |
| Analysis runs out of memory or time             | Fixed worker safeguards end the attempt without declaring the project invalid.  | Review the input shape and failure evidence. Do not repeatedly retry unchanged input or split healthy source automatically.     |
| Capacity is busy                                | Another inspection holds the same installed Core owner.                         | Let that inspection finish, then retry.                                                                                         |
| Work is cancelled or the worker fails           | No successful inspection is inferred.                                           | Resume deliberately after cancellation; investigate a process failure before retrying.                                          |
| Files change during inspection or continuation  | Snapshot checks refuse to combine incompatible states.                          | Finish the edits and begin a fresh inspection; discard the old cursor.                                                          |
| A complete record cannot fit an output page     | Records remain whole; output pagination can refuse.                             | Let the coding agent assess the page budget within the invocation’s allowed bounds.                                             |

See [deterministic examples](https://packages.moldea.ai/capabilities/) and the [inspection contracts](https://packages.moldea.ai/packages/core/repository-inspection/) for concrete results.

Initialization registers relationships only for source it inspected; in the four-agent Platform run this was narrower than the curated manifest, missing agent-specific context, output and judge paths, so run explicit relationship maintenance after onboarding for complete coverage.

## Large projects and files

The current Core and CLI defaults allow **8 MiB per file read**, **2 MiB for the manifest**, **100,000 entries**, and **128 MiB of source reads per operation**. These measure different things. An entry can be a directory or a requested path; this is not a universal file-count limit. A large file’s presence alone does not mean an inspection reads it.

| Boundary                   | What to know                                                                                                                                                           | Numeric authority                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Input and prepared results | File, manifest, entry, total-read, diagnostic, coverage, and logical retained-byte budgets are independent.                                                            | [Core limits](https://packages.moldea.ai/packages/core/repository-inspection/#resource-limits)              |
| CLI output                 | Metadata pages and canonical text chunks bound responses. They do not reset traversal budgets or make full source parsing unlimited.                                   | [CLI budgets](https://packages.moldea.ai/packages/cli/output-and-operations/#resource-budgets)              |
| Isolated analysis          | Fixed heap settings and a 120-second lifetime contain analysis. Logical accounting is not total process RAM. An allowed 8 MiB source can still exceed worker capacity. | [Worker controls](https://packages.moldea.ai/packages/core/repository-inspection/#isolated-node-inspection) |
| Filesystem reader          | Scan, page, range-read, cache, active-operation, and queue ceilings have separate scopes. The CLI supplies its own reader limits.                                      | [Reader limits](https://packages.moldea.ai/packages/repository-fs/security-and-limits/#resource-limits)     |

Users do not need to configure packages for ordinary work. Ask the coding agent to explain the exact refusal and smallest useful next action. Raising a configurable input budget does not raise the fixed analysis profile or guarantee success on every device.

## Judgment and repair

Static checks establish structure and the file or export checks named in coverage. Meaning, policy, and arbitrary application behavior require the coding agent’s assessment and relevant tests.

`Fix moldea` uses established intended behavior, respects host permissions, and reports checks it could not complete. It checks material facts and declared relationships for each owner, then traces each agent's instruction and schema to its runtime call. Presentation details and shared infrastructure used by a feature do not create feature relationships. A large repair can continue by owner from a reported commit and changed-path checkpoint. It cannot invent missing policy, guarantee every repair, or silently initialize an unrelated project. It updates a missing, broken or older CLI to the installed skill's validated target; healthy newer compatible tooling is preserved. See [repair](/docs/evaluate-reconcile-validate/#repair-a-project) and [local tooling](/docs/compatibility-and-local-tooling/).

In a repository whose Git attributes mention `filter`, including Git LFS, the repair helper refuses to read Git evidence. Repair then stops Git-dependent work and gives only a bounded foundation diagnosis until the helper supports these repositories.

On Windows, repository roots at or above the [native process working-directory limit](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setcurrentdirectory) (260 characters) prevent subprocess startup. The repair helper reports unavailable evidence as `git-read` with a request to move or clone the repository to a shorter path. The launcher's `validate` and `inspect` operations have the same working-directory limitation. Use a shorter checkout path for these operations. Deterministic tests cover longer paths for the relevance gate, managed document writers and initialization inspection.

## Compatibility and evidence

Runtime IDs select SDK guidance. They do not certify SDK versions or application behavior. Unsupported CommonJS, type-only declarations, and inconclusive export inventories are not checked and never become missing-export errors. Read the [runtime guidance](https://packages.moldea.ai/runtimes/) and [recorded evidence](/evidence/) for their separate purposes.

Release-evaluation command, token, and output profiles constrain assurance trials. They are not universal limits on users’ repositories or coding-agent sessions. See [resource profiles](/docs/compatibility-and-local-tooling/#resource-profiles).

## Trust and privacy

Local deterministic checks call no model or provider and require no Moldea Cloud account. The skill itself does not upload repository content to Moldea Cloud. Your coding-agent host’s provider, permissions, and privacy settings still apply.

The CLI selects Git paths; a raw filesystem reader can expose ignored files and dependencies. Path/link checks require a tree trusted against hostile concurrent replacement. Unsupported Git content transforms are refused, and continuation stays within one snapshot. Use the [reader trust contract](https://packages.moldea.ai/packages/repository-fs/security-and-limits/), [snapshot contract](https://packages.moldea.ai/packages/repository/reader-contract/#snapshot-consistency), and [privacy guide](/docs/safety-and-privacy/) before choosing another data source.

## Report a problem

If moldea fails or behaves unexpectedly, email [jesus@moldea.ai](mailto:jesus@moldea.ai). Describe what you asked your coding agent and what happened instead. Include the error message and your skill, CLI, Node.js, Git, and operating system versions. Remove private code, secrets, credentials, and personal data before sending.

## Unbound model workflows

Implicit canonical adoption of an unbound one-shot model workflow is included in the 8.2.3 semantic selection. Its fresh full-recording initial trial passed, including canonical instruction consumption and validation. Earlier inline-only failures remain retained. An explicit moldea request remains available; the observed pass does not establish general routing reliability.

## Semantic coverage not yet included

The 8.2.3 selection contains 120 cases: 115 passed and five recovered. The five formerly private targets and three new scenarios are now included, as detailed in [semantic coverage](/docs/semantic-evaluation/#cases-and-coverage). Two cases remain **not yet included**: `exact-binding-relevance` did not reliably report its unverified support-answer boundary, and `read-only-git-helper-suppression` exceeded the unchanged host-command output cap in three of four reserve trials, with one additional safety-stop reporting omission. Their strict criteria and failed records remain private. No forbidden repository or Git-control modification was established. Private diagnostics do not fill these published coverage gaps.

All six continuation cases passed their initial fresh full-recording trials and are included through exact reuse. They use actual sandbox Git-wrapper records together with recognized command text and measure cooperative compliance. Caller attribution separates direct trusted Codex-host calls from model-controlled commands; host calls supply neither actor violations nor positive repair-read credit. A deliberately evasive actor could locate the wrapper's non-PATH real Git binary or tamper with caller metadata or the temporary invocation log. This is not a tamper-proof audit. Native read history, reloads after compaction and actual reassessment of unchanged owners require separate evidence. The historical 108-case fallback remains unchanged.

The three-request budget case keeps each cycle within its allowance while combined output exceeds one cycle's budget. It does not force the ordinary-work limit-exhaustion branch. Initialization's inspected-source report uses a supplied inspection boundary; it does not establish unrecorded read history or validation-after-write ordering. Those limits remain visible alongside the passing observations.
