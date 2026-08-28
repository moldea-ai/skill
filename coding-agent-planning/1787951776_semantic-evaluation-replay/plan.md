# Semantic evaluation replay plan

## Objective

Add an evidence-grounded replay to every semantic evaluation scenario so a non-specialist can follow the developer request, coding-agent activity, meaningful command results, resulting workspace changes, the independent judge assessment, and the final verdict as an agentic conversation. Replay must be the first and default tab; the current criteria and rationale must remain available together in a second Evidence tab.

Build the replay presentation and normalized view-model boundary so a later qualification-specific transformer can reuse the same tabs, conversation timeline, command cards, workspace-change trees, trial sequencing, and verdict presentation without introducing qualification-only code in this change.

## Repository evidence and current behavior

- `README.md` identifies `website/` as the Astro application that validates and renders complete semantic and qualification history under `/evidence/**`, and `fixtures/` as the owner of append-only semantic attempt history and the current passing result.
- `website/package.json` establishes Astro `7.2.2`, Tailwind CSS `4.3.3`, Zod `4.3.6`, Vitest `4.1.10`, and Playwright `1.62.1`. The site is statically generated and already has unit, integration, type, lint, format, build, and browser-test boundaries. No new dependency is needed.
- `website/src/components/semantic-evaluation-case/semantic-evaluation-case.astro` currently renders each scenario as a native disclosure containing “What had to happen,” “What must not happen,” and the current rationale. It does not render the developer/actor/judge sequence.
- `website/src/pages/evidence/semantic/attempts/[attemptId]/index.astro` separately renders immutable per-trial provenance, including actor and judge versions, command-policy counts, observed and forbidden labels, rationale, and evaluation time. This information must remain available after the replay work.
- `website/src/lib/semantic-evaluation/loader.ts` verifies immutable attempt history and current release identity, but its public model is derived only from `attempt.json`. `website/src/lib/semantic-evaluation/validations.ts` consequently selects trial summaries and does not expose the richer replay fields in the verified `evidence.json` artifact.
- The verified protocol-21 evidence already contains the exact developer direction through the case definition, the actor’s final response, ordered safe execution evidence, a complete file/symlink workspace delta, actor and judge provenance, and the judge rationale. The attempt-history verifier recomputes each summary from `evidence.json` and rejects digest or summary contradictions before website generation.
- Semantic execution deliberately discards raw command text, command identifiers, MCP payloads, and arbitrary output. Safe projected facts retain normalized `composition`, `inspect`, and `validate` CLI envelopes, focused runtime-test results, selected Yarn package/provider facts, exit codes, output dispositions, and bounded metadata. The current passing attempt contains 947 completed command events, 78 with projected result facts and 869 without projected facts; one trial has as many as 55 total commands but no more than 6 projected commands. Rendering every anonymous event separately would be misleading and excessively noisy.
- Semantic workspace snapshots retain files and symlinks, not directory entries. The current evidence contains created and modified paths and supports deleted paths, but a directory lifecycle cannot be proven independently from that delta. Folder nodes can truthfully organize affected paths without claiming that an unrecorded directory itself was created or deleted.
- `website/src/lib/qualification/types.ts` already demonstrates the later reuse target: qualification trials have a task, structured actor output, projected command events, deterministic before/after verification, complete before/after path inventories, workspace assertions, judge output, retries, and ordered initial/confirmation trials.
- `website/src/components/conversation/conversation.astro` and the platform’s `SkillWorkflowPreview` establish the desired developer/agent visual language, but they support only static message turns. Replay also needs heterogeneous command, workspace, judge, and verdict steps, so extending the landing-page conversation component would mix unrelated responsibilities.
- `docs/semantic-evaluation.md` and `website/README.md` currently state that actor responses, safe command facts, and workspace artifacts remain only in raw committed evidence. Those state-bearing descriptions must be updated when a bounded public replay projection is added. Search records currently exclude actor transcripts and must continue to do so.

## Desired final behavior

### Scenario interaction

Each semantic scenario remains a native top-level disclosure. Opening it reveals two progressively enhanced tabs in this order:

