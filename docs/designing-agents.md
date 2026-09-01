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

## Keep model-facing assets distinct

- `description.md` explains what the agent does.
- `handoff-description.md` explains when responsibility transfers to it and exists only for a real routing case.
- `instruction.md` explains how it operates after receiving responsibility and must stand on its own.

Instructions should be complete, evidence-grounded, actionable, aligned with executable contracts, explicit about consequential ambiguity and failure, and concise enough that each runtime token earns its cost.

For routing metadata, the coding agent inspects the target directory directly. It uses `handoff-description.md` when present. When that optional asset is absent, it reads `description.md`, runtime guidance, and the consumer before judging the fallback. Under dynamic wiring, it records the consumer purpose, required canonical source, current selected source, and evidence that could resolve selection. If the selected source is unknown, it gives only conditional conclusions.

## Register real capabilities

A manifest tool or skill requires a qualifying repository-local implementation artifact. Before registration, the coding agent establishes its runtime-facing name, use conditions, inputs, outputs, preconditions, limitations, side effects, authorization, failure behavior, and actual runtime registration.

Every established external capability is classified before editing. Model-visible behavior belongs in canonical instruction, while integration-only behavior and material project-specific limitations belong in runtime guidance. A manifest tool or skill still requires a qualifying repository-local implementation. Provider hosting and a correct runtime ID never substitute for model-visible semantics.

Creating or maintaining the reusable Agent Skill artifact is a separate workflow. See [Design reusable Agent Skills](/docs/designing-skills/) for activation, progressive disclosure, resources, scripts, maintenance, and verification guidance.

## Align schemas

Executable and model-facing schemas are one semantic contract. Requiredness, nullability, literals, alternatives, field meaning, and material constraints stay aligned, while internal or hidden-reasoning fields remain excluded.

## Select the runtime honestly

The agent declares the highest-level available official runtime adapter whose verified target covers the actual primary integration boundary. Planned support is not presented as available, experimental support is not presented as production-ready, and `custom` is used only when the real composition requires it.

Adapter behavior is established from authorized adapter documentation and repository evidence. Compatibility inventory proves availability only. When behavioral evidence is unavailable, the coding agent preserves the current runtime and pairs each unknown invocation, instruction loading, tool, schema, routing, handoff, variable, or provider fact with its smallest reliable resolver, such as source-owned target documentation, closed repository wiring, provider configuration, or an integration test. It names the artifact type and owner without inventing a path. Evaluation remains incomplete while a material unknown lacks a resolver. Package names, inventory, and model knowledge cannot supply target details, supported patterns, provider limitations, maturity, or wiring semantics.

When the declared runtime is unavailable in the exact installed CLI, evaluation stops without selecting a replacement or changing dependencies. Other available adapter IDs establish inventory only, not this project's integration boundary.

In a dedicated repository, the coding agent directly inspects the developer-identified related application, including its instructions, material files, and safe read-only Git state. It does not substitute a local summary. The final report classifies each repository as clean, dirty, unborn, unavailable, or uninspected, then states what canonical inspection cannot observe, what each related path establishes, and what remains unknown.

## Prove instruction provenance

The coding agent traces how canonical `instruction.md` content reaches each runtime invocation or provider-side configuration. Application loading, an adapter, build or provisioning logic, or a declared exact mirror can provide the chain. Durable policy remains canonical regardless of whether a runtime exposes `instructions`, `input`, continuation prompts, messages, or tool payloads. Those fields can retain legitimate user, task, and turn content, but not an independently maintained copy of reusable behavior. Superseded copies are removed when the authorized final design makes them obsolete.
