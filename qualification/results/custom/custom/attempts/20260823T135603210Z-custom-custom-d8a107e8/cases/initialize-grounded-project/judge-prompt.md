You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: initialize-grounded-project (Initialize a grounded project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Initialize Moldea from repository evidence

Initialize Moldea for this repository. Establish only the project context that the current README and source code support. Do not create an agent, decision, runtime guide, or unresolved requirement unless the repository proves it is needed.

Preserve the existing README content, add the standard Moldea awareness block, validate the resulting project, and report the evidence and commands used.

Required judgments:
- grounds-project: The project description states the invoice-review purpose and deterministic non-authorizing result from repository evidence.
- keeps-foundation-minimal: Initialization creates only the manifest, project context, and README awareness block, without inventing an agent or runtime.
- preserves-existing-work: Existing README content and implementation remain intact.
- validates-project: The missing-project diagnostics are resolved and every deterministic layer accepts the final project without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Initialized Moldea from repository evidence and preserved the README. Final Moldea inspect and validate results are valid; TypeScript compilation also passes.",
  "commands": [
    "node <workspace>/node_modules/.pnpm/@moldea.ai+cli@file+..+..+..+..+candidates+cec33cf7c7c0f02a797e8ea3eb83f221acc6d7232a4c_5d97d9f54190ef580c69b9544e258ed9/node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "node <workspace>/node_modules/.pnpm/@moldea.ai+cli@file+..+..+..+..+candidates+cec33cf7c7c0f02a797e8ea3eb83f221acc6d7232a4c_5d97d9f54190ef580c69b9544e258ed9/node_modules/@moldea.ai/cli/dist/moldea.js validate --json",
    "node node_modules/typescript/bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.hooksPath=/dev/null -c core.pager=cat --no-pager diff --check",
    "git -c core.fsmonitor=false -c core.hooksPath=/dev/null -c core.pager=cat --no-pager diff --no-ext-diff -- README.md moldea/moldea.yaml moldea/project.md",
    "git -c core.fsmonitor=false -c core.hooksPath=/dev/null -c core.pager=cat --no-pager status --short"
  ],
  "changedFiles": [
    "README.md",
    "moldea/moldea.yaml",
    "moldea/project.md"
  ],
  "observations": [
    "The local CLI declaration and installed package are exactly @moldea.ai/cli 4.0.1.",
    "Final inspect returned schemaVersion 2, cliVersion 4.0.1, status valid, formatVersion 1, and no diagnostics.",
    "Final validate returned schemaVersion 2, cliVersion 4.0.1, status valid, and no diagnostics.",
    "The README received one standard bounded Moldea awareness block. No agent, decision, runtime guide, focused context file, or unresolved requirement was created."
  ],
  "unresolved": [
    "The README includes arithmetic mismatches in review scope, while the inspected source directly implements only duplicate-reference detection. Its implemented handling is not established, so no runtime behavior was inferred or recorded."
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
  "durationMs": 937
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "e0afbc808ca9ec3e99c9542b3b29581375ff20c0f1679d8ce0439b1c69294a53"
    },
    {
      "path": "README.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "fa95545cb7e5e4e35c4ad9782519d10be47c40fdfdb7e8483c541ecbb567048f"
    },
    {
      "path": "src/invoice-review.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "82b0a364d6953a4cb91204a8be5ed14e709971b521ebcfc84f0846fdbfd299c6"
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
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "09bfcc6a14b83e2192b8673677725c84883ee9cd0c70e45c9ec09daa8f2b2847"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "af6cc2eaf1bab5d13c6edcef842314c9e2b7c3a3ee4421711e81540b157b17a3"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "e0afbc808ca9ec3e99c9542b3b29581375ff20c0f1679d8ce0439b1c69294a53"
    },
    {
      "path": "README.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "8d8c3a8365e6de68d8cea5844ce970aa1f781d6a01a4087880dc372a18313892"
    },
    {
      "path": "src/invoice-review.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "82b0a364d6953a4cb91204a8be5ed14e709971b521ebcfc84f0846fdbfd299c6"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "d3a5c0bf86ccb8e888cd47190f16cdcd7a25b473cc2522289295503fb562efe2"
    }
  ],
  "changedPaths": [
    "moldea/moldea.yaml",
    "moldea/project.md",
    "README.md"
  ]
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
