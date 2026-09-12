# Local runtime compatibility and safe relevance gating

## Task contract

Fix the observed Eve eligibility/browser detour and the concrete security defects identified during the skills.sh audit investigation. Complete planning, challenge, revision, breakdown, implementation, review, corrections, signed publication, and skill release autonomously under the user's explicit authorization. Do not run paid semantic evaluations or adapter qualifications. Pin both domains to the authenticated evidence selected by v5.0.3. Remove superseded execution paths; do not introduce legacy fallbacks, announcements, or new warning panels. Preserve unrelated work and protected instruction files. Do not modify skill-mock.

## Evidence and causes

The skill repository is on development at 5502bace. Release 5.0.3 uses CLI 8.0.0, Core 4.0.1, format 1, and JSON schema 4. The installed skill-mock artifact matches this release. Its Eve 0.54.3 declaration satisfies the adapter's >=0.39.1 range. The session first found the official adapter, then followed runtime-compatibility.md to the public JSON. The web reader rejected the URL and browser routing selected Chrome, which was blocked. No genuine version mismatch required that lookup.

agent-design.md, agent-system-planning.md, SKILL.md, and public documentation currently make current publication facts operational prerequisites. The Eve adapter already reports local package eligibility and source-pattern evidence. Composition reports installed availability only.

relevance-gate.mjs imports repository-local Core before matching ordinary paths. repository-package.mjs validates nested package containment but does not ensure the resolved node_modules directory is inside the repository. tests/conformance.test-unit.mjs uses an external node_modules symlink in positive fixtures.

Core's published public createCore().matchManifestScope() owns format parsing and matching. A non-writing esbuild probe bundled the current implementation and dependencies at 344,712 bytes. No custom YAML parser is needed. The website already installs esbuild 0.28.2; root build tooling will declare that exact development dependency instead of relying on the website installation.

## Final architecture

### Relevance and local execution

Add a release-generated CommonJS matcher at moldea/scripts/manifest-scope.cjs, produced from tooling/relevance-gate/matcher.mjs through tooling/relevance-gate/generate-matcher.mjs. The authored entry uses the public Core API resolved from the release's locked CLI dependency. Bundle its executable dependencies, retain applicable license notices, and allow only Node built-ins as external runtime imports. The generator supports write and check modes, deterministic output, a reviewed artifact-size ceiling with headroom, and rejects unexpected external imports. No user-install-time generation, download, or dependency search is introduced. Include complete license notices for every bundled package (the probe contains Core, Repository, YAML, Zod, and error-message-utils), and verify that generated runtime imports use only node: built-ins.

The portable gate statically imports this artifact and keeps its two-byte output and input/path limits. Adoption remains independent of CLI installation. Ordinary relevance is based on the canonical format and supplied paths; missing or incompatible local tooling is handled by the subsequent launcher/scope operation. No repository dependency code executes to establish relevance. Preserve the existing managed README parser and exclude writer execution from gate behavior. Check physical containment of adoption/manifest files, including parent-directory links. Read with a fixed maximum rather than allocating an entire file after a separate size check; test oversized input and escaping links.

Keep Core's parser, matching semantics, and resource controls authoritative. Add parity cases for exact bindings, affectedBy globs, normalization, unrelated paths, malformed manifests, and representative large inputs. Check generated output against the locked release source. No persistent cache is needed: each gate handles one bounded manifest and supplied path set.

Remove loadRepositoryCore and dynamic importing from repository-package.mjs. Retain inert Core version/entry verification for CLI execution. Require resolved node_modules to be a proper descendant of the resolved repository root and CLI/Core entries to remain in their permitted dependency/package directories. Supported npm and pnpm layouts continue. The launcher remains shell-free and output-bounded; containment is not represented as package authentication or an OS sandbox.

### Local compatibility

Rewrite runtime-compatibility.md around canonical assignment, repository integration, installed composition, and adapter-produced diagnostics/evidence. Remove live compatibility retrieval and its resolver requirement from the portable artifact. Select the official runtime from the actual primary integration and locally available adapter. Package mismatch or incomplete pattern recognition preserves runtime identity and reports the precise local limitation. Missing diagnostics alone do not prove compatibility; distinguish structural validity, recognized inspection evidence, and behavioral readiness.

Update agent-design.md, agent-system-planning.md, and SKILL.md coherently. Keep best-effort minimum-only provider eligibility and exact qualification provenance. No new adapter version or CLI API is needed for the existing Eve check. The public matrix remains a maintained documentation/build artifact, independent of client operations.

### Verification contracts

Update affected cases in fixtures/conformance-cases.json and fixtures/semantic-evaluation-coverage.json without reducing coverage. Replace online-publication prerequisites with local runtime-evidence expectations, including the Eve failure and unavailable network. Remove obsolete current-run publication probes, prompt augmentation, and command allowances from tests/semantic-evaluation-runner.mjs and tooling/codex-evaluation-host, with corresponding deterministic tests. Update qualification expectations where they repeat remote prerequisites. Preserve immutable historical result artifacts and their source authenticator, which hashes source definitions independently of current case validation. Remove obsolete current localProbe validation and execution paths completely; no historical probe execution is needed to authenticate a pin. Package-candidate publication artifacts retain their independent build-time role.

