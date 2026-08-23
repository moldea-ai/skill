You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: retire-agent-coherently (Retire an agent coherently)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Retire the removed support agent

The implementation for the `support` agent was intentionally removed before this task. Reconcile the Moldea repository so it no longer claims that the agent or its custom runtime integration exists.

Preserve the project's remaining implementation and project context. Validate the final repository and report the evidence that established which canonical files were obsolete.

Required judgments:
- removes-obsolete-declaration: The final manifest no longer declares the removed support agent, its binding, or its custom runtime guidance.
- removes-orphaned-assets: The obsolete agent description, instruction, and runtime guidance are deleted together rather than left as misleading canonical state.
- preserves-surviving-context: Project context and unrelated source remain byte-for-byte unchanged.
- validates-project: Repository FS, Repository memory, Core, CLI, and project typechecking accept the reconciled project without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Removed the obsolete `support` agent registration, its canonical assets, and its custom runtime guidance. Preserved `src/support-agent.ts` as the pre-existing implementation deletion and retained project context. Final Moldea inspection and validation both returned `valid` with CLI 4.0.1/schema 2; TypeScript check passed.",
  "commands": [
    "git -C <workspace> rev-parse --show-toplevel",
    "git -C <workspace> status --short",
    "sed -n '1,240p' package.json",
    "sed -n '1,360p' moldea/moldea.yaml",
    "sed -n '1,260p' moldea/project.md",
    "sed -n '1,360p' moldea/runtimes/custom.md",
    "git -c core.fsmonitor=false -c core.pager=cat show HEAD:src/support-agent.ts",
    "<workspace>/node_modules/.bin/moldea inspect --json",
    "<workspace>/node_modules/.bin/moldea validate --json",
    "node node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat diff --check"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md",
    "moldea/runtimes/custom.md"
  ],
  "observations": [
    "Before reconciliation, `inspect --json` returned `invalid`: `MOLDEA_REFERENCE_MISSING` for `/src/support-agent.ts` and `MOLDEA_AGENT_IDENTITY_INVALID` for `support`.",
    "The pre-existing deleted implementation formerly exported `supportAgent`; the custom runtime guidance declared that export as its runtime-owned definition.",
    "The final manifest contains only the retained project context and no agents or runtimes. Final `inspect --json` reported no diagnostics and no agents/runtimes."
  ],
  "unresolved": []
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
  "durationMs": 954
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
      "sha256": "a72f179630020433ab8401fd6db2a6bf4622f3ae5b4c0276ed244514c55d612b"
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
      "sha256": "a72f179630020433ab8401fd6db2a6bf4622f3ae5b4c0276ed244514c55d612b"
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

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