1. **Replay** — selected by default and rendered first.
2. **Evidence** — contains the existing expected criteria, forbidden criteria, current rationale, evaluation time, confirmation status, and, where requested by the immutable attempt page, complete trial provenance.

The Replay panel begins with a concise notice that it is an evidence-grounded reconstruction. It must explain that the sequence and labels are condensed for readability while the messages, command facts, changed paths, and verdict come from immutable recorded evidence. It must not imply that it exposes hidden reasoning or a verbatim tool transcript.

### Replay sequence

For each initial or confirmation trial, render an ordered timeline:

1. The exact natural developer direction as a Developer message.
2. Recorded command activity in event order:
   - show each fact-bearing command as an individual terminal-style card with a normalized operation and a very short result;
   - show each failed command individually with its exit code even when no projected fact exists;
   - collapse each contiguous run of successful commands without projected facts into one compact activity card that reports the accounted command count and explains that exact command text and output were intentionally not retained;
   - never fabricate raw shell text or output.
3. One workspace step grouped into **Created**, **Modified**, and **Deleted** path trees:
   - list every recorded changed path;
   - distinguish files and symlinks;
   - derive folder nodes only as structural groupings and label them by the number and status of descendant paths rather than asserting an unrecorded folder lifecycle;
   - show an explicit “No project-visible files or folders changed” state when all groups are empty;
   - never include file contents, prior contents, new contents, hashes, modes, or symlink targets in the public replay model.
4. The exact recorded final actor response as a Coding agent message, rendered as plain text with whitespace preserved.
5. The exact structured judge rationale as an Independent judge message.
6. A final passed or failed verdict step for that trial.

When a case has confirmation trials, render the initial trial and confirmations in their immutable order with clear trial headings. Preserve the original failure and every confirmation; do not collapse recovery into only the final passing result. A pending case with no completed trial gets a truthful Replay empty state rather than fabricated activity.

### Command presentation

Use deterministic display templates owned by the semantic replay transformer:

- a recognized CLI envelope becomes a normalized command such as `moldea inspect`, `moldea validate`, or `moldea composition`, labeled as a normalized recorded operation rather than exact shell text;
- a focused runtime-test fact shows the recorded test path and Passed or Failed;
- Yarn package/provider facts show the package resolution or conflicting provider result without sandbox paths;
- a fact-bearing event can show multiple concise results in the same command card;
- empty, oversized, or unrecognized successful outputs are represented only through the contiguous aggregate card;
- failures always retain their recorded exit code and failed status.

This accounts for all command events while keeping the current run bounded to useful cards instead of producing hundreds of anonymous entries.

### Current and immutable pages

- `/evidence/semantic/` uses the replay belonging to the exact current attempt only when the existing release-identity checks accept that attempt. Pending or stale scenarios do not borrow replay from an older pass.
- `/evidence/semantic/attempts/[attemptId]/` renders the replay from that attempt’s own verified immutable evidence, including failed and recovered histories.
- Both pages use the same scenario, tab, replay, and Evidence presentation. The immutable page additionally enables complete trial provenance so every actor/judge version, command-policy aggregate, label result, and timestamp currently shown remains inspectable.
- Existing links to the raw summary, exact evidence, methodology, coverage map, and immutable history remain unchanged.

### Progressive enhancement and accessibility

- Server-render both Replay and Evidence sections in source order, with Replay first. Without JavaScript, both remain readable and the controls act as ordinary in-page links.
- Enhance the links into a WAI-ARIA tablist after page load. The script sets stable tab and panel relationships, selects Replay first, hides only the inactive enhanced panel, and supports Arrow Left, Arrow Right, Home, and End keyboard behavior.
- Scope initialization to each scenario, make it idempotent across Astro client navigation, and avoid global state shared between cards.
- Preserve native disclosure keyboard behavior, visible focus, meaningful headings, ordered-list semantics, accessible status text, and readable labels that do not rely on color or icons alone.
- Work without horizontal page overflow from 320px through large desktop widths. Long responses, command labels, and paths must wrap without widening the page.
- Reuse existing design tokens and interaction primitives for light and dark themes. Do not add a theme mechanism, CSS file, animation dependency, fake typing effect, or autoplay.
- If a small existing fade transition is used when switching enhanced panels, it must use the established motion utilities and a `motion-reduce` path. The replay itself remains an immediately readable timeline rather than a timed animation.

