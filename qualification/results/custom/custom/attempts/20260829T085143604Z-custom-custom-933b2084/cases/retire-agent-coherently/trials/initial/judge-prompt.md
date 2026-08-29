You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: retire-agent-coherently (Retire an agent coherently)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Retire the removed support agent

The implementation for the `support` agent was intentionally removed before this task. Update the existing agent setup so it no longer claims that the agent or its custom runtime integration exists.

Preserve the project's remaining implementation and project context. Validate the final repository and report the evidence that established which canonical files were obsolete.

Required judgments:
- removes-obsolete-declaration: The final manifest no longer declares the removed support agent, its binding, or its custom runtime guidance.
  Evidence sources: current-workspace, deterministic-after, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Canonical state was updated to retire the removed support agent. Removed its manifest registration, canonical description/instruction, and support-only custom runtime guidance while preserving project context and the pre-existing src/support-agent.ts deletion. Final Moldea inspect and validate returned valid with zero diagnostics; TypeScript compilation passed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md",
    "moldea/runtimes/custom.md"
  ],
  "observations": [
    "The pre-existing Git diff showed src/support-agent.ts deleted, including the supportAgent runtime export.",
    "moldea/project.md explicitly states that the former email support agent was removed from runtime implementation.",
    "Pre-change Moldea inspection reported MOLDEA_REFERENCE_MISSING for /src/support-agent.ts, establishing the manifest runtimeAgent binding as stale.",
    "The deleted description.md and instruction.md exclusively declared support-agent behavior; custom.md exclusively claimed that supportAgent was the runtime-owned definition.",
    "Final reference scanning found only historical removal statements in moldea/project.md and src/project-state.ts; no remaining declaration claims the agent or custom integration exists.",
    "The final Git diff contains only the intended canonical cleanup plus the preserved pre-existing src/support-agent.ts deletion."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 47,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "not-observed",
    "observedCount": 0,
    "indeterminateCount": 0
  },
  "sensitiveAccess": {
    "status": "not-observed",
    "observedCount": 0,
    "indeterminateCount": 0
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
  "durationMs": 989
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
      "sha256": "e9e5484ce550728e444c419357b0da48e4df0ebb6c033e5205397e2787a148a2"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "06aafe4ac570dde73840449a28a8cec0043efef5427d1ebe2bc5d9aa80d132ec"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "dd5e1bd5464f91d1230cb2a8d1466df36fce5a055000d554850007171860d812"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "102b7350ee3d38065fbd0f9c9dd78341a1e68d93242cc01a404035a0b795bcd4"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "97988ee3a9bd6dfd646b19dcb4f056c9ed08d85629ecf9e0339082025056ec80"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "b25b61501c657122ed4ba4715c531c4dbc2cde0ed9cba51dc2e54ad3dbd60c14"
    },
    {
      "path": "src/project-state.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "7aaa294b91193672ebc75d1c631b383a44c6a1276245eba28d9aec9b6d232139"
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
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "e674c4c27c188d969e1e73bb8226ab58312dc7b8ce270fc94f9f796d1dd6c191"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "102b7350ee3d38065fbd0f9c9dd78341a1e68d93242cc01a404035a0b795bcd4"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "b25b61501c657122ed4ba4715c531c4dbc2cde0ed9cba51dc2e54ad3dbd60c14"
    },
    {
      "path": "src/project-state.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "7aaa294b91193672ebc75d1c631b383a44c6a1276245eba28d9aec9b6d232139"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "changedPaths": [
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md",
    "moldea/moldea.yaml",
    "moldea/runtimes/custom.md"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
