You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-tool-loop-agent-7
Case: reconcile-drift-and-boundaries (Reconcile drift and boundaries)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Reconcile implementation drift

The support agent definition was renamed, but the existing agent setup points to removed source. Reconcile its direct Vercel AI SDK runtime-agent, instruction-loader, input-schema, and output-schema bindings with the implementation that exists.

The project also assembles another tool registry dynamically. Static inspection cannot prove its final relationship. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent a tool, recreate removed source, or modify implementation code. Validate the result.

Required judgments:
- repairs-direct-bindings: Removed agent references are replaced with the existing supportAssistant, loadSupportInstruction, SupportInputSchema, and SupportOutputSchema symbols.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- records-dynamic-boundary: Dynamic tool assembly is an unresolved warning with a concrete resolution and related source, not an invented tool binding.
  Evidence sources: current-workspace, deterministic-after, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Reconciled the support agent’s runtime-agent, instruction-loader, input-schema, and output-schema bindings with the renamed Vercel AI SDK implementation. Added the required agent-level warning for dynamic tool-registry wiring. Moldea inspection and validation completed successfully with no diagnostics, and TypeScript checking passed.",
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "Bindings now target /src/support-assistant.ts symbols supportAssistant, loadSupportInstruction, SupportInputSchema, and SupportOutputSchema.",
    "Final Moldea inspect detected the runtime agent, instruction loader, and both schemas; status was valid with zero diagnostics.",
    "`moldea validate --json` and `tsc --noEmit` both passed.",
    "Pre-existing deletion of src/support-agent.ts and untracked src/support-assistant.ts and src/dynamic-tools.ts were preserved without modification."
  ],
  "unresolved": [
    "Warning `dynamic-tool-registry-relationship`: static inspection cannot establish whether the ToolSet from /src/dynamic-tools.ts#assembleTools reaches supportAssistant or which model-visible tools it contains. Resolve through closed runtime wiring or an integration test proving the connection and resulting registrations."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 34,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 6
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 6
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
  "durationMs": 2886
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
      "sha256": "70dd898ec16b544984ca6792d83b3d1512aed65a05837e03b61fb2909d33e229"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9fa5916b50ec2db879209f595df91348c576061533576ee93caf56b00a416434"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "240314584567098e89f5cf5dc0852af80d3096937a2c4c3c701e0fba8bd9b324"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "dbd3aec9e1f7ef05972e6100cffc9f1ff540504fe6c665c6330a5bc4d9749c2d"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d77670195dccbec0a77d221813aa1f51281ccfa080713f8c1b0b8dac30eb92a"
    },
    {
      "path": "src/dynamic-tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "952cdee9ce4759798f5dd6334698f45ab0a5ff79d92d7a6245401b0f56c1493f"
    },
    {
      "path": "src/support-assistant.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "7a6b9fb83863037765058231bcc6d65ea9483cb0b9ebd1a8719a31e9e3316116"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "after": [
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "70dd898ec16b544984ca6792d83b3d1512aed65a05837e03b61fb2909d33e229"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9fa5916b50ec2db879209f595df91348c576061533576ee93caf56b00a416434"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "74a4069dce9b71537fee870da7527cb513e070c89ad4467fa810b0c696e82bb9"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "dbd3aec9e1f7ef05972e6100cffc9f1ff540504fe6c665c6330a5bc4d9749c2d"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d77670195dccbec0a77d221813aa1f51281ccfa080713f8c1b0b8dac30eb92a"
    },
    {
      "path": "src/dynamic-tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "952cdee9ce4759798f5dd6334698f45ab0a5ff79d92d7a6245401b0f56c1493f"
    },
    {
      "path": "src/support-assistant.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "7a6b9fb83863037765058231bcc6d65ea9483cb0b9ebd1a8719a31e9e3316116"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": [
    "moldea/moldea.yaml"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
