You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: reconcile-drift-and-boundaries (Reconcile drift and boundaries)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Reconcile implementation drift

The support runtime implementation was renamed, but the existing agent setup still points to the removed source. Reconcile the runtime-agent binding with the implementation that now exists.

The project also assembles tool registrations dynamically. Static inspection cannot prove the final tool relationship. Represent that boundary explicitly as an agent-level unresolved warning with a concrete resolution and the related source path. Do not invent a tool binding, recreate the removed file, or modify implementation code. Validate the repaired repository and inspect the final diff.

Required judgments:
- repairs-binding: The stale runtime-agent reference is updated to the existing supportAssistant export and no obsolete source is recreated.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- records-boundary: Dynamic tool registration is recorded as an unresolved warning with a concrete resolution and related source instead of an invented binding.
  Evidence sources: current-workspace, deterministic-after, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Reconciled canonical state in moldea/moldea.yaml: the support runtime binding now targets /src/support-assistant.ts#supportAssistant, and an agent-level warning records the unproven dynamic tool-registration boundary with a concrete integration-test resolution. Moldea inspection returned valid with no diagnostics, TypeScript validation passed, and the final Git diff was reviewed.",
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "No implementation code or removed source was created or modified.",
    "Pre-existing deletion of src/support-agent.ts and untracked src/support-assistant.ts and src/dynamic-tools.ts were preserved.",
    "Validated with @moldea.ai/cli 5.0.0 inspect --json: schemaVersion 2, status valid, zero diagnostics.",
    "Validated with node_modules/.bin/tsc -p tsconfig.json: exit code 0."
  ],
  "unresolved": [
    "Static inspection cannot establish the final dynamically assembled support-tool registrations. The agent-level dynamic-tool-registration warning points to /src/dynamic-tools.ts and requires a repository-local integration test that constructs the final support runtime and proves its tool registrations."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 42,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 2
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 2
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
  "durationMs": 1003
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "300ad2f1f8fa3017d06fb521ef723b7b21f841c59910de4e4c9be5cb8ed1ec7f"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a684a6b7412970a6243c0c8d214f18548c801a47b12eeb890cbfbbee01edac41"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "8d3c980f8f93e85b7ad87d95acac2d2529f9c3b204ff9c659ae4425e8c69673e"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "7fb182d2a0dee28953af897ee5f825c46a84413db34b89e53319b6ae9c293008"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a0dc8ee2d514ba2178dca497ad7d5cd7350d657ed07de5313d9762d0b1a2d075"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "24f868c344e45f0671873a6d328f7e75d9162900887299938e52e93f459763c9"
    },
    {
      "path": "src/dynamic-tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "6c082949bcd5195d1653e70e38a524c45a1d15c9c02c1b7df3195cb6fbe87d28"
    },
    {
      "path": "src/support-assistant.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "853350514ee647882f3e4dfd6fc0446b45cc2a3d721e7c33ad177741bdeb3082"
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
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "300ad2f1f8fa3017d06fb521ef723b7b21f841c59910de4e4c9be5cb8ed1ec7f"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a684a6b7412970a6243c0c8d214f18548c801a47b12eeb890cbfbbee01edac41"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "40031942f8e1d69e93c0bd1eea8aaae6e29c8854eccf5799c795c85d190df50b"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "7fb182d2a0dee28953af897ee5f825c46a84413db34b89e53319b6ae9c293008"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a0dc8ee2d514ba2178dca497ad7d5cd7350d657ed07de5313d9762d0b1a2d075"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "24f868c344e45f0671873a6d328f7e75d9162900887299938e52e93f459763c9"
    },
    {
      "path": "src/dynamic-tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "6c082949bcd5195d1653e70e38a524c45a1d15c9c02c1b7df3195cb6fbe87d28"
    },
    {
      "path": "src/support-assistant.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "853350514ee647882f3e4dfd6fc0446b45cc2a3d721e7c33ad177741bdeb3082"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "changedPaths": [
    "moldea/moldea.yaml"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
