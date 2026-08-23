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
  "summary": "Read-only Moldea evaluation completed; no repository files were changed. The support agent’s canonical description agrees with the bound runtime record: both identify `support` and the email channel. Custom runtime guidance names the same exported `supportAgent` record, and deterministic structural validation is valid.",
  "commands": [
    "pwd && rg --files -g 'AGENTS.md' -g 'SKILL.md' -g '*moldea*' -g 'package.json' -g 'pyproject.toml' -g 'Cargo.toml' -g 'Makefile' -g 'README*' -g '.git'",
    "sed -n '1,240p' <workspace>/.agents/skills/moldea/SKILL.md && find <workspace> -name AGENTS.md -o -name package.json -o -name pyproject.toml -o -name Cargo.toml -o -name Makefile -o -iname '*moldea*' -o -iname 'README*' | head -300",
    "for f in <workspace>/.agents/skills/moldea/references/local-tooling.md <workspace>/.agents/skills/moldea/references/context-gathering.md <workspace>/.agents/skills/moldea/references/agent-design.md <workspace>/.agents/skills/moldea/references/skill-design.md <workspace>/.agents/skills/moldea/references/evaluate-and-reconcile.md; do sed -n '1,260p' \"$f\"; done",
    "sed -n '1,280p' <workspace>/.agents/skills/moldea/references/context-gathering.md && sed -n '1,320p' <workspace>/.agents/skills/moldea/references/agent-design.md",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false rev-parse --show-toplevel",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false status --short --untracked-files=all && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false diff --no-ext-diff --no-textconv && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false diff --cached --no-ext-diff --no-textconv",
    "sed -n '1,240p' package.json; find . -maxdepth 2 \\( -name '.npmrc' -o -name '.pnpmfile.cjs' -o -name '.pnpmfile.js' -o -name '.yarnrc.yml' -o -name '.yarnrc' -o -name 'pnpm-workspace.yaml' -o -name 'pnpm-lock.yaml' -o -name 'package-lock.json' -o -name 'yarn.lock' \\) -type f -print",
    "sed -n '1,160p' node_modules/@moldea.ai/cli/package.json && readlink -f node_modules/@moldea.ai/cli && readlink -f node_modules/.bin/moldea",
    "ls -l node_modules/.bin/moldea && sed -n '1,80p' node_modules/.bin/moldea && readlink -f node_modules/@moldea.ai/cli/dist/moldea.js",
    "node --version",
    "node node_modules/@moldea.ai/cli/dist/moldea.js inspect --json",
    "find moldea src -maxdepth 4 -type f -print | sort && sed -n '1,220p' moldea/moldea.yaml && sed -n '1,220p' moldea/project.md && sed -n '1,220p' moldea/runtimes/custom.md && sed -n '1,220p' moldea/agents/support/description.md && sed -n '1,220p' moldea/agents/support/instruction.md && sed -n '1,260p' src/support-agent.ts",
    "node node_modules/@moldea.ai/cli/dist/moldea.js validate --json",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false status --short --untracked-files=all",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false diff --no-ext-diff --no-textconv && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false diff --cached --no-ext-diff --no-textconv"
  ],
  "changedFiles": [],
  "observations": [
    "Repository root is <workspace> and the final Git status and both staged/unstaged diffs were empty.",
    "The root declaration and installed local package are @moldea.ai/cli 4.0.1; Node is v24.15.0.",
    "Local `inspect --json` returned exit 0 with schemaVersion 2, cliVersion 4.0.1, command `inspect`, status `valid`, formatVersion 1, and no diagnostics.",
    "Local `validate --json` returned exit 0 with schemaVersion 2, cliVersion 4.0.1, command `validate`, status `valid`, formatVersion 1, and no diagnostics.",
    "`moldea/moldea.yaml` binds support’s custom runtime guidance to `/moldea/runtimes/custom.md` and runtime agent to `/src/support-agent.ts` symbol `supportAgent`. The guidance identifies that same export as the runtime-owned definition. The source exports `{ id: 'support', channel: 'email' }`, agreeing with the canonical support description’s email channel."
  ],
  "unresolved": [
    "The inspected repository contains no runtime invocation or instruction-loading path. Therefore the canonical instruction’s consumption by a runtime model cannot be established; this is an evidence limitation, not proof that the binding or description is incorrect."
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
  "durationMs": 949
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
      "sha256": "520baa026d06f4351e6aaa05a36ce097195fd24168d4158dae5bd2ab3b9beedf"
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
      "sha256": "520baa026d06f4351e6aaa05a36ce097195fd24168d4158dae5bd2ab3b9beedf"
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
