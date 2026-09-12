# Milestones: Complete `moldea` 5.0.1 with coherent adoption, authority, and runtime eligibility

## Milestone 1: Correct the canonical platform specifications

### Objective

Produce an isolated, review-ready platform specification candidate that consistently requires initialization before repository-dependent `moldea` planning, separates investigation order from claim-specific evidence authority, defines minimum-only runtime package ranges as best-effort eligibility, and keeps website maturity outside technical and production-readiness decisions.

### Dependencies

- The completed skill foundation commits `fc49341e30505ee53063302152d731bbdb6d7aed` and `1e7ba9675a5fa038753f26bb73ee256ae24b52e2` remain preserved.
- Revalidate the platform repository state before work because another agent may be editing unrelated files.
- Create an isolated branch or worktree whose prospective publication contains only this milestone's specification changes.

### Scope

- `moldea/context/product-and-operating-model.md`
- `moldea/context/agent-skill.md`
- `moldea/context/context-gathering.md`
- `moldea/context/runtime-compatibility-matrix.md`
- The ten current `moldea/context/adapter-*-package.md` specifications named in the plan

Hosted-platform implementation, unrelated platform files, protected coding instructions, and concurrent-agent changes are excluded.

### Implementation work

- Remove every pre-adoption exception for repository-dependent agent-system planning while preserving generic host-owned planning.
- Define instruction precedence, efficient investigation order, and claim-specific evidence authority as separate concepts. Preserve unresolved same-fact conflicts unless a current developer selection or independent resolver establishes the governing claim.
- Update the skill release reference to `5.0.1`.
- Define target runtime package `versionRange` values as verified-minimum, best-effort eligibility ranges and qualification attempts as the authority for exact executed versions and time.
- Remove maturity from skill selection, semantic interpretation, technical compatibility, and production-readiness decisions while preserving it as optional packages-website presentation.
- Replace complete-range overclaims in the ten adapter specifications without changing machine ranges, pattern contracts, adapter behavior, or hosted-platform specifications.

### Verification

- Run `pnpm docs:moldea:check`.
- Run the installed Prettier check against only touched specifications and run `git diff --check`.
- Search the touched current specifications for pre-adoption planning exceptions, “authority order,” universal evidence hierarchies, technical maturity use, “complete range,” and other blanket range claims; inspect every remaining match semantically.
- Confirm the isolated candidate contains no unrelated platform changes.

### Acceptance criteria

- All platform specifications express the three agreed contracts without contradiction.
- Release references name skill `5.0.1`.
- Hosted-platform behavior and unrelated work remain unchanged.
- The exact isolated candidate passes read-only review and is pushed to its unambiguous task-branch destination without merging it into the public branch yet.

### Review checkpoint

Review the full specification graph, with particular attention to whether planning still has an implicit pre-adoption route, whether investigation order could still be read as truth precedence, whether an open-ended range is overstated, and whether any concurrent-agent file entered the candidate.

## Milestone 2: Correct runtime eligibility publication and adapter package documentation

### Objective

Produce a review-ready packages candidate that presents target runtime requirements as best-effort eligible versions, preserves separate implementation and Core compatibility contracts, corrects stale package documentation, and prepares only Eve, LangChain, and LangGraph as documentation-only patch releases `3.0.1`.

### Dependencies

- Milestone 1 establishes the canonical specification wording.
- The packages repository must still permit the selected patch versions and have an unambiguous publication branch.

### Scope

- `scripts/runtime-compatibility/generator.ts` and its focused unit test
- Generated `docs/runtime-compatibility.md`
- `apps/website/src/components/adapter-details.astro` and directly affected runtime-publication website tests
- Eve, LangChain, and LangGraph package `README.md`, `docs/index.md`, `docs/verified-target.md`, and `package.json`
- OpenAI and OpenAI Agents SDK `docs/evidence-and-diagnostics.md`
- Root `README.md`
- `pnpm-lock.yaml` only if deterministic workspace-version synchronization changes it

The canonical matrix, maturity registry, runtime code, target minimums, verification dates, qualification URLs, unrelated packages, and protected coding instructions are excluded.

### Implementation work

- Generate and display “Eligible versions” only for target runtime package requirements, with concise verified-minimum and best-effort later-release wording.
- Preserve the existing adapter implementation range and compatible-Core labels and semantics.
- Remove bounded-family and complete-range claims from the three affected package documentation sets and correct the two diagnostic documents where “verified range” means only eligibility.
- Correct the packages root README to Core `4.0.1` and CLI `8.0.0`.
- Bump only `@moldea.ai/adapter-eve`, `@moldea.ai/adapter-langchain`, and `@moldea.ai/adapter-langgraph` from `3.0.0` to `3.0.1`.

### Verification

