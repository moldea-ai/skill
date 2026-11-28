# Work on project agents and skills

Use for an adopted project's agent-system planning, model responsibilities, and project-grounded skills. An inline or one-shot model is in scope when the task changes what it decides or says. A generic skills or SDK task without a project responsibility leaves moldea out.

## Plan the system

Keep planning read-only. Establish the outcome, users, trigger, constraints, sources, permissions, side effects, and success and failure criteria. Separate cohesive responsibilities before naming components. Keep fixed decisions, eligible actions, storage, sequencing, and enforcement deterministic. Use a model where semantic judgment is materially useful. Zero agents can be the right outcome. Reuse a cohesive responsibility before adding one. Separate private data, permissions, failure and independent control boundaries when material. Model the human decisions and approval required at consequential actions.

For each proposed agent, identify why it needs model reasoning, its inputs, outputs, data, permissions, state, contracts, native routing, failure/escalation and deterministic counterpart. Skills are on-demand coding-agent procedures and carry no independent execution authority. Run bounded evidence reads only. An opaque integration leaves specific unknowns; inventory does not prove behavior. Keep candidate names, selectors and capabilities proposed until authorized and implemented. Give one preferred architecture and ordered build and verification sequence, with alternatives only for material tradeoffs. State which sources support it and ask the decisive question when blocked. Report that planning changed no files.

## Onboard existing responsibilities

Follow [Initialize](initializing.md) for the approved batch and progress. Preserve behavior and correct existing registrations. Treat a cohesive inline workflow as one responsibility even across several model calls. For every approved responsibility establish the behavior and actual invocation, author the canonical assets, and replace independent durable inline policy with a real loader or necessary exact mirror. When dedicated repositories are involved, establish canonical ownership before writing. Use authorized related-repository evidence read-only with no invented cross-repository bindings. Keep verified context and existing artifacts in their actual repository.

Report missing source, unsupported relationships, and uninspected modules instead of calling a partial registration wired or complete.

## Establish behavior and registration

Establish responsibility, scope, inputs, outputs, project rules, capabilities, failure, authority, and escalation before drafting. Keep the instruction complete after assignment. Include only model-facing durable behavior and real executable contracts. Preserve correct behavior in refinements. Use focused changes when the owner still fits. Do not invent capabilities or require hidden knowledge.

