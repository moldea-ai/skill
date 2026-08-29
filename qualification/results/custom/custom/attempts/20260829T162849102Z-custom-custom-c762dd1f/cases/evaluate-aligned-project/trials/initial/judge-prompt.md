You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: evaluate-aligned-project (Evaluate an aligned project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Review the existing agent setup

Review whether the `support` agent is correctly described by the project, including its custom runtime guidance and connection to the implementation.

If the setup is already valid and agrees with the source, do not edit it. Report the evidence you used, the validation outcome, and any unresolved issue that genuinely remains.

Required judgments:
- explains-alignment: The actor identifies the registered agent, custom runtime guidance, and explicit runtime binding using repository evidence.
  Evidence sources: actor-output, current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "The support agent setup is structurally valid and agrees with the available source, so no files were edited. Moldea inspect and validate both returned valid schema-2 envelopes from CLI 5.0.0 with no diagnostics; TypeScript compilation also passed. The final Git diff and status were empty.",
  "changedFiles": [],
  "observations": [
    "The manifest registers support with custom runtime guidance and binds runtimeAgent to /src/support-agent.ts symbol supportAgent.",
    "The implementation exports supportAgent with id \"support\" and channel \"email\", matching the canonical agent identity, email-channel description, and custom runtime guidance.",
    "The custom guidance accurately identifies the exported record as runtime-owned and says to preserve its identifier and channel.",
    "The canonical instruction identifies the support agent and defines evidence-based answering and escalation behavior.",
    "No handoff description, mirrors, capabilities, variables, or unresolved requirements are declared or required by the observed structure."
  ],
  "unresolved": [
    "The repository contains no model-invocation or instruction-loading implementation, so runtime consumption of the canonical instruction cannot be established. This is an evidence limitation, not a demonstrated mismatch with the modeled implementation."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 18,
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
  "durationMs": 1012
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
      "sha256": "fa1eeb2a45f10e778cdd6fdf6542925d77df0de23ab9e95db5af8e6e4f2021a6"
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
      "sha256": "cb446ea5b8a9e72ba1f6eef36f71206223b9f63c34f26bc85f932af65f4a4018"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9ca53f8e82d8afdbe5648f48ac4ab694558c0cef2007054ac0c2314c264c1edd"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "6c40368c46514e46a2efe08677f2425c2195e801d5f0d249cd443228e86329dd"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b4e8f8dad200ab6c94e37c4698f3fff97c0476fc4d86fa124a054abf2d25076e"
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
      "sha256": "e9e5484ce550728e444c419357b0da48e4df0ebb6c033e5205397e2787a148a2"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "fa1eeb2a45f10e778cdd6fdf6542925d77df0de23ab9e95db5af8e6e4f2021a6"
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
      "sha256": "cb446ea5b8a9e72ba1f6eef36f71206223b9f63c34f26bc85f932af65f4a4018"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9ca53f8e82d8afdbe5648f48ac4ab694558c0cef2007054ac0c2314c264c1edd"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "6c40368c46514e46a2efe08677f2425c2195e801d5f0d249cd443228e86329dd"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b4e8f8dad200ab6c94e37c4698f3fff97c0476fc4d86fa124a054abf2d25076e"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "changedPaths": []
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
