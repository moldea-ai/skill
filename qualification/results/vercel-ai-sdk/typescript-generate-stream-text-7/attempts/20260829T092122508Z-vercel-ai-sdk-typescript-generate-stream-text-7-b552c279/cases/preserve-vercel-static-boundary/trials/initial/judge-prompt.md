You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-generate-stream-text-7
Case: preserve-vercel-static-boundary (Preserve the Vercel static boundary)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Document the Vercel static boundary

Evaluate the existing `support` integration. The wrapper passes an indirect request object to `generateText`, and `prepareStep` may replace instructions. Preserve the working implementation.

Update the agent setup to state what static inspection cannot prove: add only useful project-local runtime guidance and an agent-level unresolved warning with a concrete path to a supported direct pattern. Do not claim runtime-pattern, instruction-loader, input-schema, provider, model, routing, handoff, or subagent evidence. Validate the final project.

Required judgments:
- identifies-unsupported-form: The actor explains that an indirect request object and prepareStep prevent direct runtime-pattern and instruction-loader proof.
  Evidence sources: actor-output, current-workspace, deterministic-after
- records-focused-guidance: The manifest references the sole new runtime-guidance file under /moldea/runtimes/**/*.md, which describes the repository-specific wrapper and the supported direct object-literal alternative without claiming provider behavior.
  Evidence sources: current-workspace, workspace-patch
- records-unresolved-boundary: An unresolved warning names the static-analysis boundary, related source, and concrete direct-pattern resolution.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- avoids-inference: The actor adds no instruction-loader, input-schema, output-schema, tool, provider, model, routing, handoff, or subagent relationship.
  Evidence sources: current-workspace, deterministic-after, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Documented the Vercel static-inspection boundary while preserving `/src/support-agent.ts`. Added project-local runtime guidance and an agent-owned warning with a concrete migration path to direct `generateText({ ... })`. TypeScript, Moldea validation, and final Moldea inspection all passed with no diagnostics.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/runtimes/vercel-ai-sdk.md"
  ],
  "observations": [
    "Final inspection emitted only language and runtime-package evidence; no unsupported runtime-pattern, instruction-loader, schema, provider, model, routing, handoff, or subagent evidence was claimed.",
    "The support implementation has no Git diff.",
    "The worktree was clean before the task; final changes are limited to the two listed Moldea files."
  ],
  "unresolved": [
    "Static inspection cannot establish the effective request or instructions across the indirect request object and `prepareStep` replacement. The agent-level warning remains until `/src/support-agent.ts` is intentionally migrated and validated against the supported direct pattern."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 59,
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
  "durationMs": 2619
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
      "sha256": "ab6d3f651ca3971a36a0922b7ec353354febb630009c6ff5a3ca72d287c2bddc"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "b93f18f322707ad6ebaa3b2f094af606e701699c9027b226b74ba830afd87a46"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "9ca3c07bfdc1fafff9399bb9ff5a704f35d23ac74365183a1f335ea8c4ecace3"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "efd792c1b346f816ff3267c4eeaa92c57831fcfeed2f009a250a30267724351c"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "0b186d8cda3470a175841971d34c15c405afe0cb1c88773cac4d8b1f897bf2c2"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "af3100ee86fb564032e7b93316c9b8e7ec81a0938d39a44e4c5a6b5e7a3e6a43"
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
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "ab6d3f651ca3971a36a0922b7ec353354febb630009c6ff5a3ca72d287c2bddc"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "b93f18f322707ad6ebaa3b2f094af606e701699c9027b226b74ba830afd87a46"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "5a80200275918c8d009e9ddcee41466aa92e6892c0da884afe2ef1df1d437ee2"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "efd792c1b346f816ff3267c4eeaa92c57831fcfeed2f009a250a30267724351c"
    },
    {
      "path": "moldea/runtimes/vercel-ai-sdk.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "8403067ad7364a499e5693871e6671932f59a5f51523f6a4963c47b1ec17f646"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "0b186d8cda3470a175841971d34c15c405afe0cb1c88773cac4d8b1f897bf2c2"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "af3100ee86fb564032e7b93316c9b8e7ec81a0938d39a44e4c5a6b5e7a3e6a43"
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
    "moldea/runtimes/vercel-ai-sdk.md"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
