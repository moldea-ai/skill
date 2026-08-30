# Context gathering

Read this reference before initialization, agent-system planning, consequential project-context work, knowledge-triggered maintenance, Agent Skill creation or material maintenance, agent creation, semantic evaluation, or reconciliation.

## Establish the purpose

Begin with the question that must be answered: project foundation, system architecture, one domain, one Agent Skill, one agent, one behavior change, one contradiction, or one reconciliation. The purpose controls investigation depth and persistence.

Use supported deterministic `inspect --json` early when the operation permits it. Inspection establishes structure, canonical assets, registered relationships, and available adapter evidence; it does not establish intent or semantic correctness.

## Classify evidence

Keep these categories distinct:

- **Observed current fact:** directly established by current repository or deterministic evidence.
- **Developer-confirmed truth:** current or intended state explicitly established by the developer.
- **Intended resulting state:** behavior the authorized change must produce.
- **Planned future work:** approved but unimplemented direction.
- **Accepted rationale:** active reasoning preserved by an accepted decision.
- **Historical or superseded state:** useful history that no longer governs.
- **Unresolved state:** a material missing or uncertain fact or implementation.
- **Inference:** a hypothesis used only to direct investigation.

Do not collapse branch-local work, committed truth, plans, history, and unresolved behavior into one narrative.

## Use question-specific authority

Evidence establishes only the facts within its role:

- implementation shows executable behavior, not necessarily intended policy
- schemas define enforced shapes but may be stale or incomplete
- tests show intended or observed cases but may be stale
- canonical context states durable project truth subject to evidence
- accepted decisions explain active rationale
- agent instructions declare model behavior, not runtime support
- Agent Skill source declares reusable coding-agent behavior, not installation, activation, or runtime registration
- runtime guidance explains project-specific integration
- adapter evidence proves only what the adapter detected
- developer direction establishes task intent within safety and repository constraints
- external documentation establishes external support, not this project's use

When evidence conflicts, determine whether claims concern the same scope and time. Inspect nearby contracts and history when useful; ask only when consequential ambiguity remains.

## Handle project-knowledge handoffs

Interpret developer-supplied prose, structured data, answers, tables, and accessible sources by meaning rather than format. Activation requires reconsideration, not automatic persistence. Classify each claim as current truth, explicit correction, future intent, proposal, transient detail, or unresolved uncertainty.

With established adoption and Maintain authority, select the canonical surface from meaning rather than asking for adoption or a storage path. Persist clear current truth or explicit corrections only when material, durable, and authorized. Current does not imply durable: short-lived status stays transient unless it establishes a lasting operating constraint. Represent proposed or future state as such only when an appropriate planned or decision surface is justified. Omit transient, speculative, secret, unnecessarily personal, generic, redundant, or easily rediscovered information. Classify mixed handoffs claim by claim; never persist a shared container as one unit.

A non-conflicting current claim can establish truth in any format. A conflicting bare assertion cannot replace established truth. Continue only when the developer marks a correction or current replacement, or reliable evidence resolves the conflict. Otherwise identify both claims, ask whether the new one replaces current state or is proposed or future state, and make no semantic write before the answer. Organizational truth that only the developer can establish does not require repository corroboration.

Broad verbs such as “process,” “handle,” or “manage” do not establish consequential authority. When implementation proves only narrower behavior, preserve that observed conclusion, classify the foundation as Partial, identify the unestablished permission, value-bearing, destructive, lifecycle, or external-action boundary, and ask before tooling or semantic writes.

A focused question asks for one missing fact or decision. Prioritize authority, responsibility ownership, topology, or consequential side effects. Ask purpose or recipient only for an otherwise empty foundation; do not bundle purpose, users, goals, boundaries, authority, and workflow.

## Investigate progressively

1. Inspect applicable instructions, the root README, manifests, canonical moldea state, and other high-information surfaces.
2. Use a bounded root inventory when filename discovery is sparse. A path listing only queues candidates.
3. Search objective terms across source, documentation, configuration, and tests. Read every accessible material candidate before a conclusion, absence claim, request, or plan, mapping each path to its fact and responsibility.
4. Follow relevant imports, bindings, impact paths, schemas, capabilities, Agent Skill resources and consumers, runtime construction, instruction loaders, variable providers, tests, runtime guidance, decisions, unresolved references, and adapter evidence.
5. Test consequential conclusions against a second reliable surface when practical.
6. Identify contradictions, time differences, and material unknowns.
7. Ask one focused question only when different answers would materially change persisted truth, behavior, policy, permission, schema, capability use, routing, failure handling, or implementation direction.
8. Stop when more evidence is unlikely to change a material conclusion for the current purpose.

Never ask the developer to paste an accessible file or read the entire repository by default.

## Select durable state

