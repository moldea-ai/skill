You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: initialize-grounded-project (Initialize a grounded project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Initialize Moldea from repository evidence

Initialize Moldea for this repository. Establish only the project context that the current README and source support. Do not create an agent, runtime guide, decision, or unresolved requirement without evidence.

Preserve the existing README content, add the standard Moldea awareness block, validate the result, and report the evidence and commands used.

Required judgments:
- grounds-project: The project context states the invoice-review purpose and non-authorizing result from source evidence.
- keeps-foundation-minimal: Initialization creates only the manifest, project context, and README awareness block without inventing an SDK agent or runtime relationship.
- preserves-existing-work: Existing README content and implementation remain intact.
- validates-project: Every deterministic layer accepts the final project without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Initialized Moldea with evidence-backed project context and the standard README awareness block. Local deterministic validation and post-write inspection are valid with no diagnostics; TypeScript type-check and diff whitespace check also pass.",
  "commands": [
    "sed -n '1,260p' <workspace>/.agents/skills/moldea/SKILL.md",
    "sed -n '1,320p' .agents/skills/moldea/references/local-tooling.md",
    "sed -n '1,360p' .agents/skills/moldea/references/context-gathering.md",
    "sed -n '1,320p' .agents/skills/moldea/references/continuous-maintenance.md",
    "sed -n '1,260p' package.json",
    "sed -n '1,320p' README.md",
    "sed -n '1,360p' src/invoice-review.ts",
    "sed -n '1,220p' tsconfig.json",
    "sed -n '1,180p' node_modules/@moldea.ai/cli/package.json",
    "readlink -f node_modules/.bin/moldea",
    "node_modules/.bin/moldea inspect --json",
    "node_modules/.bin/moldea validate --json",
    "node_modules/.bin/tsc --noEmit",
    "git diff --no-ext-diff --check",
    "git diff --no-ext-diff -- README.md moldea/moldea.yaml moldea/project.md",
    "git status --porcelain=v1 --untracked-files=all"
  ],
  "changedFiles": [
    "README.md",
    "moldea/moldea.yaml",
    "moldea/project.md"
  ],
  "observations": [
    "README and source establish that the service identifies invoice total anomalies for operator review; it does not approve payments or change invoices.",
    "The root manifest and installed local CLI are both exact version 4.0.1.",
    "Initial inspect reported only missing `/moldea/moldea.yaml` and `/moldea/project.md`; post-write `validate --json` and `inspect --json` returned schema version 2, CLI 4.0.1, and status `valid` with no diagnostics.",
    "No agent, runtime guide, decision, additional context, or unresolved requirement was created because repository evidence did not support one.",
    "Final Git review shows only the intended README modification and two new Moldea files; no whitespace errors were found."
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
  "durationMs": 1674
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
      "sha256": "4585cdd5cdc98b536c1270c093e5cc872fc54a89e9801226b87dbe5993e0a0b0"
    },
    {
      "path": "README.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "ffabc4083a1ac956cd5663614429080e1d5ea8feca6a0dbf274aa4776d5cbcf9"
    },
    {
      "path": "src/invoice-review.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "790a6b7ba5392654bf96da24b6a84801bb8c8076cb1d1f594ee2a6605d368380"
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
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "09bfcc6a14b83e2192b8673677725c84883ee9cd0c70e45c9ec09daa8f2b2847"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0cb517cee590ed87c8bcdcc7e6d7485df704571277f0e8a17c2af8bae6e170f3"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "4585cdd5cdc98b536c1270c093e5cc872fc54a89e9801226b87dbe5993e0a0b0"
    },
    {
      "path": "README.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "5e6de749eecda21e0f6586aada6e01e12b3af5bb36eb453a4d3f707a674efa18"
    },
    {
      "path": "src/invoice-review.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "790a6b7ba5392654bf96da24b6a84801bb8c8076cb1d1f594ee2a6605d368380"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": [
    "moldea/moldea.yaml",
    "moldea/project.md",
    "README.md"
  ]
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
