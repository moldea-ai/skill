You are the independent judge for a moldea adapter qualification case.

Target adapter: custom
Target implementation: custom
Case: evaluate-aligned-project (Evaluate an aligned project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Evaluate the existing Moldea project

Inspect this project with the candidate Moldea skill and CLI. Determine whether the `support` agent is correctly described by the canonical repository, including its custom runtime guidance and runtime-agent binding.

If the project is already valid and its relationships agree with the source, do not edit it. Report the evidence you used, the validation commands you ran, and any unresolved issue that genuinely remains.

Required judgments:
- explains-alignment: The actor identifies the registered agent, custom runtime guidance, and explicit runtime binding using repository evidence.
- avoids-churn: The actor makes no project-visible changes because the repository is already valid and aligned.
- validates-project: Repository FS, Repository memory, Core, CLI, and project typechecking all confirm the valid project without mutation.

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Read-only Moldea evaluation completed. The canonical support description agrees with the bound runtime record: both identify support via the email channel. Custom runtime guidance names the exported supportAgent record and requires preserving its identifier and channel; src/support-agent.ts exports supportAgent with id 'support' and channel 'email'. The canonical runtime-agent binding exactly targets that file and symbol. No files were changed.",
  "commands": [
    "sed -n '1,240p' <workspace>/.agents/skills/moldea/SKILL.md",
    "find <workspace> -name AGENTS.md -o -name CLAUDE.md -o -name moldea.yaml -o -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name package-lock.json | sort | sed -n '1,240p'",
    "sed -n '1,260p' <workspace>/.agents/skills/moldea/references/local-tooling.md",
    "sed -n '1,300p' <workspace>/.agents/skills/moldea/references/context-gathering.md",
    "sed -n '1,300p' <workspace>/.agents/skills/moldea/references/evaluate-and-reconcile.md",
    "git -C <workspace> rev-parse --show-toplevel",
    "git -C <workspace> -c core.fsmonitor=false -c core.useBuiltinFSMonitor=false -c core.pager=cat status --short",
    "node -e \"const p=require('<workspace>/node_modules/@moldea.ai/cli/package.json'); console.log(JSON.stringify({name:p.name,version:p.version,bin:p.bin}))\"",
    "readlink -f <workspace>/node_modules/@moldea.ai/cli/dist/moldea.js && readlink -f <workspace>/node_modules/.bin/moldea",
    "<workspace>/node_modules/.bin/moldea inspect --json",
    "find <workspace>/src -maxdepth 3 -type f -print | sort",
    "sed -n '1,260p' <workspace>/src/support-agent.ts",
    "sed -n '1,220p' <workspace>/moldea/runtimes/custom.md",
    "sed -n '1,160p' <workspace>/moldea/agents/support/description.md",
    "sed -n '1,220p' <workspace>/moldea/agents/support/instruction.md",
    "sed -n '1,220p' <workspace>/moldea/moldea.yaml",
    "<workspace>/node_modules/.bin/moldea validate --json",
    "git -C <workspace> -c core.fsmonitor=false -c core.useBuiltinFSMonitor=false -c core.pager=cat diff --check && git -C <workspace> -c core.fsmonitor=false -c core.useBuiltinFSMonitor=false -c core.pager=cat diff --no-ext-diff -- . ':(exclude).agents/skills/moldea/**' ':(exclude).moldea-qualification/**' && git -C <workspace> -c core.fsmonitor=false -c core.useBuiltinFSMonitor=false -c core.pager=cat status --short"
  ],
  "changedFiles": [],
  "observations": [
    "The worktree was clean before and after evaluation.",
    "The repository-local @moldea.ai/cli declaration and installed package are both exactly 4.0.1; the resolved local executable points into that same package.",
    "`moldea inspect --json` completed with schemaVersion 2, cliVersion 4.0.1, command inspect, status valid, and no diagnostics. It reports the support binding as /src/support-agent.ts#supportAgent and the custom runtime guidance as /moldea/runtimes/custom.md.",
    "`moldea validate --json` completed with schemaVersion 2, cliVersion 4.0.1, command validate, status valid, and no diagnostics.",
    "The final Git diff and diff check were empty."
  ],
  "unresolved": [
    "The repository contains only the runtime-owned supportAgent declaration; there is no material runtime invocation or instruction-loader implementation to establish that the canonical model-facing instruction.md is consumed at runtime. This limits conclusions about instruction delivery, but does not contradict the requested description, custom-guidance, or runtime-binding relationships."
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
  "durationMs": 983
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
      "sha256": "e9e5484ce550728e444c419357b0da48e4df0ebb6c033e5205397e2787a148a2"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "fa1eeb2a45f10e778cdd6fdf6542925d77df0de23ab9e95db5af8e6e4f2021a6"
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
      "sha256": "cb446ea5b8a9e72ba1f6eef36f71206223b9f63c34f26bc85f932af65f4a4018"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9ca53f8e82d8afdbe5648f48ac4ab694558c0cef2007054ac0c2314c264c1edd"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "3c7c7d645ce7c4803cac5cd3ca32cbf3e9992552f453259399b266ccf6a67946"
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
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "e9e5484ce550728e444c419357b0da48e4df0ebb6c033e5205397e2787a148a2"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "fa1eeb2a45f10e778cdd6fdf6542925d77df0de23ab9e95db5af8e6e4f2021a6"
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
      "sha256": "cb446ea5b8a9e72ba1f6eef36f71206223b9f63c34f26bc85f932af65f4a4018"
    },
    {
      "path": "moldea/runtimes/custom.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "9ca53f8e82d8afdbe5648f48ac4ab694558c0cef2007054ac0c2314c264c1edd"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "3c7c7d645ce7c4803cac5cd3ca32cbf3e9992552f453259399b266ccf6a67946"
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
  "changedPaths": []
}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
