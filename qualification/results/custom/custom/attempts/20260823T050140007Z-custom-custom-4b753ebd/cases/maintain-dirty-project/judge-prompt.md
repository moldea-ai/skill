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
  "summary": "Added and assigned durable billing context, linked it to the billing implementation, and updated the support instruction. Custom runtime integration remains unchanged. Moldea inspection and validation are valid.",
  "commands": [
    "<workspace>/node_modules/.bin/moldea inspect --json",
    "<workspace>/node_modules/.bin/moldea validate --json",
    "git -c core.hooksPath=/dev/null -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null diff --no-ext-diff --no-textconv -- src/operator-notes.ts moldea/moldea.yaml moldea/agents/support/instruction.md",
    "git -c core.hooksPath=/dev/null -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null diff --no-index --no-ext-diff --no-textconv -- /dev/null moldea/context/billing.md",
    "git -c core.hooksPath=/dev/null -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null diff --no-index --no-ext-diff --no-textconv -- /dev/null notes/local-observation.md",
    "git -c core.hooksPath=/dev/null -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null status --short"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/instruction.md",
    "moldea/context/billing.md"
  ],
  "observations": [
    "Moldea CLI 4.0.1 validated with schemaVersion 2; both post-change inspect and validate returned status valid with no diagnostics.",
    "`/moldea/context/billing.md` is bound to `/src/billing.ts#refundWindowDays` and assigned to the `support` agent.",
    "The Custom runtime id, its guidance, and `/src/support-agent.ts#supportAgent` binding were preserved.",
    "Pre-existing unrelated changes remain: `src/operator-notes.ts` and `notes/local-observation.md`."
  ],
  "unresolved": [
    "The repository establishes a 30-day refund window but no invoice-specific policy. The billing context explicitly directs evidence-based escalation rather than inventing invoice or dispute rules."
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
  "durationMs": 989
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
      "sha256": "a4a7e75920059574dc016b2ca819241761e3523128b7f3e0a9dc5082138d2b27"
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
      "sha256": "2eabe21713dc7399fbad0ee52ad0cca82e58f7e27c005ee7e5e60af171cc50d4"
    },
    {
      "path": "moldea/context/billing.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "91321c61b96a25c8c6fa330f7c37323fa38751b05178c53382cd976faa3cb80a"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "f2e9cfcda37c88cd20bba813e4a1b1a9b26c2f533721a502227d497031f13daf"
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
      "sha256": "a4a7e75920059574dc016b2ca819241761e3523128b7f3e0a9dc5082138d2b27"
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