Keep new generator and script-boundary tests colocated with their authored implementation. Replace unsafe positive fixture installation with repository-contained dependency fixtures. Test malicious Core/CLI sentinels, external dependency-root and nested escapes, unsupported metadata, supported npm/pnpm layouts, gate misses, no mutation, and bounded output.

## Documentation ownership

Update skill README.md and directly affected docs: compatibility-and-local-tooling.md, coding-agent-compatibility.md, designing-agents.md, planning-agent-systems.md, and how-it-works.md. Update release/build references and qualification README only where their current claims change. Existing website generation consumes these sources; no UI redesign is included.

Synchronize ../platform/moldea/context/agent-skill.md, runtime-compatibility-matrix.md, runtime-adapter-contract.md, and directly contradictory linked specifications. Clarify public catalog ownership versus installed execution facts without changing hosted platform behavior.

Check ../packages/README.md and compatibility documentation source for operational-lookup claims. Update only contradictions; keep the public JSON endpoint, adapter ranges, package source, and independent release process intact. Check ../knowledge-base/content runtime compatibility, choosing-runtime, troubleshooting, FAQ, and installation articles; correct claims requiring remote lookup or exact historically verified provider releases. Keep article identities and manifest ownership intact.

## Ordered execution and review boundaries

1. Implement the generated matcher and launcher containment with focused tests and their directly affected specification/docs. Review parser parity, shipped dependencies, licenses, size, resource behavior, file boundaries, and positive installations. Commit/push the cohesive reviewed milestone on a task/development branch.
2. Implement local compatibility instructions, current regression-fixture and harness corrections, and remaining documentation synchronization. Review that local evidence remains meaningful and no automatic web/browser path survives. Preserve all existing semantic/qualification coverage or replace obsolete assertions with equivalent current scenarios.
3. Prepare skill 5.0.4, synchronize version/identity references, select pinned semantic and qualification evidence with a precise reason, verify the release and generated website, review the final changes, publish signed commits, merge into main, create the signed release tag, and verify release/deployment outcomes. Repin interim evidence when an earlier milestone's required tests need a current envelope; do not claim freshness.

Milestone breakdown will assign these boundaries explicitly after challenge and revision.

## Verification

Start with targeted Node tests for changed generator, gate, launcher, semantic harness, and command policy. Then run npm test for the root correctness boundary. Run npm run path:check, the matcher generation check, managed README generation check, and targeted Prettier using installed tooling.

For changed qualification contracts run applicable qualification:test, qualification:typecheck, and qualification:lint checks; these are deterministic. For changed public docs run npm run docs:check and the affected website correctness/build checks. Use existing website unit, artifact, and browser scripts if required by the affected rendering/publication boundary; no new UI is planned. Run the relevant knowledge-base validation and documentation checks in sibling repositories. Validate provider eligibility/source diagnostics with local adapter fixtures, not provider/model requests.

After successful tests and final identity changes run npm run release:evidence:pin -- --scope all --from v5.0.3 --reason "<precise changes and completed deterministic checks>", then node --experimental-strip-types tooling/release-identity/check-release.mjs. Reuse successful checks while their inputs remain unchanged. Never invoke paid semantic recording/diagnostic or qualification execution commands. CI workflows are inspected to confirm publication invokes deterministic verification only.

## Publication, risks, and completion

Use isolated checkouts for sibling repositories with unrelated edits; platform currently has concurrent UI changes. Resolve destination branches, inspect complete commit scope, and use signed/sign-off commits. Do not stage unrelated work. Refresh remote state before integration, resolve only task-related conflicts, and publish explicit branch refspecs. Preserve the original worktrees.

The main regression risks are parser/matcher drift, legitimate installation rejection, runtime overclaims, stale evaluator expectations, and unavailable pinned replay artifacts. Verification targets each. Bundled code adds disk bytes but not automatic model-visible output. Preserve resource limits without lowering user capacity. Supported host portability is checked through existing tests/CI; do not claim unexecuted platform coverage.

Completion requires the corrected skill on main and a published stable release, valid pins with working evidence pages, synchronized affected documentation, successful applicable deterministic checks and deployment, no paid runs, and no task changes left unreviewed. Rollback uses the preceding release or a corrective signed commit; no history rewriting or legacy code is needed.

## Approval required

The scope is the generated local gate, focused launcher containment, local adapter compatibility workflow, affected tests/specifications/documentation, and skill 5.0.4 publication using pinned evidence. The user explicitly authorized autonomous planning, revisions, breakdown, milestone implementation/review/fixes/push, merging, and publication for this task; no additional approval pause is required.