## Scope

### In scope

- A normalized, qualification-ready replay view model owned outside the semantic module.
- Shared Replay/Evidence tab and replay timeline components.
- A semantic-only raw-evidence validation and transformation adapter.
- Semantic current and immutable attempt page integration.
- Preservation and consolidation of all current semantic criteria, rationale, trial provenance, and raw-evidence links.
- Focused unit, integration, browser, accessibility, no-JavaScript, responsive, theme, and search-boundary coverage.
- Directly affected semantic-evaluation and website source-model documentation.

### Explicitly out of scope

- Qualification replay mapping or qualification page changes. A later change will map qualification tasks, actor output, deterministic verifier stages, projected events, workspace assertions, retries, and judge output into the shared replay model.
- Any semantic evaluator, case, coverage, protocol, checkpoint, immutable attempt, canonical result, release gate, retry, or confirmation change.
- Re-running or replacing the successful 54-scenario evaluation.
- Recording directory entries or adding a compatibility/fallback evidence schema.
- Raw command text, raw command output, MCP payloads, hidden reasoning, chain-of-thought, arbitrary model-generated dramatization, or workspace file contents.
- Search indexing of actor responses, judge rationales, command facts, or changed paths.
- Timed playback, autoplay, fake typing, audio, or a new client framework.
- New dependencies, changes to shared `@moldea.ai/website-ui`, or changes to the sibling platform repository.

## Architecture and data flow

```text
verified case definition ───────────────┐
                                       │
verified immutable attempt.json ───────┼─> semantic replay transformer
                                       │       │
digest-verified evidence.json ─────────┘       │
                                               v
                                  shared IEvaluationReplayModel
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       v                                               v
            current semantic scenario                       immutable attempt scenario
                       │                                               │
                       └────────> Replay | Evidence components <───────┘
```

The shared view model is a presentation contract, not a new evidence authority. Semantic validation remains responsible for selecting and validating public fields from the already digest-verified source artifact. The transformer immediately discards raw workspace contents and every unsupported evidence field. Components receive only normalized, public-safe replay steps.

The later qualification adapter should need only to produce the same model:

- profile task → Developer message;
- actor summary/observations → Coding agent message;
- projected command events and deterministic before/after checks → command or verifier steps;
- workspace assertions → shared workspace tree;
- judge summary/requirements → Independent judge message and verdict;
- retries and initial/confirmation history → ordered replay trials.

No unused qualification transformer, placeholder type, or conditional qualification branch will be added now.

## File and symbol changes

### Shared replay model

- Add `website/src/lib/evaluation-replay/types.ts`:
  - define exported `I`-prefixed contracts for a replay model, ordered trial, message step, command step, workspace step, verdict step, workspace change, and structural path-tree node;
  - support Developer, Coding agent, Independent judge, and Deterministic verifier roles so the renderer is qualification-ready without encoding qualification evidence details;
  - distinguish recorded text from deterministic derived labels where the presentation needs to disclose the source.
- Add `website/src/lib/evaluation-replay/utilities.ts`:
  - build stable folder trees from normalized file/symlink paths;
  - preserve lexical path order and status grouping;
  - reject or safely handle duplicate, absolute, traversal, empty, or malformed paths rather than producing misleading nodes.
- Add `website/src/lib/evaluation-replay/utilities.test-unit.ts` next to the implementation.
- Add `website/src/lib/evaluation-replay/index.ts` as the thin explicit public boundary for shared replay types and utilities.

### Semantic validation and transformation

