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
  "summary": "Initialized Moldea from local repository evidence. Added canonical manifest and project context plus the standard README awareness block. Local Moldea inspection and validation both returned valid with no diagnostics.",
  "commands": [
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.process= -c filter.lfs.required=false status --short",
    "sed -n '1,260p' README.md",
    "sed -n '1,260p' package.json",
    "sed -n '1,320p' src/invoice-review.ts",
    "node --version",
    "node -e \"const p=require('./node_modules/@moldea.ai/cli/package.json'); if (p.name !== '@moldea.ai/cli' || p.version !== '4.0.1' || !p.bin || typeof p.bin.moldea !== 'string') process.exitCode=1; console.log(JSON.stringify({name:p.name,version:p.version,bin:p.bin.moldea}))\"",
    "node -e \"const fs=require('fs'),path=require('path'); const pkg=fs.realpathSync('node_modules/@moldea.ai/cli'); const bin=fs.realpathSync('node_modules/.bin/moldea'); const expected=fs.realpathSync(path.join(pkg,'dist/moldea.js')); if (!bin.startsWith(pkg+path.sep) || bin!==expected) process.exitCode=1; console.log(JSON.stringify({package:pkg,binary:bin}))\"",
    "node ./node_modules/.bin/moldea inspect --json",
    "node ./node_modules/.bin/moldea validate --json",
    "git -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff --check",
    "git -c core.fsmonitor=false -c core.pager=cat diff --no-ext-diff -- README.md",
    "git -c core.fsmonitor=false -c core.pager=cat status --short"
  ],
  "changedFiles": [
    "README.md",
    "moldea/moldea.yaml",
    "moldea/project.md"
  ],
  "observations": [
    "README evidence establishes an invoice-review service for human finance operators, reviewing duplicate references and arithmetic mismatches, with no authority to authorize or send payments.",
    "The root declares and installs @moldea.ai/cli 4.0.1; its resolved local executable was used. Node v24.15.0 is supported.",
    "Initial isolated inspect returned expected invalid status with only missing manifest and project-file diagnostics.",
    "Post-write isolated inspect returned valid status, formatVersion 1, no diagnostics, no runtime evidence, and no agents, decisions, runtimes, focused context, or unresolved requirements.",
    "Post-write isolated validate returned valid status with no diagnostics.",
    "Final diff whitespace check passed."
  ],
  "unresolved": [
    "The inspected source currently implements duplicate-reference detection only; the README also describes arithmetic-mismatch review. The project context preserves the supported service scope without claiming that the inspected source fully implements every stated review type."
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
  "durationMs": 971
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
      "sha256": "b9b8a1bc66b500c05eacc9fcfea92fa75fa3179ffc17ab8b21ab38fe7ac1d56d"
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
