You are the independent judge for a moldea adapter qualification case.

Target adapter: anthropic
Target implementation: typescript-messages-api-0-117
Case: maintain-dirty-project (Maintain a dirty project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Add billing context safely

The support agent now needs durable guidance for billing disputes. Update the existing agent setup so this context is connected to the billing implementation and used by `support` for refund and invoice questions.

Preserve unrelated tracked and untracked developer work exactly. Keep the direct Anthropic Messages API wrapper and loader intact. Validate the final repository and inspect the complete Git diff.

Required judgments:
- adds-context: Billing context is canonical, globally registered, assigned to support, and related to the exact billing source.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- preserves-sdk-wiring: The direct Messages API wrapper and system instruction loader remain unchanged and evidenced.
  Evidence sources: current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Maintained canonical Moldea state: added billing dispute context bound to `classifyBillingQuestion`, registered it with `support`, and updated the loaded support instruction with evidence-backed refund/invoice classification guidance. The direct Anthropic Messages API wrapper and loader remain unchanged. Moldea validate and inspect both passed with no diagnostics; TypeScript compilation passed. The complete tracked diff and new context file were inspected.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/instruction.md",
    "moldea/context/billing.md"
  ],
  "observations": [
    "Canonical state changed coherently across context, implementation binding, agent registration, and runtime-loaded instruction.",
    "Existing tracked work in src/operator-notes.ts and the untracked notes/ directory remained untouched.",
    "The implementation establishes classifications only, not refund approval, invoice status, credits, or timelines; the guidance records that limitation explicitly."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 61,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 10
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 10
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
  "durationMs": 2108
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
      "sha256": "ae7a45f9d5516b6fa376e61a09618ec999b0dd613b86115741eb2b3b95733081"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "756eca193abf2891ddb6e2d542042579ca128e9b40e1418a0e0d3f7c14c3a5b0"
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
      "sha256": "c69a062f160476365567e578e9ffec62977e939e9d6e4cf788312e6959a435b5"
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
      "sha256": "77d31813e47e2a4716632fd97aa6df4abae37f8a01d238449e447c80d227544c"
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
      "sha256": "463c52d35b691a2ec317210cdcb15ee61658f66a154bb3462579430b22ab295a"
    },
    {
      "path": "moldea/context/billing.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "1b9e853d85cc112d58394f25a28586ac9aa54aee00d65c27e91a44cd87113530"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "897d26a1e3131c590041e176f9aa0b17ae84030aac5445963f0f1f159aebaa71"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "756eca193abf2891ddb6e2d542042579ca128e9b40e1418a0e0d3f7c14c3a5b0"
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
      "sha256": "c69a062f160476365567e578e9ffec62977e939e9d6e4cf788312e6959a435b5"
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
      "sha256": "77d31813e47e2a4716632fd97aa6df4abae37f8a01d238449e447c80d227544c"
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
