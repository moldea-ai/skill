# Maintain project context

Use after established relevance for durable project facts, corrections, decisions, relationships, or an explicit consolidation or named-area request.

## Maintain owned truth

Resolve the smallest authority from [Use](using-context.md). An unambiguous developer correction to established current truth authorizes the affected canonical update when adoption and ownership are known. Read-only requests, plans, reviews, and a raw handoff without correction authority permit assessment and reporting only. Do not infer an implementation rewrite, a new canonical asset, or an audit from a correction. Keep intended policy distinct from observed current behavior and use the host's plan or handoff for future work.

Before writing, establish authorized outcomes, exact paths, owning files, mirrors, affected decisions and unresolved consequential boundaries. If a material ambiguity remains, ask one focused question that distinguishes the alternatives before writing. If authorities conflict, present both claims and seek the governing choice. Never establish speculative policy by copying a proposal or implementation detail. Keep each fact in one owner and link established authority. Persist approved rationale as a decision record when it governs future choices. Update affected owners, mirrors, links, and relationships together. Remove superseded declarations made unnecessary by the authorized change. After the last write and focused native checks, run [final validation](validating.md) and report the actual result. A stopped or narrowed request leaves unfinished writes pending in the conversation.

## Keep project routing current

Keep `/moldea/project.md` a concise entry point for the project's purpose, users, goals and project-wide boundaries. Its routing section links focused owners and says which area, policy or decision each governs so future planning can select by purpose. Use established topic indexes where helpful. Update routing when authorized work adds, moves, removes, or changes a linked owner's responsibility. Keep detailed policy, code-derived boundaries and durable decisions with their owners. Around 32 KiB for the entry point and 128 KiB for focused context are readability review points. A cohesive larger file is valid. Do not measure, split, or audit solely to meet these figures.

## Map a single area

For a request to map one named area, reuse the existing foundation and read its routing, indexes and bounded sources. Use the [Initialize round format and response rules](initializing.md#guide-the-rounds) for one round, with coverage limited to the named area. After the last write and native checks, run final validation. Report the area covered, what remains and how to map another area later.

## Declare material relationships

A binding identifies one real file, optionally its supported export, owning the fact or behavior. It already makes that file relevant. Preserve an existing accurate impact entry and add no duplicate exact impact entry just to repeat a new binding. Static coverage is separate from actual consumption and answer behavior.

An `affectedBy` path identifies an inspected file or coherent subtree whose change can make the owner's material facts or behavior wrong. Representative sources include product rules, security and value-bearing contracts, data guarantees, effective operating configuration, agent loaders, routing, schemas, tools, and tests that establish the governed behavior. A package, lockfile, compiler setting, or declaration qualifies only when evidence shows a material effect. These are evidence rules, not filename bans. Layout, styling, navigation, scrolling, and component composition do not create a relationship, even when an owner document mentions them. Shared UI components, routers, query and data helpers, and error or logging services are not impact paths of a feature owner merely because the feature uses them. Relate the feature file that consumes shared code to the feature owner. Relate the shared module to an owner only when that owner states its own contract. A navigation link in `project.md` is not an impact path.

Use an exact repository-logical absolute file path for a single file and `/<directory>/**` for a proven coherent subtree. A bare directory is invalid. Use inspected evidence and exclude unrelated paths. Never use a catch-all such as `/src/**`. Use exact paths for bindings and mirrors. If a role is unknown, report that path and the evidence gap. Do not silently omit a material relationship, invent an owner, or widen a pattern to hide uncertainty. A relationship can be important despite unavailable export or runtime evidence.

In ordinary maintenance, add or correct established relationships only for owners whose canonical text this task changes, using already-inspected source. For such an owner, add an established missing relationship or correct an established wrong one. Reporting the gap alone is incomplete. For an accurate unchanged owner, only correct or remove a declaration invalidated by a move or deletion in this task. Add no relationship under that exception. An established gap for an unchanged owner can be reported in one line. Initialization, explicit relationship maintenance, and Fix retain their authorized scopes. Remove a confirmed immaterial path only with supporting evidence. Never change valid binding style merely to meet a preference.

## Consolidate context

On explicit consolidation, identify every fact, rationale, decision, unresolved boundary, relationship and consumer before writing. Use one needed content-free inventory and each exact in-scope canonical document once with necessary bounded pages. Distinguish exact duplication, overlapping owners, intentional repetition, verified supersession and unresolved conflict. Similar wording is not enough to prove duplication. Keep current truth, plans, history, accepted rationale, and unresolved state distinct. Move unique truth to its established owner, preserve useful repetition and unresolved differences, and update manifest paths, links and direct consumers together. A limit or consequential authority conflict stops the scoped work, without rewriting its ambiguity.

Keep consolidation in canonical context. Implementation, tests, history, generated evidence and protected instructions stay out unless independently authorized. Verify changed owners and consumers preserve all distinct meaning, run affected checks and validate. Report the requested scope, consolidation, authority, conflicts, links and coverage.

## Warnings and acceptance

Confirm errors and unchecked binding evidence independently of warnings. Offer to fix a warning. Offer acceptance of its exact `code`, `subject`, and `qualifier` only when the CLI reports `acceptable: true` and the other eligibility rules hold. The developer supplies the reason. For integration only offer acceptance for shared, Git-tracked AGENTS.md or CLAUDE.md instruction subjects, including tracked `.claude/CLAUDE.md`. An ignored file, local-only `CLAUDE.local.md`, or unproven tracking gets a fix or exact handoff. Establish tracked status with host Git evidence or the Fix helper. The link warning qualifier is its reported reason; acceptance is limited to that reason.

Use `acceptedWarnings` only with explicit developer approval and their reason. Validate once after writing it. Remove acceptance when requested or when repaired; review `MOLDEA_ACCEPTANCE_UNMATCHED` against the completed diagnostics. Acceptance has no effect on an unchecked connection.

## Own the README markers

The owned region is strictly between `<!-- moldea:start -->` and `<!-- moldea:end -->`. Only a changed hunk intersecting owned content is direct moldea relevance. README edits outside the region stay with the host. For Initialize or an authorized Fix, use the bundled managed README writer. It is authoritative for the explanatory text and canonical link, preserves outside bytes, and refuses a malformed region. Keep ordinary activation in AGENTS.md and detailed context in its actual owners.