- Update `website/src/lib/semantic-evaluation/validations.ts`:
  - factor the existing actor/judge host, command-policy, and trial-summary shapes so the attempt and raw replay schemas reuse one authoritative contract;
  - add an additive protocol-21/schema-6 replay candidate schema that selects only actor response, safe actor execution evidence, file/symlink workspace deltas, trial identity, host provenance, observed/forbidden labels, pass status, rationale, and timestamps;
  - model every supported projected output-fact discriminant exactly and reject unsupported values fail-closed;
  - retain compatibility only with the current schema and protocol. Do not add legacy branches.
- Add `website/src/lib/semantic-evaluation/replay-transformers.ts`:
  - correlate each raw initial or confirmation result with its derived immutable trial summary and fail if identity or public verdict fields contradict;
  - build deterministic message, command, workspace, judge, and verdict steps;
  - collapse only contiguous successful no-fact commands while preserving meaningful command order and all failed commands;
  - normalize safe command labels and short results without reconstructing raw shell syntax;
  - remove content, hashes, modes, targets, repository-control evidence, scenario snapshots, and other non-presentation fields before returning the replay model.
- Add `website/src/lib/semantic-evaluation/replay-transformers.test-unit.ts` with adversarial coverage for all supported projected fact kinds, failed commands, contiguous aggregation, mixed workspace changes, no-change state, symlinks, confirmations, pending cases, and contradictory trial correlation.
- Update `website/src/lib/semantic-evaluation/types.ts`:
  - attach the normalized replay model and exact developer direction to the semantic case model;
  - make immutable attempt cases use the same enriched case model as the current page;
  - retain existing trial summary/provenance types used by the Evidence panel.
- Update `website/src/lib/semantic-evaluation/loader.ts`:
  - read each attempt’s already verified `evidence.json` from its contained immutable attempt directory;
  - parse it through the new replay candidate schema;
  - enrich attempt cases in case-definition order with presentation metadata, criteria, developer direction, trial summaries, and replay;
  - reuse those enriched latest-attempt cases for the current page only when current release identity passes;
  - produce pending case models with no replay when no current trial exists;
  - keep current latest/last-passing/history and raw URL behavior unchanged.
- Update `website/src/lib/semantic-evaluation/loader.test-integration.ts`:
  - extend its current protocol-21 candidate factory with minimal valid replay evidence;
  - assert complete current replay mapping, failed/latest separation, ordered confirmation mapping, and pending empty state;
  - assert malformed public replay fields and raw/summary contradictions fail website generation;
  - retain digest-tampering, host-provenance, and repository-empty-state coverage.
- Update `website/src/lib/semantic-evaluation/index.ts` with exact named type exports required by pages and components. Do not add wildcard exports.

### Shared presentation

- Add `website/src/components/evidence-tabs/evidence-tabs.astro`:
  - accept a stable scenario-derived identifier and named Replay/Evidence slots;
  - render Replay first and both sections in no-JavaScript markup;
  - progressively enhance controls into an accessible, keyboard-complete tablist with Replay selected by default;
  - initialize idempotently on initial load and `astro:page-load`.
- Add `website/src/components/evaluation-replay/evaluation-replay.astro`:
  - render the reconstruction disclosure, ordered trials, agentic message cards, compact command cards, grouped workspace trees, and verdicts from only `IEvaluationReplayModel`;
  - visually align developer/agent messages with the current landing-page conversation and command cards with the platform workflow’s terminal language while using this site’s existing Astro/Tailwind tokens;
  - render all text as text nodes or through the existing safe inline-brand treatment, never `set:html` or untrusted Markdown;
  - keep long text and paths responsive, theme-safe, and accessible.
- Add `website/src/components/semantic-trial-provenance/semantic-trial-provenance.astro`:
  - move the immutable attempt page’s existing actor/judge version, command-policy, observed/forbidden labels, and evaluation-time presentation into one focused semantic component;
  - preserve every currently displayed technical trial field.
- Update `website/src/components/semantic-evaluation-case/semantic-evaluation-case.astro`:
  - preserve the outer native scenario disclosure and summary;
  - place `EvaluationReplay` in the first Replay tab;
  - move the existing three evidence sections unchanged in meaning into the second Evidence tab;
  - optionally render `SemanticTrialProvenance` for immutable attempt pages;
  - show a truthful pending replay state when no trial was recorded.

