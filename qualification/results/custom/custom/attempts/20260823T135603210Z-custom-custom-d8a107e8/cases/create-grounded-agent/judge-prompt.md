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
  "summary": "Created and registered the custom-runtime `order-triage` agent. Its canonical description and instruction accurately limit it to classifying orders for human review; it cannot approve refunds or make financial mutations. Bound the real factory and canonical instruction loader to `src/order-triage-agent.ts#createOrderTriageAgent` and added focused custom-runtime guidance.",
  "commands": [
    "./node_modules/.bin/moldea inspect --json",
    "./node_modules/.bin/moldea compatibility --json",
    "./node_modules/.bin/moldea validate --json",
    "./node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat --no-pager diff --no-ext-diff --check",
    "git -c core.fsmonitor=false -c core.pager=cat --no-pager diff --no-ext-diff -- moldea/moldea.yaml moldea/agents/order-triage/description.md moldea/agents/order-triage/instruction.md moldea/runtimes/custom.md && git -c core.fsmonitor=false -c core.pager=cat --no-pager status --short",
    "git --no-pager diff --no-ext-diff --no-index -- /dev/null moldea/agents/order-triage/description.md; test $? -eq 1",
    "git --no-pager diff --no-ext-diff --no-index -- /dev/null moldea/agents/order-triage/instruction.md; test $? -eq 1",
    "git --no-pager diff --no-ext-diff --no-index -- /dev/null moldea/runtimes/custom.md; test $? -eq 1"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/order-triage/description.md",
    "moldea/agents/order-triage/instruction.md",
    "moldea/runtimes/custom.md"
  ],
  "observations": [
    "Moldea inspect and validate both completed with schemaVersion 2, cliVersion 4.0.1, and status valid.",
    "TypeScript validation and Git diff checks passed.",
    "No tools, provider capabilities, schemas, or refund-approval authority were invented."
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
  "durationMs": 941
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
      "sha256": "64558419679f84713821eeb0bb633a4c367e8385cbe9b37283dc3a6bf2c796b2"
    },
    {
      "path": "moldea/agents/order-triage/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "411b8164268df673d43c04398e15d94fdef7cc8249d8e64afd8acc3afca3858c"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "1b7a445120245f543b3a15f12a47f578954a591b587d03b058eed1c5001b1d80"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "50dad6fcb45b4b5fc6c43a213e97c28ef97d5b85eb60da11d6d30f45d3e978a3"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9ac9a5b8d83ee5d16423c5eceb099154e62882fc40956cfa9ed8969463027fb8"
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
    "moldea/runtimes/custom.md"
  ]
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