Persist only information durable and material enough to improve project understanding, behavioral integrity, future maintenance, semantic analysis, or prevention of likely repeated misunderstanding:

- `/moldea/project.md`: concise foundational identity, purpose, users, goals, values, boundaries, and universally important facts
- `/moldea/context/**/*.md`: focused current domain, product, architecture, security, integration, terminology, team ownership, or operational truth
- `/moldea/decisions/*.md`: rationale for choices with meaningful alternatives or consequences
- `/moldea/runtimes/**/*.md`: project-specific runtime interpretation not reliably derivable from adapter and repository evidence
- `/moldea/moldea.yaml`: supported relationships, bindings, impact paths, runtime variables, capabilities, mirrors, and unresolved state
- `instruction.md`: behavior the runtime model must know
- the authoritative repository-native Agent Skill directory: reusable coding-agent procedure and focused resources
- nowhere: temporary, immaterial, rediscoverable, speculative, secret, generic, or redundant information

Canonical context is not an issue tracker, implementation log, exhaustive inventory, generic runtime guide, or secret store.

## Gather for specialized design

Agent-system planning needs enough current workflow, domain, data, contract, permission, side-effect, human-control, scale, security, failure, and recovery evidence to allocate every material responsibility without consequential assumptions. Record each material path, the fact and responsibility it establishes, and whether the recommendation preserves, combines, or reliably replaces it. Planning remains read-only and does not persist discoveries or proposals.

Agent Skill work additionally requires the requested reusable outcome, expected coding-agent users, correct behavioral owner, authoritative source and copies, representative activation and non-activation requests, required resources, supported environments, tests, host metadata, installation, distribution, and consumers. A directory name, installed copy, or request to “make a skill” is insufficient by itself.

## Initialize context first

Before foundation classification can end in clarification, complete `local-tooling.md`'s file-only executable-extension gate and independent installed-CLI presence check. This inert safety preflight does not authorize a package-manager command or dependency change. If it establishes a tooling blocker, report that blocker and its prerequisite before any independent foundation question.

Classify the project foundation before changing dependency state. Missing or unverified tooling never makes available evidence empty and does not authorize installation before the foundation supports writes.

Project names, generic labels, placeholders, empty exports, and brief or generic package metadata may guide clarification but cannot establish a sufficient foundation alone:

- **Insufficient:** meaningful purpose, users or systems served, principal goals, and relevant boundaries remain unknown. Report that no meaningful context was established and which high-information sources were inspected. Stop before dependencies, canonical state, or the README block, then explain the durable-context benefit and ask one question about the highest-value missing fact. Prefer: “`moldea` keeps durable project context in the repository so coding agents can understand the project consistently over time. The README and source do not establish what this project is for, so I haven’t initialized it yet. What does the project do, and who or what does it serve?” Adapt only the inspected sources and missing foundational fact.
- **Partial:** some conclusions are supported, but a material gap or consequential alternative remains. Report the narrower conclusion and unestablished boundary. Stop before dependencies, canonical state, mirrors, or the README block; ask one question about that boundary.
- **Sufficient:** evidence supports a useful truthful foundation without material assumptions. Complete initialization without a ceremonial question and report understanding, the material sources supporting each foundation conclusion, resulting files, validation, and non-blocking limitations.

Judge evidence by quality, coverage, consistency, and authority rather than volume. A concise authoritative source may be sufficient; extensive stale or contradictory documentation may not be.

Once sufficient, create only:

```text
/moldea/moldea.yaml
/moldea/project.md
```

Use `version: 1` and omit empty optional manifest mappings. Create focused context, decisions, runtime guidance, agents, and requirements only when actual understanding requires them. Never create ceremonial directories or checklist documents.

Initialization does not create an agent by default. Partial or inconsistent artifacts leave the project unadopted; identify the exact artifacts and missing contract elements, preserve valid content, and do not initialize or repair over them until explicit authority and any consequential semantic ambiguity are resolved. A new initialize request in an adopted repository becomes foundation maintenance.

Never turn developer-answerable ambiguity into an unresolved requirement or claim initialization completed while awaiting context.

Every completed initialization ends with `Next actions`, always offering foundation review and ordinary development. Mention agent-system planning or agent creation only when relevant. Validation does not replace this handoff or make file creation semantic completion.

## Preserve project distinctions

Keep current context, proposed work, rejected or superseded decisions, runtime guidance, and unresolved state distinct. Create a decision only when preserving why materially helps future work; create runtime guidance only for a real project-specific integration.

For authorization, ownership, billing, value-bearing, destructive, concurrent, or lifecycle-sensitive behavior, preserve the evidenced responsible actor, authoritative transition, transaction and idempotency boundary, timing, and audit obligations. Known incomplete state can remain accurate current state, but prose does not make it production-ready.