### Page integration and copy

- Update `website/src/pages/evidence/semantic/index.astro`:
  - retain grouping, counts, history, raw links, and provenance;
  - add concise copy explaining that opening a scenario exposes an evidence-grounded replay;
  - continue rendering only current release-bound case evidence.
- Update `website/src/pages/evidence/semantic/attempts/[attemptId]/index.astro`:
  - replace its separate per-case trial markup with the enriched shared semantic case component;
  - enable full trial provenance in the Evidence tab;
  - preserve summary counts, immutable identity, raw artifact links, stop reason, digests, and technical provenance;
  - revise the introduction so it no longer claims actor responses and safe command facts are available only in raw evidence.
- Update `website/src/pages/evidence/semantic/_index.test-e2e.ts` rather than creating a second page-test convention:
  - verify Replay is the first selected tab;
  - verify Developer, Coding agent, command, workspace, Independent judge, and verdict steps against representative recorded scenarios;
  - verify meaningful command results, aggregated unprojected activity, created/modified path trees, and the no-change state;
  - switch to Evidence and verify the three existing sections remain present;
  - verify Arrow key, Home, End, focus, and `aria-selected` behavior;
  - navigate to the immutable attempt and verify its replay plus retained trial provenance;
  - retain no-JavaScript, 320px, light/dark, and axe coverage.

### Search and documentation state

- Update `website/src/lib/generation/generation.test-unit.ts` to assert that a distinctive actor-response value present in the replay model does not enter semantic search records or `llms.txt`. The production search builder should not require a behavior change because it already selects only bounded case and attempt metadata.
- Update `docs/semantic-evaluation.md`:
  - document the new public replay projection and its reconstruction label;
  - state exactly which recorded fields are shown;
  - explain normalized command cards, aggregation of unprojected successful commands, path-only workspace trees, and the continued absence of raw command text/output and hidden reasoning;
  - keep current protocol, retry, confirmation, privacy, and release-gate contracts unchanged.
- Update `website/README.md`:
  - replace the statement that full actor transcripts and workspace evidence are available only through raw links with the implemented bounded replay projection;
  - state that replay text remains excluded from documentation search and `llms.txt`;
  - preserve fail-closed source-model and static/no-JavaScript boundaries.
- Do not update root `README.md`; its project blueprint and ownership descriptions remain accurate because no top-level module responsibility changes.

## Ordered implementation strategy

1. **Establish the shared replay contract and safe path utilities.** Add the domain-neutral replay types and deterministic path-tree builder first. Review the contract against both semantic and qualification evidence so it supports the known later roles and trial sequence without qualification-only placeholders. Complete the utility unit tests before integrating semantic data.
2. **Create the semantic public projection.** Refactor existing semantic Zod shapes for reuse, validate the consumed raw evidence fields, and implement the semantic replay transformer. Verify every projected command-fact type, failed-command handling, contiguous aggregation, path-only workspace mapping, exact messages, confirmations, and contradiction failures in focused unit tests.
3. **Integrate immutable evidence into the website loader.** Load the replay source only after immutable verification, correlate it to attempt summaries, enrich cases in stable case-definition order, and preserve current identity, pending, latest, last-passing, and historical behavior. Update the integration candidate factory and complete loader regression coverage before changing presentation.
4. **Build the reusable presentation.** Implement progressively enhanced Replay/Evidence tabs, the replay timeline, and extracted semantic trial provenance. Review the components for semantic HTML, unique identifiers, focus behavior, text-only status meaning, path wrapping, 320px layout, both themes, reduced motion, and no-JavaScript readability.
5. **Unify current and immutable semantic scenario rendering.** Update the semantic case component and both semantic routes to use the shared replay and Evidence presentation. Preserve every current criteria, rationale, history, raw-link, digest, host, command-policy, label, and timestamp surface. Confirm Replay is first everywhere.
6. **Synchronize search protections and documentation.** Add the regression assertion that replay transcripts stay out of search and `llms.txt`, then update semantic methodology and website source-model documentation to describe the exact new public projection and retained privacy boundaries.
7. **Run focused and complete verification.** Format only touched files, run focused unit/integration/browser checks first, then the complete website quality and E2E boundaries, the immutable semantic evidence verifier, and the final diff/documentation review. Stop if any evidence, identity, accessibility, or no-JavaScript invariant regresses.

