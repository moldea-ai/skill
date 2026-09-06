# Milestones: Resource-bounded moldea skill and PR Assurance

## Completed baseline

Milestones 1 through 20 are complete and published through `3cadf883ae98f624f09fdc3c2c92e4d96d8f2dea` on `origin/new_skill`. They established the clean 5.0 contracts across the skill, packages, platform specifications, websites, knowledge base, fixtures, release tooling, and bounded qualification status inspection.

The first paid Custom qualification attempt, `20260906T060549917Z-custom-custom-daa6b9f1`, is retained as failure evidence. It proved that the portable relevance gate could load the repository-local CLI but resolved Core through the skill development checkout instead of the qualification workspace. The remaining sequence begins with that root-cause correction. Because the portable skill digest changes, the earlier semantic evidence must then be regenerated before Custom or adapter evidence can qualify the release.

## Milestone 21: Enforce repository-local Core resolution

### Objective

Make every portable moldea launcher resolve Core exclusively from the validated repository-local CLI dependency graph, including hoisted npm and isolated pnpm layouts, without falling through to the skill installation or a parent workspace.

### Dependencies

- Milestones 1 through 20 are published.
- The failed Custom attempt is preserved as regression evidence.

### Scope and implementation

- Replace the ambient `import.meta.resolve` Core lookup in `moldea/scripts/repository-package.mjs` with deterministic search rooted in the validated CLI package.
- Derive Node module search roots from the CLI package, retain only roots contained by the target repository's `node_modules`, and select the first existing `@moldea.ai/core` candidate in normal Node search order.
- Treat the first candidate as authoritative: fail closed when it escapes containment, has invalid identity or version metadata, or lacks the exact supported entry point instead of skipping to another installation.
- Keep CLI and Core realpath, package-name, stable-version, and supported-range checks intact.
- Add focused conformance coverage for hoisted npm, isolated pnpm, missing repository-local Core with an ambient outside copy available, and an invalid nearer candidate that must not fall through to a later valid copy.
- Preserve the failed paid attempt and update directly affected durable documentation only if the established repository-local contract is not already accurate.

### Verification

- Run the focused conformance tests, the complete root correctness suite, type and lint checks where configured, targeted formatting, the portable skill validator, path/resource/privacy checks, semantic preflight, qualification verification, and a non-paid dry run.
- Reproduce the failed relationship-gate scenario in an isolated pnpm-shaped workspace and require activation without reading canonical bodies through the launcher.

### Acceptance criteria

- The relationship gate returns active for an affected source in the isolated qualification layout.
- No launcher can resolve CLI or Core outside the target repository dependency boundary.
- npm and pnpm dependency layouts both pass, while missing or malformed nearer dependencies fail closed with bounded output.
- The preserved failed attempt remains intact and machine-readable.

### Review checkpoint

Review search-root ordering, realpath containment, first-candidate failure behavior, version validation, cross-platform path handling, regression depth, and the exact failed-evidence preservation before signed publication.

## Milestone 22: Refresh semantic evidence

### Objective

Record fresh exact-current semantic evidence for the corrected portable skill.

### Dependencies

- Milestone 21 is published.

### Scope and implementation

- Run the official semantic evaluation with cache disabled against the exact published skill state.
- Preserve every case and recovery trial through the established bounded evidence pipeline.
- Correct only in-scope semantic defects through the authorized review loop; re-plan if a material contract change becomes necessary.

### Verification

- Verify all 18 semantic cases, with explicit attention to abstention, declared-relationship activation, canonical-file activation, lowercase `moldea`, bounded resource use, repository-bound tooling, privacy, and artifact integrity.
- Run semantic evidence verification, root checks, portable skill validation, formatting, path checks, and public evidence rendering checks.

### Acceptance criteria

- One no-cache semantic attempt passes completely and matches the exact current portable skill and qualification-source identities.
- The affected-source case uses bounded moldea evidence and identifies the owning canonical context.

### Review checkpoint

Review failures and recoveries, token/tool resource measurements, artifact digests, privacy output, exact identities, and public evidence before signed publication.

## Milestone 23: Qualify Custom

### Objective

Record fresh passing Custom qualification evidence against the corrected, semantically qualified skill.

### Dependencies

- Milestone 22 is published and its semantic evidence is current.

### Scope and implementation

- Run the official paid `custom/custom` qualification with cache disabled against the exact published packages snapshot.
- Preserve all trials, including the earlier failed attempt, and publish only a complete passing attempt as current.
- Correct only in-scope qualification defects through the authorized review loop; re-plan if a material contract change becomes necessary.

### Verification

- Verify all universal cases, especially unrelated-task abstention, relationship activation, canonical activation, instruction/tool boundaries, package identity, resource budgets, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete Custom profile passes with exact-current semantic, skill, qualification-source, CLI, Core, and packages identities.
- Current status is compact and points to the passing attempt while retaining failed evidence.

