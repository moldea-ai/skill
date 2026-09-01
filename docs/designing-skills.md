---
title: Design reusable Agent Skills
navigationTitle: Skill design
description: Choose the right behavior boundary, author progressively disclosed skills, and keep resources and consumers aligned.
section: workflows
order: 65
---

# Create skills that earn their context

Ask `moldea` to create or refine an Agent Skill when a repeatable coding-agent workflow needs specialized operating guidance, domain knowledge, reusable resources, or focused scripts that should load only when relevant.

```text
Create a repository-local release-review skill that uses our existing release policy and verifier.
```

The coding agent first inspects the repository and any existing skill. It does not treat every reusable sentence as a new skill.

## Choose the correct boundary

Different surfaces own different behavior:

- protected coding instructions define repository-wide developer constraints
- agent instructions define one runtime agent's behavior after it receives responsibility
- tools expose executable capability contracts
- deterministic software owns predictable application behavior
- ordinary documentation explains concepts for humans
- Agent Skills package reusable coding-agent knowledge, workflows, and supporting resources

A skill is not an independently executing agent, hidden authority, or substitute for missing implementation.

The coding agent names the owning surface before creating a skill. Selecting protected coding instructions as the owner never authorizes changing them, and predictable checksum or validation behavior remains in deterministic software.

## Define activation precisely

Every skill has a stable lowercase kebab-case directory and matching frontmatter `name`. Its `description` explains what the skill enables and the concrete requests or situations that should activate it.

A useful description includes natural adjacent terminology without claiming unrelated work. Review representative positive requests, adjacent requests that should remain outside the skill, ambiguous wording, and requests that mention related technology without requesting the workflow. Structural validity alone cannot prove that activation is selective or that the workflow is complete.

## Keep host metadata supplemental

Host-specific metadata may add presentation, a default prompt, invocation policy, dependencies, installation, or discovery information. The portable `SKILL.md` description remains authoritative for activation. When portable purpose, activation, or the default interaction changes, the coding agent updates the portable description first and synchronizes every affected host description or prompt. It then rereads or diffs both artifacts and reports only changes present in the workspace. A host-only change does not update portable behavior.

An existing invocation policy and unrelated supported host fields are preserved unless you explicitly request a change or reliable host and repository evidence establishes that change as intended. The resulting description is checked against representative requests that should activate the skill and adjacent requests that should not. Discoverability never grants authority for destructive or external actions.

## Disclose only what the workflow needs

The required `SKILL.md` contains the universal workflow and routes the coding agent to focused resources only when needed:

```text
release-review/
├── SKILL.md
├── references/
├── scripts/
└── assets/
```

- `references/` holds detailed guidance loaded for particular operations.
- `scripts/` holds deterministic reusable operations with explicit contracts and verification.
- `assets/` holds templates or output resources that do not need to enter model context.

Only necessary directories are created. Resources are linked directly from `SKILL.md`, reference chains stay shallow, and guidance is not duplicated across files merely to fill the structure.

## Treat scripts as production code

Skill scripts define their inputs, outputs, dependencies, supported environments, side effects, and exit behavior. They validate boundary input, fail clearly, avoid secrets, and require authority for destructive or external changes.

When an established script already owns a deterministic check, the skill delegates through that script's real interface. It does not ask the model to recreate the check or supply a result the script owns unless the script contract genuinely requires independent evidence.

Representative success, boundary, and failure cases are executed before readiness is claimed. Linking a script never grants authority to execute it during an unrelated task.

## Keep the complete artifact aligned

When skill behavior changes, the coding agent traces both directions among activation metadata, `SKILL.md`, references, scripts, assets, tests, host metadata, installation and distribution paths, generated or installed copies, coding-agent consumers, agent use conditions, runtime registration, implementation, and public documentation.

Authoritative source, installed, generated, cached, mirrored, and distributed copies remain distinct evidence. When a consumer or copy belongs to another Git repository, each repository is authorized and verified independently; coordinated work is never described as Git-atomic.

Repository-local Agent Skills stay in their established native location. Repository format version `1` defines no canonical `/moldea/skills` store.

An agent manifest skill entry is created only when reliable evidence establishes a qualifying repository-local implementation and actual runtime registration. A skill directory, installed coding-agent skill, or mention in an instruction does not prove that relationship.

## Validate structure and behavior

The coding agent runs the repository's established skill validator when available, resolves every linked resource, and tests non-trivial scripts. It then evaluates realistic positive and adjacent non-activation requests plus complete workflow scenarios that structural validation cannot prove.

Evaluation remains read-only. Reconciliation establishes intended behavior and updates the smallest coherent set of affected skill, consumer, runtime, test, and documentation surfaces.
