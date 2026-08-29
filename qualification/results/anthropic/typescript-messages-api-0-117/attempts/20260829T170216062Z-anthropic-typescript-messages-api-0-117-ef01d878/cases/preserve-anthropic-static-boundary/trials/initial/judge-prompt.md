You are the independent judge for a moldea adapter qualification case.

Target adapter: anthropic
Target implementation: typescript-messages-api-0-117
Case: preserve-anthropic-static-boundary (Preserve the Anthropic static boundary)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Review the Anthropic static boundary

Review whether the `support` and `dynamic-support` agents represent only the Anthropic relationships that static repository evidence can establish.

Confirm the direct Messages API wrapper and system instruction loader. Treat the provider-hosted web search tool and indirect request object conservatively: do not invent client-tool, schema, runtime-pattern, routing, or handoff relationships that the adapter does not prove. If the project already records the dynamic boundary accurately, leave it unchanged and report the evidence and validation outcome.

Required judgments:
- explains-direct-evidence: The actor grounds the support agent's direct Messages API pattern and system instruction loader in deterministic adapter evidence.
  Evidence sources: actor-output, current-workspace, deterministic-after
- preserves-provider-tool-boundary: The actor treats the provider-hosted web search tool as outside client-tool registration and schema evidence instead of inventing canonical tool relationships.
  Evidence sources: actor-output, current-workspace, deterministic-after
- preserves-indirect-request-boundary: The actor explains that the dynamic-support request object does not establish a direct runtime pattern and retains the existing unresolved warning with a concrete resolution.
  Evidence sources: actor-output, current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "The existing Anthropic boundary is accurate and was left unchanged. Repository-local Moldea inspection and validation both returned valid schema-2 envelopes with no diagnostics; TypeScript compilation passed; final Git diff and status were clean.",
  "changedFiles": [],
  "observations": [
    "src/agents.ts proves supportAgent directly calls client.messages.create and supplies system from loadSupportInstruction().",
    "loadSupportInstruction reads /moldea/agents/support/instruction.md, matching the registered instructionLoader binding.",
    "Moldea adapter evidence confirms supportAgent as a Messages API runtime pattern and confirms the system instruction loader.",
    "The provider-hosted web search object produced no adapter-proven capability, client-tool, or schema relationship, and none is registered.",
    "dynamicSupportAgent constructs an intermediate request object. Adapter evidence establishes its language and Anthropic SDK dependency, but no Messages runtime-pattern, instruction-loader, schema, routing, or handoff relationship.",
    "moldea/moldea.yaml conservatively records the dynamic uncertainty as the indirect-request-construction warning and does not invent unsupported relationships."
  ],
  "unresolved": [
    "The dynamic request's runtime relationships remain unproven while the request is assembled indirectly; the existing warning correctly identifies a closed direct request or supported adapter evidence as the resolver."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 17,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 1
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 1
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
  "durationMs": 2085
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "moldea/agents/dynamic-support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "3dec4ef187bfffd6b96789d69ae29e31a180120ca0f8e6dc74f4fffa5d481b7c"
    },
    {
      "path": "moldea/agents/dynamic-support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "10f809f5c859c509c710797066b0a8f69b6d86fc0b0c33dd52cbd1e36b7a8807"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0de068e3643b27a469cef731ff03278f269287410e6763a4bd92cd49c7564f82"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "e7ab796d00d12f27c4cfb05cdfacff7704106cf90c5c6d261e2016239248ba91"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "1bbc13c7f7e9e4157b800f89caa61d626463358974a8495c58bcb9941909c482"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "d1273a468848ef38698566bef48d8de0a64674165b256764af7ece9f276b6ef8"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "9fbb84806eb5d5774b038c9f0674596fc83b63a9e607f7c058c720e8ec7add81"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "5d232d42e89489e6fe0d60235038eb9f1a40ebf1cf6c3c8838b225eab30f3628"
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
      "path": "moldea/agents/dynamic-support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "3dec4ef187bfffd6b96789d69ae29e31a180120ca0f8e6dc74f4fffa5d481b7c"
    },
    {
      "path": "moldea/agents/dynamic-support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "10f809f5c859c509c710797066b0a8f69b6d86fc0b0c33dd52cbd1e36b7a8807"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0de068e3643b27a469cef731ff03278f269287410e6763a4bd92cd49c7564f82"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "e7ab796d00d12f27c4cfb05cdfacff7704106cf90c5c6d261e2016239248ba91"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "1bbc13c7f7e9e4157b800f89caa61d626463358974a8495c58bcb9941909c482"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "d1273a468848ef38698566bef48d8de0a64674165b256764af7ece9f276b6ef8"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "9fbb84806eb5d5774b038c9f0674596fc83b63a9e607f7c058c720e8ec7add81"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "5d232d42e89489e6fe0d60235038eb9f1a40ebf1cf6c3c8838b225eab30f3628"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7618798c77f948fc8b2a75fa7accecd8222ffc47e53ccd5461da03116901576a"
    }
  ],
  "changedPaths": []
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
