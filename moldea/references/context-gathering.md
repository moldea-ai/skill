# Context gathering

Read this reference before initialization, agent-system planning, consequential project-context work, knowledge-triggered maintenance, Agent Skill creation or material maintenance, agent creation, semantic evaluation, or reconciliation.

## Establish the purpose

Begin with the question that must be answered: project foundation, agent-system architecture, one domain, one Agent Skill, one agent, one behavior change, one contradiction, or one reconciliation. The purpose controls investigation depth and persistence.

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
- Agent Skill source states reusable coding-agent behavior but does not prove installation, activation, or runtime-agent registration
- runtime guidance explains project-specific integration
- adapter evidence proves only what the adapter deterministically detected
- developer direction establishes task intent within safety and repository constraints
- external documentation establishes what an external system supports, not how this project uses it

When evidence conflicts, determine whether the claims concern the same scope and time, inspect nearby contracts and history when useful, and ask only if a consequential ambiguity remains.

## Handle project-knowledge handoffs

Treat developer-supplied prose, structured data, answers, tables, and accessible sources by meaning rather than format. Activation means reconsideration; it does not make every claim canonical. Establish whether each claim expresses current truth, an explicit correction, intended future state, a proposal, transient detail, or unresolved uncertainty.

Persist clear current truth or an explicit correction when it is material, durable, and authorized. Current does not mean durable: short-lived work status or focus remains transient unless it establishes a lasting operating constraint. Preserve future or proposed state without presenting it as current only when an appropriate planned or decision surface is justified. Omit transient, speculative, secret, unnecessarily personal, generic, redundant, or easily rediscovered information. Classify mixed handoffs claim by claim before choosing canonical surfaces; never persist a shared source container as one unit.

A non-conflicting current claim can establish truth regardless of format. When it materially conflicts with established evidence, that bare assertion does not authorize replacement. Continue only when the developer explicitly marks the claim as a correction or current replacement, or other reliable evidence resolves the conflict. Otherwise identify the exact conflict and ask one focused question that distinguishes whether the new claim replaces current state or describes proposed or future state; make no semantic write before the answer. Do not require repository corroboration for organizational truth that only the developer can establish.

Do not infer consequential authority from broad verbs such as “process,” “handle,” or “manage.” When a broad consequential claim is paired with implementation that establishes only narrower behavior, classify the foundation as Partial. Preserve the narrower observed conclusion, identify the unestablished authority, permission, value-bearing, destructive, lifecycle, or external-action boundary, and ask one focused question before any tooling, canonical, mirror, or README write.

A focused question asks for one missing fact or one decision whose answer changes the result. Choose the highest-information uncertainty first, normally purpose or recipient for an otherwise empty foundation, and do not bundle purpose, users, goals, boundaries, authority, or workflow into one prompt. When one consequential boundary is already visible, ask only about that boundary.

## Investigate progressively

1. Inspect applicable instructions, the root README, manifests, canonical `moldea` state, and other high-information project surfaces first.
2. When high-level filename discovery is sparse, inspect a bounded root inventory instead of concluding that project evidence is absent.
3. Search objective terms across ordinary source, documentation, configuration, and test locations, then inspect the material files, contracts, and relationships found.
4. Follow relevant imports, bindings, impact paths, schemas, capabilities, Agent Skill resources and consumers, runtime construction, instruction loaders, variable providers, tests, runtime guidance, decisions, unresolved references, and adapter evidence.
5. Test consequential conclusions against a second reliable surface when practical.
6. Identify contradictions, temporal differences, and material unknowns.
7. Ask one focused question only when different reasonable answers would materially change persisted truth, behavior, policy, permission, schema semantics, capability use, routing, failure handling, or implementation direction.
8. Stop when more evidence is unlikely to change a material conclusion for the current purpose.

Do not claim that project-specific evidence is unavailable after only a high-level filename filter. Do not ask the developer for facts reliable repository or deterministic evidence can establish, and do not read the entire repository by default.

## Select durable state

Persist a fact only when it is material and durable enough to improve project understanding, behavioral integrity, agent design, future maintenance, semantic change analysis, or prevention of likely repeated misunderstanding.

Route durable information by meaning:

- `/moldea/project.md`: concise foundational identity, purpose, users, goals, values, boundaries, and universally important facts
- `/moldea/context/**/*.md`: focused current domain, product, architecture, security, integration, terminology, team responsibility or ownership, or operational truth
- `/moldea/decisions/*.md`: materially useful rationale for choices with meaningful alternatives or consequences
- `/moldea/runtimes/**/*.md`: project-specific runtime interpretation not reliably established by adapter and repository evidence alone
- `/moldea/moldea.yaml`: supported semantic relationships, bindings, impact paths, runtime variables, capabilities, mirrors, and unresolved state
- `instruction.md`: behavior the runtime model must know
- the authoritative repository-native Agent Skill directory: reusable coding-agent procedure and its focused resources
- nowhere: temporary, immaterial, easily rediscovered, speculative, secret, generic, or redundant information

Never use canonical context as an issue tracker, implementation log, exhaustive inventory, generic runtime guide, or store for runtime secret values.

## Gather for agent-system planning

