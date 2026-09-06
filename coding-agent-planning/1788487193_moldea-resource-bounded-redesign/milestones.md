# Milestones: Scalable clean-slate moldea activation and PR Assurance foundation

## Completed baseline

Milestones 1 through 19 are complete, reviewed, signed, and published at their recorded repository boundaries. The latest published skill commit is `5fcadcc55b6fbad23d77b826539f208d7d94fceb`. It contains lowercase product-name enforcement and fresh semantic attempt `20260906T035559508Z-semantic-9f0bb977`, which passed all 18 cases on their initial trials. The remaining sequence preserves every prior result and begins with the qualification defects exposed after that commit.

## Milestone 20: Correct qualification ownership and bounded status

### Objective

Remove host-task opinion from negative moldea activation verdicts and replace body-bearing qualification status output with bounded metadata pages.

### Dependencies

- Milestones 1 through 19 are published.
- Failed Custom attempts `20260906T035957301Z-custom-custom-0755bb71` and `20260906T041722240Z-custom-custom-111a8e5f` remain byte-for-byte intact.

### Scope and implementation

- Preserve and publish both failed `t5` attempt directories plus the resulting latest pointer as immutable diagnostic evidence.
- Remove `reviews-ordinary-source` from `qualification/profiles/t5/cases/c10/scenario.yaml` and `reviews-unrelated-document` from `qualification/profiles/t5/cases/c11/scenario.yaml`.
- Retain completed actor outcome, zero moldea command/output behavior, no moldea mention or reference leakage, exact adoption state, and unchanged workspace as the complete negative-case contract.
- Update the two case READMEs and qualification documentation to state that host-owned review correctness is outside moldea qualification.
- Add a focused `qualification/src/status/` module that projects valid and unavailable local checkpoints into compact summaries, orders them deterministically, pages at most 64 records, binds an opaque cursor to the exact selected snapshot, and rejects malformed or stale cursors.
- Preserve the default actionable status scope and make `--all` select full local history. Add `--cursor` only to status commands and remove the old complete-checkpoint JSON shape without an alias or compatibility reader.
- Keep every status JSON page at or below 65,536 UTF-8 bytes and exclude complete checkpoints, candidates, package manifests, stages, prompts, workspace paths, commands, model output, and repository content.
- Update command parsing/types, CLI orchestration, presentation, exports, focused tests, `qualification/README.md`, `docs/adapter-qualification.md`, and any generated website evidence contracts directly affected by the new status shape.

### Verification

- Run focused parser, status, presentation, profile-loader, coverage, and local-attempt integration tests, including exact 64-record, continuation, final-page, malformed-cursor, stale-snapshot, unavailable-attempt, actionable-scope, and 65,536-byte boundary cases.
- Prove both abstention scenarios fail on moldea activation/preservation violations but cannot fail on unrelated review opinions.
- Run `npm run qualification:dry-run`, `npm run qualification:verify`, `npm run qualification:test`, `npm run qualification:typecheck`, `npm run qualification:lint`, and `npm run qualification:format:check`.
- Run root tests, semantic history verification, semantic input-identity comparison, resource/path checks, portable-skill validation, website checks, formatting, secret scanning, and diff checks.

### Acceptance criteria

- Negative activation qualification owns only moldea behavior and repository preservation.
- Status output is compact, content-free, deterministic, cursor-paged, stale-safe, and at most 65,536 bytes.
- Both failed attempts remain immutable and verifiable.
- The current passing semantic attempt remains exact because no semantic input or portable skill byte changes.

### Review checkpoint

Review scenario ownership, cursor integrity, output sizing, default versus `--all` behavior, absence of sensitive/body fields, historical evidence immutability, semantic identity, documentation, and the exact candidate state before signed publication.

## Milestone 21: Record fresh Custom qualification

### Objective

Generate one exact-current passing universal Custom qualification after Milestone 20.

### Dependencies

- Milestone 20 is reviewed, signed, published, and the worktree is clean.
- The isolated packages repository remains at commit `67a063b90a4b9a8493956d1576e55f286925754c`.

### Scope and implementation

- Run one official no-cache `custom/custom` qualification against the exact published skill and packages snapshot.
- Preserve every trial and operational retry immutably; promote only a complete passing attempt.
- Do not recalibrate from rejected output, weaken canonical validation, or alter negative-case ownership during the run.

### Verification

- Verify every universal case, confirmation, deterministic assertion, command-policy result, resource profile, package/source identity, artifact digest, latest pointer, privacy projection, and public rendering.
- Run qualification verification, resource/path checks, root tests, website checks, formatting, secret scanning, and exact-state review.

### Acceptance criteria

- All universal cases pass or recover under the existing resource and policy limits.
- The attempt is exact-current, source-bound, privacy-safe, and independently verifiable.
- No adapter-specific profile runs before this result is published.

### Review checkpoint

