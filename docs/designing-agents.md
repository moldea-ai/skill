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

## Register real capabilities

A manifest tool or skill requires a qualifying repository-local implementation artifact. Before registration, the coding agent establishes its runtime-facing name, use conditions, inputs, outputs, preconditions, limitations, side effects, authorization, failure behavior, and actual runtime registration.

Provider-hosted capabilities without a qualifying repository-local artifact can still be described accurately in instructions or runtime guidance; they are not fabricated into the manifest.

Creating or maintaining the reusable Agent Skill artifact is a separate workflow. See [Design reusable Agent Skills](/docs/designing-skills/) for activation, progressive disclosure, resources, scripts, maintenance, and verification guidance.

## Align schemas

Executable and model-facing schemas are one semantic contract. Requiredness, nullability, literals, alternatives, field meaning, and material constraints stay aligned, while internal or hidden-reasoning fields remain excluded.

## Select the runtime honestly

The agent declares the highest-level available official runtime adapter whose verified target covers the actual primary integration boundary. Planned support is not presented as available, experimental support is not presented as production-ready, and `custom` is used only when the real composition requires it.

Adapter behavior is established from authorized adapter documentation and repository evidence. Compatibility inventory proves availability only. When behavioral evidence is unavailable, the coding agent preserves the current runtime and names the material unknown invocation, instruction loading, tools, schemas, routing, handoffs, variables, or provider configuration. It also names the source-owned target documentation and closed repository wiring or integration tests that could resolve each gap. A generic statement that fit is unestablished is not enough. Package names, inventory, and model knowledge cannot supply target details, supported patterns, provider limitations, maturity, or wiring semantics. Dynamic wiring can establish a consumer's purpose and required canonical source without proving which source the runtime resolves; that actual source remains unknown rather than effective, absent, or wrong.

When the declared runtime is unavailable in the exact installed CLI, evaluation stops without selecting a replacement or changing dependencies. Other available adapter IDs establish inventory only, not this project's integration boundary.

In a dedicated repository, related-application evidence can establish the primary runtime and provider-hosted capabilities. The coding agent maps those capabilities before editing and preserves model-visible behavior in the canonical instruction or runtime guidance without fabricating a cross-repository manifest binding. The final report first states that canonical inspection cannot observe the external invocation or capability, then names each repository's state, related evidence, externally established semantics, and other unknown implementation details.

## Prove instruction provenance

The coding agent traces how canonical `instruction.md` content reaches each runtime invocation or provider-side configuration. Application loading, an adapter, build or provisioning logic, or a declared exact mirror can provide the chain. Durable policy remains canonical regardless of whether a runtime exposes `instructions`, `input`, continuation prompts, messages, or tool payloads. Those fields can retain legitimate user, task, and turn content, but not an independently maintained copy of reusable behavior. Superseded copies are removed when the authorized final design makes them obsolete.
