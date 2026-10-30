---
title: Testing
navigationTitle: Testing
description: Essential and full deterministic suites, test classification, focused verification, and maintainer qualification.
section: reference
order: 190
---

# Testing

## Commands and completion

| Root command                                                              | Selection                                                                                 |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm test`                                                                | Essential root unit and integration guarantees, in order.                                 |
| `npm run test:full`                                                       | Complete root and website correctness, including both browser suites.                     |
| `npm test -- unit` / `npm run test:full -- integration`                   | One stage. `e2e` is also accepted; essential omits that intentionally full-only category. |
| `npm run test:unit -- <file>` / `npm run test:integration -- <file>`      | Complete focused root coverage with `MOLDEA_TEST_SUITE` unset.                            |
| `npm --workspace website run test:unit` / `test:integration` / `test:e2e` | Complete focused website categories with their existing preparation.                      |

Root commands force `essential` or `full` for their children. Unset granular commands remain complete; explicit invalid `MOLDEA_TEST_SUITE` values fail configuration. Root modes, stages and extra arguments are validated before preparation. Required selections fail when no tests are found. Intentionally full-only categories are omitted before invocation.

Complete ordinary work with essential plus complete focused coverage of changed behavior and affected consumers. Shared changes broaden the affected consumers. Focused frontend verification still covers meaningful accessibility, keyboard/focus, mobile down to 320px, light/dark and motion behavior. Run full explicitly with a coding agent every 1–4 weeks. No recurring full automation is added. Model/provider evaluations and campaigns remain separate.

## Classification

Essential protects portable relevance/refusal, path containment, local launcher/tooling identity, bounded responses and cursors, safe response directories, managed-write preservation/refusal, initialization inspection, and repair Git safety/non-mutation. Generated portable freshness, release identity, path integrity and consequential suite/CI controls also remain essential.

Full-only files are listed in `src/test-suite/constants.ts` and excluded before Vitest imports them in essential mode. They cover semantic, scripted-journey, execution-host, evidence, package-candidate, resource and evaluator command/process self-tests, release updater/evidence-publication self-tests, and evaluator runtime generation. These valuable qualifications remain in full and focused commands. An evaluator helper's security role does not by itself make its self-tests part of the portable skill's essential contract.

Mixed portable files use native `{ tags: ['full'] }` options. Managed instruction writers retain byte preservation, refusal, link containment, exact paths and idempotence directly; broader real-CLI template/Claude diagnostics and long-path qualification are full-only. Repair helper security remains essential while evaluator-wrapper permutations and medium-repository scale qualification are full-only. Broad successful uncaptured CLI response and compatible-version representations are full-only; malformed-response suppression, tool identity, refusal, cancellation, bounds and continuation remain essential. Runtime guidance label completeness is full-only presentation coverage; artifact/behavior identity and integration-asset validity remain essential.

Classify each new or materially changed scenario by its concrete failure consequence. Keep useful secondary coverage full-only and unique consequential guarantees essential even when expensive. Preserve assertions and category/co-location conventions; add no parallel test tree or priority registry. Unclassified cases remain essential until assessed. Do not enable `passWithNoTests` or drop a failure to improve timings.

## Preparation and interruption

Essential invokes only root units and integrations. It does not build evaluator runtimes or prepare sandbox, website models, fixture builds or browsers. Full prepares `runtime:build` once when root unit/integration stages are selected, then runs root and website units, root and website artifact integrations, and recorded plus clean-development browsers. Website granular commands retain their own synthetic generation/build preparation. Full E2E alone uses the website browser commands without an unrelated evaluator build. Focused evaluator tests still need `npm run runtime:build` when their existing contract requires those helpers.

Commands inherit stdio, stop at the first failure, and await bounded owned interruption/cleanup. Startup, nonzero exit, interruption and cleanup failure cannot become success or start a later stage. Cleanup failures report the command/root PID for verification. There is no output buffer/drain or orphan supervisor. The installed Windows helper cannot discover every descendant after its parent exits; helper completion is not exhaustive orphan-cleanup proof.

Configuration messages are `MOLDEA_TEST_SUITE must be essential or full when set.` and `Expected essential or full and optionally unit, integration, or e2e.` Installed failures propagate, including:

- PACKAGE_MANAGER_NOT_FOUND: The package manager's executable couldn't be found.
- PROCESS_TREE_SURVIVED: The process tree is still running after it was force-stopped

## CI and release boundaries

CI emits `root_required` independently of `test_suite`. A complete nonempty presentation-only PR keeps the established shortcut; root-relevant, empty, mixed, unknown or uncertain comparisons require all existing root/portable/quality lanes. Ordinary runs use essential. Tags force full; explicit full dispatch also requires root verification without publication. The selector reuses the root command's closed mode validation, and jobs propagate the selected `MOLDEA_TEST_SUITE` through their existing granular commands.

Root-relevant essential PRs retain the supported Linux Node matrix, Windows deep-path clone/install and supported-unit discovery, macOS portable integration, and minimum-Git qualification. Priority does not remove those lanes. Essential omits evaluator runtime/sandbox preparation; full prepares what the existing root and portable categories need. Root correctness retains its 10-minute budget and explicit unit/integration commands. Conformance result rejects missing/invalid classification, invalid priority, failed/cancelled jobs and unexpected skips; full priority cannot accept a presentation-only skip.

Shared conformance keeps its root/portable/quality boundary and excludes website browsers. Routine website and Pages workflows retain documentation, types, lint, formatting, source/fixture/production-artifact validation, selected-evidence digests, exact-source and deployment gates while omitting full-only unit/artifact test permutations. Complete local full and focused website commands retain those categories and both browser suites.

Standalone `release:check` explicitly runs full correctness before its existing identity/evidence checker and retains its prepared-evidence requirement. Ordinary tags keep `release:identity:check`. No browser/Chromium setup, prepared semantic evidence, local-full attestation, operator approval, release dependency or new main/scheduled workflow is added. Candidate package artifacts and the packages caller's immutable workflow pin remain unchanged.

## Measurement

Record exact source, host/tool versions, commands, preparation and elapsed time, counts, skips, retries/failures and cache conditions. Run the approved essential/full pair on the same source and host with equivalent cold repository caches, preserving developer caches.

The selection ratio is context, not before/after proof: full includes website units/artifact integrations absent from the old root aggregate. The target is at least 50% shorter comparable routine test execution against the previous CI root boundary. Match runtime/image/commands and report CI critical path, runner time and release time separately. Comparable old-local proof remains pending; never compare local seconds with CI seconds or infer improvement from the larger full denominator.

The 2026-10-30 Linux pair used Node 24.15.0/npm 11.12.1 and source tree `cff736666420664dea13f40e27f222cc0cfd249b` over `28b76834`. Separate isolated checkouts and dependency copies kept repository caches cold without resetting developer caches; command timing includes each suite's preparation. Essential passed 533 tests with 22 skips in 19.770 seconds. Full passed 2,167 Vitest cases and 223 recorded-browser cases, with two platform skips, but failed two unchanged mobile/accessibility tests at their 30-second deadlines after 474.665 seconds. Each failed case then passed three isolated runs with retries off; all five development-browser cases passed separately. The aggregate remains failed, so no passing essential/full ratio is claimed. This matches the previously disclosed parallel-browser timing pattern, not proof of its underlying cause. An earlier attempt stopped on missing documentation frontmatter, corrected before this pair. Comparable before/after CI evidence remains separate.

[Essential conformance on `bf4f40e9`](https://github.com/moldea-ai/skill/actions/runs/41102652471) passed. Compared with [the `28b76834` baseline](https://github.com/moldea-ai/skill/actions/runs/40441627980), the same root unit/integration command boundary fell from 425 seconds to approximately 27 seconds (about 94% shorter); the root job fell from 565 to 83 seconds. Essential omits the baseline's 117-second sandbox installation and one-second evaluator build. Both observations used Node 24.15.0 on hosted Ubuntu 24.04 with the same lockfile and root-relevant portability eligibility; image revisions changed from `20261012.334.1` to `20261025.353.1`, and cache/runner variation remains possible. This is a single-run CI observation. Whole-workflow critical-path/total-runner comparisons remain pending because job metadata returned inconsistent intermediate completion states. No release was run, so release elapsed-time savings remain unmeasured.
