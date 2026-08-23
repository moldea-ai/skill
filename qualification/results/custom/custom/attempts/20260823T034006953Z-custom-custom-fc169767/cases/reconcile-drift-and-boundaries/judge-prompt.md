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
  "summary": "Repaired `support` runtime binding to the renamed implementation and added the required agent-level dynamic-tool-registration warning. Local Moldea inspection and validation both returned valid with no diagnostics.",
  "commands": [
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= status --short --untracked-files=all",
    "node node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "node node_modules/@moldea.ai/cli/dist/moldea.js validate --json",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= diff --no-ext-diff --check && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= diff --no-ext-diff -- moldea/moldea.yaml && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= status --short --untracked-files=all"
  ],
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "The binding now points to `/src/support-assistant.ts#supportAssistant`.",
    "Post-repair `inspect --json` and `validate --json` used local CLI 4.0.1, schema 2, and returned `status: valid` with no diagnostics.",
    "No implementation files were modified; pre-existing deletion and untracked files were preserved.",
    "Final diff check reported no whitespace errors."
  ],
  "unresolved": [
    "Agent warning `dynamic-tool-registration`: static inspection cannot prove the final tool relationship. Verify `createToolRegistry` registers the tools declared for `support`, then record each supported binding. Related path: `/src/dynamic-tools.ts`."
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
  "durationMs": 980
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
      "sha256": "70e0543b06e216ea466e53dd681583d420c91ccd0c449abe791d47ebdc81044a"
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