Inspect every trial, retry, failure/recovery, command and token aggregate, maximum output, moldea use, deterministic result, judge assessment, and stored artifact before signed publication.

## Milestone 22: Qualify Anthropic Messages API

### Objective

Record passing evidence for `anthropic/typescript-messages-api-0-117`.

### Dependencies

- Milestone 21 is published and Custom remains current.

### Scope and implementation

- Run the official `t1` adapter-specific profile against the published packages snapshot.
- Preserve all trials and publish only a complete passing attempt.

### Verification

- Verify adapter construction, instruction flow, tool registration/repair, static boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t1` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review Anthropic-specific behavior and evidence, then sign and publish the exact result.

## Milestone 23: Qualify Claude Agent SDK

### Objective

Record passing evidence for `claude-agent-sdk/typescript-query-subagents-0-3`.

### Dependencies

- Milestone 22 is published.

### Scope and implementation

- Run and preserve the official `t2` adapter-specific qualification.

### Verification

- Verify query/subagent wiring, instruction provenance, boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t2` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review Claude Agent SDK-specific behavior and evidence, then sign and publish the exact result.

## Milestone 24: Qualify Cloudflare AI Chat Agent

### Objective

Record passing evidence for `cloudflare-agents/typescript-ai-chat-agent-0-10-ai-sdk-7`.

### Dependencies

- Milestone 23 is published.

### Scope and implementation

- Run and preserve the official `t3` adapter-specific qualification.

### Verification

- Verify AI Chat Agent wiring, bindings, migrations/deployment guidance, tool behavior, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t3` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review Cloudflare AI Chat Agent-specific behavior and evidence, then sign and publish the exact result.

## Milestone 25: Qualify Cloudflare Think

### Objective

Record passing evidence for `cloudflare-agents/typescript-think-0-16-ai-sdk-7`.

### Dependencies

- Milestone 24 is published.

### Scope and implementation

- Run and preserve the official `t4` adapter-specific qualification.

### Verification

- Verify Think wiring, static boundaries, bindings, tool behavior, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t4` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review Cloudflare Think-specific behavior and evidence, then sign and publish the exact result.

## Milestone 26: Qualify Eve

### Objective

Record passing evidence for `eve/typescript-filesystem-agent-0-39`.

### Dependencies

- Milestone 25 is published.

### Scope and implementation

- Run and preserve the official `t6` adapter-specific qualification.

### Verification

- Verify filesystem-agent wiring, instruction and tool boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t6` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review Eve-specific behavior and evidence, then sign and publish the exact result.

## Milestone 27: Qualify Google Gen AI

### Objective

Record passing evidence for `google-genai/typescript-models-generate-content-2`.

### Dependencies

- Milestone 26 is published.

### Scope and implementation

- Run and preserve the official `t7` adapter-specific qualification.

### Verification

- Verify model generation wiring, instruction/tool handling, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t7` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review Google Gen AI-specific behavior and evidence, then sign and publish the exact result.

## Milestone 28: Qualify LangChain

### Objective

Record passing evidence for `langchain/typescript-create-agent-1-5`.

### Dependencies

- Milestone 27 is published.

### Scope and implementation

- Run and preserve the official `t8` adapter-specific qualification.

### Verification

- Verify create-agent wiring, tool registration/repair, static boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t8` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review LangChain-specific behavior and evidence, then sign and publish the exact result.

## Milestone 29: Qualify LangGraph Functional API

### Objective

Record passing evidence for `langgraph/typescript-functional-api-1-4`.

### Dependencies

- Milestone 28 is published.

### Scope and implementation

- Run and preserve the official `t9` adapter-specific qualification.

### Verification

- Verify Functional API wiring, routing/static boundaries, tool behavior, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t9` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review LangGraph Functional API-specific behavior and evidence, then sign and publish the exact result.

## Milestone 30: Qualify LangGraph StateGraph

### Objective

Record passing evidence for `langgraph/typescript-state-graph-1-4`.

### Dependencies

- Milestone 29 is published.

### Scope and implementation

- Run and preserve the official `t10` adapter-specific qualification.

### Verification

- Verify StateGraph wiring, state/routing boundaries, tools, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t10` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review LangGraph StateGraph-specific behavior and evidence, then sign and publish the exact result.

## Milestone 31: Qualify OpenAI Responses API

### Objective

Record passing evidence for `openai/typescript-responses-api-7`.

### Dependencies

- Milestone 30 is published.

### Scope and implementation

- Run and preserve the official `t11` adapter-specific qualification.

### Verification

- Verify Responses API wiring, instruction and tool contracts, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t11` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review OpenAI Responses API-specific behavior and evidence, then sign and publish the exact result.

## Milestone 32: Qualify OpenAI Agents SDK

### Objective

Record passing evidence for `openai-agents-sdk/typescript-agent-handoffs-0-16`.

### Dependencies

