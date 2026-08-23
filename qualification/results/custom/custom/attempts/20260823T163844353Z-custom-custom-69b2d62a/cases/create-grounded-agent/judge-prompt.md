You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: create-grounded-agent (Create a grounded agent)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Create the order-triage agent

Create and register the Moldea agent implemented by `createOrderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the actual implementation: it classifies orders for human review and cannot approve refunds.

Use the project's custom runtime, establish the real runtime-agent binding and affected source path, add only useful project-local runtime guidance, and validate the complete project. Do not invent tools, provider capabilities, or decision authority.

Required judgments:
- grounds-behavior: The canonical description and instruction reflect order classification, human review, and the explicit lack of refund authority.
- binds-implementation: The manifest binds the order-triage agent to the existing createOrderTriageAgent export and affected source.
- defines-runtime-guidance: The manifest references the sole new runtime-guidance file under /moldea/runtimes/**/*.md, which explains that the runtime-owned loader supplies the canonical instruction path and content to the factory without inventing provider behavior.
- validates-project: Repository FS, Repository memory, Core, CLI, and project typechecking accept the completed agent without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Registered the custom-runtime order-triage agent, with grounded description/instructions and a real binding to `createOrderTriageAgent`. Local Moldea validation and TypeScript type-checking pass.",
  "commands": [
    "node <workspace>/node_modules/.pnpm/@moldea.ai+cli@file+..+..+..+..+candidates+cec33cf7c7c0f02a797e8ea3eb83f221acc6d7232a4c_5d97d9f54190ef580c69b9544e258ed9/node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "node <workspace>/node_modules/.pnpm/typescript@file+..+..+..+..+candidates+cec33cf7c7c0f02a797e8ea3eb83f221acc6d7232a4c478d_01542eff990d6fcb1ea061773b96e0de/node_modules/typescript/bin/tsc --project tsconfig.json",
    "node <workspace>/node_modules/.pnpm/@moldea.ai+cli@file+..+..+..+..+candidates+cec33cf7c7c0f02a797e8ea3eb83f221acc6d7232a4c_5d97d9f54190ef580c69b9544e258ed9/node_modules/@moldea.ai/cli/dist/moldea.js validate --json",
    "git -c core.fsmonitor=false -c core.pager=cat status --short\ngit -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff --check\ngit -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff -- moldea/moldea.yaml moldea/agents/order-triage/description.md moldea/agents/order-triage/instruction.md moldea/runtimes/custom-runtime.md"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/runtimes/custom-runtime.md"
  ],
  "observations": [
    "The agent is registered with runtime `custom`, bound to `/src/order-triage-agent.ts#createOrderTriageAgent`, and affected by that exact source path.",
    "Its description and instruction state only supported behavior: classify orders for human review; never approve refunds or perform financial mutations.",
    "The custom runtime guidance records canonical instruction loading and explicitly avoids inferring a provider, tools, schemas, or loader implementation.",
    "Final `validate --json` returned status `valid` with no diagnostics; TypeScript completed successfully."
  ],
  "unresolved": [
    "The repository establishes only a runtime-owned instruction-loader parameter, not a concrete loader implementation, invocation path beyond the factory, provider integration, input/output schema, or tools. This is recorded in project-local runtime guidance and no unsupported bindings were added."
  ]
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
  "durationMs": 968
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
      "sha256": "7c7899735df7f1b9c19eb17a5a6100cf3a5246eb56ee6fa14145e36125ef0d0d"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "50dad6fcb45b4b5fc6c43a213e97c28ef97d5b85eb60da11d6d30f45d3e978a3"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "30fb686590791996816feacb47bf4640aa9ee9c342c4058905aeadd151e22f4a"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "60e1b6134b661c45f4dc421c706d7a2420a9e4ec8709a2cc5a5f3a0a0de21859"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
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
      "sha256": "e26a07ce2109fdcb2e7747ac6f1093a7663f3caca2fa4404a16c2538875bc12c"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "9b6c673c66f24300b73d36254828844aa498f67ea8ac3d9dbcb6dafb44d9600b"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "50dad6fcb45b4b5fc6c43a213e97c28ef97d5b85eb60da11d6d30f45d3e978a3"
    },
    {
      "path": "moldea/runtimes/custom-runtime.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "f0e842f8049197dd6ffd222bc577804099d9bf9d06517ce206b1da0475aad94b"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "30fb686590791996816feacb47bf4640aa9ee9c342c4058905aeadd151e22f4a"
    },
    {
      "path": "src/order-triage-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "60e1b6134b661c45f4dc421c706d7a2420a9e4ec8709a2cc5a5f3a0a0de21859"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "changedPaths": [
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/moldea.yaml",
    "moldea/runtimes/custom-runtime.md"
  ]
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
