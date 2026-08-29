You are the independent judge for a moldea adapter qualification case.

Target adapter: anthropic
Target implementation: typescript-messages-api-0-117
Case: repair-anthropic-tool-registration (Repair Anthropic tool registration)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Repair the Anthropic tool registration

Project validation reports that the support agent's declared tool name does not match its closed Anthropic Messages API client-tool array. Use the validation evidence and repository source to reconcile the agent setup.

Preserve the direct wrapper, tool declaration, implementation, and input schema. Do not rename working source merely to match stale canonical data. Validate that the repaired project emits the complete tool evidence and no wiring diagnostic.

Required judgments:
- explains-name-mismatch: The actor explains from validation evidence and repository source that the declared tool name differs from the closed client-tool name. Repeating the internal diagnostic code is not required.
  Evidence sources: actor-output, current-workspace, deterministic-after, workspace-patch
- repairs-canonical-name: The manifest tool name becomes lookup_order, matching source without changing the valid runtime implementation.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- preserves-binding-closure: Runtime-agent, instruction-loader, client-tool registration, and input-schema bindings remain exact and evidenced while the implementation reference remains unchanged.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Reconciled the support agent’s canonical tool name from `find_order` to the runtime-backed `lookup_order`. Preserved the wrapper, tool declaration, implementation, and input schema. TypeScript validation passed. Moldea inspection returned schema 2, CLI 5.0.0, status `valid`, complete Anthropic tool-registration and schema evidence, and zero diagnostics.",
  "changedFiles": [
    "moldea/moldea.yaml"
  ],
  "observations": [
    "Final Git diff contains only the intended one-line canonical name correction.",
    "Anthropic evidence identifies the closed client tool as `lookup_order` and links `/src/agent.ts`, `lookupOrderTool`, `LookupOrderInputSchema`, and the Messages API pattern.",
    "The working tree was initially clean; only `moldea/moldea.yaml` is now modified."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 39,
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
  "durationMs": 1974
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
      "sha256": "6430f285c3eacd685354785537500d5a2c713af2a89a3994da0d9d4ad6ca16f6"
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
      "sha256": "46be5f9be366d970fb696c94106d610ce633eff351302cfd5fbc8afde922d650"
    },
    {
      "path": "src/agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "ec131f7c09cdd881a8c6997e2caa4ab7f4148ac8b9c52ef65d3aee9b31ac596a"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "825b297f3c463be96390aeb678951a3151399f5305b4eb59976e6cd00895eb99"
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
      "sha256": "f0f530df57ced5372d74de4b6e899d8408b9fd7be8777fd8608110865684adda"
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
      "sha256": "a684703ff979be20529eede273c1a2e6d1bac77a001d2e1fe12bda7bd0fccaa6"
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
      "sha256": "46be5f9be366d970fb696c94106d610ce633eff351302cfd5fbc8afde922d650"
    },
    {
      "path": "src/agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "ec131f7c09cdd881a8c6997e2caa4ab7f4148ac8b9c52ef65d3aee9b31ac596a"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "825b297f3c463be96390aeb678951a3151399f5305b4eb59976e6cd00895eb99"
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
      "sha256": "f0f530df57ced5372d74de4b6e899d8408b9fd7be8777fd8608110865684adda"
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