### Review checkpoint

Review every failed/recovered trial, resource measurement, provenance edge, public artifact, and current-pointer transition before signed publication.

## Milestone 24: Qualify Anthropic Messages API

### Objective

Record passing evidence for `anthropic/typescript-messages-api-0-117`.

### Dependencies

- Milestone 23 is published and Custom remains current.

### Scope and implementation

- Run and preserve the official paid `t1` adapter qualification against the exact published packages snapshot.

### Verification

- Verify adapter construction, instruction flow, tool registration and repair, static boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t1` profile passes with exact-current evidence.

### Review checkpoint

Review Anthropic-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 25: Qualify Claude Agent SDK

### Objective

Record passing evidence for `claude-agent-sdk/typescript-query-subagents-0-3`.

### Dependencies

- Milestone 24 is published.

### Scope and implementation

- Run and preserve the official paid `t2` adapter qualification.

### Verification

- Verify query/subagent wiring, instruction provenance, boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t2` profile passes with exact-current evidence.

### Review checkpoint

Review Claude Agent SDK-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 26: Qualify Cloudflare AI Chat Agent

### Objective

Record passing evidence for `cloudflare-agents/typescript-ai-chat-agent-0-10-ai-sdk-7`.

### Dependencies

- Milestone 25 is published.

### Scope and implementation

- Run and preserve the official paid `t3` adapter qualification.

### Verification

- Verify AI Chat Agent wiring, bindings, migrations/deployment guidance, tool behavior, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t3` profile passes with exact-current evidence.

### Review checkpoint

Review Cloudflare AI Chat Agent-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 27: Qualify Cloudflare Think

### Objective

Record passing evidence for `cloudflare-agents/typescript-think-0-16-ai-sdk-7`.

### Dependencies

- Milestone 26 is published.

### Scope and implementation

- Run and preserve the official paid `t4` adapter qualification.

### Verification

- Verify Think wiring, static boundaries, bindings, tool behavior, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t4` profile passes with exact-current evidence.

### Review checkpoint

Review Cloudflare Think-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 28: Qualify Eve

### Objective

Record passing evidence for `eve/typescript-filesystem-agent-0-39`.

### Dependencies

- Milestone 27 is published.

### Scope and implementation

- Run and preserve the official paid `t6` adapter qualification.

### Verification

- Verify filesystem-agent wiring, instruction and tool boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t6` profile passes with exact-current evidence.

### Review checkpoint

Review Eve-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 29: Qualify Google Gen AI

### Objective

Record passing evidence for `google-genai/typescript-models-generate-content-2`.

### Dependencies

- Milestone 28 is published.

### Scope and implementation

- Run and preserve the official paid `t7` adapter qualification.

### Verification

- Verify model-generation wiring, instruction/tool handling, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t7` profile passes with exact-current evidence.

### Review checkpoint

Review Google Gen AI-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 30: Qualify LangChain

### Objective

Record passing evidence for `langchain/typescript-create-agent-1-5`.

### Dependencies

- Milestone 29 is published.

### Scope and implementation

- Run and preserve the official paid `t8` adapter qualification.

### Verification

- Verify create-agent wiring, tool registration and repair, static boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t8` profile passes with exact-current evidence.

### Review checkpoint

Review LangChain-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 31: Qualify LangGraph Functional API

### Objective

Record passing evidence for `langgraph/typescript-functional-api-1-4`.

### Dependencies

- Milestone 30 is published.

### Scope and implementation

- Run and preserve the official paid `t9` adapter qualification.

### Verification

- Verify Functional API wiring, routing/static boundaries, tool behavior, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t9` profile passes with exact-current evidence.

### Review checkpoint

Review LangGraph Functional API-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 32: Qualify LangGraph StateGraph

### Objective

Record passing evidence for `langgraph/typescript-state-graph-1-4`.

### Dependencies

- Milestone 31 is published.

### Scope and implementation

- Run and preserve the official paid `t10` adapter qualification.

### Verification

- Verify StateGraph wiring, state/routing boundaries, tools, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t10` profile passes with exact-current evidence.

### Review checkpoint

Review LangGraph StateGraph-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 33: Qualify OpenAI Responses API

### Objective

Record passing evidence for `openai/typescript-responses-api-7`.

### Dependencies

- Milestone 32 is published.

### Scope and implementation

- Run and preserve the official paid `t11` adapter qualification.

### Verification

- Verify Responses API wiring, instruction and tool contracts, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t11` profile passes with exact-current evidence.

### Review checkpoint

Review OpenAI Responses API-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 34: Qualify OpenAI Agents SDK

### Objective

