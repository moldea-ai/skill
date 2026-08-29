You are the independent judge for a moldea adapter qualification case.

Target adapter: anthropic
Target implementation: typescript-messages-api-0-117
Case: evaluate-aligned-project (Evaluate an aligned project)

Read the installed candidate skill at `.agents/skills/moldea/SKILL.md`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

# Review the existing agent setup

Review whether the `support` and `summary` agents accurately represent their direct Anthropic Messages API wrappers and instruction loaders, including the support agent's client tool and input schema.

If the project is already valid and aligned, do not edit it. Report the evidence and validation outcome. Do not infer output-schema, tool-implementation, routing, handoff, subagent, or agent input-schema relationships.

Required judgments:
- explains-direct-patterns: The actor accurately explains how each canonical instruction loader reaches its corresponding direct Messages API wrapper using emitted evidence. Equivalent evidence-based wording passes without requiring property-name repetition.
  Evidence sources: actor-output, current-workspace, deterministic-after
- explains-closed-bindings: The actor accurately explains the declared closed client-tool registration and direct input-schema relationship. Exact helper or schema symbol repetition is not required when the relationships are unambiguous and deterministic evidence confirms them.
  Evidence sources: actor-output, current-workspace, deterministic-after
- respects-static-boundary: The actor does not infer output-schema, tool-implementation, routing, handoff, subagent, agent-definition, or agent input-schema relationships.
  Evidence sources: actor-output, current-workspace, deterministic-after

Actor report (claims are not evidence by themselves):

{
  "outcome": "completed",
  "summary": "The project is valid and aligned; no edits were needed. Moldea inspection and validation returned schema 2 / CLI 5.0.0 `status: valid` with no diagnostics, TypeScript type-checking passed, and the final relevant diff and Git status were clean.",
  "changedFiles": [],
  "observations": [
    "Both agents are direct `Anthropic.messages.create` wrappers in `src/agents.ts` and use runtime ID `anthropic`.",
    "Each wrapper loads its canonical `instruction.md` through the corresponding loader in `src/instructions.ts` and supplies it through the Messages API `system` property.",
    "Support registers the client tool `find_order`; its manifest name, description, registration symbol, and executable input schema match the source.",
    "`FindOrderInputSchema` requires one string `orderId` and rejects additional properties, matching the tool registration.",
    "Summary has no tool declaration, matching its wrapper.",
    "No output-schema, routing, handoff, subagent, agent input-schema, or additional tool-implementation relationships were inferred.",
    "No repository files changed."
  ],
  "unresolved": []
}

Runner-owned actor command policy:

{
  "completedCommandCount": 39,
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
  "durationMs": 2042
}

Workspace assertions:

{
  "passed": true,
  "failures": [],
  "before": [
    {
      "path": "moldea/agents/summary/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "691597041e3bfbaac12f18a9194b44c9881767cabbc6a212b8d7961955d1c584"
    },
    {
      "path": "moldea/agents/summary/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "f52c42abf98299651f470d9535d955c59a1edb029cbb12980884354b6ae8263d"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "53ae7f61ec2efd17535480232f56c720e32d6239218dfe198d51cfc7b65f3f22"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "31ec265be4124fac1e491ee9a345b7e1cfead6dbd9768d98cfb98195c9038b80"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "b17c461a511274f745667ee0ae3fb0c4cbb4dfc6d2c862979035d5849972135b"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "08ad3c054285b24fc37a3e588996ff309df58b71623cda2c3c8f36e0697139eb"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7329d780b6c86796a7932a90628c73ac3760ffc99279cd119041a993bdf7c86a"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "e3d635caa7b64360d88b04433655eb8dc6d2e06519b8f2cb6c7fe1b3bc0315e1"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "531fbfb209994adc762596c61504e9103f478cb3f7459e920ec2148178b739e4"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "105dbd6ee1919d795ec1500a2f55dbc68fb42ca1f090de910e21e585952d649b"
    },
    {
      "path": "src/instructions.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "9c042be5c8af3ffc1bca210ba0fbb94d9959b823bcb6fa631fea69d71ea95333"
    },
    {
      "path": "src/tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "e9fa46c1fb7aa0f4b112a1de1408834d33edcf42ba380c7e7df89fa32eae48c4"
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
      "path": "moldea/agents/summary/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "691597041e3bfbaac12f18a9194b44c9881767cabbc6a212b8d7961955d1c584"
    },
    {
      "path": "moldea/agents/summary/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "f52c42abf98299651f470d9535d955c59a1edb029cbb12980884354b6ae8263d"
    },
    {
      "path": "moldea/agents/support/description.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "53ae7f61ec2efd17535480232f56c720e32d6239218dfe198d51cfc7b65f3f22"
    },
    {
      "path": "moldea/agents/support/instruction.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "31ec265be4124fac1e491ee9a345b7e1cfead6dbd9768d98cfb98195c9038b80"
    },
    {
      "path": "moldea/moldea.yaml",
      "kind": "file",
      "mode": 33204,
      "sha256": "b17c461a511274f745667ee0ae3fb0c4cbb4dfc6d2c862979035d5849972135b"
    },
    {
      "path": "moldea/project.md",
      "kind": "file",
      "mode": 33204,
      "sha256": "08ad3c054285b24fc37a3e588996ff309df58b71623cda2c3c8f36e0697139eb"
    },
    {
      "path": "package.json",
      "kind": "file",
      "mode": 33204,
      "sha256": "7329d780b6c86796a7932a90628c73ac3760ffc99279cd119041a993bdf7c86a"
    },
    {
      "path": "src/agents.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "e3d635caa7b64360d88b04433655eb8dc6d2e06519b8f2cb6c7fe1b3bc0315e1"
    },
    {
      "path": "src/contracts.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "531fbfb209994adc762596c61504e9103f478cb3f7459e920ec2148178b739e4"
    },
    {
      "path": "src/implementations.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "105dbd6ee1919d795ec1500a2f55dbc68fb42ca1f090de910e21e585952d649b"
    },
    {
      "path": "src/instructions.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "9c042be5c8af3ffc1bca210ba0fbb94d9959b823bcb6fa631fea69d71ea95333"
    },
    {
      "path": "src/tools.ts",
      "kind": "file",
      "mode": 33204,
      "sha256": "e9fa46c1fb7aa0f4b112a1de1408834d33edcf42ba380c7e7df89fa32eae48c4"
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
