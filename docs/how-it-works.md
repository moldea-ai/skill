---
title: Workflow reference
navigationTitle: Workflow reference
description: Technical reference for activation, operation selection, repository evidence, deterministic tooling, and verified changes.
section: concepts
order: 30
---

# Natural on the surface, rigorous underneath

Start with [How `moldea` works](/how-it-works/) for a visual walkthrough of one connected project change. This reference explains the workflow underneath it.

The normal experience has three steps:

1. You describe the outcome to your coding agent.
2. The managed README block points your coding agent to the installed skill. Agent work and concrete project-level context use an adoption check. Ordinary implementation tasks use a small local relationship check.
3. The coding agent returns the implementation, analysis, or plan with an evidence-based report.

There is no separate `moldea` chat surface to operate.

## Activation

The coding agent can activate the skill in four ways:

- **Direct activation:** after initialization, you ask to plan, build, review, or maintain AI agents, establish a project fact or policy, supply a clear correction, ask about project-context ownership, or request a specific `moldea` operation. The project-level meaning must be evident from the conversation independently of any code edit. Initialization itself requires an explicit request.
- **Canonical activation:** the task changes a path under `/moldea/**`.
- **Managed README activation:** a changed README hunk intersects the content between the full-line `moldea` markers.
- **Declared-relationship activation:** in an adopted repository, a known task path exactly matches a binding or `affectedBy` declaration. The initial check combines exact repository paths explicitly named or targeted by the developer, whether changed or unchanged, with changed paths already established by the host. At an existing scope checkpoint, a materially new path independently discovered during the task gets one new-batch check; unchanged paths reuse the earlier decision. A new-batch miss leaves earlier matched owners in place.

You do not need special commands or `moldea` terminology. A follow-up continues the active task within its existing authorization; it does not activate from a particular phrase. Changing the subject resets that relevance. Unclear intent does not grant permission to write.

Generic terminology, SDK installation, incidental agent or host command names, pasted proposals, and temporary status do not establish direct relevance. A lasting code requirement such as changing a scheduler interval still uses relationship matching. A miss cannot be bypassed because unknown context might be affected. The README selects the entrypoint, not the workflow: direct work checks adoption; other known paths check relationships. Selection and preliminary gating are silent preflight. The coding agent defers `moldea` announcements until relevance is established; a non-match continues without workflow references, CLI calls, or `moldea` reporting. Explicit initialization creates the foundation. An explicit setup check can diagnose a failed adoption gate with bounded read-only foundation inspection. An explicit [project-repair request](/docs/evaluate-reconcile-validate/#repair-a-project) may restore established prior state but cannot silently initialize. Other repository-dependent operations require the complete foundation and owned README block.

Relevant informational handoffs, feedback reviews, and read-only planning remain read-only. An unambiguous correction to established project truth authorizes its minimal canonical update after adoption and ownership checks, without another request naming moldea. Explicit read-only constraints still apply. Proposals and intended policies are not represented as already implemented behavior.

## Operation selection

After initialization, the skill directs the coding agent to select one operation and honor its authority:

| Operation  | Writes | Purpose                                                                                           |
| ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| Plan       | No     | Recommend the smallest robust agent-and-software architecture.                                    |
| Initialize | Yes    | Establish local tooling and the minimum canonical project foundation.                             |
| Maintain   | Yes    | Keep affected project and agent representations coherent, including explicit context compression. |
| Evaluate   | No     | Report deterministic and semantic alignment evidence.                                             |
| Reconcile  | Yes    | Correct confirmed drift with established intent.                                                  |
| Validate   | No     | Run deterministic structural validation only.                                                     |

## Focused guidance

The portable skill has a small universal contract and focused references. The coding agent reads only the guidance needed for the active workflow, such as agent design, Agent Skill design, context gathering, continuous maintenance, explicit context compression, evaluation, or local tooling.

## Evidence before edits

The coding agent begins with high-information repository evidence and follows material relationships. It distinguishes observed facts, developer-confirmed truth, intended resulting state, plans, rationale, history, unresolved state, and investigative inference. The recommended inspection order reduces discovery cost but does not rank authority. Each material claim is resolved by its actual owner, a current explicit developer selection, or an independent source that establishes the disputed fact. Conflicting sources remain unresolved when no such resolver exists.

Code proves current behavior and instructions declare model-facing behavior, but neither selects intended policy. Tests, schemas, context, decisions, runtime guidance, and developer direction answer other questions. Reconciliation, validation, and mirror synchronization cannot choose truth merely by making surfaces match.

Before a semantic write, the coding agent directly establishes adoption, inspects high-information evidence, classifies the relevant claims, and confirms authority for the exact change. Insufficient foundations and unexplained conflicts stop before dependencies or canonical state change.

Conversational assessment reuses known owners or bounded content-free inventory, then reads only selected content. New facts do not reset the shared command and output budgets. Already assessed unchanged facts are reused; there is no background scan or separate classification call.

## Deterministic local tooling

When an operation needs mechanical repository evidence, the coding agent uses the installed skill's closed launcher. The launcher verifies the compatible repository-local `@moldea.ai/cli` declaration and installed stable version, the installed Core version against both the CLI's declared range and moldea's supported range, the executable, and path containment before invoking Node without a shell. Package management and repository setup or CI own lockfile consistency; the launcher does not read target-project lockfiles. The CLI owns Git inventory, repository snapshots, format parsing, path and placeholder validation, mirrors, diagnostics, and the installed package and adapter composition. The installed adapter contracts and local inspection evidence establish package eligibility, recognized source patterns and limitations for that installed implementation. The packages website remains a discovery catalog, not a required lookup during runtime work. Website presentation labels do not affect the technical decision.

The developer should not need to run these commands. This boundary exists so the coding agent does not guess deterministic mechanics.

## Small coherent changes

Write-capable operations update the smallest authorized set of affected representations. The coding agent preserves unrelated work and does not create duplicate canonical stores, independent instructions, fake relationships, or ceremonial files. Ordinary maintenance removes only duplication or stale wording directly affected by the authorized change. A natural request to consolidate, deduplicate, organize, clean up, or compress canonical context authorizes broader loss-preserving reorganization: every unique current fact, accepted rationale, requirement, unresolved boundary, relationship, and consumer remains accounted for, and consequential conflicts stop before writes.

This context compression applies only to Git-owned project state. It does not manage a coding host's context window, conversation compaction, prompt cache, token budget, or internal model behavior, and it does not claim token savings.

Before completion, the coding agent compares final behavior with every still-applicable selected owner and declared mirror. It updates contradicted facts and narrow implementation relationships grounded in already-inspected source, while preserving accurate and unrelated state. After every canonical and mirror write is complete, it runs the relevant project-native checks, then final deterministic validation. For a repairable structural defect, it establishes the complete affected contract, corrects equivalent defects within the authorized change set, reruns checks affected by the repair, and validates again. Four ordinary CLI calls are an efficiency target. Recovery may continue while changed state and new evidence support progress within the same output and host limits. Unchanged failures without new evidence, oscillation, missing authority or tooling, scope expansion, and exhausted limits stop recovery. A validation that precedes a later repair does not verify the resulting state. The coding agent reports actual changes, verification, unresolved diagnostics, and remaining work.
