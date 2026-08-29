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
  "summary": "Created the order-triage agent for the custom runtime. Its canonical description and instruction classify orders for human review and explicitly prohibit refund approval. Registered the real createOrderTriageAgent binding, affected source path, and grounded runtime guidance. Moldea inspection and validation completed without diagnostics; TypeScript typechecking passed. Final Git review showed only the intended files.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/runtimes/order-triage.md"
  ],
  "observations": [
    "Canonical state now registers order-triage with runtime.id custom and binds /src/order-triage-agent.ts#createOrderTriageAgent.",
    "No tools, provider capabilities, schemas, routing, or refund decision authority were added.",
    "Moldea CLI 5.0.0 inspect and validate returned valid schema-version-2 envelopes with no diagnostics.",
    "TypeScript compilation via tsc -p tsconfig.json exited successfully."
  ],
  "unresolved": [
    "The repository does not establish the injected loader's failure handling or downstream interpretation/enforcement of returned agent fields; this limitation is explicitly recorded in runtime guidance."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 52,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 8
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 8
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
  "durationMs": 1144
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
      "sha256": "f56bf1dc627f338ae21a043204c7f5c394c0f2bfa782c9f5e2d1b3f06d75ba31"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "28f36dd2e728470d2edfa7dc19496dac04e9c62e12c0abcfe97f1b86e1b40793"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "0cc8e3d90a23e43dc2eb23bc9f0a2171798f6711286be695b6bd47da830a32e3"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "50dad6fcb45b4b5fc6c43a213e97c28ef97d5b85eb60da11d6d30f45d3e978a3"
    },
    {
      "path": "moldea/runtimes/order-triage.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "5608b2f8e923418c15ac000e006e1807342ff5f893807915d93cbadae2f7ef73"
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
    "moldea/runtimes/order-triage.md"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