Register one lowercase ASCII kebab-case ID under `agents` in `moldea.yaml` and `/moldea/agents/<agent-id>/description.md` and `instruction.md`. After an optional heading, the first nonblank instruction line includes the exact backtick-wrapped ID. An entry may be `{}` when the evidence establishes no optional relationships. Register only real paths and symbols. Use `bindings.runtimeAgent` for the material implementation and `bindings.instructionLoader` for a material repository-local loader when needed. Bind schemas through `bindings.inputSchema` and `bindings.outputSchema` when established. Reference context by whole logical path. Apply [material relationship rules](maintaining-context.md#declare-material-relationships). Qualify missing or uninspectable connections without inventing files, dormant stubs, or cross-repository paths.

This example assumes that inspection established each file, export and use. Omit relationships the implementation did not establish. Registration does not prove consumption.

```yaml
version: 1
context:
  /moldea/context/order-triage.md:
    affectedBy: [/src/orders/policy.ts]
agents:
  order-triage:
    context: [/moldea/context/order-triage.md]
    bindings:
      runtimeAgent: { path: /src/order-triage-agent.ts, symbol: createOrderTriageAgent }
      instructionLoader: { path: /src/order-triage-instructions.ts, symbol: loadOrderTriageInstruction }
    tools:
      lookup-order:
        name: lookup_order
        description: Looks up an order for human review.
        implementation: { path: /src/order-lookup.ts, symbol: lookupOrder }
        registration: { path: /src/order-lookup.ts, symbol: lookupOrderTool }
        inputSchema: { path: /src/order-contracts.ts, symbol: OrderLookupInputSchema }
        outputSchema: { path: /src/order-contracts.ts, symbol: OrderLookupOutputSchema }
    skills:
      review-order:
        name: review-order
        description: Guides a repository-owned order review.
        implementation: { path: /skills/review-order/SKILL.md }
```

## Keep model-facing assets distinct

`description.md` is the single canonical model-facing description for the responsibility. Use it for actual routing metadata. Keep it concise, responsibility-focused and consistent with the instruction, including limits that materially affect target selection. `instruction.md` owns how the agent behaves after assignment.

Classify each actual consumer from the wiring, SDK contract, relevant project documentation and tests. A property name supplies no classification. A shared routing/display property uses the canonical description; a genuinely display-only summary may stay separate. An established purpose classification survives a missing relationship or uncertain source. Check dynamic selection at the established boundary. Preserve correct consumers and report an unknown mapping separately from a proven mismatch. If routing and instruction disagree on authorization, treat that as a separate material conflict even when source selection is correct. Review affected consumers whenever their metadata or responsibility changes.

## Verify instruction provenance and capabilities

Follow canonical instruction to each material model invocation or provider-side configuration. It can be loaded directly, built or provisioned from canonical text, or consumed through a declared exact tracked mirror. Maintain the mirror from the source and verify actual consumption. Preserve request-specific input in the appropriate fields and avoid independent durable policy in messages, continuations or tool payloads. Include required build and deployment resolution. State exact unknowns at an opaque client, dynamic loader or registry and identify the smallest reliable resolver.

Keep executable and model-facing schemas equivalent in requiredness, nullability, permitted values and constraints. Verify attachment to the actual call, including transformations. A qualifying local capability uses a stable agent-scoped ID, exact runtime name, concise responsibility-specific description, real implementation, and applicable registration or schema bindings. Describe only established use conditions, inputs, outputs, preconditions, side effects, permission and failure rules. Model-visible provider tools go in the canonical instruction without fabricated local bindings. Runtime-only wiring stays in the owning implementation.

For a project-grounded Agent Skill, reuse the established repository Skill when it already owns the procedure. Use existing project procedures as evidence. Promote only reusable project-owned procedure. Link to the [canonical moldea context](maintaining-context.md#keep-project-routing-current) for the durable product and policy rules the Skill applies. Establish consumers, invocation scope, distribution and host policy. The skill description is its activation contract. Resolve linked resources from the skill root and verify the targets exist inside the repository. A script's presence or import grants no execution authority. Register the skill to an agent only for evidenced local use. Check its frontmatter, resources, required files, positive and negative invocation behavior and host permissions with native checks. Those checks establish the skill artifact's own structural and behavioral evidence independently of moldea Validate. Run moldea Validate only when canonical files change. Source existence alone does not prove installation or consumption.

Retire a responsibility only with write authority and evidence for downstream consumers. Preserve or replace its duties, remove its registrations, owned capabilities, mirror and instruction wiring as applicable, and update routing, context links and tests in the same change. Do not remove shared dependencies still used.

## Check one connection

Select the defining package the code actually calls. If a transport differs from the agent-defining SDK, start with the defining package. Confirm its installed version. Use its types or source-owned documentation to find where it takes instructions, the output schema and tools. Report any field you cannot verify for that version. Follow only the selected path from canonical instruction and executable schema to the outgoing call, including routing, tools and material continuations. An opaque path does not justify rewriting the declaration.

Classify the observed connection as connected, broken with an established correction, or unknown at a named boundary. Prefer a focused native test exercising the real owned loader and invocation with only the external provider substituted. For creation or rewiring, verify the outgoing instruction against the canonical source. For creation, cover the outgoing schema where applicable. Add a connection test only within developer-authorized implementation. Never invent a connection or weaken a test to finish. Run the native tests. After canonical writes, run final [Validate](validating.md) or leave it to the parent Initialize or Fix. Report file/export checks, connection evidence, and untested live behavior separately. A successful structural check cannot establish runtime consumption or readiness. Keep valid dynamic declarations and state material gaps without inventing unsupported manifest fields.
