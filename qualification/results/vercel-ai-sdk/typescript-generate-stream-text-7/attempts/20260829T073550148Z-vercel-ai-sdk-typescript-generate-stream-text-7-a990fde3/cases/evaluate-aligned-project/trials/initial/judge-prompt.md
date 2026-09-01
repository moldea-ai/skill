You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: evaluate-aligned-project (Evaluate an aligned project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Review the existing agent setup

Review whether the `support` and `summary` agents accurately represent their direct Vercel AI SDK generation wrappers, instruction loaders, structured output, and function-tool relationships.

If the project is already valid and aligned, do not edit it. Report the evidence and validation outcome. Do not infer provider, model, routing, handoff, subagent, or agent input-schema relationships.

Required judgments:
- explains-direct-patterns: The actor accurately explains how each canonical instruction loader reaches its corresponding direct generation wrapper using emitted evidence. Equivalent evidence-based wording passes without requiring property-name repetition.
  Evidence sources: actor-output, current-workspace, deterministic-after
- explains-closed-bindings: The actor accurately explains the declared structured-output and closed function-tool relationships. Exact helper or schema symbol repetition is not required when the relationships are unambiguous and deterministic evidence confirms them.
  Evidence sources: actor-output, current-workspace, deterministic-after
- respects-static-boundary: The actor does not infer provider, model, routing, handoff, subagent, agent-definition, or agent input-schema relationships.
  Evidence sources: actor-output, current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "The support and summary agent declarations are valid and aligned with their direct Vercel AI SDK wrappers. No repository edits were needed. Moldea inspection and validation returned valid with no diagnostics; TypeScript compilation passed; the final Git diff and status were clean.",
  "changedFiles": [],
  "observations": [
    "supportAgent calls generateText, loads the canonical support instruction, uses SupportOutputSchema through Output.object, and registers findOrderTool as find_order.",
    "summaryAgent calls streamText, loads the canonical summary instruction, and uses SummaryOutputSchema through Output.object.",
    "findOrderTool binds FindOrderInputSchema, FindOrderOutputSchema, and the findOrder implementation exactly as declared in moldea/moldea.yaml.",
    "Canonical instruction loaders read the corresponding support and summary instruction.md files directly.",
    "No provider, model, routing, handoff, subagent, or agent input-schema relationships were inferred."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 37,
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
  "durationMs": 3064
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
      "sha256": "6d5a467d09fb056383d41c8588a826bac6ca6a50356ecd168742e5f16c152c5f"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "8302c2755449ab2d3b84c4d07462876909dc1fc768eb28920a0d4a7ac26aa42e"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "c3df151d768b88b01a512a284493a488e3001ad3e5217e02b043c7277e56025e"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "fe2887aaac97c0fb197e9a64b2231accf06a55ea0ed9cbe00abfc6652e51a5d1"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "1b797dac0e4896b2d780b54ca00f82c95571be6b47ed0cb99ed48dc09c6c7114"
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
      "sha256": "6d5a467d09fb056383d41c8588a826bac6ca6a50356ecd168742e5f16c152c5f"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "8302c2755449ab2d3b84c4d07462876909dc1fc768eb28920a0d4a7ac26aa42e"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "c3df151d768b88b01a512a284493a488e3001ad3e5217e02b043c7277e56025e"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "fe2887aaac97c0fb197e9a64b2231accf06a55ea0ed9cbe00abfc6652e51a5d1"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "1b797dac0e4896b2d780b54ca00f82c95571be6b47ed0cb99ed48dc09c6c7114"
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
