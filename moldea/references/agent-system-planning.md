# Agent-system planning

Read this reference before planning an AI- or agent-enabled system, decomposing agent responsibilities, or recommending orchestration.

## Select this operation narrowly

Use `plan` when the developer explicitly asks what agent-and-software system should accomplish an objective, what should be agents versus deterministic components, or how agent responsibilities should be separated and orchestrated.

Do not capture a generic implementation, architecture, migration, refactor, deployment, or host-defined `plan` command merely because it uses planning language. Relevance-triggered maintenance also does not create a separate planning exercise without clear developer intent.

## Keep planning read-only

Planning may run before `/moldea/**` exists and does not adopt or initialize `moldea`. Do not modify repository files, package or lock state, installed dependencies, Git state or configuration, generated artifacts, protected coding instructions, or external systems. Create no canonical plan file, hidden cache, or planning database.

Use an available compatible root-local CLI read-only. If runtime identity is explicitly requested and safe exact CLI proof is available, run `compatibility --json`; inventory proves availability only. Never create package metadata, choose a manager, install or repair the CLI, or use a global or transient launcher to plan. Without it, continue from evidence, disclose limitation, and make no unsupported claim.

## Plan from the objective

1. Establish the outcome, recipient, trigger or cadence, deliverables, success criteria, constraints, and prohibited outcomes that materially shape the system.
2. Apply the bounded discovery ladder in `context-gathering.md` before asking for discoverable facts. Read material accessible files that discovery exposes and map each path to its established fact; listings are not evidence. Do not claim none or recommend topology from the request after discovery alone.
3. Decompose the objective and every evidence-established outcome into the smallest cohesive system responsibilities before naming agents or components.
4. Classify each responsibility as deterministic application logic, deterministic data or transformation logic, an existing or proposed service or runtime-native tool, a reusable Agent Skill, an AI agent, human control, or a deliberate combination with explicit boundaries.
5. Keep fixed calculations, eligibility rules, filtering, storage, delivery mechanics, and predictable sequencing deterministic unless evidence establishes a real need for model reasoning.

Use an Agent Skill for reusable on-demand coding-agent knowledge, workflow, or supporting resources. Do not treat a skill as an independently executing runtime agent, a deterministic service, or authority to perform its described side effects.

## Minimize and justify agents

A valid result may recommend zero agents. Prefer the smallest agent topology that preserves reliable responsibility boundaries.

Create a separate agent candidate only when an independent boundary materially improves cohesive ownership, specialized model context, permission separation, failure isolation, routing clarity, reusable reasoning, independent evaluation or maintenance, or another evidence-backed concern.

Before finalizing, reconcile every material evidence-established responsibility with an explicit deterministic, service, tool, skill, agent, or human owner. Combining or removing one requires reliable replacement evidence and cannot erase its outcome. Model-reasoning responsibilities with incompatible private context, permissions, trust, or failure boundaries remain separate unless deterministic software replaces one. Reducing agent count never justifies dropping a responsibility or merging incompatible boundaries.

Public research and privileged project or customer reasoning remain separate when their data boundaries conflict.

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

Identify authoritative and derived data, transient and persistent state, allowed readers and writers, deterministic enforcement points, agent recommendation versus execution authority, human approvals or escalation, and least-privilege constraints. Preserve repository-established approval scope exactly, including approval for every publication when required. Avoid implying that an agent knows data whose source or access path materially affects the design.

Expose the principal inputs, outputs, events, service and tool contracts, and failure boundaries needed for components to interact. Planning need not finalize executable schema syntax, but agent separation must not depend on hidden contract assumptions.

## Treat runtime compatibility honestly

Runtime selection is optional unless requested or material. Exact CLI inventory establishes adapter availability, not behavioral support for target or provider usage. Leave runtime undecided without behavioral evidence.

When reliable adapter documentation and repository evidence are unavailable, describe runtime requirements or candidate considerations without claiming that a target, provider limit, pattern, or complete behavior is supported. Final `runtime.id` and runtime integration belong to later agent design and implementation.

## Produce one actionable recommendation

Provide one preferred architecture when evidence supports it. Present alternatives only when their tradeoff could reasonably change the developer's decision.

Cover the materially applicable objective, established context, constraints, responsibility allocation, agents and their justification, deterministic components, services or tools, human control, authoritative data, readers and writers, persistence, permissions, control flow, model input and output contracts, deterministic enforcement, failures, runtime considerations, tradeoffs, and implementation sequence. Treat these as a completion check, not optional sections; omit only genuinely immaterial categories.

Name the material repository paths read and what each establishes. Ensure every resulting responsibility still appears in the recommended architecture. If accessible evidence was not inspected, do not present a repository-specific topology as grounded.

Recommend an implementation order that reduces uncertainty and tests important boundaries early. It is distinct from runtime control flow and remains required with zero agents. Do not execute it during `plan`.

When unresolved decisions remain, investigate or ask the one question whose answer most changes authority, responsibility ownership, topology, or consequential side effects before asking about downstream configuration. Still state the invariant architecture, identify the branch that cannot be finalized, and distinguish the partial recommendation from a complete plan.

Finish by distinguishing the recommendation from current implemented and canonical state and stating that no repository files were changed by `plan`.
