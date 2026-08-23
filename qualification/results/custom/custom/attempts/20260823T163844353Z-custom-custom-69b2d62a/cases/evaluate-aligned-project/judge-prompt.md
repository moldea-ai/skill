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
  "summary": "Read-only Moldea evaluation completed; no repository files were changed. The canonical support agent agrees with its bound source: manifest binding `/src/support-agent.ts#supportAgent`, runtime guidance, and source record all identify `support` on the `email` channel. Local CLI inspection and validation returned valid envelopes (schema 2, CLI 4.0.1).",
  "commands": [
    "npm --version",
    "sed -n '1,160p' node_modules/@moldea.ai/cli/package.json",
    "readlink -f node_modules/@moldea.ai/cli/dist/moldea.js; readlink -f node_modules/.bin/moldea; test \"$(readlink -f node_modules/@moldea.ai/cli/dist/moldea.js)\" = \"$(readlink -f node_modules/.bin/moldea)\" && printf 'same-provider\\n'",
    "<workspace>/node_modules/.bin/moldea inspect --json",
    "<workspace>/node_modules/.bin/moldea compatibility --json",
    "<workspace>/node_modules/.bin/moldea validate --json",
    "<workspace>/node_modules/.bin/tsc --noEmit",
    "git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= status --short; git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= diff --no-ext-diff --no-textconv --check; git -c core.fsmonitor=false -c core.pager=cat -c diff.external= -c filter.lfs.clean= -c filter.lfs.smudge= diff --no-ext-diff --no-textconv --stat"
  ],
  "changedFiles": [],
  "observations": [
    "`package.json` declares the exact required local CLI, `@moldea.ai/cli` 4.0.1; installed manifest and resolved binary match it. npm 11.12.1 satisfies the skill compatibility range.",
    "`inspect --json` returned status `valid`, no diagnostics, format version 1, schema version 2, and CLI version 4.0.1.",
    "The `support` manifest declares runtime `custom`, guidance `/moldea/runtimes/custom.md`, and runtime-agent binding `/src/support-agent.ts#supportAgent`. The guidance states that this exported record is runtime-owned and preserves its identifier and channel; the source exports `{ id: 'support', channel: 'email' }`, matching the support description.",
    "`compatibility --json` reported `custom` as an available adapter for repository format 1. `validate --json` returned status `valid` with no diagnostics. TypeScript validation passed.",
    "Final Git status, diff check, and diff stat were empty."
  ],
  "unresolved": [
    "The custom adapter produced no runtime evidence (`evidence: []`), and the repository source contains only the `supportAgent` identity/channel record. Therefore canonical instruction consumption by an actual model invocation or provider configuration is not established. This is an evidence limitation, not a contradiction in the declared runtime-agent binding."
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
  "durationMs": 926
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
