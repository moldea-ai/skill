---
title: Design grounded agents
navigationTitle: Agent design
description: Establish supported behavior, concise model-facing assets, real capabilities, schemas, variables, and runtime provenance.
section: workflows
order: 60
---

# Establish behavior before writing prose

Agent design begins when you directly request an agent or accept an agent candidate for implementation. The coding agent revalidates repository evidence rather than copying a planning recommendation mechanically.

## Define the responsibility

The supported contract can include identity, purpose, responsibility, context, inputs, outputs, rules, exclusions, capabilities, variables, ambiguity handling, failure, escalation, routing, and quality expectations. Only material categories are included.

An agent is not complete when the model would need hidden repository knowledge. The coding agent must provide the necessary context, bind the runtime mechanism, narrow the responsibility, implement authorized support, clarify intent, or preserve genuine incomplete state.

That readiness judgment is separate from the outcome of a narrower maintenance request. When every requested safe change, preservation obligation, and validation step is complete, the coding agent reports the maintenance operation as completed and records any remaining blocking readiness limitation. It reports the task as blocked only when that limitation prevents the requested deliverable itself.

## Keep model-facing assets distinct

- `description.md` explains what the agent does.
- `handoff-description.md` explains when responsibility transfers to it and exists only for a real routing case.
- `instruction.md` explains how it operates after receiving responsibility and must stand on its own.

Instructions should be complete, evidence-grounded, actionable, aligned with executable contracts, explicit about consequential ambiguity and failure, and concise enough that each runtime token earns its cost.

For an unbound one-shot model workflow, a direct change to model decisions or output establishes one cohesive agent responsibility. The actual invocation must consume its canonical instruction through an evidenced loader or exact mirror, with focused tests for that path. A separate agent for every call is unnecessary.

For routing metadata, the coding agent inspects the target directory directly. It uses `handoff-description.md` when present. When that optional asset is absent, it reads `description.md`, runtime guidance, and the consumer before judging the fallback. Under dynamic wiring, it records the consumer purpose, required canonical source, current selected source, and evidence that could resolve selection. If the selected source is unknown, it gives only conditional conclusions.

## Register real capabilities

A manifest tool or skill requires a qualifying repository-local implementation artifact. Before registration, the coding agent establishes its runtime-facing name, use conditions, inputs, outputs, preconditions, limitations, side effects, authorization, failure behavior, and actual runtime registration.

Every established external capability is classified before editing. Model-visible behavior belongs in canonical instruction, while integration-only behavior and material project-specific limitations belong in runtime guidance. A manifest tool or skill still requires a qualifying repository-local implementation. Provider hosting and a correct runtime ID never substitute for model-visible semantics.

Creating or maintaining the reusable Agent Skill artifact is a separate workflow. See [Design reusable Agent Skills](/docs/designing-skills/) for activation, progressive disclosure, resources, scripts, maintenance, and verification guidance.

## Align schemas

Executable and model-facing schemas are one semantic contract. Requiredness, nullability, literals, alternatives, field meaning, and material constraints stay aligned, while internal or hidden-reasoning fields remain excluded.

## Select the runtime honestly

The agent declares the label matching its actual highest-level SDK integration. Runtime IDs select guidance rather than certify compatibility. Use `custom` only when no named runtime describes the integration, never to hide missing evidence. No runtime package is installed merely to select a label.

Resolve SDK details from the installed skill’s focused runtime guidance and the installed SDK’s type definitions, using a bounded query for the relevant symbol. Read only the declaration or source-owned documentation needed for the task. Repository wiring, provider configuration, and appropriate integration tests must establish behavior. At an unresolved dynamic boundary, stop and name the smallest reliable resolver without inventing a path. Evaluation remains incomplete while a material unknown lacks a resolver.

An unknown runtime label is a manifest error. A known label does not prove that an SDK is installed, an export is used, or a runtime integration works. Core coverage checks declared files and explicit TypeScript or JavaScript ESM exports only.

In a dedicated repository, the coding agent directly inspects the developer-identified related application, including its instructions, material files, and safe read-only Git state. It does not substitute a local summary. The final report classifies each repository as clean, dirty, unborn, unavailable, or uninspected, then states what canonical inspection cannot observe, what each related path establishes, and what remains unknown.

## Keep impact relationships meaningful

`affectedBy` tells the coding agent which changes may affect an agent's behavior. It is not a list of everything needed to build the project. Prefer the sources that define tools, policy, schemas, routing, instruction loading, and runtime integration, plus focused tests for those behaviors. Apply the [relationship guidance](/docs/repository-format/#example-connect-focused-context-to-the-code) to every owner kind: include material facts and behavior, not presentation mechanics or shared infrastructure merely used by a feature.

Package manifests and lockfiles belong when relevant dependencies materially affect that agent. Compiler configuration and type declarations need a demonstrated behavioral role. Do not add them to every agent by default, or exclude them solely because of their filenames. Exact bindings already establish relevance and do not need mechanical duplication.

An exact `affectedBy` path must name a regular file, such as `/src/support-agent.js`. Use a supported glob such as `/src/support-policy/**` for a coherent behavioral subtree. Neither `/src/support-policy` nor `/src/support-policy/` expresses subtree impact; removing the trailing slash alone does not fix a directory reference. Choose the narrowest relationship supported by the implementation. Binding and mirror paths retain their own exact-path contracts.

A matching path starts a check of the actual change. It does not force an instruction edit when behavior remains the same.

When retiring an agent, remove its declarations, canonical assets, exclusive runtime wiring, and tests that exercise only the retired behavior. Preserve shared policy and other owners' relationships. An explicit project repair also reviews each relationship and the agent's instruction connection; large repairs can continue by owner after a recorded checkpoint.

## Prove instruction provenance

The coding agent traces how canonical `instruction.md` content reaches each runtime invocation or provider-side configuration. Application loading, build or provisioning logic, or a declared exact mirror can provide the chain. Durable policy remains canonical regardless of whether a runtime exposes `instructions`, `input`, continuation prompts, messages, or tool payloads. Those fields can retain legitimate user, task, and turn content, but not an independently maintained copy of reusable behavior. Superseded copies are removed when the authorized final design makes them obsolete.
