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
  "summary": "Created and registered the order-triage agent, grounded its description and instruction in human-review classification with no refund approval authority, and bound the existing Vercel AI SDK wrapper, instruction loader, structured output schema, and classify_order tool symbols. Moldea inspect/validate and TypeScript type-checking passed. Final Git status and diff were reviewed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md"
  ],
  "observations": [
    "Moldea inspection detected orderTriageAgent as a direct generateText wrapper, loadOrderTriageInstruction as wired instructions, OrderTriageOutputSchema as agent output, and classify_order as a function tool with its existing implementation, registration, input-schema, and output-schema symbols.",
    "No runtime guide, provider, model, routing, handoff, subagent, agent input schema, or refund authority was added.",
    "Canonical Moldea state changed only to register and describe the requested agent; unrelated project state remained unchanged.",
    "Validation passed: `moldea inspect --json`, `moldea validate --json`, and `tsc -p tsconfig.json`."
  ],
  "unresolved": [
    "Live provider and runtime behavior was not established because no provider was called and the agent was not run, as required."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 24,
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
  "durationMs": 3072
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
      "sha256": "c133df904319d9be5560272f86d5fae893619da0525bc7d44eb92a7f41465e0a"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "282266ea4e164e6d6dd1bdfff5eb00541e3fe66c5e8bff70f704b2eef0895512"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "d6cc29821476483060cfed07e0e3a320b0e7ce11a190f95358cf5a4f41852d61"
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
