You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-tool-loop-agent-7
Case: evaluate-aligned-project (Evaluate an aligned project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Review the existing agent setup

Review whether the `support` and `summary` agents accurately represent their direct Vercel AI SDK `ToolLoopAgent` definitions, instruction loaders, call-options input schemas, structured output, and function-tool relationships.

If the project is already valid and aligned, do not edit it. Report the evidence and validation outcome. Do not infer provider, model, routing, handoff, or subagent relationships.

Required judgments:
- explains-direct-patterns: The actor accurately explains how each canonical instruction loader and input schema reaches its corresponding direct ToolLoopAgent definition using emitted evidence. Equivalent evidence-based wording passes without requiring property-name repetition.
  Evidence sources: actor-output, current-workspace, deterministic-after
- explains-closed-bindings: The actor accurately explains the declared structured-output and closed function-tool relationships. Exact helper or schema symbol repetition is not required when the relationships are unambiguous and deterministic evidence confirms them.
  Evidence sources: actor-output, current-workspace, deterministic-after
- respects-static-boundary: The actor does not infer provider, model, routing, handoff, subagent, or direct-generation runtime-pattern relationships.
  Evidence sources: actor-output, current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "The existing support and summary agent declarations are valid and aligned; no edits were needed. Moldea inspect and validate completed successfully with zero diagnostics, TypeScript type-checking passed, and the final Git diff and status were clean.",
  "changedFiles": [],
  "observations": [
    "Both canonical agents bind to their direct ToolLoopAgent definitions in src/agents.ts and to the matching instruction loaders in src/instructions.ts.",
    "Each loader reads its agent’s canonical moldea/agents/<id>/instruction.md file.",
    "SupportInputSchema and SummaryInputSchema match the respective callOptionsSchema bindings; SupportOutputSchema and SummaryOutputSchema match their Output.object structured-output bindings.",
    "The support find-order capability accurately links runtime name find_order, findOrderTool registration, findOrder implementation, and its input/output schemas. The summary agent declares and configures no function tool.",
    "@moldea.ai/cli 5.0.0 inspect and validate returned schemaVersion 2, status valid, and no diagnostics. TypeScript compilation with --noEmit exited successfully.",
    "No repository files changed; hardened final Git diff and worktree status were empty."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 35,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 1
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 1
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
  "durationMs": 2768
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "moldea/agents/summary/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "691597041e3bfbaac12f18a9194b44c9881767cabbc6a212b8d7961955d1c584"
    },
    {
      "path": "moldea/agents/summary/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "f52c42abf98299651f470d9535d955c59a1edb029cbb12980884354b6ae8263d"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "53ae7f61ec2efd17535480232f56c720e32d6239218dfe198d51cfc7b65f3f22"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "31ec265be4124fac1e491ee9a345b7e1cfead6dbd9768d98cfb98195c9038b80"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "7434225daee0c23059f391982a23353a049b77f29b85a48c79b4a1fafbad0219"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "df7f7951564fe4365c65ae1f7fbb3876c91e47f115d0d0c36cf4bf7e9acccbdb"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "e8e8684ccb4b5a79c5764f8296677a583682da57ab98e935276c89a297e9c926"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "364805ba84dc8f65b010d32248bf0c1c1028da9970afc3a3b43752298a59e3db"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "6534450b5e79e0a320732c1153b487beb1110db47e012ca8228f7b94f5ed961f"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "105dbd6ee1919d795ec1500a2f55dbc68fb42ca1f090de910e21e585952d649b"
    },
    {
      "path": "src/instructions.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "9c042be5c8af3ffc1bca210ba0fbb94d9959b823bcb6fa631fea69d71ea95333"
    },
    {
      "path": "src/tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "2c42e2375f3e3c5277a25f3fb72f03562977efab47573f640e9abd954ea2b2f7"
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
      "path": "moldea/agents/summary/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "691597041e3bfbaac12f18a9194b44c9881767cabbc6a212b8d7961955d1c584"
    },
    {
      "path": "moldea/agents/summary/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "f52c42abf98299651f470d9535d955c59a1edb029cbb12980884354b6ae8263d"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "53ae7f61ec2efd17535480232f56c720e32d6239218dfe198d51cfc7b65f3f22"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "31ec265be4124fac1e491ee9a345b7e1cfead6dbd9768d98cfb98195c9038b80"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "7434225daee0c23059f391982a23353a049b77f29b85a48c79b4a1fafbad0219"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "df7f7951564fe4365c65ae1f7fbb3876c91e47f115d0d0c36cf4bf7e9acccbdb"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "e8e8684ccb4b5a79c5764f8296677a583682da57ab98e935276c89a297e9c926"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "364805ba84dc8f65b010d32248bf0c1c1028da9970afc3a3b43752298a59e3db"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "6534450b5e79e0a320732c1153b487beb1110db47e012ca8228f7b94f5ed961f"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "105dbd6ee1919d795ec1500a2f55dbc68fb42ca1f090de910e21e585952d649b"
    },
    {
      "path": "src/instructions.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "9c042be5c8af3ffc1bca210ba0fbb94d9959b823bcb6fa631fea69d71ea95333"
    },
    {
      "path": "src/tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "2c42e2375f3e3c5277a25f3fb72f03562977efab47573f640e9abd954ea2b2f7"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": []
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
