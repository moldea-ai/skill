You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-tool-loop-agent-7
Case: repair-vercel-tool-registration (Repair Vercel tool registration)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Repair the Vercel tool registration

Project validation reports that the support agent's declared tool name does not match its closed Vercel AI SDK tools map. Use the validation evidence and repository source to reconcile the agent setup.

Preserve the direct agent definition, tool declaration, implementation, and schemas. Do not rename working source merely to match stale canonical data. Validate that the repaired project emits the complete tool evidence and no wiring diagnostic.

Required judgments:
- explains-name-mismatch: The actor explains from validation evidence and repository source that the declared tool name differs from the closed tools-map key. Repeating the internal diagnostic code is not required.
  Evidence sources: actor-output, current-workspace, deterministic-after, workspace-patch
- repairs-canonical-name: The manifest tool name becomes lookup_order, matching source without changing the valid runtime implementation.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- preserves-binding-closure: Runtime-agent, instruction-loader, agent input-schema, agent output-schema, tool implementation, registration, tool input-schema, and tool output-schema bindings remain exact and evidenced.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Updated the canonical support tool name from `find_order` to `lookup_order`, matching the closed Vercel AI SDK tools map. TypeScript validation passed. Moldea CLI 5.0.0 inspection returned schema 2, status `valid`, complete tool-registration evidence, and no diagnostics.",
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "The final tool evidence references the direct agent registration, input and output schemas, `lookupOrder` implementation, and `lookupOrderTool` declaration.",
    "Source agent, tool, implementation, instruction, and schema files were unchanged.",
    "Final Git diff contains only the intended one-line canonical name correction."
  ],
  "unresolved": []
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
  "durationMs": 2857
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
      "sha256": "0ff1bd9b3fd7e7ba0fa6485233478324b236fb61abbe20a7df730bf189c72a73"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "68bb48816e0a8353dc8ddd106f266f434db625e518dbbbf3ae67b447fafc1a5e"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "ee813c3797f0c937d4a53a54492304494fb72fba43d801f7239567b224ec7613"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "176e77ee762345f7dddcf44b8b048ebdc270a421bbf5ce76c980500536ca390b"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "c078692d9021be44146778df0e0384578260e90ad1ba2bd880048fc4e8097174"
    },
    {
      "path": "src/agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "678238ef8ea8f65d7b5141b67ca09fcd3e7f4265b61198f2bba536809080d914"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b7f90d6fa361d60310eecf7a76725b7fe4fc7ee9057c239441026b52c775a4d0"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "257a4f724e003ce2d795bb0c098238b51f32fcc9427bc28271ee236cdb84bafc"
    },
    {
      "path": "src/tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "2bf9b2c805e90dec726e7319552b45d883478d5a2d1c264b29679e18e6a6b68d"
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
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0ff1bd9b3fd7e7ba0fa6485233478324b236fb61abbe20a7df730bf189c72a73"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "68bb48816e0a8353dc8ddd106f266f434db625e518dbbbf3ae67b447fafc1a5e"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "a7ded004f12f65ab0a23e0d6c35e2e3210297b47677b1e0ac55fc4deeda0d4ad"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "176e77ee762345f7dddcf44b8b048ebdc270a421bbf5ce76c980500536ca390b"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "c078692d9021be44146778df0e0384578260e90ad1ba2bd880048fc4e8097174"
    },
    {
      "path": "src/agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "678238ef8ea8f65d7b5141b67ca09fcd3e7f4265b61198f2bba536809080d914"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b7f90d6fa361d60310eecf7a76725b7fe4fc7ee9057c239441026b52c775a4d0"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "257a4f724e003ce2d795bb0c098238b51f32fcc9427bc28271ee236cdb84bafc"
    },
    {
      "path": "src/tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "2bf9b2c805e90dec726e7319552b45d883478d5a2d1c264b29679e18e6a6b68d"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": [
    "moldea/moldea.yaml"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
