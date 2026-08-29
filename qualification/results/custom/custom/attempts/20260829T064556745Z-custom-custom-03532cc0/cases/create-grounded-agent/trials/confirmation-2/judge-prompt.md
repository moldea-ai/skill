You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: create-grounded-agent (Create a grounded agent)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Create the order-triage agent

Add the order-triage agent implemented by `createOrderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the actual implementation: it classifies orders for human review and cannot approve refunds.

Use the project's custom runtime, establish the real runtime-agent binding and affected source path, add only useful project-local runtime guidance, and validate the complete project. Do not invent tools, provider capabilities, or decision authority.

Required judgments:
- grounds-behavior: The canonical description and instruction reflect order classification, human review, and the explicit lack of refund authority.
  Evidence sources: current-workspace, workspace-patch
- binds-implementation: The manifest binds the order-triage agent to the existing createOrderTriageAgent export and affected source.
  Evidence sources: current-workspace, deterministic-after
- defines-runtime-guidance: The manifest references the sole new runtime-guidance file under /moldea/runtimes/**/*.md, which explains that the runtime-owned loader supplies the canonical instruction path and content to the factory without inventing provider behavior.
  Evidence sources: current-workspace, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Created and registered the order-triage agent on the custom runtime. Its canonical description and instruction limit it to classifying orders for human review and explicitly prohibit refund approval. Added the real `createOrderTriageAgent` binding, affected source path, and project-specific runtime guidance. Moldea CLI 5.0.0 inspection completed valid with no diagnostics; TypeScript compilation passed. Final status and changed contents were reviewed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/runtimes/custom.md"
  ],
  "observations": [
    "The runtime binding points to `/src/order-triage-agent.ts` symbol `createOrderTriageAgent`.",
    "The custom runtime produces no adapter evidence by design.",
    "No tools, provider capabilities, or additional decision authority were declared.",
    "The worktree was initially clean, and final status contains only the four intended changes."
  ],
  "unresolved": [
    "The injected instruction loader's implementation is outside this repository; runtime behavior beyond requesting the established canonical instruction path cannot be verified locally."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 47,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 12
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 12
  }
}

Deterministic post-actor summary:

{
  "passed": true,
  "inspectionStatus": "valid",
  "repositoryFilesystemValid": true,
  "memoryRepositoryEquivalent": true,
  "coreValid": true,
  "cliCompositionValid": true,
  "cliIdentityValid": true,
  "cliPackageInventoryValid": true,
  "cliAdapterInventoryValid": true,
  "cliEnvelopeValid": true,
  "cliValidateStatus": "valid",
  "cliInspectStatus": "valid",
  "typecheckPassed": true,
  "repositoryUnchanged": true,
  "failures": [],
  "durationMs": 958
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
      "sha256": "88fc3dd6876fad6598fb57efe8e0344bc46f4868066d6c7a0563b56074c9c830"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "60e1b6134b661c45f4dc421c706d7a2420a9e4ec8709a2cc5a5f3a0a0de21859"
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
      "sha256": "9b3b47d9afc3cbd25338badf8bf92404917fd00474e821c19cbcea9a6fbb377f"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "8ec7f81eee159da36ee3d7f592e61251041b6f2f70a036bd3503290cf85a2725"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "96b6a9b34d39865d341438093e5522351f7db151f589eb4bf31e518ebe558d20"
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
      "sha256": "40b5a4d6535b3b3fde9fcc1aca3cc9a42df18be3a358d4d4f98dca10dbcd88a6"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "88fc3dd6876fad6598fb57efe8e0344bc46f4868066d6c7a0563b56074c9c830"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "60e1b6134b661c45f4dc421c706d7a2420a9e4ec8709a2cc5a5f3a0a0de21859"
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

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
