You are the independent judge for a moldea adapter qualification case.

Target adapter: anthropic
Target implementation: typescript-messages-api-0-117
Case: create-grounded-agent (Create a grounded agent)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Anthropic Messages API wrapper, its instruction loader, and the `classify_order` client tool with its input schema to their exact existing symbols. Add no redundant runtime guide and do not invent output-schema, routing, handoff, subagent, agent input-schema, or refund authority. Validate the complete project.

Required judgments:
- grounds-behavior: Canonical assets reflect classification, human review, and the explicit absence of refund authority.
  Evidence sources: current-workspace, workspace-patch
- binds-direct-wrapper: The manifest binds the existing direct Messages API wrapper and system instruction loader without inventing unsupported output-schema or routing relationships.
  Evidence sources: current-workspace, deterministic-after
- binds-function-tool: The classify_order name, implementation, client-tool registration, and input-schema symbols match the existing closed tool declaration.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Created the order-triage agent and bound the Anthropic Messages wrapper, instruction loader, classify_order implementation/registration, and input schema to their exact symbols. Moldea inspect and validate completed successfully with zero diagnostics; TypeScript compilation passed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md"
  ],
  "observations": [
    "The agent classifies orders for human review and explicitly cannot approve refunds.",
    "No runtime guide, output schema, routing, handoff, subagent, agent input schema, or refund authority was added.",
    "Final Git review showed only the intended manifest modification and new agent directory."
  ],
  "unresolved": [
    "Current published Anthropic runtime compatibility and maturity were not checked because network access was prohibited; the resolver is https://packages.moldea.ai/compatibility/runtimes.json. Local CLI adapter inspection and project validation passed."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 51,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 5
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 5
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
  "durationMs": 1988
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
      "sha256": "026a01d9c50268e0203d93822471b532395014a13a66b12d82086c2469089c2f"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "bb38ded3213e5eb961429b474c612b94893ec0f7742618d9678525871725c75c"
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
      "sha256": "4309b1d099aff11e322665662633ced688f34a38a2dae15028b99c811ba0f47a"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "63e6507cbf8a79bb712e6aa88f668f04d8f66548464dbd4d27be8151e6053da3"
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
      "sha256": "026a01d9c50268e0203d93822471b532395014a13a66b12d82086c2469089c2f"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "bb38ded3213e5eb961429b474c612b94893ec0f7742618d9678525871725c75c"
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