Record passing evidence for `openai-agents-sdk/typescript-agent-handoffs-0-16`.

### Dependencies

- Milestone 33 is published.

### Scope and implementation

- Run and preserve the official paid `t12` adapter qualification.

### Verification

- Verify agent/handoff wiring, instruction provenance, tool registration and repair, boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t12` profile passes with exact-current evidence.

### Review checkpoint

Review OpenAI Agents SDK-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 35: Qualify Vercel generate/stream text

### Objective

Record passing evidence for `vercel-ai-sdk/typescript-generate-stream-text-7`.

### Dependencies

- Milestone 34 is published.

### Scope and implementation

- Run and preserve the official paid `t13` adapter qualification.

### Verification

- Verify generation/streaming wiring, instruction and tool behavior, indirect/static boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t13` profile passes with exact-current evidence.

### Review checkpoint

Review Vercel generate/stream text-specific behavior, provenance, budgets, and evidence before signed publication.

## Milestone 36: Qualify Vercel ToolLoopAgent

### Objective

Record passing evidence for `vercel-ai-sdk/typescript-tool-loop-agent-7`.

### Dependencies

- Milestone 35 is published.

### Scope and implementation

- Run and preserve the official paid `t14` adapter qualification.

### Verification

- Verify ToolLoopAgent wiring, prepare-call/prepare-step boundaries, tool behavior, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t14` profile passes with exact-current evidence.
- Custom and all thirteen adapter targets have current passing results.

### Review checkpoint

Review Vercel ToolLoopAgent-specific behavior plus the complete target registry before signed publication.

## Milestone 37: Record release evidence

### Objective

Create the compact fresh 5.0.0 release-evidence envelope from the exact passing semantic and qualification set.

### Dependencies

- Milestones 22 through 36 are published and all current evidence verifies.

### Scope and implementation

- Run the fresh release-evidence recording command against exact current identities.
- Verify semantic, Custom, every adapter, CLI closure, packages snapshot, portable skill, qualification source, artifact digests, resource states, and provenance.
- Update only the release envelope and directly generated/public release evidence owned by the established workflow.

### Verification

- Run release identity/check workflows, semantic and qualification verification, root and website validation, privacy scanning, formatting, and exact-state review.

### Acceptance criteria

- One compact fresh envelope selects all passing exact-current evidence without a pin, compatibility reader, copied transcript, or stale identity.

### Review checkpoint

Review every selected digest and source, evidence mode, package/version identity, public disclosure, and release gate before signed publication.

## Milestone 38: Publish the clean release and final audit

### Objective

Integrate and publish the clean skill 5.0.0 release, remove authorized obsolete 4.0.x release surfaces, and prove cross-repository consistency.

### Dependencies

- Milestone 37 is published and release checks pass.
- Required GitHub and registry credentials and repository controls remain available.

### Scope and implementation

- Review the complete feature branch against the freshly resolved `main` target, resolve only in-scope conflicts, and merge through the authorized signed publication workflow.
- Push exact `main`, monitor established CI, site, and release workflows, and verify published skill, package, and site artifacts.
- Delete authorized exact `v4.0.0`, `v4.0.1`, and `v4.0.2` local/remote tag and GitHub Release surfaces when authenticated hosting permits, without rewriting shared branch history.
- Audit active source, specifications, documentation, websites, knowledge base, packages, platform, fixture manifests, release metadata, and registry state for old versions, global-install guidance, eager/body-bearing inspection, false completeness, stale ranges, and launch overclaims.
- Preserve unrelated concurrent work and protected instruction files.

### Verification

- Run final repository-owned tests, typechecks, lint, formatting, builds, docs/site validation, semantic/qualification/release verification, package/version closure, tag/release checks, workflow checks, registry checks, and contradiction searches at each affected boundary.

### Acceptance criteria

- Skill 5.0.0 is published from reviewed signed evidence and public sites reflect it.
- Active source and documentation expose only the clean current contracts.
- Authorized obsolete release surfaces are absent or a precise external-capability blocker is recorded.
- Every affected repository is at the exact intended published tip, excluding explicitly preserved unrelated concurrent work.

### Review checkpoint

Review target freshness, mergeability, signed history, workflow and registry outcomes, public rendering, obsolete release absence, cross-repository contradictions, protected instructions, and final completion evidence.

## Execution scope

The remaining execution consists of eighteen sequential milestones: correct and publish repository-bounded Core resolution; regenerate exact-current semantic evidence; qualify Custom and each of the thirteen declared adapters one at a time; record one compact fresh release-evidence envelope; then integrate, publish, remove authorized obsolete 4.0.x release surfaces, and audit the complete cross-repository public state. Each milestone includes its required implementation, tests, documentation synchronization, evidence preservation, review loop, signed commit, and explicit one-branch publication before the next begins.
