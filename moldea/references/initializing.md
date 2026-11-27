# Initialize an existing project

Use for explicit initialization or to resume its onboarding in the same conversation. Confirm the target repository and host authority first. Do not recommend initialization during unrelated work.

## Establish the foundation

Check the [Git and Node requirements](validating.md#supported-contract) and accessible Git worktree before writing. Use the selected installation's bundled tools. Honor read-only and no-install restrictions. In a dedicated repository, ask which checkout owns the canonical context if authority is unclear. Read a related implementation repository only through authorized, bounded evidence. Never add cross-repository manifest paths or write its files by implication.

Reuse established adoption evidence. Bounded regular `/moldea/moldea.yaml` and `/moldea/project.md` establish foundation presence. README and instruction integration are separate. If already adopted, report the setup without writing, or resume known unfinished onboarding when asked. Replacing valid adoption requires explicit intent. Send partial adoption artifacts to [Check/Fix](checking-and-fixing.md#diagnose-blocked-adoption) for assessment. Partial artifacts grant no repair authority.

Open the smallest project-owned sources that can establish purpose, people or systems served, goals, and material operating boundaries. A concise authoritative source or a clear current developer statement can suffice. A project name, empty export, or package description alone cannot.

- **Insufficient:** say the repository was not adopted, name the evidence checked, and ask one focused question about what the project does and whom it serves.
- **Partial:** evidence supports some foundation but leaves a material question about purpose, users, goals, authority, safety, value-bearing behavior, or operating boundaries unresolved, or supports conflicting material interpretations. An inference about purpose or users can follow the Sufficient path below when supported by strong, consistent evidence and the other material foundation boundaries are established. Say the repository was not adopted, state what is established, which foundation files exist or are missing, and where integration stands. Ask one question that distinguishes the material alternatives. Preserve all existing artifacts.
- **Sufficient:** write a concise grounded `moldea/project.md` and `moldea/moldea.yaml`. Begin with established facts. If purpose or users are inferred from strong evidence, record the supported observations and confirm the inference during a round before saving it as an accepted fact. Link existing authoritative architecture, policy, and decision documents in place. Use [focused routing](maintaining-context.md#keep-project-routing-current) for known relevant owners.

Insufficient and partial foundation evidence stop before any write or validation. Do not save an answerable ambiguity as project policy. With no evidenced relationship, the complete manifest is `version: 1` followed by a newline. Zero agents and zero relationships are valid. Only record a narrow relationship for a foundation fact when inspected material authority is clear.

After the two foundation files, run the bundled writer:

```text
node <installed-skill-root>/scripts/managed-readme.mjs --repository <absolute-repository-root>
```

The writer owns the managed region and preserves outside bytes. Malformed, linked, invalid, oversized or non-regular README input stops the flow. Do not hand-edit the block or validate a partial foundation. Follow [Check setup integration](checking-and-fixing.md#check-setup-integration) for the managed AGENTS.md bridge, protected-file handoff, smoke test, and governing Claude import.

## Inventory the main areas

After foundation and integration, run one bounded inventory and reuse it during the conversation:

```text
node <installed-skill-root>/scripts/initialization-inspection.mjs --repository <absolute-repository-root>
```

Use project indexes and inspect only passages needed to understand the main areas and draft concrete proposals. The same helper accepts up to eight known `--path <relative-file>` arguments, 32 KiB per file and 64 KiB per packet, without traversing the tree again. An omitted path was not inspected. Use a bounded targeted read when a necessary passage is absent. Respect the [initialization limits](validating.md#resource-limits).

Report by name or path the agents, cohesive inline model workflows, architecture and policy documents, active decision records, and project-owned Agent Skills found. Verify candidate skill ownership. The installed moldea distribution is not project-owned. A canonical directory is not proof of an active agent or of complete discovery. If discovery is partial, report coverage against the identified areas and name known uninspected areas, including registered agents' input, context-selection and output modules. An inventory error supplies no absence evidence.

## Guide the rounds

Send one message headed **Round N** containing one line on what is established, covered main areas out of the identified total, agents registered or pending, files changed by the preceding round (foundation and integration files in round 1), and the remaining gaps. Count an area as covered when inspected evidence identifies its governing context and the relationship is established.

Ask at most five numbered questions in that message, each naming evidence and proposing an answer the developer can accept or correct. Ask first about rules followed by code but undocumented, then areas and the proposed governing context and `affectedBy` relationships, then decisions in force without records, then purpose and users only where inferred. Do not use a generic questionnaire or repeat a question when the evidence and developer already established the answer.

When discovered agents or cohesive inline workflows need permission, include their registration and necessary application wiring as one item in round 1. List the responsibilities. If the developer requested inclusion from the outset, register the evidenced scope without a confirmation item. Use [Agents](agents.md#onboard-existing-responsibilities) for actual registration. Accept approval for a subset or a decline and report the disposition of excluded responsibilities. Preserve a valid zero-agent path. While approval is pending, keep the foundation and do not run final validation.

A plain **yes** accepts all proposals in this round. Accept answers and corrections by number. **Skip** leaves unconfirmed proposals unwritten and names the gaps. Write only confirmed durable facts, narrow evidenced relationships, routing changes and decision records in their owning files. Link existing owners without copying policy into a second home. Report the changes and limits of inspected-source coverage.

After the answers or skip, offer numbered choices to continue on the named remaining areas where fresh evidence-backed proposals exist, or stop here. Stop completes initialization for the covered scope. Resume an unanswered round on **continue** in the same conversation, without restarting or treating it as approval. Keep the actual request, decisions, coverage, and next step in the conversation. Never write a checkpoint file or send the developer to another session.

## Finish and validate

When the developer stops or no evidence-backed gaps remain, finish approved native checks and run one final bundled [Validate](validating.md) after the last write. Do not run a foundation-only or per-agent validation. If diagnostics establish a bounded authorized correction, including a governing Claude import, apply it through the appropriate writer, run affected checks and validate after the corrective write. A completed run supplies diagnostics; stop without extra inspection when the required status is established.

At a blocker or limit, retain the grounded foundation and report adoption separately from unfinished onboarding or verification. Include inventory, confirmed/pending registrations, changed paths, material diagnostics and any precise repair or protected-file handoff, and the next unfinished step. When complete, report adoption for the covered scope, the coverage map and uncovered areas, changed files, and checks. End with one short `Next:` line telling the developer to ask moldea to map another area by name.
