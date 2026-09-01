You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: create-grounded-agent (Create a grounded agent)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Vercel AI SDK wrapper, its instruction loader, structured output, and the `classify_order` function tool to their exact existing symbols. Add no redundant runtime guide and do not invent provider, model, routing, handoff, subagent, input-schema, or refund authority. Validate the complete project.

Required judgments:
- grounds-behavior: Canonical assets reflect classification, human review, and the explicit absence of refund authority.
  Evidence sources: current-workspace, workspace-patch
- binds-direct-wrapper: The manifest binds the existing direct generateText wrapper, loader, and Output.object schema without inventing an input schema.
  Evidence sources: current-workspace, deterministic-after
- binds-function-tool: The classify_order name and implementation, registration, input-schema, and output-schema symbols match the existing closed function tool.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Created the canonical order-triage agent and exact implementation bindings. Moldea inspect passed with no diagnostics and proved all declared Vercel AI SDK relationships. TypeScript validation passed. Final Git review showed only the intended manifest and agent assets changed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md"
  ],
  "observations": [
    "The agent classifies orders as fulfillment or refund-review for human review and explicitly cannot approve refunds.",
    "Bindings use the existing symbols orderTriageAgent, loadOrderTriageInstruction, OrderTriageOutputSchema, classifyOrder, classifyOrderTool, ClassifyOrderInputSchema, and ClassifyOrderOutputSchema.",
    "No runtime guide, provider/model declaration, routing, handoff, subagent, agent input schema, or refund authority was added.",
    "Validation completed with Moldea CLI 5.0.0 inspect and TypeScript 6.0.3 typechecking."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 50,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 7
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 7
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
  "durationMs": 2707
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
      "sha256": "e5616ec25cf877a51df4c751a8b4f093491763a2b3c430d5ed8309ecc32fa461"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "2c812237c24506657aa700e37cf20e571b9c68e9a44f67b3ce056ef196ee915d"
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
      "sha256": "3d6b26670f30329b80cf1ef9b3dcec3d4e0051d35d61a4df3cb7b25f5e4f46eb"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "43fbf0264e2eb99f80193f960d3c4022e87f40711f8b05530bdcfc73f8a75aa0"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "8085593b13c0c002e4415cddc0dfedc759af6c46e492e3550413b9542adefc49"
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
      "sha256": "e5616ec25cf877a51df4c751a8b4f093491763a2b3c430d5ed8309ecc32fa461"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "2c812237c24506657aa700e37cf20e571b9c68e9a44f67b3ce056ef196ee915d"
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
