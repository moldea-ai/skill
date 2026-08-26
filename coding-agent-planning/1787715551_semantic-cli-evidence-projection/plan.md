# Semantic CLI Evidence Projection Correction

## Current state and repository evidence

The first clean Sol candidate is terminal at semantic protocol 14. Five initial cases ran: three passed, `initialize-partial-context` recovered through two passing confirmations, and `initialize-sufficient-context` failed both its initial trial and confirmation 1. The recovery policy correctly skipped confirmation 2 and left 44 cases pending or failing.

The repository currently contains four valid, uncommitted immutable attempt directories plus the updated `fixtures/semantic-evaluation-results/latest.json`. `npm run eval:semantic:verify` accepts all 49 historical attempts. The ignored `fixtures/.semantic-evaluation-candidate.json` preserves the terminal protocol-14 checkpoint.

Both `initialize-sufficient-context` trials produced the expected canonical project foundation, README awareness block, concise completion report, no unnecessary agent or context, and unchanged protected repository controls. Both failed only because the actor claimed a valid local CLI result without a projected `moldea-cli-envelope` fact. The retained evidence records every completed command as empty, oversized, or unrecognized, so the judge correctly triggered `claim-validity-without-deterministic-evidence`.

The affected code establishes a concrete evaluator gap:

- `moldea/references/local-tooling.md` already requires the verified repository-local CLI, separate JSON invocations, completed envelope validation, and result-first decision gates. The portable skill does not require one shell serialization or prohibit a fixed Node launcher for the same verified local path.
- `tooling/semantic-evaluation/actor-execution-evidence.mjs` accepts only a finite executable inventory and unwraps only one single-quoted `/bin/bash -lc '...'` representation.
- Retained qualification actor events show Codex legitimately emitting direct commands, single-quoted wrappers, double-quoted wrappers, and fixed-Node invocations of the verified local CLI.
- The projection unit suite primarily exercises pnpm Plug and Play commands. It does not prove npm-style direct-bin, dot-relative, fixed-Node, or double-quoted Codex wrapper equivalence.
- The evaluator intentionally removes raw command text and command output from public evidence. That privacy boundary must remain intact.

## Objective

Correct the semantic evaluator so security-equivalent, exact repository-local CLI invocations produce the same safe result fact, while chained, redirected, augmented, provider-ambiguous, or otherwise near-match commands remain untrusted. Invalidate the terminal protocol-14 candidate, retain every failed attempt as inspectable history, and present those attempts as historical Sol evidence after the correction.

This is an evaluator correction, not another portable-skill refinement. `moldea/`, semantic case definitions, semantic coverage, qualification profiles, qualification protocols, model selection, prompts, confirmation policy, and the 49-case inventory remain unchanged.

## Contract decisions

### Finite invocation equivalence

Replace generic wrapper unwrapping with exact matching against a finite command inventory. A command is eligible only when its entire text equals one approved invocation or that same invocation inside one exact simple Codex Bash wrapper. Support the wrapper serializations demonstrated by repository evidence without interpreting arbitrary shell syntax.

For npm-style repositories, treat these forms as equivalent when they target an already verified evaluator-owned local path:

- direct root-local bin or installed CLI bin invocation
- the same path with a harmless `./` prefix
- the same path launched through the sandbox's fixed `node` or `/opt/node` executable
- the exact invocation inside the known single-quoted or double-quoted `/bin/bash -lc` wrapper

Retain the existing exact pnpm Plug and Play, workspace-path, Yarn inspection, and focused runtime-test contracts. Do not accept environment assignments, command substitution, pipes, redirection, output filtering, `cd`, `npm exec`, `npx`, package-manager execution fallbacks, extra arguments, multiple commands, or a different executable path.

### Evidence privacy and authority

Continue publishing only bounded facts, exit codes, byte counts, status, and output disposition. Do not persist raw command text, raw output, command hashes, host paths, credentials, or actor-controlled metadata. A parseable envelope from an unapproved command remains unrecognized, and an approved command still requires the exact release CLI version, JSON schema, operation, status, result/error presence, and compatible exit code.

### Protocol invalidation