## Testing and verification

### Focused behavior coverage

- Shared path-tree unit cases:
  - nested and top-level paths;
  - mixed files and symlinks;
  - stable lexical ordering;
  - duplicate paths;
  - empty groups;
  - absolute, traversal, empty, and malformed paths.
- Semantic transformer unit cases:
  - exact developer, actor, and judge text;
  - every supported projected output-fact discriminant;
  - canonical normalized command labels and short result text;
  - failed factless commands retained individually;
  - only contiguous successful factless commands aggregated;
  - aggregate counts account for all hidden command events;
  - created, modified, deleted, no-change, and symlink workspace states;
  - no content, hash, mode, target, raw output, or unsupported evidence field reaches the returned model;
  - initial, confirmation-1, and confirmation-2 ordering;
  - passed, failed, recovered, and pending cases;
  - mismatch between raw evidence and immutable trial summary rejected.
- Semantic loader integration cases:
  - complete current attempt replay;
  - failed latest versus last passing isolation;
  - historical attempt replay ownership;
  - empty pre-attempt state;
  - malformed replay field rejection;
  - immutable digest and summary tampering rejection.
- Browser cases:
  - Replay first and selected by default;
  - exact role labels and representative messages;
  - command result and aggregate activity cards;
  - complete changed-path trees and no-change message;
  - Evidence tab preserves all three current evidence sections;
  - immutable attempt retains full trial provenance;
  - keyboard tab navigation and focus;
  - no-JavaScript access to both sections;
  - 320px through desktop layout with no page overflow;
  - light and dark themes;
  - no critical or serious axe violations;
  - reduced-motion-safe behavior.
- Search regression:
  - replay actor text is present in the semantic model and rendered page but absent from local search records and `llms.txt`.

### Commands

Run from the repository root unless noted:

```bash
npm --prefix website run test:unit
npm --prefix website run test:integration:artifact
npm --prefix website run typecheck
npm --prefix website run lint
npm --prefix website run format:check
npm --prefix website run build
npm --prefix website run test:e2e
npm run eval:semantic:verify
git diff --check
```

After focused checks pass, run the established combined website boundary as the final regression check:

```bash
npm run website:check
```

Run Prettier from `website/` against only touched website files, using `website/.prettierrc`, before the format check. Do not run formatting or generators against unrelated files. Review generated output only as verification; do not commit ignored `website/.generated/` or `website/dist/` artifacts.

## Security, privacy, and integrity

- Read replay only from the exact immutable `evidence.json` already validated against its attempt digest and derived summary.
- Validate every consumed replay field with Zod and fail static generation on malformed, unsupported, or contradictory current evidence.
- Render actor and judge text as plain text. Do not interpret evidence as HTML or executable Markdown.
- Never expose raw commands, raw output, MCP payloads, command identifiers, hidden reasoning, host paths, workspace contents, symlink targets, hashes, modes, repository-control internals, or unrelated evidence fields.
- Preserve the existing raw-source links for technical auditability instead of expanding the public projection beyond the requested explanation surface.
- Keep replay content out of search records and `llms.txt` so local search remains bounded and does not turn transcripts into ordinary documentation claims.
- Do not mutate evaluator evidence, regenerate an attempt, or create a parallel replay artifact that could drift from immutable evidence.

## Performance and maintainability

- Transform replay once during static model generation; perform no browser-side JSON fetching, parsing, model calls, or large evidence traversal.
- Emit only public-safe normalized fields. Do not serialize the 778 KB raw evidence object, file contents, or unsupported metadata into the generated model.
- Preserve useful command order while reducing the current 947 events to individual meaningful/failed cards plus compact contiguous aggregates. Do not use an arbitrary display limit that could hide a material command failure.
- Use one idempotent tab initializer for every scenario rather than one global listener per card. The static Astro components add no React runtime or render-cycle cost.
- Keep the shared replay model domain-neutral and the semantic transformation semantic-owned. Qualification-specific source interpretation remains in the qualification module when implemented later.
- Reuse current design tokens, EvidenceStatus behavior, and visual language. Do not copy platform React code or create a second styling system.