- Run the focused generator and runtime-publication tests, then `pnpm compatibility:generate`, `pnpm compatibility:check`, `pnpm docs:check`, `pnpm website:check`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm build`.
- Confirm generation is deterministic and `git diff --check` passes.
- Compare protected matrix and maturity-registry digests before and after the milestone.
- Inspect release selection and packed artifacts so only the three intended patch packages are selected and their npm-visible READMEs contain the corrected contract.

### Acceptance criteria

- Public runtime-package requirements use eligibility terminology without weakening implementation or Core compatibility labels.
- Machine range values, `lastVerifiedAt`, maturity data, qualification links, and runtime behavior are byte-identical.
- Exactly the three required adapter manifests are `3.0.1`; no other package release is selected.
- The candidate passes read-only review and is pushed to its unambiguous task-branch destination without public package publication yet.

### Review checkpoint

Review schema stability, terminology boundaries, release selection, package artifact contents, protected-data digests, and whether a documentation edit accidentally changed executable adapter behavior.

## Milestone 3: Correct public knowledge-base guidance

### Objective

Produce a small, review-ready knowledge-base candidate that tells users to initialize `moldea` before repository-specific agent-system planning and accurately explains best-effort runtime eligibility and pinned evidence.

### Dependencies

- Milestones 1 and 2 establish the exact public terminology.

### Scope

- `content/011_frequently-asked-questions/002_getting-started-faq.md`
- `content/003_open-source-tools/007_validation-and-diagnostics.md`
- `content/manifest.json` only when the established content workflow changes it

Unrelated articles, slugs, ordering, categories, relationships, and protected coding instructions are excluded.

### Implementation work

- Remove the public pre-initialization planning exception while explaining that ordinary planning remains available independently of `moldea`.
- Explain eligible minimum versions, deterministic best-effort inspection of later stable versions, exact qualification provenance, and the distinction between pinned prior evidence and a fresh run.
- Keep the prose concise and aligned with the platform specification and packages publication.

### Verification

- Run `npm run validate`, `npm test`, `git diff --check`, and the established formatter if one exists.
- Inspect any manifest change and confirm it is deterministic and limited to the two articles.
- Search the current affected articles for contradictory pre-adoption planning and blanket compatibility language.

### Acceptance criteria

- Both articles state the agreed contracts clearly for a non-specialist reader.
- No unrelated article or manifest relationship changes.
- The candidate passes read-only review and is pushed to its unambiguous task-branch destination without public merge yet.

### Review checkpoint

Review public clarity, agreement with the canonical specification, absence of technical overclaims, and exact path scope.

## Milestone 4: Complete the portable skill and evidence presentation

### Objective

Produce the final skill `development` candidate with coherent activation, planning, evidence authority, and runtime eligibility behavior; visible exact qualification provenance for current and pinned evidence; deterministic regression coverage; and a regenerated dual-domain 5.0.1 evidence pin using the same accepted sources.

### Dependencies

- Milestones 1 through 3 provide stable candidate wording for every external contract.
- The historical qualification tag `v5.0.0` and semantic source commit `926907e26feac6a55929f68ca134aeaf41a6a4b5` must remain available and pass immutable verification.

### Scope

- Portable files under `moldea/` identified in the plan
- Directly affected root and `docs/` public skill documentation
- Conformance and semantic-coverage fixtures and deterministic runner wording, while retaining exactly 74 semantic cases
- Qualification and release-evidence website models, loaders, generation/search projection, profile and current-attempt pages, and focused tests identified in the plan
- `tooling/release-identity/release-evidence-source.mjs` and its focused integration coverage
- `fixtures/release-evidence.json`
- The current planning directory, including this revised plan and breakdown

Historical evidence, qualification profiles and attempts, paid evaluator output, maturity state, `skill-mock`, Eve adapter implementation, hosted-platform behavior, and protected coding instructions are excluded.

### Implementation work

- Require adoption before repository-dependent `moldea` planning and preserve generic host planning.
- Replace fixed evidence hierarchy wording with efficient investigation order plus claim-specific conflict resolution.
- Describe minimum-only runtime package requirements as best-effort eligibility, not blanket compatibility.
- Expose exact current profile runtime-package inputs as inputs and exact current attempt provenance as executed evidence.
- Refactor the existing bounded pinned-source authentication traversal to return a compact per-target attempt id, exact executed package closure, and recorded time. Join it to the matching current profile and label it as pinned prior evidence while the current contract remains pending.
- Keep the release envelope compact. Do not create a copied package ledger, current-contract pass, historical attempt route, compatibility alias, fallback, or parallel evidence model.
- Strengthen deterministic conformance, source-tamper, model-projection, search, page, accessibility, responsive, theme, and current-versus-pinned tests.
- Regenerate the 5.0.1 evidence envelope with the same qualification and semantic sources and an honest reason covering all contract corrections.

### Verification

- Run focused tests during implementation, then `npm run managed-readme:check`, `npm run test:unit`, `npm run test:integration`, `npm run eval:semantic:preflight`, `npm run qualification:dry-run:all`, `npm run qualification:test`, `npm run qualification:typecheck`, `npm run qualification:lint`, `npm run qualification:format:check`, `npm run path:check`, `npm run website:check`, and `npm run release:check`.
- Run the established skill website end-to-end suite if it is not included by `website:check`.
- Verify relevant pages at 320 px and desktop widths, keyboard access, focus visibility, light and dark themes, readable overflow, no serious accessibility violations, and no avoidable client-side render work. No animation is introduced.
- Prove that pinned public package versions and time come from the authenticated immutable source attempt and that tampering fails closed.
- Verify the envelope still points qualification to `v5.0.0` / `c3416c52ae69a3f26d2e38c07ba98aa8531e358d` and semantic evidence to `926907e26feac6a55929f68ca134aeaf41a6a4b5`.
- Do not run any model-backed semantic evaluation or non-dry-run adapter qualification.

### Acceptance criteria

- The portable skill, public docs, deterministic fixtures, and website implement the same three contracts.
- Exactly 74 semantic cases remain, and no historical evidence or paid output changes.
- Current inputs, current executed evidence, and authenticated pinned prior evidence are visibly and honestly distinguished.
- Tampered pinned provenance is rejected before rendering.
- All required deterministic skill checks pass for the exact candidate.
- A read-only review returns `Ready to commit`, and `repo push` publishes the exact signed candidate to `origin/development`.

### Review checkpoint

Review activation abstention, same-fact conflict behavior, runtime wording, source-authentication boundaries, bounded memory and output implications of provenance projection, public evidence comprehensibility, regression coverage, immutable-source identity, and complete diff scope before publication to `development`.

## Milestone 5: Publish synchronized public contracts and release skill 5.0.1

### Objective

Merge and publish only the reviewed candidates in dependency order, release the three documentation-only adapter patches, merge the exact skill candidate, create immutable tag `v5.0.1`, and verify the tag-bound release and websites.

### Dependencies

- Milestones 1 through 4 are each reviewed, pushed, and unchanged from their recorded immutable evidence.
- Every destination branch and prospective merge result can be resolved unambiguously.
- No directly affected public repository contains a known contradictory contract.

### Scope

- The exact reviewed platform, packages, knowledge-base, and skill candidate commits
- Pull-request or protected-branch integration required by each repository
- Existing packages release workflow for the three selected patch packages
- Skill tag `v5.0.1` and its existing release workflow

Unrelated concurrent-agent commits, force pushes, tag movement, history rewrites, extra package releases, paid evaluations, and any new implementation are excluded.

### Implementation work

- Refresh each target and perform read-only branch review of the exact candidate and prospective merge result.
- Merge the platform, packages, and knowledge-base candidates through their established protected workflows without bundling unrelated work.
- Verify publication of `@moldea.ai/adapter-eve@3.0.1`, `@moldea.ai/adapter-langchain@3.0.1`, and `@moldea.ai/adapter-langgraph@3.0.1`; no other package should publish from this change.
- Re-run the final cross-repository contradiction and provenance audit against published branch tips.
- Review the complete skill `development` range against refreshed `main`, merge the exact candidate through the established workflow, create signed immutable tag `v5.0.1`, and push only that tag.
- Verify the tag-bound skill release, release evidence, package artifacts, and public website surfaces.

### Verification

- Confirm every merge commit or squash result has the exact reviewed path set and no unrelated work.
- Confirm all required checks on protected branches and release workflows pass.
- Re-run deterministic release checks against the exact skill tag checkout or tag-bound workflow output.
- Verify public package versions, package README contracts, skill evidence provenance, qualification package display, initialization guidance, and lowercase `moldea` naming.
- Confirm there are no uncommitted task changes or unpublished task commits left in any repository.

### Acceptance criteria

- Canonical specifications, packages publication, knowledge base, and skill website expose one noncontradictory contract.
- Only the intended three adapter patch versions are published.
- Skill `5.0.1` is merged, immutably tagged, and released with both evidence domains pinned to the accepted sources.
- All tag-bound and public verification succeeds without a paid semantic or adapter-qualification run.
- Unrelated concurrent-agent work remains untouched and absent from this task's commits and merges.

### Review checkpoint

Inspect the exact public branch tips, package registry versions, release tag target, release-evidence source identities, workflow conclusions, and visible website claims. Stop rather than force, rewrite, or broaden scope if any immutable identity or protected publication boundary differs from the reviewed candidate.

## Execution scope

Execute five sequential milestones: correct the isolated platform specifications; correct and prepare the packages publication and three adapter patch versions; correct public knowledge-base guidance; complete and deterministically verify the portable skill, authenticated qualification provenance display, and dual-domain evidence pin; then merge and publish only those reviewed candidates before creating and verifying immutable skill tag `v5.0.1`. Run no paid semantic evaluation or non-dry-run adapter qualification, preserve historical evidence and machine compatibility data, and exclude hosted-platform behavior, Eve adapter implementation, `skill-mock`, protected coding instructions, and unrelated concurrent-agent work.
