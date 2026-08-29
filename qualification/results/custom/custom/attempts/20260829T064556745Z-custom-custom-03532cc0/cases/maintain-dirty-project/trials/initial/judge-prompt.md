You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: maintain-dirty-project (Maintain a dirty project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Add billing context safely

The support agent now needs durable guidance for billing disputes. Update the existing agent setup so this context is connected to the billing implementation and used by the `support` agent for refund and invoice questions.

The working tree already contains unrelated tracked and untracked developer work. Preserve it exactly. Keep the existing Custom runtime integration intact, validate the final project, and inspect the complete Git diff before finishing.

Required judgments:
- adds-context: The billing context is canonical, registered globally, and assigned to the support agent with an explicit affected path.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- updates-instruction: The agent instruction explains when the new billing context should be used while preserving its required opening identity.
  Evidence sources: current-workspace, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Added canonical billing-dispute guidance, bound it to `/src/billing.ts#refundWindowDays`, and connected it to the `support` agent for refund and invoice questions. Preserved the existing Custom runtime configuration. Moldea inspect/validate and TypeScript validation passed; the complete tracked diff and untracked files were reviewed.",
  "changedFiles": [
    "moldea/context/billing.md",
    "moldea/moldea.yaml",
    "moldea/agents/support/instruction.md"
  ],
  "observations": [
    "Moldea CLI 5.0.0 reported a valid format-version-1 project with no diagnostics.",
    "`tsc --project tsconfig.json` completed successfully.",
    "Pre-existing changes in `src/operator-notes.ts` and `notes/local-observation.md` were preserved exactly.",
    "The Custom runtime remains configured with `id: custom`, `/moldea/runtimes/custom.md`, and the existing `/src/support-agent.ts#supportAgent` binding."
  ],
  "unresolved": [
    "Repository evidence does not expose an executable instruction/context loader, so deterministic validation proves the canonical relationship but not runtime consumption beyond the existing Custom runtime guidance."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 53,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 3
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 3
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
  "durationMs": 1077
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
      "sha256": "f31f4d3ae06bd859d68bcf7b6f5bb1bd494d35a10540a0e8dadf453db49a1235"
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
      "sha256": "a176dc47d3976e1fd01f285353319aebe0e3b9fb2c9c581b9d2bd1386e7c48c8"
    },
    {
      "path": "moldea/context/billing.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "f79a351479052cd5502b1bf0b5c508ee1d5d50fa4c2b507be36739aca7c11c6c"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "bfd9804dcebc4cb82756c95c0a9aa07547fe0014f2fb145e26f53f811d1fccd9"
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
      "sha256": "f31f4d3ae06bd859d68bcf7b6f5bb1bd494d35a10540a0e8dadf453db49a1235"
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

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
