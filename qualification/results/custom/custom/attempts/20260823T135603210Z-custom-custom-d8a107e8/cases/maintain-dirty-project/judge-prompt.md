You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: maintain-dirty-project (Maintain a dirty project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Add billing context safely

The support agent now needs durable guidance for billing disputes. Add a canonical context document at `moldea/context/billing.md`, register its relationship to the billing implementation, assign it to the `support` agent, and update the canonical agent instruction so the context is used for refund and invoice questions.

The working tree already contains unrelated tracked and untracked developer work. Preserve it exactly. Keep the existing Custom runtime integration intact, validate the final repository with Moldea, and inspect the complete Git diff before finishing.

Required judgments:
- adds-context: The billing context is canonical, registered globally, and assigned to the support agent with an explicit affected path.
- updates-instruction: The agent instruction explains when the new billing context should be used while preserving its required opening identity.
- preserves-dirty-state: The unrelated project agent policy, tracked operator note, and untracked local observation remain byte-for-byte unchanged.
- validates-project: Repository FS, Repository memory, Core, CLI, and project typechecking all confirm the final project without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Added and registered billing guidance for the support agent; the Custom runtime integration remains unchanged. Moldea validation and post-change inspection both returned valid.",
  "commands": [
    "node node_modules/.bin/moldea validate --json",
    "node node_modules/.bin/moldea inspect --json",
    "git -c core.fsmonitor=false -c core.pager=cat -c core.autocrlf=false diff --no-ext-diff --check"
  ],
  "changedFiles": [
    "moldea/context/billing.md",
    "moldea/moldea.yaml",
    "moldea/agents/support/instruction.md"
  ],
  "observations": [
    "The billing context is bound to /src/billing.ts#refundWindowDays and assigned to support.",
    "The instruction directs refund and invoice questions to the canonical billing context.",
    "Pre-existing src/operator-notes.ts modification and notes/local-observation.md untracked file were preserved.",
    "The complete tracked diff and the new billing-context diff were inspected."
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
  "durationMs": 999
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": ".agents/project-policy.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "3c82f56b8773308f09cb495e8cb63f4c46282c3afbf0f98ba19473f695fdc5c0"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "73a65e696b94b9f8ba5456b85eb96fc0f3f9884bc7f0ccc051297b776b75a823"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "da111540e94c8cf9c74126bf78465a2675e6115dca4bee59ff7f1013390e2f62"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "8d3c980f8f93e85b7ad87d95acac2d2529f9c3b204ff9c659ae4425e8c69673e"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a33c8d33962f1af17c07b8f2ba2ad3655fff0bcd7f2d48a1d9972229c66bb59e"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "34c2c6199b14ad2aa8d25ebdc8abbef949ebec518c7f118d9730355ed41705dc"
    },
    {
      "path": "notes/local-observation.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "6cfe99cfca4749f42bfdd8286fa787c634d83876a49ff0a71fc075ea9141f645"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "3bc02f09d689d050464034f0ca67dba1100555c1f8f8ded8d4bd929a24e71725"
    },
    {
      "path": "src/billing.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "604a74af1637a10da3861d7598aeebc28d51ce50309cb0c8084e488fe2e2d2ec"
    },
    {
      "path": "src/operator-notes.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "8c6e077196c58296cec28d8e7020d5aeda365f0518d2c7bad8bd89d964d71e3b"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b4e8f8dad200ab6c94e37c4698f3fff97c0476fc4d86fa124a054abf2d25076e"
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
      "path": ".agents/project-policy.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "3c82f56b8773308f09cb495e8cb63f4c46282c3afbf0f98ba19473f695fdc5c0"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "73a65e696b94b9f8ba5456b85eb96fc0f3f9884bc7f0ccc051297b776b75a823"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "3ed13d5e0bc1bd8b24f02b37310da1748aa7b483fb11dbc9539b56622be87f35"
    },
    {
      "path": "moldea/context/billing.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "30f80714cdfb4cc291e5d02fdb756edd84805f05eb83f2081a7c71e19093ed01"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "9da36563a857671695fe5c6f7fa4c94ae9c549793addead073083533414ffd7c"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a33c8d33962f1af17c07b8f2ba2ad3655fff0bcd7f2d48a1d9972229c66bb59e"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "34c2c6199b14ad2aa8d25ebdc8abbef949ebec518c7f118d9730355ed41705dc"
    },
    {
      "path": "notes/local-observation.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "6cfe99cfca4749f42bfdd8286fa787c634d83876a49ff0a71fc075ea9141f645"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "3bc02f09d689d050464034f0ca67dba1100555c1f8f8ded8d4bd929a24e71725"
    },
    {
      "path": "src/billing.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "604a74af1637a10da3861d7598aeebc28d51ce50309cb0c8084e488fe2e2d2ec"
    },
    {
      "path": "src/operator-notes.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "8c6e077196c58296cec28d8e7020d5aeda365f0518d2c7bad8bd89d964d71e3b"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b4e8f8dad200ab6c94e37c4698f3fff97c0476fc4d86fa124a054abf2d25076e"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "changedPaths": [
    "moldea/agents/support/instruction.md",
    "moldea/context/billing.md",
    "moldea/moldea.yaml"
  ]
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
