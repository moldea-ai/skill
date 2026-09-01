You are the independent judge for a moldea adapter qualification case.

Target adapter: vercel-ai-sdk
Target implementation: typescript-tool-loop-agent-7
Case: preserve-vercel-static-boundary (Preserve the Vercel static boundary)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Document the Vercel static boundaries

Evaluate the existing support integrations and preserve their working implementation. `supportAgent` uses `prepareCall`, while `stepSupportAgent` uses only `prepareStep`. `delegatingSupportAgent` registers a function tool whose implementation calls `stepSupportAgent`. The same project also exports a `WorkflowAgent`, which is outside the selected ToolLoopAgent target.

Update the canonical agent setup to state exactly what static inspection cannot prove. For `support`, preserve only the proved agent-definition and input-schema relationships and record why `prepareCall` leaves instruction, output, and tool wiring unresolved. For `step-support`, preserve its proved agent definition, input schema, output schema, and tool relationships, but record its instruction loader as unresolved because `prepareStep` can replace it. Preserve every proved `delegating-support` relationship without adding a handoff, routing target, or subagent relationship. Do not register `workflowSupportAgent` as a ToolLoopAgent target. Add only useful project-local preparation guidance, preserve all source, and validate the final project.

Required judgments:
- preserves-prepare-call-boundary: For supportAgent, the actor preserves agent-definition and input-schema proof while recording instruction-loader, output-schema, and tool relationships as unresolved because prepareCall can replace them.
  Evidence sources: actor-output, current-workspace, deterministic-after
- preserves-prepare-step-boundary: For stepSupportAgent, the actor records only the instruction-loader relationship as unresolved and preserves its proved agent-definition, input-schema, output-schema, and get_status tool relationships.
  Evidence sources: actor-output, current-workspace, deterministic-after
- does-not-infer-subagent-handoff: The actor preserves the delegate_support function tool and its direct bindings without adding routing, handoff, or subagent relationships from its call to stepSupportAgent.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- keeps-workflow-agent-outside-target: The actor preserves workflowSupportAgent as source but does not register it as a ToolLoopAgent target or infer canonical evidence from the unsupported @ai-sdk/workflow API.
  Evidence sources: current-workspace, deterministic-after, workspace-patch
- records-focused-guidance: Both prepared agents reference the sole new runtime-guidance file under /moldea/runtimes/**/*.md, which distinguishes prepareCall from prepareStep and gives the appropriate closed-constructor alternatives without claiming provider behavior.
  Evidence sources: current-workspace, workspace-patch
- records-unresolved-boundaries: Separate unresolved warnings name each preparation boundary, its related source, and the relationship-specific closed-constructor resolution.
  Evidence sources: current-workspace, deterministic-after, workspace-patch

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "Updated canonical Moldea state to reflect only statically proved Vercel ToolLoopAgent relationships. Added scoped preparation guidance and explicit warning requirements for callback-controlled wiring. Source implementation was preserved. Final Moldea inspection and validation completed successfully with no diagnostics; TypeScript compilation also passed.",
  "changedFiles": [
    "moldea/moldea.yaml",
    "moldea/runtimes/vercel-ai-sdk-preparation.md"
  ],
  "observations": [
    "support retains only its runtime-agent and input-schema bindings; prepareCall leaves instruction, output, and all get_status tool relationships unproved.",
    "step-support retains its runtime-agent, input/output schemas, and complete get_status tool relationships; its instruction loader is unresolved because prepareStep may replace instructions.",
    "All proved delegating-support relationships remain unchanged. No handoff, routing target, or subagent relationship was added.",
    "workflowSupportAgent remains outside the registered ToolLoopAgent targets.",
    "No source files or runner-mounted inputs were changed."
  ],
  "unresolved": [
    "support prepare-call-wiring remains a warning until closed static wiring or an integration test proves the effective instruction, output, and tool relationships.",
    "step-support prepare-step-instruction-loader remains a warning until canonical instruction provenance is proved for every prepared step."
  ]
}

Runner-owned actor command policy:

