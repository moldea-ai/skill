You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: repair-vercel-tool-registration (Repair Vercel tool registration)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Repair the Vercel tool registration

Project validation reports that the support agent's declared tool name does not match its closed Vercel AI SDK tools map. Use the validation evidence and repository source to reconcile the agent setup.

Preserve the direct wrapper, tool declaration, implementation, and schemas. Do not rename working source merely to match stale canonical data. Validate that the repaired project emits the complete tool evidence and no wiring diagnostic.

Required judgments:
- explains-name-mismatch: The actor explains from validation evidence and repository source that the declared tool name differs from the closed tools-map key. Repeating the internal diagnostic code is not required.
  Evidence sources: actor-output, current-workspace, deterministic-after, workspace-patch
- repairs-canonical-name: The manifest tool name becomes lookup_order, matching source without changing the valid runtime implementation.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- preserves-binding-closure: Runtime-agent, instruction-loader, agent output-schema, tool implementation, registration, input-schema, and tool output-schema bindings remain exact and evidenced.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Reconciled the support tool declaration from stale `find_order` to the runtime-registered `lookup_order`. Preserved the wrapper, declaration, implementation, and schemas. TypeScript passed; Moldea inspection and validation both returned valid with zero diagnostics, and inspection emitted complete tool-registration evidence.",
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "Final Git diff contains only the intended tool-name change.",
    "Tool evidence links `lookup_order` to `supportAgent`, `lookupOrderTool`, `lookupOrder`, `LookupOrderInputSchema`, and `LookupOrderOutputSchema`.",
    "No Vercel wiring diagnostic remains."
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
    "indeterminateCount": 4
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 4
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
  "durationMs": 2648
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
      "sha256": "74284484ccb463e9b0c7033b65cb4d9a966971adbc393719259d771d7c4a95b8"
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
      "sha256": "702ebe4b8e02f4a86c92dc413a9c0020040bf024b916729f0d9009398627ae93"
    },
    {
      "path": "src/agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "9b7f24439e024f61fffd0a6ac6df4bf25a1478fa423a4a1e9cf06b7b4a2d34c4"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "a3c3e0fda22ca5101936d9589c1dce7c3b98f5e663a51f8f51254a0bbdc17a2c"
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
      "sha256": "c2cebde94e33fb8b46b8943130764b9d1033026dca2121718ae4ab0372656065"
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
      "sha256": "702ebe4b8e02f4a86c92dc413a9c0020040bf024b916729f0d9009398627ae93"
    },
    {
      "path": "src/agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "9b7f24439e024f61fffd0a6ac6df4bf25a1478fa423a4a1e9cf06b7b4a2d34c4"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "a3c3e0fda22ca5101936d9589c1dce7c3b98f5e663a51f8f51254a0bbdc17a2c"
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
