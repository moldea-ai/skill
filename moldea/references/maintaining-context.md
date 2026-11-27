# Maintain project context

Use after established relevance for durable project facts, corrections, decisions, relationships, or an explicit consolidation or named-area request.

## Maintain owned truth

Resolve the smallest authority from [Use](using-context.md). An unambiguous developer correction to established current truth authorizes the affected canonical update when adoption and ownership are known. Read-only requests, plans, reviews, and a raw handoff without correction authority permit assessment and reporting only. A correction grants no authority for an implementation rewrite or an audit. Keep intended policy distinct from observed current behavior and use the host's plan or handoff for future work.

Before writing, establish authorized outcomes, exact paths, owning files, mirrors, affected decisions and unresolved consequential boundaries. If a material ambiguity remains, ask one focused question that distinguishes the alternatives before writing. If authorities conflict, present both claims and seek the governing choice. Never establish speculative policy by copying a proposal or implementation detail. Keep each fact in one owner and link established authority. Persist approved rationale as a decision record when it governs future choices. Update affected owners, mirrors, links, and relationships together. Remove superseded declarations made unnecessary by the authorized change. After the last write and focused native checks, run [final validation](validating.md) and report the actual result. A stopped or narrowed request leaves unfinished writes pending in the conversation.

## Keep project routing current

Keep `/moldea/project.md` a concise entry point for the project's purpose, users, goals and project-wide boundaries. Its routing section links focused owners and says which area, policy or decision each governs so future planning can select by purpose. Use established topic indexes where helpful. Update routing whenever authorized work adds, moves or removes an owner or changes its responsibility.

Each product area, policy domain or subsystem has one focused context owner for its facts and relationships, including detailed policy and code-derived boundaries. Keep durable decisions in decision records and agents in their own folders.

Put a new durable fact in the owner for its area. Update an established fact in its existing owner. When no owner covers the area, propose a focused file, its routing link and any evidenced relationships for the developer to approve before writing. When another document owns a fact, link to that authority in place and keep this owner's distinct facts.

If an owner mixes unrelated responsibilities, a fact belongs to another owner, or a route is missing, propose the exact moves and routing for the developer to approve. Apply an approved restructure through Maintain. Move sections without changing their meaning, update the route and affected references, and give each owner only the relationships that apply to its responsibility. Run final validation after the last write. Around 32 KiB for the entry point and 128 KiB for focused context are readability review points. Keep cohesive owners intact at any size. Size alone does not warrant measurement, splitting or an audit.

## Map a single area

For a request to map one named area, reuse the existing foundation and read its routing, indexes and bounded sources. Use the [Initialize round format and response rules](initializing.md#guide-the-rounds) for one round, with coverage limited to the named area. After the last write and native checks, run final validation. Report the area covered, what remains and how to map another area later.

## Declare material relationships

A binding identifies one real file, optionally its supported export, owning the fact or behavior. It already makes that file relevant. Preserve an existing accurate impact entry and add no duplicate exact impact entry just to repeat a new binding. Static coverage is separate from actual consumption and answer behavior.

An impact path under `affectedBy` names an inspected implementation file, the authoritative source of a governed authored deliverable, or a coherent subtree whose change warrants checking whether the owner's stated facts still hold or its stated rules are followed. A match brings the owner into relevance analysis. Preserve accurate context after that review. Judge eligibility from evidence of the path's role. Filenames alone supply no evidence of that role.

- For product rules, security and value-bearing contracts, data guarantees and agent behavior, prefer the point that enforces the stated rule. Look at effective operating configuration, agent loaders, routing, schemas, tools and tests that establish the governed behavior. Project-owned instructions, Skills, prompts and schemas qualify when they govern behavior.
- Packages, lockfiles, compiler settings and declarations require evidence of a material effect on the owner's facts or rules. For presentation, build, CI and deployment configuration, assets and content-production scripts, relate only a path shown to be the sole enforcement point of a stated rule. A mention of layout, styling, navigation, scrolling or component composition in the owner supplies no relationship by itself.
- When a feature uses shared UI components, routers, query or data helpers, or error or logging services, relate the consuming feature file if its behavior is material to the feature owner's facts or rules. Relate the shared module only to an owner that states the module's own contract. Ordinary use of a shared module supplies no relationship to it.
- Relate a post, report or release note when the owner's rules directly govern that deliverable. Link to human-facing reference documentation, records, approvals and receipts in the owner text. Navigation links in `project.md` route readers to owners without declaring impact paths.
- Exclude generated, vendored and installed artifacts, including generated deliverable copies, installed Skills and their bundled CLIs.

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
