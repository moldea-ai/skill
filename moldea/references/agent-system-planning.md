# Agent-system planning

Read this reference before planning an AI- or agent-enabled system, decomposing agent responsibilities, or recommending orchestration.

## Select this operation narrowly

Use `plan` when the developer explicitly asks what agent-and-software system should accomplish an objective, what should be agents versus deterministic components, or how agent responsibilities should be separated and orchestrated.

Do not capture a generic implementation, architecture, migration, refactor, deployment, or host-defined `plan` command merely because it uses planning language. Relevance-triggered maintenance also does not create a separate planning exercise without clear developer intent.

## Keep planning read-only

Planning may run before `/moldea/**` exists and does not adopt or initialize `moldea`. Do not modify repository files, package or lock state, installed dependencies, Git state or configuration, generated artifacts, protected coding instructions, or external systems. Create no canonical plan file, hidden cache, or planning database.

Use an already available compatible repository-local CLI read-only when its deterministic evidence materially helps. Never create package metadata, select a package manager, install or repair the CLI, or use a global or transient package launcher merely to plan. When deterministic or compatibility evidence is unavailable, continue from sufficient repository and developer evidence, disclose the limitation, and make no unsupported validity or compatibility claim.

## Plan from the objective

1. Establish the outcome, recipient, trigger or cadence, deliverables, success criteria, constraints, and prohibited outcomes that materially shape the system.
2. Gather planning context from high-information repository evidence before asking the developer to repeat discoverable facts. Inspect current workflows, services, rules, data sources and ownership, schemas, APIs, jobs, queues, integrations, AI usage, permissions, side effects, approvals, scale, latency, privacy, security, compliance, audit, and failure expectations as relevant.
3. Decompose the objective into the smallest cohesive system responsibilities before naming agents or components. Describe outcome or decision boundaries rather than arbitrary technical steps.
4. Classify each responsibility as deterministic application logic, deterministic data or transformation logic, an existing or proposed service or runtime-native tool, a reusable Agent Skill, an AI agent, human control, or a deliberate combination with explicit boundaries.
5. Keep fixed calculations, eligibility rules, filtering, storage, delivery mechanics, and predictable sequencing deterministic unless evidence establishes a real need for model reasoning.

Use an Agent Skill for reusable on-demand coding-agent knowledge, workflow, or supporting resources. Do not treat a skill as an independently executing runtime agent, a deterministic service, or authority to perform its described side effects.

## Minimize and justify agents

A valid result may recommend zero agents. Prefer the smallest agent topology that preserves reliable responsibility boundaries.

Create a separate agent candidate only when an independent boundary materially improves cohesive ownership, specialized model context, permission separation, failure isolation, routing clarity, reusable reasoning, independent evaluation or maintenance, or another evidence-backed concern.

Reuse an existing agent only when the responsibility remains cohesive with its established purpose. Do not create a god agent to reduce the count, split one cohesive responsibility to manufacture a multi-agent design, or add planners, critics, supervisors, memory, autonomous loops, or an orchestrator by fashion.

For every agent candidate, identify:

- its proposed responsibility and why model reasoning earns an agent boundary
- principal inputs, outputs, decisions, and project context
- capabilities, data access, permissions, and state it may read or affect
- interaction, handoff, escalation, and failure boundaries
- why deterministic software or another candidate should not own the responsibility

Proposed names and IDs remain illustrative until a later write-capable workflow establishes them.

## Design control, state, and contracts

Prefer deterministic orchestration when sequencing, branching, and routing can be expressed reliably in ordinary application logic. Recommend a model-based router only when selecting the next responsibility genuinely requires semantic judgment.

Repository format version `1` defines no canonical orchestration or handoff graph. Keep proposed routing and transfers as architectural behavior until a later implementation establishes them through runtime-native mechanisms and the appropriate agent-owned surfaces.

Identify authoritative and derived data, transient and persistent state, allowed readers and writers, deterministic enforcement points, agent recommendation versus execution authority, human approvals or escalation, and least-privilege constraints. Avoid implicit claims that an agent “knows” data whose source or access path materially affects the design.

Expose the principal inputs, outputs, events, service and tool contracts, and failure boundaries needed for components to interact. Planning need not finalize executable schema syntax, but agent separation must not depend on hidden contract assumptions.

## Treat runtime compatibility honestly

Runtime selection is optional during architecture planning unless it changes the recommendation. The exact CLI can establish which adapter IDs are available in its installed package composition, but it does not establish behavioral support for a specific target or provider usage.

When reliable adapter documentation and repository evidence are unavailable, describe runtime requirements or candidate considerations without claiming that a target, provider limit, pattern, or complete behavior is supported. Final `runtime.id` and runtime integration belong to later agent design and implementation.

## Produce one actionable recommendation

Provide one preferred architecture when evidence supports it. Present alternatives only when their tradeoff could reasonably change the developer's decision.

Cover the materially applicable objective, established context, constraints, responsibility allocation, agents and their justification, deterministic components, services or tools, human control, data and state ownership, permissions, control flow, contracts, failures, runtime considerations, tradeoffs, and implementation sequence.

Recommend an implementation order that reduces uncertainty and validates important deterministic services, schemas, capabilities, agent boundaries, routing, tests, and runtime integration early. Do not execute that sequence during `plan`.

When an unresolved material decision could change responsibility ownership or topology, investigate further or ask a focused question. Return reliable partial conclusions when useful, but do not invent the missing semantics, create an unresolved requirement merely because planning is read-only, or claim the plan is complete.

Finish by distinguishing the recommendation from current implemented and canonical state and stating that no repository files were changed by `plan`.
