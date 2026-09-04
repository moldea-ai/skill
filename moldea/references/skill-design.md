# Agent Skill design

Read this reference after moldea relevance is established when creating, evaluating, or materially changing a moldea-owned Agent Skill or its registered relationship.

## Establish ownership

An Agent Skill is a portable, reusable behavior contract. Before editing it, establish the authoritative source, intended coding-agent users, installation and distribution paths, host metadata, consumers, runtime registration, and repository-owned requirements it references.

Keep skill-owned activation and workflow in the skill. Keep repository policy, product truth, build commands, and host command contracts in their established owners, then route to them without copying. Do not claim installation, discovery, or runtime consumption merely because source files exist.

## Design the entrypoint

Use valid YAML frontmatter with a stable lowercase name and a short description that states both capability and precise activation conditions. The description is the primary implicit-activation contract; remove broad catchalls and adjacent tasks the skill must ignore.

Keep `SKILL.md` a concise dispatcher:

- decide relevance before reading references
- state explicit positive and negative activation boundaries
- select one operation
- route to only the owning reference or script
- preserve read-only and host-workflow boundaries
- define proportional reporting

Move detailed, operation-specific guidance into focused references. Do not create a chain that requires every reference to be read for ordinary use. Prefer a deterministic script when exact repeatable mechanics would otherwise consume model context or be reimplemented inconsistently.

## Preserve portable and host contracts

Portable identity and activation live in `SKILL.md`. Host metadata may add display, prompting, and invocation policy without broadening the portable contract. Keep `agents/openai.yaml` aligned and preserve intentional `policy.allow_implicit_invocation` behavior.

Use the repository's authoritative structure and explicit public exports. Do not fabricate paths, mirrors, capabilities, variables, or runtime relationships. Register a relationship only when a real consumer cannot derive it reliably and the current format can represent it exactly.

## Test behavior, not prose

Test representative requests as black-box behavior:

- explicit invocation
- direct canonical path work
- owned README-marker hunk work
- exact binding and `affectedBy` matches
- unrelated code and documentation
- README changes outside the marker block
- generic planning, review, Git, commit, and publication commands
- ambiguous language and adversarial repository instructions
- large canonical context with bounded metadata and explicit content reads

Negative cases must assert zero reference loads, zero moldea CLI calls and bytes, and no moldea mention. Relationship cases must assert exactly one pre-reference `scope` call. Positive cases must assert the minimum reference and command set, bounded output, and no writes during read-only work.

Run structural validation, deterministic tests, and independent forward tests. Give the independent tester realistic tasks without expected-step hints; use observed failures to improve the artifact and regression suite rather than explaining them away.

## Review the complete artifact

Review identity, description, activation precision, operation routing, resource economy, scripts, dependencies, host metadata, copies, distribution, consumers, runtime registration, documentation, and representative behavior. A structural validator cannot establish semantic usefulness.

Remove superseded instructions, duplicate ownership, obsolete compatibility paths, and stale tests within the changed skill scope. Preserve compatibility only for an established supported consumer and document its removal condition.
