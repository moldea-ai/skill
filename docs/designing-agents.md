---
title: Design grounded agents
navigationTitle: Agent design
description: Establish a model responsibility, connect canonical instructions and descriptions, and verify the actual invocation.
section: workflows
order: 60
---

# Establish behavior before writing prose

## Define the responsibility

Identify the decisions or outputs the model owns, its inputs, capabilities, authority, failure and escalation rules. A cohesive inline model workflow can be registered as one responsibility. Preserve functioning behavior when adopting an existing workflow and use project-native tests for the changed call path.

## Keep model-facing assets distinct

Each agent owns `description.md` and `instruction.md` under its canonical ID. The description explains the responsibility and supplies all routing-facing text. The instruction governs behavior after assignment. Inspect the actual consumer. A shared route-and-display property uses the canonical description; a dedicated display summary can stay separate. Compare both assets when a description misstates authorization or scope.

## Register real capabilities

Use bindings for the actual invocation, loader and executable schemas that the repository establishes. Record local tools or skills only when the implementation and relevant registration are real. Describe provider-hosted capabilities the model can actually use, including their scope and permission requirements. Keep executable and model-facing schemas aligned through required fields, nullability and constraints.

## Follow the defining SDK

Verify the installed version of the defining SDK and inspect the relevant fields or functions in its types or source-owned documentation. An opaque client or dynamic registry can need a focused observation. The public [SDK guidance](https://packages.moldea.ai/runtimes/) helps locate package documentation.

## Prove instruction provenance

Connect each material call or provider configuration to the canonical instruction, using a loader or a declared necessary mirror. Keep durable policy in that source. The [relationship rules](/docs/repository-format/) help identify code that can change the contract. A focused integration test should exercise the real loader and outgoing instruction, schema and tools while substituting only the provider boundary. Report static coverage, observed consumption and any missing live evidence separately.
