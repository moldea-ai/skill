You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: maintain-dirty-project (Maintain a dirty project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Add billing context safely

The support agent now needs durable guidance for billing disputes. Add `moldea/context/billing.md`, register its relationship to the billing implementation, assign it to `support`, and update the canonical instruction so the context is used for refund and invoice questions.

Preserve unrelated tracked and untracked developer work exactly. Keep the direct Vercel AI SDK wrapper, loader, and structured output intact. Validate the final repository and inspect the complete Git diff.

Required judgments:
- adds-context: Billing context is canonical, globally registered, assigned to support, and related to the exact billing source.
- preserves-sdk-wiring: The direct streamText wrapper, instruction loader, and Output.object relationship remain unchanged and evidenced.
- preserves-dirty-state: Unrelated project policy, tracked operator note, and untracked local observation remain byte-for-byte unchanged.
- validates-project: Every deterministic layer accepts the final project without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Added and registered durable billing context for support. The canonical instruction now directs refund and invoice questions to it; the direct Vercel AI SDK wrapper, loader, and structured output remain unchanged. Local validation passed and the complete tracked plus new-file diffs were reviewed.",
  "commands": [
    "node_modules/.bin/moldea inspect --json",
    "node_modules/.bin/moldea validate --json",
    "node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null diff HEAD --no-ext-diff --no-textconv --check",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null diff HEAD --no-ext-diff --no-textconv",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null diff --no-index --no-ext-diff --no-textconv /dev/null moldea/context/billing.md",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null status --short && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.attributesfile=/dev/null ls-files --others --exclude-standard"
  ],
  "changedFiles": [
    "moldea/context/billing.md",
    "moldea/moldea.yaml",
    "moldea/agents/support/instruction.md"
  ],
  "observations": [
    "Moldea CLI 4.0.1 final inspect and validate both returned schemaVersion 2, status valid, and no diagnostics.",
    "TypeScript validation passed.",
    "Billing context is bound to /src/billing.ts#classifyBillingQuestion and assigned to support.",
    "Pre-existing src/operator-notes.ts and notes/local-observation.md remain preserved.",
    "Repository evidence establishes classification only; no unsupported refund or invoice policy/action was added."
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
  "durationMs": 2738
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
      "sha256": "b3fc7886e63743d9a3491d69f6fbdac4fe560995792400bc8788fb2fc6c8bd55"
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
      "sha256": "76eda5e17d613b64af071bdc641b3443eb89eb43c36b812db1b2ad15258618d3"
    },
    {
      "path": "moldea/context/billing.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9a0563c17a60ef93b915a9605ae0877631dedc983bd77ad73ef4be4ba57d57f4"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "6671d9c62a5c9295450461ae49c2d2823533e0dda373f8b0408cbc34f9f66852"
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
      "sha256": "b3fc7886e63743d9a3491d69f6fbdac4fe560995792400bc8788fb2fc6c8bd55"
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

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
