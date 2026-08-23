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
  "summary": "Initialized Moldea with evidence-backed invoice-review context and the standard README awareness block. Local Moldea inspection and validation both passed.",
  "commands": [
    "git -c core.fsmonitor=false status --short",
    "sed -n '1,260p' README.md",
    "sed -n '1,340p' src/invoice-review.ts",
    "sed -n '1,260p' package.json",
    "sed -n '1,220p' tsconfig.json",
    "<workspace>/node_modules/.pnpm/@moldea.ai+cli@file+..+..+..+candidates+6ab569e9456fa35ca8242041cbe3ce012d8e7ac35931776aaa822614257ef666+cli-4.0.1.tgz/node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "<workspace>/node_modules/.pnpm/@moldea.ai+cli@file+..+..+..+candidates+6ab569e9456fa35ca8242041cbe3ce012d8e7ac35931776aaa822614257ef666+cli-4.0.1.tgz/node_modules/@moldea.ai/cli/dist/moldea.js validate --json",
    "node_modules/.bin/tsc -p tsconfig.json",
    "git -c core.fsmonitor=false diff --check && git -c core.fsmonitor=false diff -- README.md moldea/moldea.yaml moldea/project.md && git -c core.fsmonitor=false status --short",
    "git -c core.fsmonitor=false diff --no-index -- /dev/null moldea/moldea.yaml || [ $? -eq 1 ]\ngit -c core.fsmonitor=false diff --no-index -- /dev/null moldea/project.md || [ $? -eq 1 ]"
  ],
  "changedFiles": [
    "README.md",
    "moldea/moldea.yaml",
    "moldea/project.md"
  ],
  "observations": [
    "README establishes invoice-line-item review for duplicate references and arithmetic mismatches, with findings for human finance operators and no payment authorization or sending.",
    "Source implements duplicate-reference detection; no agent, runtime guide, decision, focused context, or unresolved-requirement asset was warranted.",
    "Initial local CLI inspection was structurally invalid only for missing manifest and project files. Post-write `inspect --json` and `validate --json` were valid with CLI 4.0.1, schema 2, and no diagnostics.",
    "No network, provider, runtime agent, model, subagent, package-manager process, or mounted-input modification was used.",
    "The attempted TypeScript check could not run because `node_modules/.bin/tsc` is absent."
  ],
  "unresolved": [
    "Arithmetic-mismatch implementation details are not visible in the source tree, so none were inferred or persisted."
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
  "durationMs": 939
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
      "sha256": "1c1644a43f26f1fc55714ffcd9e8729dab497cfc180d37f6cb67759fa7f14b75"
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
      "sha256": "b12f3727ed8101cb9869b42dddb2a0da98eaf6b15fb3469135f67f89684e2b24"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "1c1644a43f26f1fc55714ffcd9e8729dab497cfc180d37f6cb67759fa7f14b75"
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
