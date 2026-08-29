You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-tool-loop-agent-7
Case: create-grounded-agent (Create a grounded agent)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Vercel AI SDK agent definition, its instruction loader, call-options input schema, structured output, and the `classify_order` function tool to their exact existing symbols. Add no redundant runtime guide and do not invent provider, model, routing, handoff, subagent, or refund authority. Validate the complete project.

Required judgments:
- grounds-behavior: Canonical assets reflect classification, human review, and the explicit absence of refund authority.
  Evidence sources: current-workspace, workspace-patch
- binds-direct-agent: The manifest binds the existing direct ToolLoopAgent definition, loader, callOptionsSchema input, and Output.object output schema.
  Evidence sources: current-workspace, deterministic-after
- binds-function-tool: The classify_order name and implementation, registration, input-schema, and output-schema symbols match the existing closed function tool.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Created the canonical order-triage agent and bound the existing Vercel AI SDK runtime agent, instruction loader, input/output schemas, and classify_order tool symbols. TypeScript compilation, Moldea inspection, and complete Moldea validation passed with zero diagnostics.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md"
  ],
  "observations": [
    "Canonical state changed only for the new order-triage agent; project foundation and source implementation remained unchanged.",
    "Adapter evidence confirmed all requested direct bindings, including classifyOrderTool registration under classify_order.",
    "No runtime guide, provider/model declaration, routing, handoff, subagent, or refund authority was added.",
    "The tracked Git diff and exact contents of the new untracked files were reviewed; the evaluator prohibited a no-index Git diff for those untracked files."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 33,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 6
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 6
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
  "durationMs": 3491
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
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
      "sha256": "47ef4ec4b1d3eabce19caaf0f5dcfe301880638ecb78f1ff07f95e6eb11fc848"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "8736dc37152c61454d33679087e5259b64dd24ae2a5c00ab3149e5a286617f54"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "03f4244e2459fe6abc4cbec87dbedcb1aaa494467951f8371c70eef8a83ec6ce"
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
      "path": "moldea/agents/order-triage/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "24bc9cc86c4257d6e6b4eb602f6da31057a043af519b1ce9ab507cb74d80765c"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "b838878f258287cc15e5514f588f4d2929e0b19cd0870a9216b80fb63b535105"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "ebcb1943dbca2e9a91cbca90f8c2f675e649302d694645419b3f8e7f3b8d27ef"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "47ef4ec4b1d3eabce19caaf0f5dcfe301880638ecb78f1ff07f95e6eb11fc848"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "8736dc37152c61454d33679087e5259b64dd24ae2a5c00ab3149e5a286617f54"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "03f4244e2459fe6abc4cbec87dbedcb1aaa494467951f8371c70eef8a83ec6ce"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": [
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/moldea.yaml"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
