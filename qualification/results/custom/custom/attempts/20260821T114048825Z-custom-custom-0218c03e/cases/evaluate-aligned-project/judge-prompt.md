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
  "summary": "Read-only Moldea evaluation completed. The canonical support agent agrees with the runtime source: its support/email role, custom runtime guidance, and runtimeAgent binding all match. No repository files were changed. Candidate-skill CLI validation could not be run because the repository-local CLI is 3.3.5, outside the candidate skill's supported >=3.1.3 <3.2.0 range.",
  "commands": [
    "pwd && rg --files -g 'AGENTS.md' -g 'SKILL.md' -g 'package.json' -g 'pyproject.toml' -g 'Cargo.toml' -g 'moldea*' -g '.moldea*' -g '!node_modules' -g '!vendor'",
    "sed -n '1,260p' <workspace>/.agents/skills/moldea/SKILL.md && find <workspace> -name AGENTS.md -o -name package.json -o -name pyproject.toml -o -name Cargo.toml -o -iname '*moldea*' | head -250",
    "sed -n '1,260p' <workspace>/.agents/skills/moldea/references/local-tooling.md && sed -n '1,260p' <workspace>/.agents/skills/moldea/references/context-gathering.md && sed -n '1,300p' <workspace>/.agents/skills/moldea/references/evaluate-and-reconcile.md && find <workspace> -path <workspace>/node_modules -prune -o -name AGENTS.md -print && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= -c filter.lfs.process= status --short && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= -c filter.lfs.process= rev-parse --show-toplevel",
    "sed -n '1,220p' package.json && find . -path './node_modules' -prune -o -path './.agents' -prune -o -path './.moldea-qualification' -prune -o -type f -print | sort | head -300 && pnpm --version && node --version && readlink -f node_modules/@moldea.ai/cli/package.json && readlink -f node_modules/.bin/moldea && node -e \"const p=require('./node_modules/@moldea.ai/cli/package.json'); console.log(JSON.stringify({name:p.name,version:p.version,bin:p.bin}))\"",
    "sed -n '1,280p' moldea/moldea.yaml && sed -n '1,260p' moldea/agents/support/description.md && sed -n '1,360p' moldea/agents/support/instruction.md && sed -n '1,280p' moldea/runtimes/custom.md && sed -n '1,360p' src/support-agent.ts && sed -n '1,220p' moldea/project.md && sed -n '1,220p' tsconfig.json && npm --version && node --version && readlink -f node_modules/@moldea.ai/cli/package.json && readlink -f node_modules/.bin/moldea && node -e \"const p=require('./node_modules/@moldea.ai/cli/package.json'); console.log(JSON.stringify({name:p.name,version:p.version,bin:p.bin}))\"",
    "./node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= -c filter.lfs.process= diff --check && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= -c filter.lfs.process= diff --no-ext-diff -- . && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= -c filter.lfs.process= status --short && test -f moldea/runtimes/custom.md && test -f src/support-agent.ts && grep -F \"symbol: supportAgent\" moldea/moldea.yaml && grep -F \"id: 'support'\" src/support-agent.ts && grep -F \"channel: 'email'\" src/support-agent.ts"
  ],
  "changedFiles": [],
  "observations": [
    "moldea/moldea.yaml registers support with runtime id custom, guidance /moldea/runtimes/custom.md, and runtimeAgent path /src/support-agent.ts with symbol supportAgent.",
    "The canonical description says the agent answers customer support requests through email; src/support-agent.ts exports supportAgent with id 'support' and channel 'email'.",
    "The canonical instruction identifies the support agent and directs evidence-based support with escalation for uncertainty. The custom runtime guidance correctly identifies the exported supportAgent record and its id/channel contract.",
    "Final Git diff and status were empty; no pre-existing changes were altered.",
    "npm 11.12.1 and Node v24.15.0 satisfy candidate-skill tooling ranges, but package.json and the installed local CLI both report @moldea.ai/cli 3.3.5."
  ],
  "unresolved": [
    "The candidate Moldea skill supports only CLI >=3.1.3 <3.2.0, so its required deterministic inspect --json/validate --json evidence could not be validly invoked against local CLI 3.3.5. Evaluation mode is read-only, so no dependency change was made.",
    "The attempted project-local TypeScript check could not run because node_modules/.bin/tsc is absent."
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
  "cliValidateStatus": "valid",
  "cliInspectStatus": "valid",
  "typecheckPassed": true,
  "repositoryUnchanged": true,
  "failures": [],
  "durationMs": 966
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
      "sha256": "df711941ed3bfb8864492ffa3984df32ae4f48eb3b943102b4d7f1a540679231"
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
      "sha256": "df711941ed3bfb8864492ffa3984df32ae4f48eb3b943102b4d7f1a540679231"
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
