You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: retire-agent-coherently (Retire an agent coherently)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Retire the removed support agent

The direct Vercel AI SDK implementation for `support` was intentionally removed. Reconcile the Moldea repository so it no longer claims that the wrapper, loader, schema, or agent exists.

Preserve remaining source and project context. Remove obsolete canonical assets, validate the final repository, and report the evidence that established their obsolescence.

Required judgments:
- removes-obsolete-declaration: The final manifest no longer declares the removed agent or any Vercel wrapper, loader, or output-schema binding.
- removes-orphaned-assets: Obsolete description and instruction files are deleted rather than left as misleading canonical state.
- preserves-surviving-context: Project context and unrelated source remain byte-for-byte unchanged.
- validates-project: Every deterministic layer accepts the reconciled project without read-time mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Retired the obsolete canonical support agent assets while preserving project context. Final local Moldea inspection is valid with no diagnostics and no registered agents; TypeScript validation and diff whitespace checks pass.",
  "commands": [
    "pwd && rg --files -g 'AGENTS.md' -g 'SKILL.md' -g 'package.json' -g 'moldea*' -g '.moldea*' | sed -n '1,240p'",
    "sed -n '1,260p' <workspace>/.agents/skills/moldea/SKILL.md && find . -name AGENTS.md -o -name package.json -o -name moldea.yml -o -name moldea.yaml -o -name .moldea -o -name .moldea-qualification | sed -n '1,240p'",
    "sed -n '1,260p' <workspace>/.agents/skills/moldea/references/local-tooling.md && sed -n '1,300p' <workspace>/.agents/skills/moldea/references/context-gathering.md && sed -n '1,280p' <workspace>/.agents/skills/moldea/references/continuous-maintenance.md && sed -n '1,320p' <workspace>/.agents/skills/moldea/references/agent-design.md && sed -n '1,320p' <workspace>/.agents/skills/moldea/references/evaluate-and-reconcile.md && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c core.autocrlf=false rev-parse --show-toplevel && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= status --short && find . -path './node_modules' -prune -o -path './.agents/skills/moldea' -prune -o -path './.moldea-qualification' -prune -o -type f -print | sort",
    "sed -n '1,240p' package.json && find . -maxdepth 2 -type f \\( -name 'pnpm-lock.yaml' -o -name 'package-lock.json' -o -name 'yarn.lock' -o -name '.npmrc' -o -name '.pnpmfile.cjs' -o -name '.yarnrc.yml' \\) -print | sort && find . -path './node_modules' -prune -o -path './.git' -prune -o -path './.agents/skills/moldea' -prune -o -path './.moldea-qualification' -prune -o -type f -name 'AGENTS.md' -print",
    "test -f node_modules/@moldea.ai/cli/package.json && sed -n '1,180p' node_modules/@moldea.ai/cli/package.json && readlink -f node_modules/.bin/moldea && readlink -f node_modules/@moldea.ai/cli",
    "<workspace>/node_modules/.pnpm/@moldea.ai+cli@file+..+..+..+..+candidates+6ad6fb106fc915332b8b302b0d3d112b977d2847cb34_cb7b3ff0be44b76c934c5d3dbb958c8e/node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "sed -n '1,300p' moldea/moldea.yaml && sed -n '1,260p' moldea/agents/support/description.md && sed -n '1,360p' moldea/agents/support/instruction.md && sed -n '1,300p' moldea/project.md && sed -n '1,360p' src/project-state.ts && git -c core.fsmonitor=false -c core.pager=cat show HEAD:src/support-agent.ts && find . -path './node_modules' -prune -o -path './.git' -prune -o -path './.agents' -prune -o -path './.moldea-qualification' -prune -o -type f -print0 | xargs -0 grep -n -i -E 'support|vercel|ai sdk'",
    "node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= diff --check",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= diff --no-ext-diff -- moldea/moldea.yaml moldea/agents/support/description.md moldea/agents/support/instruction.md src/support-agent.ts && git -c core.fsmonitor=false -c core.pager=cat status --short && find moldea -maxdepth 3 -type f -print | sort && find . -path './node_modules' -prune -o -path './.git' -prune -o -path './.agents' -prune -o -path './.moldea-qualification' -prune -o -type f -print0 | xargs -0 grep -n -i -E 'support|vercel|ai sdk' || true"
  ],
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md"
  ],
  "observations": [
    "Pre-change isolated `inspect --json` completed with schemaVersion 2, cliVersion 4.0.1, command `inspect`, and status `invalid`. It reported exactly four stale support references to the already-deleted `/src/support-agent.ts`: one impact path plus runtimeAgent, instructionLoader, and outputSchema bindings.",
    "`HEAD:src/support-agent.ts` confirms the removed direct Vercel AI SDK implementation exported `supportAgent`, `loadSupportInstruction`, and `SupportOutputSchema`. The implementation deletion was pre-existing and was preserved.",
    "Removed the `support` manifest registration and canonical description/instruction assets. `moldea/project.md` was intentionally retained because it preserves the still-relevant historical context that shared state remains after the wrapper’s retirement.",
    "Post-change isolated `inspect --json` completed with schemaVersion 2, cliVersion 4.0.1, command `inspect`, status `valid`, no diagnostics, and an empty agents list.",
    "`node_modules/.bin/tsc --noEmit` and `git diff --check` exited successfully. Final diff contains only the pre-existing implementation deletion and the intended Moldea reconciliation."
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
  "durationMs": 1675
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "34c2c851afb361fee178242324c8902b3f0590e5d0630244f652e491c16a44ec"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9fa5916b50ec2db879209f595df91348c576061533576ee93caf56b00a416434"
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
      "sha256": "4c9e1bab9a858d285167de430f9dfd402fd9af153e7c66d0350ab804d7cf1ef0"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "cac0415aed798c1b6d40fed8bfa15e848f226f192be70cae7478cbcfe97157c3"
    },
    {
      "path": "src/project-state.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d435f63800a2a268830b9a78c5da763ece38e72ca1a7416245ca210661de2bd"
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
      "sha256": "4c9e1bab9a858d285167de430f9dfd402fd9af153e7c66d0350ab804d7cf1ef0"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "cac0415aed798c1b6d40fed8bfa15e848f226f192be70cae7478cbcfe97157c3"
    },
    {
      "path": "src/project-state.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "0d435f63800a2a268830b9a78c5da763ece38e72ca1a7416245ca210661de2bd"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": [
    "moldea/agents/support/description.md",
    "moldea/agents/support/instruction.md",
    "moldea/moldea.yaml"
  ]
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
