You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: create-grounded-agent (Create a grounded agent)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Create the order-triage agent

Create and register the Moldea agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Vercel AI SDK wrapper, its instruction loader, structured output, and the `classify_order` function tool to their exact existing symbols. Add no redundant runtime guide and do not invent provider, model, routing, handoff, subagent, input-schema, or refund authority. Validate the complete project.

Required judgments:
- grounds-behavior: Canonical assets reflect classification, human review, and the explicit absence of refund authority.
- binds-direct-wrapper: The manifest binds the existing direct generateText wrapper, loader, and Output.object schema without inventing an input schema.
- binds-function-tool: The classify_order name and implementation, registration, input-schema, and output-schema symbols match the existing closed function tool.
- avoids-redundant-guidance: No runtime guide is added because the integration uses supported direct patterns without repository-specific wrapper behavior.
- validates-project: Every deterministic layer accepts the completed project without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Registered the order-triage Moldea agent with grounded description and instruction, direct Vercel AI SDK bindings, structured output, and the classify_order tool bindings. No provider, agent, subagent, or network invocation occurred.",
  "commands": [
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false rev-parse --show-toplevel && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false status --short",
    "node node_modules/.bin/moldea inspect --json",
    "node node_modules/.bin/moldea compatibility --json",
    "node node_modules/.bin/moldea validate --json",
    "node node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat -c filter.lfs.required=false diff --check"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md"
  ],
  "observations": [
    "Moldea validate --json completed with schemaVersion 2, cliVersion 4.0.1, status valid, and no diagnostics.",
    "Post-change Moldea inspect --json completed valid and established Vercel AI SDK evidence for orderTriageAgent, loadOrderTriageInstruction, OrderTriageOutputSchema, and classify_order with its implementation, registration, and schemas.",
    "TypeScript validation completed successfully with tsc --noEmit.",
    "The final diff check passed; only the requested Moldea manifest and agent assets were changed."
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
  "durationMs": 2698
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
      "sha256": "c549c9cc811f7190c2832491ef2c20d0620048d5a6266baa9a55109148220170"
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
      "sha256": "5b1d0d0e134de21a876c211d6b6d2197618050c23fbbb6db779a79942b9b7c3b"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "bcf438911a9d31d7693fdcbea8c7705d8192c420cbe3f413e4a006fef3cf7802"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "62959012819128884f5e79a44cba7c23ff4f6183b5348ebd53c6145bf80a2572"
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
      "sha256": "c549c9cc811f7190c2832491ef2c20d0620048d5a6266baa9a55109148220170"
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

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