- Milestone 31 is published.

### Scope and implementation

- Run and preserve the official `t12` adapter-specific qualification.

### Verification

- Verify agent/handoff wiring, instruction provenance, tool registration/repair, boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t12` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review OpenAI Agents SDK-specific behavior and evidence, then sign and publish the exact result.

## Milestone 33: Qualify Vercel generate/stream text

### Objective

Record passing evidence for `vercel-ai-sdk/typescript-generate-stream-text-7`.

### Dependencies

- Milestone 32 is published.

### Scope and implementation

- Run and preserve the official `t13` adapter-specific qualification.

### Verification

- Verify generation/streaming wiring, instruction and tool behavior, indirect/static boundaries, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t13` profile passes or recovers with exact-current evidence.

### Review checkpoint

Review Vercel generate/stream text-specific behavior and evidence, then sign and publish the exact result.

## Milestone 34: Qualify Vercel ToolLoopAgent

### Objective

Record passing evidence for `vercel-ai-sdk/typescript-tool-loop-agent-7`.

### Dependencies

- Milestone 33 is published.

### Scope and implementation

- Run and preserve the official `t14` adapter-specific qualification.

### Verification

- Verify ToolLoopAgent wiring, prepare-call/prepare-step boundaries, tool behavior, package identity, resources, privacy, artifacts, and website rendering.

### Acceptance criteria

- The complete `t14` profile passes or recovers with exact-current evidence.
- All thirteen adapter targets and Custom have current passing results.

### Review checkpoint

Review Vercel ToolLoopAgent-specific behavior plus the complete target registry, then sign and publish the exact result.

## Milestone 35: Record release evidence

### Objective

Create the compact fresh 5.0.0 release-evidence envelope from the exact passing semantic and qualification set.

### Dependencies

- Milestones 21 through 34 are published and all current evidence verifies.

### Scope and implementation

- Run the fresh release-evidence recording command against exact current identities.
- Verify semantic, Custom, every adapter, CLI closure, packages snapshot, portable skill, qualification source, artifact digests, resource states, and provenance.
- Update only the release envelope and directly generated/public release evidence that the established workflow owns.

### Verification

- Run release identity/check workflows, semantic and qualification verification, root/website validation, privacy scanning, formatting, and exact-state review.

### Acceptance criteria

- One compact fresh envelope selects all passing exact-current evidence without a pin, compatibility reader, copied transcript, or stale identity.

### Review checkpoint

Review every selected digest and source, evidence mode, package/version identity, public disclosure, and release gate before signed publication.

## Milestone 36: Publish the clean release and final audit

### Objective

Integrate and publish the clean skill 5.0.0 release, remove authorized obsolete 4.0.x release surfaces, and prove cross-repository consistency.

### Dependencies

- Milestone 35 is published and release checks pass.
- Required GitHub and registry credentials and repository controls remain available.

### Scope and implementation

- Review the complete feature branch against the freshly resolved `main` target, resolve only in-scope conflicts, and merge through the authorized signed publication workflow.
- Push exact `main`, monitor established CI/site/release workflows, and verify the published skill/package/site artifacts rather than inferring success from a push.
- Delete authorized exact `v4.0.0`, `v4.0.1`, and `v4.0.2` local/remote tag and GitHub Release surfaces when authenticated hosting permits, without rewriting shared branch history.
- Audit active source, specifications, documentation, websites, knowledge base, packages, platform, fixture manifests, release metadata, and registry state for old versions, global-install guidance, eager/body-bearing inspection, false completeness, stale ranges, and launch overclaims.
- Preserve unrelated concurrent work and protected instruction files.

### Verification

- Run final repository-owned tests, typechecks, lint, formatting, builds, docs/site validation, semantic/qualification/release verification, package/version closure, tag/release checks, workflow checks, registry checks, and contradiction searches at each affected boundary.

### Acceptance criteria

- Skill 5.0.0 is published from reviewed signed evidence and the public sites reflect it.
- Active source and documentation expose only the clean current contracts.
- Authorized obsolete release surfaces are absent or a precise external capability blocker is recorded.
- Every affected repository is clean at the exact intended published tip, excluding explicitly preserved unrelated concurrent work.

### Review checkpoint

Review target freshness, mergeability, signed history, workflow and registry outcomes, public rendering, obsolete release absence, cross-repository contradictions, protected instructions, and final completion evidence.

## Execution scope

Preserve completed Milestones 1 through 19 and all immutable evidence. Correct negative qualification ownership and bounded status output in Milestone 20, obtain passing Custom evidence in Milestone 21, qualify each of the thirteen adapter targets independently in Milestones 22 through 34, record the fresh release envelope in Milestone 35, and complete clean 5.0.0 publication plus the cross-repository and 4.0.x release-surface audit in Milestone 36. Every milestone includes its required tests, documentation, review, signed commit, and explicit publication before the next milestone begins.
