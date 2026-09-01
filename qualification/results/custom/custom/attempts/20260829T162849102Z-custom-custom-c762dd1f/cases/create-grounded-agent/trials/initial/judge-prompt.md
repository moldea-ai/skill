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
  "summary": "Created the canonical order-triage agent for the custom runtime. Its description and instruction limit it to classifying orders for human review and explicitly prohibit refund approval. Registered `createOrderTriageAgent` as the runtime-agent binding, linked the affected source file, and added focused runtime guidance. TypeScript compilation, Moldea validation, and complete post-write inspection passed with no diagnostics. Final Git changes were reviewed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/runtimes/custom.md"
  ],
  "observations": [
    "The existing implementation loads `/moldea/agents/order-triage/instruction.md`, sets `canApproveRefunds` to false, and uses the `classify-for-human-review` action.",
    "The manifest uses runtime ID `custom` and binds `/src/order-triage-agent.ts` symbol `createOrderTriageAgent`.",
    "No tools, provider capabilities, or additional decision authority were declared.",
    "`tsc -p <workspace>/tsconfig.json` passed.",
    "Moldea CLI 5.0.0 `validate --json` and post-write `inspect --json` returned schema version 2, status `valid`, and no diagnostics."
  ],
  "unresolved": [
    "The canonical instruction loader implementation is supplied by the factory caller and is not present in this repository; runtime guidance records this boundary without claiming end-to-end provider execution."
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
    "indeterminateCount": 9
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 9
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
  "durationMs": 1031
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
      "sha256": "1215e1a3ced55d0ad67e48e54ec6abcb0dbb4020a128f13475efd8d248d36d87"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "128d3c946585a97e57f32f0d33a271b2068f598425c9a81c7f980e988794ae46"
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
      "sha256": "85abe3761ed9f1b898c5bfa3ade7b1a0967505e25317c87bf1c32cef25a570eb"
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
