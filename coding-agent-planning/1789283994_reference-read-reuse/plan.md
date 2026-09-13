# Reference-read reuse

## Task contract

Reduce avoidable instruction rereads and adapter-source exploration without weakening activation, authorization, evidence freshness, initialization, or runtime compatibility. Complete planning, challenge, implementation, review, and publication autonomously under the developer's current authorization. Publish a skill patch with explicitly pinned existing evidence. Do not run paid semantic evaluations or adapter qualifications.

The motivating failures were repeated entrypoint and reference reads, compaction followed by broad rereading, package-source exploration despite available local documentation, and disproportionate time and token costs. moldea must support the host coding agent, not take over its workflow. This task cannot guarantee that hosts never reread instructions or that model behavior is deterministic.

## Current evidence

The clean skill repository is at `6cd9cceeabecf91d4cc981c215b343e4e61dca64`, matching remote main, with release 5.0.7. `moldea/SKILL.md` routes operations but does not define instruction-read lifetime. It repeats initialization already owned by `references/continuous-maintenance.md` and runtime inspection already owned by `references/runtime-compatibility.md`. The runtime reference permits local contract/source inspection but does not explicitly prefer the installed adapter README and its relevant guide.

`tests/conformance.test-unit.mjs` already checks routing and procedure contracts, often against exact prose in the entrypoint. Relocated contracts must be checked at their actual owner, not deleted or matched against a concatenation of every reference. Root `npm test` exercises unit and integration boundaries, including the real gate, launcher, and managed README writer. `docs/release-evidence.md` defines authenticated evidence pinning; the website renders pinned evidence using the same replay and project interface as fresh evidence.

## Final behavior and ownership

1. `SKILL.md` keeps activation, operation routing, authorization, bounded evidence rules, and safety boundaries. Add one instruction-lifetime policy applying to every instruction to read or load a reference. Reuse only unchanged instructions already read completely and still fully available in the active context, subject to host requirements. Do not treat a summary or remembered conclusion as the complete instructions.
2. Load a newly required reference when the operation changes. After context loss, reload only required unavailable instructions. A skill update or a known reference edit invalidates affected instruction reuse. Topic changes reset relevance and authorization even if instructions remain available. Do not add file hashing, CLI probes, persistent caches, repository status files, or trust bypasses for reuse.
3. Keep instruction freshness distinct from repository evidence freshness. Changes to source, canonical state, dependencies, scope, or authorization require the appropriate current checks, not automatic rereading of unchanged guides. A conversation handoff may record operation, installed skill identity already known, loaded reference paths, unresolved questions, and next work; it never grants permission or substitutes for missing instructions.
4. Remove duplicate initialization and runtime procedures from the entrypoint, retaining explicit routes to their existing owners and the early installation-hazard preflight. Preserve every material constraint at its owner. Do not reorganize other references merely for consistency.
5. In `runtime-compatibility.md`, use existing inspection evidence first, then the installed adapter README and its specifically relevant linked guide. Inspect implementation only for a material question those sources cannot resolve. Do not read all guides, repeat package discovery, or browse compatibility websites. Missing documentation is not proof of incompatibility and does not authorize a custom adapter.

## Files and ordered execution

- Create branch `reference_read_reuse` from the current verified state before implementation.
- Update `moldea/SKILL.md`, `moldea/references/runtime-compatibility.md`, and only necessary existing conformance assertions. Preserve the initialization reference unless a constraint is genuinely missing.
- Synchronize root `README.md` and `docs/compatibility-and-local-tooling.md`. Add a concise internal regression checklist at `docs/reference-reading.md` covering continuation, planning-to-writing, lost versus retained context after compaction, skill/reference changes, changed repository evidence, unrelated requests, and documentation-first adapter investigation. This is an explicit future behavioral verification checklist, not a claim of freshly executed model tests or a new evaluator framework.
- Update the current release identity to 5.0.8 in `package.json`, the root lockfile identity, skill metadata, README, and current installation/compatibility docs. Do not rewrite historical evidence or dependency versions.
- After portable bytes are final and deterministic checks pass, run `npm run release:evidence:pin -- --scope all --from v5.0.7 --reason <specific-reason>`. Preserve original authenticated source identities; disclose that the instruction changes were not freshly model-evaluated.
- Review the complete change and publish one cohesive signed commit through the explicit branch push, then fast-forward main and publish the new signed release tag. Never overwrite an existing tag. Verify release checks, CI, website publication, installation bytes, and continued replay/project evidence availability.

## Verification and acceptance

Run the focused conformance test, then `npm test`, `npm run path:check`, skill-creator's frontmatter validator, touched-file Prettier, `npm run release:check`, and `npm run website:check`. Run website end-to-end checks where available because the release selects evidence displayed publicly. No paid evaluator or qualification command is authorized. Check test failures against preserved contracts before changing expectations.

Review ownership and links in both directions: every removed procedure remains complete in its routed reference, every required reference is reachable, and unrelated tasks still abstain. Record entrypoint word/byte reduction without claiming measured model-token savings. Structural and deterministic tests cannot prove continuation behavior; report that limitation.

Keep all 74 semantic scenarios and adapter qualification coverage. Add no dependencies, migrations, runtime caches, helper protocols, package releases, host-specific continuation keywords, compatibility shims, or changes to protected coding instructions. Do not modify `skill-mock`, packages, platform, or another agent's changes. If concurrent edits overlap publication scope, isolate them rather than include them. Rollback is a new corrective release or ordinary revert, not rewriting published tags.

## Approval required

Scope: the bounded skill instruction/referral changes, conformance ownership updates, directly related documentation, deterministic verification, and 5.0.8 publication with pinned evidence described above. The developer has explicitly authorized this task's autonomous planning, correction, implementation, review, and publication; no additional approval pause is required.