Planning begins from the developer's desired outcome rather than proposed agent names. Gather enough evidence to distinguish deterministic responsibilities from work that materially benefits from model reasoning.

When relevant, establish the current workflow and services, domain rules, data sources and ownership, schemas and contracts, APIs, jobs, queues, integrations, existing agents and AI usage, capabilities, permissions, side effects, human approvals, scale, cadence, latency, privacy, security, compliance, audit, failure, and recovery expectations. Retain the exact material evidence paths so the recommendation can distinguish repository-established facts from proposed architecture.

Planning context is sufficient when the objective and material success criteria are clear and the current system, data, state, authority, side effects, contracts, and existing capabilities are understood well enough to classify responsibilities without consequential unsupported assumptions. It is insufficient when an unresolved fact could change whether a responsibility is deterministic, Agent Skill-guided, agent-owned, human-controlled, or separately owned.

Because `plan` is read-only, do not persist discovered context, proposed candidates, or architecture decisions during that operation. Recommend later initialization or maintenance for durable current truth when useful.

## Gather for Agent Skill design

Before creating or materially changing an Agent Skill, establish:

- the requested reusable outcome and expected coding-agent users
- whether protected coding instructions, a runtime-agent instruction, deterministic software or a tool, canonical project context, ordinary documentation, or an existing cohesive skill owns the behavior more accurately
- applicable coding instructions and the authoritative project sources the workflow must use without duplicating
- the authoritative skill source and any installed, generated, cached, mirrored, or distributed copies
- representative positive activation, adjacent non-activation, ambiguous, and related-technology requests
- the universal workflow, focused references, scripts, assets, dependencies, supported environments, tests, and verification needed
- relevant host metadata, installation, packaging, distribution, coding-agent consumers, agent guidance, manifest declarations, and runtime registration

Agent Skill design context is sufficient when those facts establish the behavior boundary, activation contract, authoritative sources, required resources, authority and failure rules, and material consumer relationships without unsupported assumptions. A directory name, installed copy, or request to “make a skill” is not sufficient evidence by itself.

## Initialize context first

Inspect high-information project evidence and classify the foundation before changing dependency state. Use an installed exact CLI early only after direct provider verification. Missing or unverified tooling never makes available evidence “empty” and must not prompt installation until the foundation supports canonical writes.

Before finalizing canonical project truth, classify the available foundation as an interaction outcome rather than a persisted score or status. Project and directory names, generic labels, placeholder files, empty exports, and brief or generic package metadata may inform clarification but cannot establish a sufficient foundation alone:

- **Insufficient:** meaningful purpose, users or systems served, principal goals, and relevant boundaries cannot be established. State that no meaningful project context was inferred, identify the high-information evidence inspected, stop before dependency changes, canonical project state, or the owned README awareness block, ask one question about the highest-value missing fact, and do not claim completion.
- **Partial:** some foundational conclusions are supported, but a material gap or consequential alternative remains. Broad claims such as payment handling do not establish authority or side effects when implementation proves only narrower processing. Summarize the narrower supported conclusions, label the unestablished consequential boundary, stop before dependency changes, canonical project state, mirrors, or the owned README awareness block, ask one question about that boundary, and resume only after the developer answers.
- **Sufficient:** the evidence supports a useful and truthful foundation without material unsupported assumptions. Complete initialization without a ceremonial question and report the established understanding, resulting files, validation, non-blocking limitations, and an explicit `Next actions` handoff.

Judge evidence by its quality, coverage, consistency, and authority rather than documentation volume. A concise authoritative source may be sufficient; extensive stale or contradictory documentation may not be.

Once the foundation is sufficient, create the minimum canonical state:

```text
/moldea/moldea.yaml
/moldea/project.md
```

Use `version: 1` and omit empty optional manifest mappings. Create focused context, decisions, runtime guidance, agents, and unresolved requirements only when actual understanding requires them. Never create ceremonial empty directories or checklist documents.

Initialization does not create an agent by default. If the developer requests an agent before foundation is sufficient, establish the missing durable truth, clarify consequential intent, narrow supported behavior, or preserve genuine incomplete state without inventing completion.

Treat partial initialization idempotently: preserve valid established content, repair only in-scope structural problems, and clarify before replacing consequential semantic content. If already initialized, an initialize request becomes foundation maintenance rather than a fresh scaffold.

Every completed initialization ends its report with an explicit `Next actions` handoff. Always offer reviewing the foundation and continuing ordinary development. Include planning an agent system or requesting a specific agent only as optional choices when relevant. Validation or test status does not replace this handoff, and these options are not required questions. Do not steer the developer toward creating an agent by default.

## Preserve project distinctions

Keep project context current. Keep proposed, rejected, and superseded decisions clearly historical. Create a decision only when preserving why materially helps future work. Create runtime guidance only for a real project-specific integration pattern.

For authorization, ownership, billing, value-bearing, destructive, concurrent, or lifecycle-sensitive behavior, preserve the responsible actor, authoritative state transition, transaction and idempotency boundary, timing semantics, and audit obligations that evidence establishes.

Known incomplete state can remain valid current project state when represented accurately. It is not production-ready merely because prose describes the intended future behavior.
