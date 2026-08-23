You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: evaluate-aligned-project (Evaluate an aligned project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Evaluate the existing Moldea project

Inspect this project with the candidate Moldea skill and CLI. Determine whether the `support` and `summary` agents accurately represent their direct Vercel AI SDK generation wrappers, instruction loaders, structured output, and function-tool relationships.

If the project is already valid and aligned, do not edit it. Report the evidence and validation commands you used. Do not infer provider, model, routing, handoff, subagent, or agent input-schema relationships.

Required judgments:
- explains-direct-patterns: The actor distinguishes the direct generateText instructions relationship from the direct streamText system fallback using emitted evidence.
- explains-closed-bindings: The actor identifies Output.object and the exact closed function-tool implementation, registration, and schema relationships.
- respects-static-boundary: The actor does not infer provider, model, routing, handoff, subagent, agent-definition, or agent input-schema relationships.
- validates-without-churn: Repository FS, Repository memory, Core, CLI, and project typechecking accept the project without mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "No edits were needed. `support` and `summary` are aligned with their direct Vercel AI SDK generation wrappers: canonical instructions are loaded and awaited at invocation, declared output schemas are supplied through `Output.object`, and support’s declared `find-order` function tool matches its registration, schemas, and implementation. No provider, model, routing, handoff, subagent, or agent-input-schema relationship was inferred or assessed.",
  "commands": [
    "node_modules/.bin/moldea inspect --json",
    "node_modules/.bin/moldea validate --json",
    "node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.autocrlf=false status --short && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.autocrlf=false diff --check && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.autocrlf=false diff --no-ext-diff --exit-code && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.autocrlf=false diff --cached --no-ext-diff --exit-code"
  ],
  "changedFiles": [],
  "observations": [
    "Repository-local Moldea CLI was verified as exact version 4.0.1.",
    "`inspect --json` returned schemaVersion 2, status `valid`, and no diagnostics; adapter evidence detected both instruction loaders, both output schemas, support `generateText`, summary `streamText`, and support’s function-tool registration.",
    "`validate --json` returned schemaVersion 2, status `valid`, and no diagnostics.",
    "TypeScript validation passed.",
    "Final Git status and staged/unstaged diffs are empty."
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
  "durationMs": 2764
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
      "sha256": "3f7eda41341ab7fc796b8f12cde91281a4751a59de50102fdc28f5dddbf9b4d6"
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
      "sha256": "3f7eda41341ab7fc796b8f12cde91281a4751a59de50102fdc28f5dddbf9b4d6"
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

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