Increment `SEMANTIC_EVALUATION_PROTOCOL_VERSION` from 14 to 15 because the judge's admissible execution-evidence boundary changes. Keep semantic checkpoint schema 4 and public attempt schema 3: their shapes do not change. Protocol-14 checkpoints must not resume or migrate under protocol 15. A later explicitly authorized run must use `--record --restart`; the restart removes only the ignored checkpoint and preserves public history.

### Historical presentation

After the protocol bump, schema 3 alone no longer means current assurance. Semantic attempt presentation must distinguish:

- current protocol-15 Sol evidence
- historical Sol evidence from an earlier protocol
- historical Terra evidence

Current status and scenario counts continue to require exact current artifact, suite, coverage, CLI, protocol, and host identities. The terminal protocol-14 Sol attempts therefore remain inspectable but cannot satisfy current assurance or the release gate.

## Implementation steps

1. Update the command projector in `tooling/semantic-evaluation/actor-execution-evidence.mjs`.
   - Replace `unwrapSimpleBashCommand` with exact full-command matching that supports only the approved direct and wrapper serializations.
   - Extend the finite Moldea executable forms with dot-relative and fixed-Node variants for the existing evaluator-owned npm paths.
   - Reuse the exact matcher for existing workspace-path, focused-runtime, and Yarn projections where appropriate, without broadening their commands.
   - Preserve output size limits, strict envelope validation, bounded evidence shapes, and raw-data omission.

2. Strengthen colocated projection tests in `tooling/semantic-evaluation/actor-execution-evidence.test-unit.mjs`.
   - Cover valid and invalid `inspect`, `validate`, and `compatibility` envelopes through direct, dot-relative, fixed-Node, single-quoted wrapper, and double-quoted wrapper forms.
   - Verify every approved form produces the same sanitized `moldea-cli-envelope` fact.
   - Add adversarial near matches for command chaining, redirects, pipes, environment prefixes, executable substitutions, extra arguments, unsupported launchers, escaped wrapper payloads, package-manager fallbacks, and fabricated envelopes from unrecognized commands.
   - Assert that serialized evidence contains no command text, raw envelope fields, private paths, credentials, or sensitive payloads.

3. Add real-path integration coverage beside the semantic runner.
   - Extend `tests/semantic-evaluation-runner.test-integration.mjs` to seed the existing exact published npm CLI closure, run representative approved invocation forms against a disposable actor repository, feed their real completed events through `parseSemanticEvaluationHostOutput`, and assert the projected release-bound facts.
   - Include a representative rejected near-match using the same valid CLI output so command authority, not merely JSON validity, remains tested.
   - Keep the third-party boundary local and deterministic; no model, registry, provider, or external network call is needed.

4. Advance the semantic evidence protocol.
   - Set `SEMANTIC_EVALUATION_PROTOCOL_VERSION` to 15 in `tooling/release-identity/constants.mjs`.
   - Update semantic-runner, release-evidence, conformance, attempt-history, and website tests whose current-protocol expectations are affected.
   - Assert that the terminal protocol-14 checkpoint is incompatible and that only `--restart` can begin the next recorded candidate.
   - Preserve historical protocol-14 attempt verification and do not add a checkpoint migration or compatibility fallback.

5. Correct semantic website generation labels and current-status derivation.
   - Extend `website/src/lib/semantic-evaluation/types.ts` and `loader.ts` so each attempt model owns its assurance-generation label from both model schema and evaluation protocol.
   - Render `Current Sol`, `Historical Sol`, or `Historical Terra` from that model on semantic history and immutable attempt pages instead of inferring current assurance from schema 3 alone.
   - Update loader integration tests for all three generations, exact current-protocol status, stale-protocol pending counts, malformed host pairings, and retained raw evidence links.
   - Update focused E2E expectations so the new failed protocol-14 attempts remain reachable and are labeled historical after protocol 15 becomes current.
   - Preserve static no-JavaScript behavior, keyboard access, 320px responsiveness, light/dark themes, accessible names, and existing render efficiency.

6. Synchronize concise operational documentation.
   - Update `README.md` and `docs/semantic-evaluation.md` from protocol 14 to protocol 15.
   - Explain that the evaluator accepts a finite set of security-equivalent exact local invocations while withholding raw commands and output.
   - Explain that the failed protocol-14 Sol attempts remain public history and that a new candidate requires `--restart` after a reviewed, committed correction.
   - Do not add evaluator mechanics to the portable skill or expand public guidance beyond what operators need to understand evidence validity and restart behavior.

