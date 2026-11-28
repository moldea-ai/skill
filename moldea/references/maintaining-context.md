# Maintain project context

Use after established relevance for durable project facts, corrections, decisions, relationships, or an explicit consolidation or named-area request.

## Maintain owned truth

Resolve the smallest authority from [Use](using-context.md). An unambiguous developer correction to established current truth authorizes the affected canonical update when adoption and ownership are known. Read-only requests, plans, reviews, and a raw handoff without correction authority permit assessment and reporting only. A correction grants no authority for an implementation rewrite or an audit. Keep intended policy distinct from observed current behavior and use the host's plan or handoff for future work.

Before writing, establish authorized outcomes, exact paths, owning files, mirrors, affected decisions and unresolved consequential boundaries. If a material ambiguity remains, ask one focused question that distinguishes the alternatives before writing. If authorities conflict, present both claims and seek the governing choice. Never establish speculative policy by copying a proposal or implementation detail. Keep each fact in one owner and link established authority. Persist approved rationale as a decision record when it governs future choices. Update affected owners, mirrors, links, and relationships together. Remove superseded declarations made unnecessary by the authorized change. After the last write and focused native checks, run [final validation](validating.md) and report the actual result. A stopped or narrowed request leaves unfinished writes pending in the conversation.

## Keep project routing current

Keep `/moldea/project.md` a concise entry point for the project's purpose, users, goals and project-wide boundaries. Its routing section links focused owners and says which area, policy or decision each governs so future planning can select by purpose. Use established topic indexes where helpful. Update routing whenever authorized work adds, moves or removes an owner or changes its responsibility.

Each product area, policy domain or subsystem has one focused context owner for its facts and relationships, including detailed policy and code-derived boundaries. Keep durable decisions in decision records and agents in their own folders.

Put new durable facts in the owner for their area and update established facts in place. Store durable product and policy rules that agents or PR Assurance rely on in canonical moldea context. Write the rule itself, including its material conditions, even when a human guide or procedure supplies the evidence. Put shared rules in `project.md` when they apply project-wide. When no owner covers the area, propose a focused file, its routing link and evidenced relationships for the developer to approve before writing.

Link human documentation from the owner for procedures, approvals and other supporting detail. When moving a rule into canonical context, replace its statement in each human doc within the authorized edit scope with a link to the owner. Report each remaining duplicate whose doc is outside that scope. Keep explanations of the circumstances around the rule in the doc and the rule statement in its owner. Link to the existing authority for facts it already holds and to the canonical owner for rules. Keep this owner's distinct facts.

If an owner mixes unrelated responsibilities, a fact belongs to another owner, or a route is missing, propose the exact moves and routing for the developer to approve. Apply an approved restructure through Maintain. Move sections without changing their meaning, update the route and affected references, and give each owner only the relationships that apply to its responsibility. Run final validation after the last write. Around 32 KiB for the entry point and 128 KiB for focused context are readability review points. Keep cohesive owners intact at any size. Size alone does not warrant measurement, splitting or an audit.

## Map a single area