{
  "completedCommandCount": 64,
  "credentialExposure": {
    "status": "not-observed",
    "observedCount": 0
  },
  "networkAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 6
  },
  "sensitiveAccess": {
    "status": "indeterminate",
    "observedCount": 0,
    "indeterminateCount": 6
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
  "durationMs": 3341
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "moldea/agents/delegating-support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a8117aea31bc38216e01077f15274cf9a991062b8d572773837a18878ce7bc8d"
    },
    {
      "path": "moldea/agents/delegating-support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "d60acb50fd78839aa7852812d99ef93b6634170434cd65085978b775debbd865"
    },
    {
      "path": "moldea/agents/step-support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0756b0c13fe196cb4a2cb3e39de296a8b10be60f84a6b6bb31301de6c2dfe8da"
    },
    {
      "path": "moldea/agents/step-support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0b3e175e2a6a8e5952010629d7c187bc234093d4e7f2e6a72d6fd2de965ef345"
    },
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
      "sha256": "3718ac34b7ba5915861a77d87fcd7b3c7fdef72709b809de24e3fcf10334f8c8"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a2a415c0242c7b41f52f8313a2f7c31cca3bde3e9673204c7fc2bc1a2efce29f"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "cf3437ad2d842a3b6514aecc2b638d922276d6583971bf23e242a0ade54e8918"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "20587c55e44047626567edc43b1250cef64ecebdda0210d8cacce074a54f6462"
    },
    {
      "path": "src/delegating-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "1796887cbe0bd52b53722fc67ff311fba3b83cf8120e49b4362403c7e24c640a"
    },
    {
      "path": "src/delegation-tool.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b943c3f2936478a50c10cae66622c5ed2b0aed4060aa84bf27b32c5a513c0115"
    },
    {
      "path": "src/delegation.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "c7aaba0b4fc6dca9406310177e5a343b53159e88c96445e357fe7e16fc04707e"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "5cb8b057352da29deeef2c2abae57ba1d04b0c2369b16783aaf33e39e30c06a9"
    },
    {
      "path": "src/instructions.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "bd173ef005ec6567954ad8f1aac6b0feec8063d702482e41c13434d29f59e0ea"
    },
    {
      "path": "src/status-tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "f6990992565c538a26aa5d2443538a8d0eb1387709b7ce6e385be72776a46f1c"
    },
    {
      "path": "src/step-support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "3a5f39fbe03b5f3c19ce5c18a2ced77e6f5086f79bbb95d6c427c58f1d00d67e"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b56a2255edaeb9ecaa4797b9bf75dd9e4688d3f090c2e1361e43eeb2fe15df2f"
    },
    {
      "path": "src/workflow-agent.mts",
      "kind": "file",
      "mode": 33204,
      "sha256": "299efab589780ff0475526befe4a0156319eb7b0ef8a8639724b9e1e8b7654d9"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "db0f58d67938a74c706f519ce791f0125cff26fb63b2a5d300010eec24a6a3b2"
    }
  ],
  "after": [
    {
      "path": "moldea/agents/delegating-support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a8117aea31bc38216e01077f15274cf9a991062b8d572773837a18878ce7bc8d"
    },
    {
      "path": "moldea/agents/delegating-support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "d60acb50fd78839aa7852812d99ef93b6634170434cd65085978b775debbd865"
    },
    {
      "path": "moldea/agents/step-support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0756b0c13fe196cb4a2cb3e39de296a8b10be60f84a6b6bb31301de6c2dfe8da"
    },
    {
      "path": "moldea/agents/step-support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "0b3e175e2a6a8e5952010629d7c187bc234093d4e7f2e6a72d6fd2de965ef345"
    },
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
      "sha256": "b44981c0cf248e114224f8e22fb561a990c9cb607bbc4a1c88ebd103cbfe0b65"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "a2a415c0242c7b41f52f8313a2f7c31cca3bde3e9673204c7fc2bc1a2efce29f"
    },
    {
      "path": "moldea/runtimes/vercel-ai-sdk-preparation.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "d27c83dffccde85b8d67c90d583976ba094e3ff69b0efe85867c1eef4c83cee0"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "cf3437ad2d842a3b6514aecc2b638d922276d6583971bf23e242a0ade54e8918"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "20587c55e44047626567edc43b1250cef64ecebdda0210d8cacce074a54f6462"
    },
    {
      "path": "src/delegating-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "1796887cbe0bd52b53722fc67ff311fba3b83cf8120e49b4362403c7e24c640a"
    },
    {
      "path": "src/delegation-tool.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b943c3f2936478a50c10cae66622c5ed2b0aed4060aa84bf27b32c5a513c0115"
    },
    {
      "path": "src/delegation.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "c7aaba0b4fc6dca9406310177e5a343b53159e88c96445e357fe7e16fc04707e"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "5cb8b057352da29deeef2c2abae57ba1d04b0c2369b16783aaf33e39e30c06a9"
    },
    {
      "path": "src/instructions.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "bd173ef005ec6567954ad8f1aac6b0feec8063d702482e41c13434d29f59e0ea"
    },
    {
      "path": "src/status-tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "f6990992565c538a26aa5d2443538a8d0eb1387709b7ce6e385be72776a46f1c"
    },
    {
      "path": "src/step-support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "3a5f39fbe03b5f3c19ce5c18a2ced77e6f5086f79bbb95d6c427c58f1d00d67e"
    },
    {
      "path": "src/support-agent.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "b56a2255edaeb9ecaa4797b9bf75dd9e4688d3f090c2e1361e43eeb2fe15df2f"
    },
    {
      "path": "src/workflow-agent.mts",
      "kind": "file",
      "mode": 33204,
      "sha256": "299efab589780ff0475526befe4a0156319eb7b0ef8a8639724b9e1e8b7654d9"
    },
    {
      "path": "tsconfig.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "db0f58d67938a74c706f519ce791f0125cff26fb63b2a5d300010eec24a6a3b2"
    }
  ],
  "changedPaths": [
    "moldea/moldea.yaml",
    "moldea/runtimes/vercel-ai-sdk-preparation.md"
  ]
}

Judge only the requirements listed above. Use only their declared evidence sources. A pass requires the actual repository state, runner-owned evidence, and diff to agree. Return only the structured result required by the output schema.
