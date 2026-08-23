You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: reconcile-drift-and-boundaries (Reconcile drift and boundaries)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Reconcile implementation drift

The support runtime implementation was renamed, but the Moldea repository still points to the removed source. Reconcile the runtime-agent binding with the implementation that now exists.

The project also assembles tool registrations dynamically. Static inspection cannot prove the final tool relationship. Represent that boundary explicitly as an agent-level unresolved warning with a concrete resolution and the related source path. Do not invent a tool binding, recreate the removed file, or modify implementation code. Validate the repaired repository and inspect the final diff.

Required judgments:
- repairs-binding: The stale runtime-agent reference is updated to the existing supportAssistant export and no obsolete source is recreated.
- records-boundary: Dynamic tool registration is recorded as an unresolved warning with a concrete resolution and related source instead of an invented binding.
- preserves-source: Both pre-existing implementation files and the canonical agent assets remain unchanged.
- validates-project: The initially invalid project becomes valid through Repository FS, Repository memory, Core, CLI, and project typechecking without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Updated the support runtime-agent binding to `/src/support-assistant.ts#supportAssistant` and recorded the dynamic tool-registration boundary as an agent-level warning. Local validation and inspection both returned valid.",
  "commands": [
    "git -c core.fsmonitor=false -c core.pager=cat status --short",
    "node -e \"const p=require('./node_modules/@moldea.ai/cli/package.json'); if(p.name!=='@moldea.ai/cli'||p.version!=='4.0.1'||!p.bin?.moldea) process.exit(1); console.log(JSON.stringify({name:p.name,version:p.version,bin:p.bin.moldea}))\"",
    "readlink -f node_modules/@moldea.ai/cli/dist/moldea.js; readlink -f node_modules/.bin/moldea",
    "<workspace>/node_modules/.bin/moldea inspect --json",
    "<workspace>/node_modules/.bin/moldea validate --json",
    "git -c core.fsmonitor=false -c core.pager=cat diff --check; git -c core.fsmonitor=false -c core.pager=cat diff -- moldea/moldea.yaml; git -c core.fsmonitor=false -c core.pager=cat status --short"
  ],
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "The repository-local CLI is @moldea.ai/cli 4.0.1 and resolved from its local package.",
    "Initial inspect was invalid only because the runtime binding referenced removed `/src/support-agent.ts`.",
    "Final `validate --json` and `inspect --json` returned schemaVersion 2, cliVersion 4.0.1, and status `valid`.",
    "Final diff is limited to the intended Moldea manifest; pre-existing deletion and untracked implementation files were preserved."
  ],
  "unresolved": [
    "Agent warning `dynamic-tool-registration`: static inspection cannot establish the final support tool relationship because registration is dynamically assembled. Resolve by inspecting the registry produced by `createToolRegistry` and verifying tools registered for the support runtime; related path: `/src/dynamic-tools.ts`."
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
  "durationMs": 959
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
      "sha256": "846205b3784e4499bfe005073178835b5152f5f3eca39e0951e7a4ed3587cf50"
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
      "sha256": "dc9b1b744af115f45c3e8ca665659ac9b8305a6809a0b6e8e095501094a6b1ff"
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
      "sha256": "846205b3784e4499bfe005073178835b5152f5f3eca39e0951e7a4ed3587cf50"
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

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
