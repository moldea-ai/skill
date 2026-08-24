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

Adapter behavior is established from authorized adapter documentation and repository evidence. Compatibility inventory proves availability only. When behavioral evidence is unavailable, the coding agent names the unestablished invocation, instruction, capability, schema, routing, or variable facts that matter and identifies the smallest source-owned documentation and closed repository wiring or tests that could resolve them. Package names, inventory, and model knowledge cannot supply target details, supported patterns, provider limitations, maturity, or wiring semantics, so the existing runtime remains unless other reliable evidence establishes a replacement.

In a dedicated repository, related-application evidence can establish the primary runtime and provider-hosted capabilities. The canonical instruction or runtime guidance preserves that model-visible behavior without fabricating a cross-repository manifest binding. The final report distinguishes those externally established facts from implementation details canonical deterministic inspection cannot observe.

## Prove instruction provenance

The coding agent traces how canonical `instruction.md` content reaches each runtime invocation or provider-side configuration. Application loading, an adapter, build or provisioning logic, or a declared exact mirror can provide the chain. Independently maintained runtime instructions are removed when the authorized final design makes them obsolete.