7. Preserve and verify the failed evidence state.
   - Keep the four existing attempt directories and their exact contents unchanged.
   - Keep `latest.json` pointing to `20260826T033103078Z-semantic-e94de2e7` with failed status until a later recorded run writes a newer immutable attempt.
   - Keep the ignored terminal checkpoint during implementation and confirm ordinary resume rejects it after the protocol bump.
   - Run `npm run eval:semantic:verify` to prove all historical attempts remain valid.
   - Do not manually edit, delete, rewrite, or relabel immutable result artifacts.

8. Complete model-free verification and stop at review.
   - Run the focused actor-execution-evidence unit suite.
   - Run the focused semantic-runner unit and integration suites.
   - Run `npm run test:unit` and `npm run test:integration`.
   - Run `npm run eval:semantic:preflight` for all 49 cases.
   - Run `npm run eval:semantic:verify`.
   - Run `npm run website:check` and the focused semantic evidence E2E tests; run the complete website E2E suite with the repository-supported command when practical.
   - Run `npm run release:identity:check`, `git diff --check`, and formatting checks for touched files.
   - Run `npm run release:check` and confirm its only remaining failures are the intentionally missing protocol-15 Sol semantic result and downstream current qualification evidence.
   - Review the complete source, documentation, website, and retained-evidence diff. Do not run a model, restart the candidate, commit, or push.

## Error handling and edge cases

- An exact approved command with malformed, mixed, oversized, empty, version-mismatched, schema-mismatched, status-mismatched, or exit-code-mismatched output remains non-evidence.
- A valid envelope emitted by an unapproved command remains non-evidence.
- Wrapper support is exact string matching, not shell parsing or permissive quote stripping.
- Fixed-Node support applies only to the known evaluator-owned Node executable and approved repository-local paths.
- Historical attempt validation remains additive across protocols, but current assurance remains exact and closed.
- The implementation must not expose raw commands to diagnose future failures. Tests and finite classifications provide the maintainable diagnostic boundary.
- If implementation inspection reveals that an approved equivalent form cannot preserve provider identity or shell safety, stop and revise this plan instead of broadening the matcher.

## Verification commands

```bash
node --test tooling/semantic-evaluation/actor-execution-evidence.test-unit.mjs
node --test tests/semantic-evaluation-runner.test-unit.mjs
node --test tests/semantic-evaluation-runner.test-integration.mjs
npm run test:unit
npm run test:integration
npm run eval:semantic:preflight
npm run eval:semantic:verify
npm run website:check
npm --prefix website run test:e2e -- --grep "semantic evidence"
npm --prefix website run test:e2e
npm run release:identity:check
npm run release:check
git diff --check
```

The release check is expected to remain red until a later clean protocol-15 Sol semantic run passes and current qualification evidence is regenerated. That expected freshness failure must not be weakened or treated as a reason to alter historical evidence.

## Acceptance criteria

- Every approved security-equivalent exact local CLI invocation projects the same sanitized result fact.
- Chained, redirected, augmented, ambiguous, or unrecognized commands cannot acquire authority from valid-looking output.
- No raw command, raw output, private path, or credential enters public evidence.
- Protocol 15 invalidates the terminal protocol-14 checkpoint without introducing migration or fallback code.
- All four failed-run attempt directories remain byte-identical and independently verifiable.
- The website presents protocol-14 Sol attempts as historical, keeps their failures inspectable, and reports no current assurance until protocol-15 evidence exists.
- `moldea/`, all 49 semantic case definitions, coverage, prompts, and qualification profiles remain unchanged.
- All model-free checks pass, apart from the explicitly expected release-freshness gate.
- No additional paid call occurs during this implementation.

## Follow-up after implementation

After the correction is reviewed, committed, and pushed with a clean worktree, a new explicit authorization may start one clean protocol-15 Sol candidate with `--record --restart`. Standing confirmation authorization does not authorize that restart. The new run must preserve all protocol-14 history and use the existing stop, checkpoint, bounded-confirmation, and compatible-resume policy.

## Approval required

Approval authorizes the focused evaluator, protocol, website, documentation, test, and retained-evidence work described above. It does not authorize modifying the portable skill or semantic cases, deleting failed attempts, restarting the semantic evaluation, making any paid model call, committing, or pushing.
