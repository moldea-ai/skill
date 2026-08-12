# Context gathering

Read this reference before initialization, agent-system planning, consequential project-context work, agent creation, semantic evaluation, or reconciliation.

## Establish the purpose

Begin with the question that must be answered: project foundation, agent-system architecture, one domain, one agent, one behavior change, one contradiction, or one reconciliation. The purpose controls investigation depth and persistence.

Use deterministic `inspect --json` early when supported local tooling exists. It establishes structural state, canonical assets, registered relationships, and available adapter evidence; it does not establish developer intent or semantic correctness.

## Classify evidence

Keep these categories distinct:

- **Observed current fact:** directly established by current repository or deterministic evidence.
- **Developer-confirmed truth:** current or intended state explicitly established by the developer.
- **Intended resulting state:** behavior the authorized change is meant to produce.
- **Planned future work:** approved direction not yet implemented; never present it as current support.
- **Accepted rationale:** active reasoning preserved by an accepted decision.
- **Historical or superseded state:** useful history that no longer governs current behavior.
- **Unresolved state:** a material missing or uncertain fact or implementation.
- **Inference:** a hypothesis used only to choose further investigation.

Do not collapse branch-local work, committed truth, plans, history, and unresolved behavior into one narrative.

## Use question-specific authority

Assess evidence according to the fact it can establish:

- implementation shows executable current behavior but not always intended policy
- executable schemas define enforced shapes but may be stale or incomplete
- tests show intended or observed cases but can be stale
- project context states durable project truth but remains subject to evidence
- accepted decisions explain active rationale
- agent instructions state model-facing behavior but do not prove runtime support
- runtime guidance explains project-specific integration
- adapter evidence proves only what the adapter deterministically detected
- developer direction establishes task intent within safety and repository constraints
- external documentation establishes what an external system supports, not how this project uses it

When evidence conflicts, determine whether the claims concern the same scope and time, inspect nearby contracts and history when useful, and ask only if a consequential ambiguity remains.

## Investigate progressively

1. Inspect the root README and other high-information project surfaces first.
2. Inspect package, runtime, entry-point, configuration, canonical `moldea`, and central contract evidence proportional to the task.
3. Follow material imports, bindings, impact paths, schemas, capability registrations, runtime-agent construction, instruction loaders, variable providers, tests, runtime guidance, decisions, unresolved references, and adapter evidence.
4. Test consequential conclusions against a second reliable surface when practical.
5. Identify contradictions, temporal differences, and material unknowns.
6. Ask one focused question only when different reasonable answers would materially change persisted truth, behavior, policy, permission, schema semantics, capability use, routing, failure handling, or implementation direction.
7. Stop when more evidence is unlikely to change a material conclusion for the current purpose.

Do not ask the developer for facts reliable repository or deterministic evidence can establish. Do not read the entire repository by default.

## Select durable state

Persist a fact only when it is material and durable enough to improve project understanding, behavioral integrity, agent design, future maintenance, semantic change analysis, or prevention of likely repeated misunderstanding.

Route durable information by meaning:

- `/moldea/project.md`: concise foundational identity, purpose, users, goals, values, boundaries, and universally important facts
- `/moldea/context/**/*.md`: focused current domain, product, architecture, security, integration, terminology, or operational truth
- `/moldea/decisions/*.md`: materially useful rationale for choices with meaningful alternatives or consequences
- `/moldea/runtimes/**/*.md`: project-specific runtime interpretation not reliably established by adapter and repository evidence alone
- `/moldea/moldea.yaml`: supported semantic relationships, bindings, impact paths, runtime variables, capabilities, mirrors, and unresolved state
- `instruction.md`: behavior the runtime model must know
- nowhere: temporary, immaterial, easily rediscovered, speculative, secret, generic, or redundant information

Never use canonical context as an issue tracker, implementation log, exhaustive inventory, generic runtime guide, or store for runtime secret values.

## Gather for agent-system planning

Planning begins from the developer's desired outcome rather than proposed agent names. Gather enough evidence to distinguish deterministic responsibilities from work that materially benefits from model reasoning.

When relevant, establish the current workflow and services, domain rules, data sources and ownership, schemas and contracts, APIs, jobs, queues, integrations, existing agents and AI usage, capabilities, permissions, side effects, human approvals, scale, cadence, latency, privacy, security, compliance, audit, failure, and recovery expectations.

Planning context is sufficient when the objective and material success criteria are clear and the current system, data, state, authority, side effects, contracts, and existing capabilities are understood well enough to classify responsibilities without consequential unsupported assumptions. It is insufficient when an unresolved fact could change whether a responsibility is deterministic, agent-owned, human-controlled, or separately owned.

Because `plan` is read-only, do not persist discovered context, proposed candidates, or architecture decisions during that operation. Recommend later initialization or maintenance for durable current truth when useful.

## Initialize context first

Initialization requires an accessible supported Git working tree and compatible local tooling. Run initial deterministic inspection even when the missing-project diagnostic is expected.

Create the minimum foundation:

```text
/moldea/moldea.yaml
/moldea/project.md
```

Use `version: 1` and omit empty optional manifest mappings. Create focused context, decisions, runtime guidance, agents, and unresolved requirements only when actual understanding requires them. Never create ceremonial empty directories or checklist documents.

Initialization does not create an agent by default. If the developer requests an agent before foundation is sufficient, establish the missing durable truth, clarify consequential intent, narrow supported behavior, or preserve genuine incomplete state without inventing completion.

Treat partial initialization idempotently: preserve valid established content, repair only in-scope structural problems, and clarify before replacing consequential semantic content. If already initialized, an initialize request becomes foundation maintenance rather than a fresh scaffold.

## Preserve project distinctions

Keep project context current. Keep proposed, rejected, and superseded decisions clearly historical. Create a decision only when preserving why materially helps future work. Create runtime guidance only for a real project-specific integration pattern.

For authorization, ownership, billing, value-bearing, destructive, concurrent, or lifecycle-sensitive behavior, preserve the responsible actor, authoritative state transition, transaction and idempotency boundary, timing semantics, and audit obligations that evidence establishes.

Known incomplete state can remain valid current project state when represented accurately. It is not production-ready merely because prose describes the intended future behavior.
