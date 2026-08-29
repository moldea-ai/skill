You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: initialize-grounded-project (Initialize a grounded project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Initialize Moldea from repository evidence

Initialize Moldea for this repository. Establish only the project context that the current README and source code support. Do not create an agent, decision, runtime guide, or unresolved requirement unless the repository proves it is needed.

Preserve the existing README content, add the standard Moldea awareness block, validate the resulting project, and report the evidence and validation outcome.

Required judgments:
- grounds-project: The project description states the invoice-review purpose and deterministic non-authorizing result from repository evidence.
  Evidence sources: current-workspace, workspace-patch
- keeps-foundation-minimal: Initialization creates only the manifest, project context, and README awareness block, without inventing an agent or runtime.
  Evidence sources: current-workspace, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Initialized Moldea from repository evidence. Canonical state is now established under /moldea/**, the existing README content is preserved with the standard awareness block appended, and no agent, decision, runtime guide, or unresolved requirement was created. Moldea CLI 5.0.0 inspection and validation both returned schema 2 status valid with no diagnostics; TypeScript compilation also passed. Next actions are foundation review or ordinary project development.",
  "changedFiles": [
    "README.md",
    "moldea/moldea.yaml",
    "moldea/project.md"
  ],
  "observations": [
    "README.md establishes the purpose: review invoice lines for duplicate references and arithmetic mismatches for a human finance operator, without authorizing or sending payments.",
    "src/invoice-review.ts proves only duplicate-reference detection, returning unique duplicate references in sorted order.",
    "The final Git review showed only README.md modified and moldea/ added; the README diff preserves its original content.",
    "The exact repository-local @moldea.ai/cli 5.0.0 was already declared and installed; no dependency or lockfile changes were needed.",
    "No unrelated pre-existing changes or untracked files were present or altered."
  ],
  "unresolved": [
    "Current repository evidence does not establish arithmetic-mismatch implementation, a service entry point, transport, deployment target, or other runtime integration behavior. These limitations are recorded in moldea/project.md without inventing requirements."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 21,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 4
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 4
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
  "durationMs": 1009
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
      "sha256": "8ce21f764606746aee656ca3a1acf46b96b8c72912eca5a673a3f09e44e4f5a9"
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
      "sha256": "43ba3bdc982deffdbb867fad1e70b020606a1db20c9102f687ed480c598308c8"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "8ce21f764606746aee656ca3a1acf46b96b8c72912eca5a673a3f09e44e4f5a9"
    },
    {
      "path": "README.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "ac9128c9f59abc4a62425dc0c60916833b020815e7a8534a3e3718f09a97a941"
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

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