## Compatibility, migration, deployment, and rollback

- No compatibility or legacy evidence path is required. The repository intentionally supports only semantic protocol 21, attempt schema 4, and evidence schema 6.
- No dependency, package-lock, environment, API, database, migration, deployment, route, or external integration contract changes are required.
- Static route URLs and raw artifact URLs remain stable.
- Deployment continues through the existing GitHub Pages workflow and gains no runtime service dependency.
- The change is reversible by removing the replay projection/components and restoring the two semantic templates; immutable evaluator evidence remains untouched throughout.

## Risks and edge cases

- **Narrative mistaken for a transcript:** permanently label the replay as an evidence-grounded reconstruction and distinguish normalized operations from exact shell commands.
- **Anonymous command flood:** render meaningful or failed events individually and collapse only contiguous successful no-fact events, preserving complete accounting without 869 low-information cards in the current run.
- **False folder claims:** use folder nodes only to organize recorded file/symlink paths. Do not state that a folder itself was created or deleted without directory evidence.
- **Long actor responses and paths:** preserve exact text while using wrapping, `min-width: 0`, and responsive single-column layouts at narrow widths.
- **Historical failure/recovery distortion:** derive replay per immutable trial and retain the initial failure plus every confirmation in order.
- **Current evidence borrowing from history:** attach replay to the accepted current attempt only; stale last-passing evidence remains historical.
- **No-JavaScript tab loss:** render both panels before enhancement and use controls as in-page links until the accessible tab initializer runs.
- **Duplicate tab identifiers across 54 cases:** derive IDs from validated stable case IDs within each route and verify build output for duplicate IDs.
- **Search/model growth:** project only necessary replay text and facts, keep transcripts out of search and `llms.txt`, and inspect generated model/build size for accidental raw-evidence retention.
- **Future qualification divergence:** reuse the normalized view model and renderer, but keep qualification evidence interpretation in a future qualification transformer rather than weakening semantic validation or adding speculative branches now.

## Acceptance criteria

- Every evaluated semantic scenario on the current and immutable attempt pages has Replay as its first and default enhanced tab.
- Replay visibly and accessibly presents the exact developer direction, recorded actor response, meaningful/failed command activity with short results, all resulting created/modified/deleted paths, judge rationale, and trial verdict.
- Every recorded command event is either represented individually or included in a contiguous successful no-fact aggregate; no failure is hidden by aggregation.
- Workspace changes clearly separate Created, Modified, and Deleted paths and use folder trees without making unsupported directory-lifecycle claims.
- Multi-trial cases preserve initial and confirmation order; pending cases show no fabricated replay.
- The Evidence tab retains the existing expected, forbidden, and rationale sections, and immutable attempt pages retain all existing trial provenance.
- Raw command text/output, hidden reasoning, workspace contents, hashes, modes, symlink targets, and unsupported evidence do not enter the normalized website model or rendered HTML.
- Replay text remains absent from search records and `llms.txt`.
- Tabs work with mouse and keyboard, both panels remain available without JavaScript, and affected pages pass responsive, light/dark, reduced-motion, and automated accessibility checks.
- The existing semantic verifier still passes without changing or re-running the 54-scenario evidence.
- The shared replay contracts and components can accept a later qualification transformer without semantic imports or presentation rewrites.
- All listed focused and complete verification commands pass, the final diff contains only authorized source/test/documentation changes, and no generated or unrelated files are committed.

## Approval required

Approve implementation of the complete semantic replay scope above: a reusable replay view model and presentation, a semantic-only immutable-evidence projection, Replay-first scenario tabs on current and historical semantic pages, preservation of all existing evidence/provenance, focused tests and documentation synchronization, and no evaluator, evidence, qualification-page, dependency, route, or protocol changes.
