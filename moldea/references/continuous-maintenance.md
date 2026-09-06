# Initialization and maintenance

Read this reference after explicit initialization intent or established post-adoption relevance for authorized canonical synchronization.

## Adoption

Initialization requires explicit developer intent. Establish the repository root, reuse current project evidence, and confirm that adoption is absent or intentionally being replaced before writing. A complete initialized repository has regular root files `/moldea/moldea.yaml` and `/moldea/project.md` plus exactly one ordered full-line marker pair in the root README. Partial artifacts do not authorize automatic repair; preserve them and resolve the conflict only as part of the explicit initialization task.

Do not recommend initialization during unrelated work. Do not treat generic knowledge, ordinary documentation, or a repository name as adoption intent.

Create the smallest foundation that accurately represents established current truth. Zero agents, relationships, runtimes, and requirements are valid. Never create placeholder agents or speculative bindings to make a project appear complete.

## Decide whether foundation evidence is sufficient

Before installing or changing a dependency, creating canonical state, or adding the managed README block, inspect the smallest high-information project-owned sources and classify the foundation:

- **Insufficient:** reliable evidence does not establish what the project does and who or what it serves. Report that the complete adoption contract is absent, identify the exact evidence inspected, and explain that `moldea` keeps durable repository context so coding agents can understand the project consistently over time. State that the inspected sources do not establish what the project is for, then ask one focused question: what does the project do, and who or what does it serve?
- **Partial:** evidence supports some useful foundation but leaves one material purpose, user, goal, authority, safety, value-bearing, or operating boundary unresolved, or supports consequential conflicting interpretations. Preserve every existing artifact, summarize the supported truth separately from the highest-value unresolved boundary, and ask one focused clarification that distinguishes the material alternatives.
- **Sufficient:** evidence establishes a useful project purpose and served people or systems, and no unresolved material boundary would make the persisted foundation misleading. Proceed without a ceremonial question.

Insufficient and partial foundations stop before every dependency, `/moldea/**`, and managed README write. Do not store developer-answerable ambiguity as an unresolved requirement. A repository name, generic label, brief package metadata, placeholder source, or empty export does not establish a foundation by itself. A concise authoritative source can be sufficient when it establishes the necessary truth. Developer-provided context in the initialization request may contribute when its intended authority is clear.

Do not use successful structural validation to justify placeholder truth. Validation proves that files satisfy the repository format; it does not prove that their claims are meaningful or evidence-backed.

When repository evidence establishes no manifest relationship, the complete manifest is exactly:

```yaml
version: 1
```

The file ends with one LF. Do not add a project name, schema field, metadata, empty optional mappings, a `/moldea/project.md` registration, source globs, or any other relationship merely to describe the project or make the manifest look complete.

Do not validate a partial foundation. Write `/moldea/moldea.yaml`, `/moldea/project.md`, and the complete managed README block before the first CLI call. Then use the installed skill's closed launcher for exactly one final `validate`. On success, stop without `inspect` or another moldea command. On structural failure, use only its bounded diagnostics to repair the foundation and run `validate` at most once more. When the launcher succeeds, do not enumerate dependencies, inspect CLI internals, resolve executable links, search global installations, use transient tooling, or probe package-manager configuration. Load `local-tooling.md` only after the launcher reports that repository tooling is unavailable or invalid and the authorized operation can establish it.

## Maintain owned truth

For an authorized relevant change:

1. Reuse the host task's exact paths and hunks.
2. Identify the canonical owner from direct paths or the single `scope` result.
3. Read only the owner and the relevant implementation or consumer.
4. Update the smallest coherent set of canonical declarations, mirrors, requirements, and documentation.
5. Preserve unrelated canonical content and developer work.
6. Run the narrowest structural validation and project-native checks required by the changed behavior.

A relationship requires reconsideration, not an automatic edit. If implementation remains aligned, leave canonical state byte-identical and report no more than one line.

Keep one owner for each fact. Link an existing authority instead of copying its policy into another canonical asset. Synchronize a declared mirror from its source; do not create undeclared distributed copies or cross-repository paths.

## README marker ownership

moldea owns only the content strictly between these exact markers:

```markdown
<!-- moldea:start -->
<!-- moldea:end -->
```

The markers themselves establish the boundary. A README edit activates maintenance only when a changed hunk intersects the owned content. Changes elsewhere in README, including nearby design routing or a path-only match, are unrelated and must not load moldea resources or run the CLI.

When initialization is authorized, add this concise managed block. Its first sentence is the repository-owned discovery bridge that makes the cheap gate reliable across compatible hosts without activating further `moldea` work on a miss. Its second sentence routes readers to canonical state.

```markdown
<!-- moldea:start -->

For every repository task, select the repository-installed `moldea` skill so its two-byte relevance gate can test the host-known paths. If the gate does not match, continue without `moldea`.
Canonical moldea project state lives under `/moldea/**`; start at `/moldea/project.md`.
<!-- moldea:end -->
```

Do not add duplicated project context, tool versions, CLI commands, or other workflow rules to the block.

Never rewrite README outside the markers as part of moldea maintenance. If the block is malformed, duplicated, or ambiguous, stop before editing it and report the exact structural issue.

## Requirements and removal

Classify an affected requirement criterion as satisfied, outstanding, or evidence-blocked. Remove it only when every criterion is established and the current operation authorizes the removal. Remove superseded declarations and stale relationships made unnecessary by the change; do not retain compatibility paths without an established supported consumer.

After writes, validate schema-4 metadata and inspect only the changed canonical owners. Do not run full-project content inspection.
