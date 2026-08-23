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
  "summary": "Read-only Moldea evaluation completed; no repository files changed. The canonical `support` runtime declaration, custom guidance, and runtime-agent binding agree with `src/support-agent.ts`: it exports `supportAgent` with `id: 'support'` and `channel: 'email'`. Moldea structural inspection and validation are valid with no diagnostics.",
  "commands": [
    "node --version",
    "node -e \"const fs=require('fs'); const p='<workspace>/node_modules/@moldea.ai/cli/package.json'; const x=JSON.parse(fs.readFileSync(p,'utf8')); if (x.name !== '@moldea.ai/cli' || x.version !== '4.0.1' || typeof x.bin?.moldea !== 'string') process.exit(1); process.stdout.write(JSON.stringify({name:x.name,version:x.version,bin:x.bin.moldea})+'\\n')\"",
    "readlink -f <workspace>/node_modules/@moldea.ai/cli/package.json",
    "readlink -f <workspace>/node_modules/@moldea.ai/cli/$(node -e \"const x=require('<workspace>/node_modules/@moldea.ai/cli/package.json'); process.stdout.write(x.bin.moldea)\")",
    "readlink -f <workspace>/node_modules/.bin/moldea",
    "<workspace>/node_modules/.bin/moldea inspect --json",
    "<workspace>/node_modules/.bin/moldea compatibility --json",
    "<workspace>/node_modules/.bin/moldea validate --json",
    "<workspace>/node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false diff --check && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false diff --no-ext-diff --exit-code && git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.required=false status --short"
  ],
  "changedFiles": [],
  "observations": [
    "Repository-local CLI provider was verified as @moldea.ai/cli 4.0.1; Node v24.15.0 is within the supported range.",
    "`inspect --json` returned schemaVersion 2, cliVersion 4.0.1, command `inspect`, status `valid`, and no diagnostics or adapter evidence.",
    "`compatibility --json` returned valid and lists the `custom` adapter for repository format 1.",
    "`validate --json` returned valid with no diagnostics.",
    "The manifest binds `support` to `/src/support-agent.ts#supportAgent`; the source exports that exact symbol with the guided identifier `support` and email channel. Its description also accurately states the email channel.",
    "The custom runtime guidance accurately identifies that exported record as runtime-owned and directs preservation of its identifier and channel.",
    "Final Git diff and worktree status were empty."
  ],
  "unresolved": [
    "The repository establishes only a runtime-owned metadata record; it does not establish how canonical `moldea/agents/support/instruction.md` reaches a runtime model or provider configuration. Therefore canonical instruction provenance and actual support-agent invocation behavior cannot be confirmed. This is an evidence limitation, not a structural validation failure.",
    "The attempted TypeScript check could not run because `<workspace>/node_modules/.bin/tsc` does not exist; no project script declares an alternative local type-check command."
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
  "durationMs": 960
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
