You are the independent judge for a moldea adapter qualification case.

Target adapter: anthropic
Target implementation: typescript-messages-api-0-117
Case: retire-agent-coherently (Retire an agent coherently)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Retire the removed support agent

The direct Anthropic Messages API implementation for `support` was intentionally removed. Update the existing agent setup so it no longer claims that the wrapper, loader, or agent exists.

Preserve remaining source and project context. Remove obsolete canonical assets, validate the final repository, and report the evidence that established their obsolescence.

Required judgments:
- removes-obsolete-declaration: The final manifest no longer declares the removed agent or any Anthropic wrapper or instruction-loader binding.
  Evidence sources: current-workspace, deterministic-after, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Retired the obsolete canonical `support` agent registration and deleted its description and instruction assets. Preserved the pre-existing deletion of `src/support-agent.ts` and all remaining project context. Final Moldea inspection and TypeScript validation passed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md"
  ],
  "observations": [
    "The pre-existing `src/support-agent.ts` deletion removed the Anthropic Messages API wrapper and the exported `supportAgent` and `loadSupportInstruction` symbols.",
    "Before correction, Moldea CLI 5.0.0 inspection returned `invalid` with three diagnostics: missing runtime-agent binding, missing instruction-loader binding, and missing affectedBy path, all referencing `/src/support-agent.ts`.",
    "After correction, Moldea inspection returned schema 2, status `valid`, and zero diagnostics; its project inventory contains no agents.",
    "`tsc --noEmit` completed successfully.",
    "Final repository search found no remaining canonical or source references to `supportAgent`, `loadSupportInstruction`, `/src/support-agent.ts`, or the support agent assets.",
    "Final Git diff confirmed only the requested canonical retirement plus the preserved pre-existing deletion of `src/support-agent.ts`; no unrelated or untracked changes appeared.",
    "The shared `moldea/project.md` context and existing Anthropic SDK dependency were intentionally retained because neither claims that the removed wrapper, loader, or agent exists."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 36,
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
  "durationMs": 1852
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
      "sha256": "34c2c851afb361fee178242324c8902b3f0590e5d0630244f652e491c16a44ec"
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
      "sha256": "ae7a45f9d5516b6fa376e61a09618ec999b0dd613b86115741eb2b3b95733081"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "4c9e1bab9a858d285167de430f9dfd402fd9af153e7c66d0350ab804d7cf1ef0"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "447b5043405bfe3428220417089aeddae0b03a5bf34756b0463f3be7b4fda167"
    },
    {
      "path": "src/project-state.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d435f63800a2a268830b9a78c5da763ece38e72ca1a7416245ca210661de2bd"
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
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "09bfcc6a14b83e2192b8673677725c84883ee9cd0c70e45c9ec09daa8f2b2847"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "4c9e1bab9a858d285167de430f9dfd402fd9af153e7c66d0350ab804d7cf1ef0"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "447b5043405bfe3428220417089aeddae0b03a5bf34756b0463f3be7b4fda167"
    },
    {
      "path": "src/project-state.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d435f63800a2a268830b9a78c5da763ece38e72ca1a7416245ca210661de2bd"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": [
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md",
    "moldea/moldea.yaml"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