For a request to map one named area, reuse the existing foundation and read its routing, indexes and bounded sources. Use the [Initialize round format and response rules](initializing.md#guide-the-rounds) for one round, with coverage limited to the named area. After the last write and native checks, run final validation. Report the area covered, what remains and how to map another area later.

## Declare material relationships

A binding identifies one real file, optionally its supported export, owning the fact or behavior. It already makes that file relevant. Preserve an existing accurate impact entry and add no duplicate exact impact entry just to repeat a new binding. Static coverage is separate from actual consumption and answer behavior.

An **impact path** is an exact path or simple glob under `affectedBy` for code or configuration that implements a fact or enforces a rule the owner states, a project-owned model-facing asset that governs behavior, or the authoritative source of a directly governed authored deliverable. A match calls for checking whether the owner's stated facts still hold or its stated rules are followed. Relevance can end without an edit. Human documentation stays out of impact paths, including guides, procedures, policies, READMEs, records, approvals and receipts. Link those docs from their owner. Presentation, build and CI qualify only as the sole enforcement point of a stated rule.

Add or keep a path only with a named owner-stated fact or rule and inspected evidence of how the path qualifies under that statement. File behavior or filenames alone establish no relationship. Preserve accurate context.

- For product rules, security and value-bearing contracts, data guarantees and agent behavior, inspect effective operating configuration, agent loaders, routing, schemas, tools and tests that establish the governed behavior. Prefer the point that implements the fact or enforces the rule. Project-owned instructions, Skills, prompts and schemas qualify when they govern behavior, in any format.
- Packages, lockfiles, compiler settings and declarations need a material role. Presentation, build, CI, deployment, asset and content-production paths qualify in those roles only as the sole enforcement point of a named owner-stated rule. A mention of layout, styling, navigation, scrolling or component composition supplies no relationship by itself.
- When a feature uses shared UI components, routers, query or data helpers, or error or logging services, relate the consuming feature file if its behavior is material to the feature owner's facts or rules. Relate the shared module only to an owner that states the module's own contract. Ordinary use of a shared module supplies no relationship to it.
- Relate authoritative sources of directly governed authored deliverables. Use one proven coherent subtree glob per collection and replace its individual file declarations. If no coherent glob is proven, report the gap. Navigation links in `project.md` route readers without declaring impact paths.
- Exclude generated, vendored and installed artifacts, including generated deliverable copies, installed Skills and their bundled CLIs.

Use exact repository-logical absolute paths for single files, bindings and mirrors, and `/<directory>/**` for a proven coherent subtree. A bare directory is invalid. Exclude unrelated paths, human docs and other ineligible content from globs. Never use a catch-all such as `/src/**`. Report unknown roles with their paths and evidence gaps. Do not omit a material relationship, invent an owner, or widen a pattern to hide uncertainty. A relationship can be important despite unavailable export or runtime evidence.

In ordinary maintenance, add or correct established relationships only for owners whose canonical text this task changes, using inspected source. Add missing eligible relationships and correct wrong ones for those owners. Reporting a gap alone is incomplete. For an accurate unchanged owner, only correct or remove a declaration invalidated by this task's move or deletion. An established gap there can be reported in one line. Initialization, explicit relationship maintenance, and Fix retain their authorized scopes. Remove confirmed ineligible declarations with evidence. Give the reason, including when the owner states no qualifying fact or rule. Never change valid binding style merely to meet a preference.

## Consolidate context

On explicit consolidation, identify every fact, rationale, decision, unresolved boundary, relationship and consumer before writing. Use one needed content-free inventory and each exact in-scope canonical document once with necessary bounded pages. Distinguish exact duplication, overlapping owners, intentional repetition, verified supersession and unresolved conflict. Similar wording is not enough to prove duplication. Keep current truth, plans, history, accepted rationale, and unresolved state distinct. Move unique truth to its established owner, preserve useful repetition and unresolved differences, and update manifest paths, links and direct consumers together. A limit or consequential authority conflict stops the scoped work, without rewriting its ambiguity.

Keep consolidation in canonical context. Implementation, tests, history, generated evidence and protected instructions stay out unless independently authorized. Verify changed owners and consumers preserve all distinct meaning, run affected checks and validate. Report the requested scope, consolidation, authority, conflicts, links and coverage.

## Warnings and acceptance

Confirm errors and unchecked binding evidence independently of warnings. Offer to fix a warning. Offer acceptance of its exact `code`, `subject`, and `qualifier` only when the CLI reports `acceptable: true` and the other eligibility rules hold. The developer supplies the reason. For integration only offer acceptance for shared, Git-tracked AGENTS.md or CLAUDE.md instruction subjects, including tracked `.claude/CLAUDE.md`. An ignored file, local-only `CLAUDE.local.md`, or unproven tracking gets a fix or exact handoff. Establish tracked status with host Git evidence or the Fix helper. The link warning qualifier is its reported reason; acceptance is limited to that reason.

Use `acceptedWarnings` only with explicit developer approval and their reason. Validate once after writing it. Remove acceptance when requested or when repaired; review `MOLDEA_ACCEPTANCE_UNMATCHED` against the completed diagnostics. Acceptance has no effect on an unchecked connection.

## Own the README markers

The owned region is strictly between `<!-- moldea:start -->` and `<!-- moldea:end -->`. Only a changed hunk intersecting owned content is direct moldea relevance. README edits outside the region stay with the host. For Initialize or an authorized Fix, use the bundled managed README writer. It is authoritative for the explanatory text and canonical link, preserves outside bytes, and refuses a malformed region. Keep ordinary activation in AGENTS.md and detailed context in its actual owners.
