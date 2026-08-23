You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: create-grounded-agent (Create a grounded agent)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Create the order-triage agent

Create and register the Moldea agent implemented by `createOrderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the actual implementation: it classifies orders for human review and cannot approve refunds.

Use the project's custom runtime, establish the real runtime-agent binding and affected source path, add only useful project-local runtime guidance, and validate the complete project. Do not invent tools, provider capabilities, or decision authority.

Required judgments:
- grounds-behavior: The canonical description and instruction reflect order classification, human review, and the explicit lack of refund authority.
- binds-implementation: The manifest binds the order-triage agent to the existing createOrderTriageAgent export and affected source.
- defines-runtime-guidance: Custom runtime guidance explains how canonical instruction content reaches the factory without inventing provider behavior.
- validates-project: Repository FS, Repository memory, Core, CLI, and project typechecking accept the completed agent without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Registered the custom-runtime `order-triage` agent, bound it to `createOrderTriageAgent`, and added grounded description, instruction, and runtime guidance. Structural validation and TypeScript validation pass.",
  "commands": [
    "node node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "node node_modules/@moldea.ai/cli/dist/moldea.js compatibility --json",
    "node node_modules/@moldea.ai/cli/dist/moldea.js validate --json",
    "node node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "node node_modules/typescript/bin/tsc --noEmit",
    "node node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.hooksPath=/dev/null -c core.pager=cat diff --check --no-ext-diff"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/runtimes/custom.md"
  ],
  "observations": [
    "Moldea CLI 4.0.1 reports schemaVersion 2; `custom` is available for repository format 1.",
    "The runtime-agent binding is `/src/order-triage-agent.ts#createOrderTriageAgent`; the affected source path is registered exactly.",
    "Post-change `validate --json` and `inspect --json` both returned valid with no diagnostics.",
    "TypeScript validation passed using the installed pnpm TypeScript path.",
    "The initially attempted root TypeScript path does not exist because `node_modules/typescript` is absent; the installed TypeScript binary was then used successfully."
  ],
  "unresolved": [
    "The repository does not establish an instruction-loading or model-invocation path for the custom runtime. This is recorded as the agent's blocking `canonical-instruction-consumption` unresolved requirement; no unsupported loader or provider behavior was invented."
  ]
}

Deterministic post-actor summary:

{
  "passed": true,
  "inspectionStatus": "valid",
  "repositoryFilesystemValid": true,
  "memoryRepositoryEquivalent": true,
  "coreValid": true,
  "cliCompatibilityValid": true,
  "cliIdentityValid": true,
  "cliPackageInventoryValid": true,
  "cliAdapterInventoryValid": true,
  "cliEnvelopeValid": true,
  "cliValidateStatus": "valid",
  "cliInspectStatus": "valid",
  "typecheckPassed": true,
  "repositoryUnchanged": true,
  "failures": [],
  "durationMs": 1037
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "7c7899735df7f1b9c19eb17a5a6100cf3a5246eb56ee6fa14145e36125ef0d0d"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "50dad6fcb45b4b5fc6c43a213e97c28ef97d5b85eb60da11d6d30f45d3e978a3"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d477d7931e94f152e6ee727ffe4f1485a674534bebad8522ac605cd0a323151"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "4c19e10f70c0f778a2eb0cb02dee4dc9327854c1b49f2c6f54dc15c38c742f24"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "after": [
    {
      "path": "moldea/agents/order-triage/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "c133df904319d9be5560272f86d5fae893619da0525bc7d44eb92a7f41465e0a"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "ba7021c59ee98165ab13deae8c70d2eafe0b87749b63c8115e4b9086dc0a02ad"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "9a61924a19538315a2717bd1ada25837e50c062ea354cd6c29d26076d74a324c"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "50dad6fcb45b4b5fc6c43a213e97c28ef97d5b85eb60da11d6d30f45d3e978a3"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "2b0d799f5da811a92fb74036f622fa7bbf81c126280d4344859563fdb1d0fd5b"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d477d7931e94f152e6ee727ffe4f1485a674534bebad8522ac605cd0a323151"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "4c19e10f70c0f778a2eb0cb02dee4dc9327854c1b49f2c6f54dc15c38c742f24"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "changedPaths": [
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/moldea.yaml",
    "moldea/runtimes/custom.md"
  ]
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
