You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: maintain-dirty-project (Maintain a dirty project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Add billing context safely

The support agent now needs durable guidance for billing disputes. Update the existing agent setup so this context is connected to the billing implementation and used by `support` for refund and invoice questions.

Preserve unrelated tracked and untracked developer work exactly. Keep the direct Vercel AI SDK wrapper, loader, and structured output intact. Validate the final repository and inspect the complete Git diff.

Required judgments:
- adds-context: Billing context is canonical, globally registered, assigned to support, and related to the exact billing source.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- preserves-sdk-wiring: The direct streamText wrapper, instruction loader, and Output.object relationship remain unchanged and evidenced.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Added durable billing context, bound it to `classifyBillingQuestion`, registered it with `support`, and embedded safe refund/invoice guidance in the loaded instruction. Moldea inspection passed with no diagnostics, TypeScript type-checking passed, and the complete tracked diff was reviewed.",
  "changedFiles": [
    "moldea/agents/support/instruction.md",
    "moldea/context/billing.md",
    "moldea/moldea.yaml"
  ],
  "observations": [
    "The direct Vercel AI SDK `streamText` wrapper, canonical instruction loader, and structured output schema remain unchanged.",
    "Existing tracked work in `src/operator-notes.ts` and untracked work under `notes/` were preserved exactly.",
    "The implementation only establishes exact lowercase `refund` substring classification; it does not establish refund eligibility or authorization, invoice status, or invoice details. The canonical guidance records these limits explicitly.",
    "Final repository status contains only the three task changes plus the same pre-existing tracked and untracked developer work."
  ],
  "unresolved": [
    "No provider or agent invocation was performed, as prohibited; model behavior was therefore validated structurally and by type-checking, not through a live generation call."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 54,
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
  "durationMs": 2643
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
      "sha256": "c2176bdb53cccc0a7744f33caa9b7607d2f6c23ff0735f91a3d4e7e8a12bce77"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "bfa76d3c425e23bfecbaf50b933a035fe1f531b838d0da58e2876e5d59ac0662"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "3bdcbdeb76557c13098e001b66bc90465729d825a063678b8ebe7353a649dd29"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "f7762f212514bced5c2d5374b3846213de0abdb5e654ea4b64c18a5a0d96fbdb"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "6a66460450a96d2f4729f5ae4b02f65b43fa98e9d2a4f89a11ab9b141505ba88"
    },
    {
      "path": "notes/local-observation.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a68ae7d12f8ada37cfe98daab81cbb88b6444c9fd02012f1cbd164f5d5101bfe"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "e712e8faedb364e4fd514f91e7f78d8f4889c173527fba158d9e30afb808440d"
    },
    {
      "path": "src/billing.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "8b3760bda98890d7221f151cf4ca8b8310b2c8219485b4fb271b30b3afafb8b1"
    },
    {
      "path": "src/operator-notes.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "a560293e9d53ce132eb82202be4feedaae93524b7842b9f63bf6d5f28455d3ed"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "7c2c655f3568f8e885c5927cc0b69930833c11d291979a18a6d514405205c8bb"
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
      "path": ".agents/project-policy.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "c2176bdb53cccc0a7744f33caa9b7607d2f6c23ff0735f91a3d4e7e8a12bce77"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "bfa76d3c425e23bfecbaf50b933a035fe1f531b838d0da58e2876e5d59ac0662"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "d8bfe0c16f872f052d4d8b00983ef01b200eb800423fd7dfae83b1cc5f11448c"
    },
    {
      "path": "moldea/context/billing.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "865da225b0252b9bf5d08d071ca63154e819009b5f94634b6bd514af0e9158dc"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "24ca00259f8b057ea70feb0c1b6d4b74023e52a0ca156b9da053597c5e773965"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "6a66460450a96d2f4729f5ae4b02f65b43fa98e9d2a4f89a11ab9b141505ba88"
    },
    {
      "path": "notes/local-observation.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a68ae7d12f8ada37cfe98daab81cbb88b6444c9fd02012f1cbd164f5d5101bfe"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "e712e8faedb364e4fd514f91e7f78d8f4889c173527fba158d9e30afb808440d"
    },
    {
      "path": "src/billing.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "8b3760bda98890d7221f151cf4ca8b8310b2c8219485b4fb271b30b3afafb8b1"
    },
    {
      "path": "src/operator-notes.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "a560293e9d53ce132eb82202be4feedaae93524b7842b9f63bf6d5f28455d3ed"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "7c2c655f3568f8e885c5927cc0b69930833c11d291979a18a6d514405205c8bb"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": [
    "moldea/agents/support/instruction.md",
    "moldea/context/billing.md",
    "moldea/moldea.yaml"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
