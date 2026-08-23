You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: reconcile-drift-and-boundaries (Reconcile drift and boundaries)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Reconcile implementation drift

The support wrapper was renamed, but the Moldea repository points to removed source. Reconcile its direct Vercel AI SDK runtime-agent, instruction-loader, and output-schema bindings with the implementation that exists.

The project also assembles another tool registry dynamically. Static inspection cannot prove its final relationship. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent a tool, recreate removed source, or modify implementation code. Validate the result.

Required judgments:
- repairs-direct-bindings: Removed wrapper references are replaced with the existing supportAssistant, loadSupportInstruction, and SupportOutputSchema symbols.
- records-dynamic-boundary: Dynamic tool assembly is an unresolved warning with a concrete resolution and related source, not an invented tool binding.
- preserves-source: Existing implementation files and canonical agent assets remain unchanged, and removed source is not recreated.
- validates-project: The initially invalid project becomes valid through every deterministic layer without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Reconciled the support agent’s three Vercel AI SDK bindings to /src/support-assistant.ts and recorded the dynamic tool registry as an agent-level warning. Local Moldea inspection and validation are valid; TypeScript also passes.",
  "commands": [
    "npm --version",
    "node -e \"const p=require('./node_modules/@moldea.ai/cli/package.json'); console.log(JSON.stringify({name:p.name,version:p.version,bin:p.bin}))\" && readlink -f node_modules/@moldea.ai/cli && readlink -f node_modules/.bin/moldea",
    "node_modules/.bin/moldea inspect --json",
    "node_modules/.bin/moldea compatibility --json",
    "node_modules/.bin/moldea validate --json",
    "node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat status --short && git -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff --check && git -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff -- moldea/moldea.yaml && git -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff --stat"
  ],
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "The root-local Moldea CLI is 4.0.1; final inspect returned schemaVersion 2, command inspect, status valid, with no diagnostics.",
    "The Vercel AI SDK adapter established direct runtime-agent, instruction-loader, and agent-output-schema evidence for supportAssistant, loadSupportInstruction, and SupportOutputSchema in /src/support-assistant.ts.",
    "Pre-existing implementation changes remain preserved: src/support-agent.ts deleted; src/support-assistant.ts and src/dynamic-tools.ts untracked.",
    "The final diff is whitespace-clean."
  ],
  "unresolved": [
    "Agent warning dynamic-tool-registry: /src/dynamic-tools.ts dynamically merges tool registries, so static inspection cannot establish its relationship to the support invocation. Resolution: establish and bind a supported closed tools map at the Vercel AI SDK invocation, or verify runtime registration and record its concrete relationship."
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
  "durationMs": 2774
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
      "sha256": "82bc909d07d5673426878ba62aa41777b3e02fd6cc64cb66c3d70779aec18211"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "eeb441d0e5ff641303f0f40f24ba13e52543002bd561d488b31b2eaefdfa5539"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "754702812a8ded630d1f32164cbefe1b033ad7d197a0f0cfd7903fac2b012129"
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
      "sha256": "a855a68f89dab95710c930f6b959e65eab498089e9188934b725c2ae9f84289a"
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
      "sha256": "dd3f46194eefba2cee3ecdd486910c4af14a74d675bdfcee2131141319a5be16"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "eeb441d0e5ff641303f0f40f24ba13e52543002bd561d488b31b2eaefdfa5539"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "754702812a8ded630d1f32164cbefe1b033ad7d197a0f0cfd7903fac2b012129"
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
      "sha256": "a855a68f89dab95710c930f6b959e65eab498089e9188934b725c2ae9f84289a"
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

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
