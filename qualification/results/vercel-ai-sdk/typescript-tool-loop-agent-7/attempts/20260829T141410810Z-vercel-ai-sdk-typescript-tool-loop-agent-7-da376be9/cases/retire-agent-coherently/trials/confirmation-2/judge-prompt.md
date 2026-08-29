You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-tool-loop-agent-7
Case: retire-agent-coherently (Retire an agent coherently)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Retire the removed support agent

The direct Vercel AI SDK implementation for `support` was intentionally removed. Update the existing agent setup so it no longer claims that the agent definition, loader, input schema, output schema, or agent exists.

Preserve remaining source and project context. Remove obsolete canonical assets, validate the final repository, and report the evidence that established their obsolescence.

Required judgments:
- removes-obsolete-declaration: The final manifest no longer declares the removed agent or any Vercel agent definition, loader, input-schema, or output-schema binding.
  Evidence sources: current-workspace, deterministic-after, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Retired the obsolete canonical support agent setup. Removed its manifest registration, description, and instruction while preserving project context and the pre-existing deletion of `src/support-agent.ts`. Moldea CLI 5.0.0 inspection passed with zero agents and no diagnostics; TypeScript validation passed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md"
  ],
  "observations": [
    "The pre-existing Git diff showed `src/support-agent.ts` deleted, including the agent definition, instruction loader, and input/output schemas.",
    "`src/project-state.ts` declares `activeAgents: 0`.",
    "`moldea/project.md` states that the support agent definition was retired and remains unchanged.",
    "Before correction, Moldea inspection reported five missing-path diagnostics for the support registration; afterward it returned schema version 2, CLI 5.0.0, status `valid`, zero agents, and no diagnostics.",
    "Final residue search found no support runtime, loader, schema, agent symbol, Vercel runtime registration, or agents mapping claims.",
    "`tsc --project <workspace>/tsconfig.json --noEmit` completed successfully.",
    "Final Git diff contains the three intentional canonical changes plus the preserved pre-existing deletion of `src/support-agent.ts`. No provider, agent, model, subagent, or network access was used."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 30,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 3
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 3
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
  "durationMs": 1789
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
      "sha256": "490100fa6fe21ac6a87966262c69ab4681ec1fe07a2489882c27642c67ed9892"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "3da91596a64cdcce8810a7fa4614ffece58f82dcf623f0fbe2c60cd8497ab8e0"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "b3b00d45eee85115db161031132802440f48004b0f8bd3cdaa8493970d6e8bd7"
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
      "sha256": "3da91596a64cdcce8810a7fa4614ffece58f82dcf623f0fbe2c60cd8497ab8e0"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "b3b00d45eee85115db161031132802440f48004b0f8bd3cdaa8493970d6e8bd7"
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
