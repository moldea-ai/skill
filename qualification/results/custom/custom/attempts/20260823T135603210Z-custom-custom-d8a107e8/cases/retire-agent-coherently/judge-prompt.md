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
  "summary": "Retired the removed support agent from canonical Moldea state. The final local Moldea inspection and validation both returned valid, and TypeScript validation passed.",
  "commands": [
    "git -C <workspace> rev-parse --show-toplevel && git -C <workspace> status --porcelain=v1 -uall && git -C <workspace> diff --no-ext-diff --no-textconv -- src/support-agent.ts moldea && git -C <workspace> diff --cached --no-ext-diff --no-textconv -- src/support-agent.ts moldea",
    "<workspace>/node_modules/.bin/moldea inspect --json",
    "<workspace>/node_modules/.bin/moldea validate --json",
    "./node_modules/.bin/tsc --noEmit",
    "git -C <workspace> -c core.fsmonitor=false -c core.pager=cat status --short && git -C <workspace> -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff --no-textconv --check && git -C <workspace> -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff --no-textconv -- moldea src/support-agent.ts"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md",
    "moldea/runtimes/custom.md"
  ],
  "observations": [
    "`src/support-agent.ts` was already deleted before this work.",
    "Initial isolated `moldea inspect --json` was invalid: it identified the missing `/src/support-agent.ts` runtime binding and invalid support instruction identity.",
    "Canonical search established that the manifest entry, two support-agent files, and `moldea/runtimes/custom.md` were the obsolete active claims. `moldea/project.md` accurately preserves the historical removal and was retained.",
    "Final `moldea inspect --json` and `moldea validate --json` returned schemaVersion 2, cliVersion 4.0.1, status valid, with no diagnostics.",
    "No provider, agent, model, subagent, network, package-manager, or mounted-input operations were used."
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
  "durationMs": 927
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
      "sha256": "1fa482fee547bcff836bb43f05a9e3f6d662418e668f45b477ca19e0366425f0"
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
      "sha256": "1fa482fee547bcff836bb43f05a9e3f6d662418e668f45b477ca19e0366425f0"
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
