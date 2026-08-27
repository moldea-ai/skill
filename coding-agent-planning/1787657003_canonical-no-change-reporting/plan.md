# Semantic command-result evidence correction

## Objective

Correct the semantic evaluator so an independent judge can verify the result of an actor's command without trusting the actor's final response and without publishing arbitrary command output. Prove the correction against the exact `pnpm-pnp-local-cli-provider` failure, then generate a fresh protocol-compatible 48-case semantic result from the already committed release-candidate skill.

This is an evaluator correction, not another portable-skill refinement. The current skill instructions already require the PnP proof that the confirmation actor performed. The missing evidence was created by the runner, which discarded the completed command's exit code and output before constructing the judge prompt.

## Current state and repository evidence

- Source is clean and synchronized at commit `a3a12838b60d81b306a994645787325a6cab5170` on `qualifications`.
- The committed portable artifact digest is `1b81aa56466ba3bad78a737435a45bc34efb9e2ae1452e72746c7fa9890207bb`, with skill release `3.1.0`, CLI `4.0.1`, JSON schema `2`, and 48 semantic cases.
- `moldea/references/local-tooling.md` already requires safe executable PnP proof, exact package identity, canonical bin provenance, direct invocation, exit-code interpretation, and JSON-envelope validation. `README.md` states the same observable behavior. No additional portable wording is needed.
- `fixtures/conformance-cases.json` correctly requires `resolve-pnpm-pnp-provider`, `verify-exact-root-cli`, and `avoid-global-or-transient-cli`. The case and its criteria must remain unchanged.
- The latest official candidate contains 29 initial trials: 26 initial passes, two initial failures recovered by two passing confirmations each, and the terminal `pnpm-pnp-local-cli-provider` failure. Nineteen cases were not reached.
- Six immutable attempt directories and `fixtures/semantic-evaluation-results/latest.json` are currently untracked. The latest attempt is failed, and the ignored local checkpoint is terminal under semantic protocol `12`. `npm run eval:semantic:verify` accepts all six attempts.
- The initial PnP actor only described the proof and did not execute it, so that initial failure was valid.
- Confirmation 1 then read the relevant skill guidance, inspected the PnP repository, resolved `@moldea.ai/cli` from the root manifest, verified the installed manifest and canonical bin, directly ran `pnpm node /mnt/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js inspect --json`, interpreted exit `1` as structural invalidity, accurately reported CLI `4.0.1` and schema `2`, and left the repository unchanged.
- The confirmation judge still failed `verify-exact-root-cli` because `tests/semantic-evaluation-runner.mjs` projects only command, status, and selected tool fields. It omits the installed Codex event's `exit_code` and `aggregated_output`, so the judge could see that the command ran but could not verify the reported version or envelope.
- The [official Codex non-interactive-mode documentation](https://learn.chatgpt.com/docs/non-interactive-mode) confirms that `codex exec --json` emits JSONL `item.*` events and includes command executions as first-class items. The installed `codex-cli 0.149.1` binary and the observed run establish the completed-command fields used here: `exit_code` and `aggregated_output`.
- `tooling/codex-evaluation-host/host.mjs` copies Codex authentication into the isolated home. An actor shell can therefore produce sensitive output. Forwarding arbitrary `aggregated_output`, even with best-effort regular-expression redaction, is not an acceptable public-evidence boundary.
- The semantic website consumes additive attempt summaries and links to raw evidence. It does not parse `actorExecutionEvidence`, so no website schema or component change is needed for the additive raw evidence fields.
- `tooling/semantic-evaluation/attempt-history.mjs` preserves raw attempts byte-for-byte and supports historical checkpoint schemas. Existing protocol-12 attempt history can remain verifiable even though it cannot satisfy a protocol-13 release gate.

## Desired final behavior

- Every completed command-execution event records its safe integer exit code.
- The runner consumes command output transiently and never copies raw `aggregated_output` into the judge prompt, checkpoint, attempt, canonical result, logs, or website model.
- The runner projects only narrowly defined, evaluator-owned facts from an exact recognized invocation and matching complete output:
  - workspace-contained absolute paths normalized to workspace-relative public paths
  - the allowlisted Moldea JSON envelope fields `schemaVersion`, `cliVersion`, `command`, and `status`
  - booleans stating whether `result` and `error` are present
- Output is projected only when the command matches a recognized repository-local invocation and the complete bounded output matches its corresponding shape. Empty, unrecognized, mismatched, or oversized output is represented by an explicit disposition and byte count, with no content or digest.
- A result-dependent criterion can pass only when a completed runner event supplies the relevant exit code and projected facts. A command string, completion status, omitted output, or actor claim alone cannot establish the result.
- Started command events, command text, command identifiers, and MCP tool events are discarded before persistence.
- Historical attempts remain immutable and verifiable. Protocol-12 checkpoints cannot resume under the new evidence semantics.
- Routine future Codex CLI version changes remain resumable when the event contract still satisfies protocol 13. The protocol changes because evaluator semantics changed, not merely because the installed CLI version changed.

## In-scope implementation

### Focused execution-evidence module

Add `tooling/semantic-evaluation/actor-execution-evidence.mjs` as the single owner of completed-command projection and validation.

The module will:

- define the supported event and item types, item-count limit, item-byte limit, command-output projection limit, recognized output dispositions, and safe fact shapes
- accept the release CLI version and JSON schema version as explicit projection inputs instead of reading package state implicitly
- copy only the existing allowlisted command or tool metadata
- require `exit_code` to be a safe integer for a completed command event and expose it as `exitCode`
- inspect `aggregated_output` only as an in-memory string
- calculate its UTF-8 byte count without persisting a content digest
- reject NUL-containing output from projection
- recognize a bounded list of absolute `/mnt` paths only when every non-empty output line is an absolute normalized path inside `/mnt`; expose those paths without the `/mnt` host mount prefix
- recognize a complete JSON Moldea envelope only when the release schema, release CLI version, supported command, supported status, and result/error consistency are valid; expose only the safe scalar fields and result/error presence booleans
- use `empty`, `projected`, `unrecognized`, and `too-large` dispositions so omitted content cannot be mistaken for proof
- enforce a strict persisted shape and reject raw `aggregated_output`, command text, command identifiers, MCP events, unknown evidence fields, malformed facts, and invalid dispositions
- preserve the current maximum of 128 completed-command events and the current 32 KiB per-evidence-item bound; use a 32 KiB transient output projection bound and recognize only the two evaluator-owned pnpm Plug'n'Play CLI paths

Add `tooling/semantic-evaluation/actor-execution-evidence.test-unit.mjs` beside the new module and expose only the projector, validator, and required types through `tooling/semantic-evaluation/index.mjs` and `index.d.mts`.

This module remains specific to semantic evaluator evidence. Do not move or rewrite qualification sanitization: qualification publishes broader artifact types through a separate TypeScript package and already owns a final sanitization boundary. Combining both systems is not required to correct this defect.

### Runner integration and judge contract

Update `tests/semantic-evaluation-runner.mjs` to delegate actor execution event selection and validation to the new module.

- Pass the exact published CLI version and release JSON schema version into the projector.
- Keep final agent-message extraction unchanged.
- Keep actor prompts, case materialization, workspace snapshots, repository controls, skill-artifact evidence, model, reasoning effort, timeout, sandbox, egress, confirmation policy, and recording behavior unchanged.
- Update the judge prompt to state that result-dependent criteria require relevant projected command-result facts, that omitted output proves no result, and that raw command output is intentionally unavailable.
- Preserve the rule that actor prose alone cannot establish execution or its result.
- Make protocol mismatch errors direct the operator to `--restart`; do not suggest checkpoint migration for a semantic protocol change.

Update `tests/semantic-evaluation-runner.test-unit.mjs` for the new event shape, protocol identity, judge wording, compatibility failure, and parser behavior. Update the existing PnP integration in `tests/semantic-evaluation-runner.test-integration.mjs` so the real isolated fixture produces the same path and `inspect --json` outputs seen in the failed confirmation, passes them through the runner parser, and proves that the judge-visible evidence contains the exact safe path, CLI-envelope, and exit-code facts without raw output.

### Protocol and documentation synchronization

Change `SEMANTIC_EVALUATION_PROTOCOL_VERSION` from `12` to `13` in `tooling/release-identity/constants.mjs`. Keep checkpoint/result schema version `4`: the stored structure remains additively compatible, while protocol 13 is the explicit behavioral boundary for how command results are derived and judged.

Update:

- `README.md`
- `docs/semantic-evaluation.md`
- `fixtures/semantic-evaluation-results/README.md`

The documentation will explain the safe projection boundary, output dispositions, result-dependent judging rule, protocol 13 identity, historical-attempt compatibility, and required fresh restart. It will continue to direct maintainers to raw evidence for inspectable actor, judge, workspace, and projected command facts without claiming that arbitrary stdout is published.

No dependency or lockfile change is required.

## Explicit exclusions

- Do not modify `moldea/`, its version, release metadata, activation paths, authority rules, local-tooling instructions, or reporting rules.
- Do not modify `fixtures/conformance-cases.json`, the 48-case catalog, coverage criteria, scenario prompts, expected labels, forbidden labels, or fixture difficulty.
- Do not make the judge trust actor prose, command text, status alone, or a hash of omitted output.
- Do not persist raw stdout, stderr, `aggregated_output`, authentication state, environment values, private host paths, full CLI diagnostics, package manifests, or arbitrary JSON values as command-result evidence.
- Do not introduce best-effort redaction as permission to retain arbitrary actor output.
- Do not change checkpoint/result schema 4, add a protocol-12 migration, or resume the terminal protocol-12 checkpoint.
- Do not delete, rewrite, or replace the six current attempt directories or their latest pointer. They are legitimate transparent evidence of the failed evaluation.
- Do not add a website UI, website schema field, empty-state workaround, or compatibility fallback for stale latest evidence.
- Do not run confirmation 2 for the terminal candidate.
- Do not run Custom or adapter qualification, publish a release, tag, commit, or push without its separate authorization.
- Do not modify protected coding-instruction files.

## Ordered implementation steps

1. **Implement the safe projector and strict validator.**
   - Add the focused semantic-evidence module and declarations.
   - Model completed command events without actor-controlled command or MCP metadata.
   - Implement exact path and Moldea-envelope projections, explicit omission dispositions, byte bounds, and strict field allowlists.
   - Export the module through the established semantic-evaluation entry point.

2. **Integrate the evidence boundary into the runner.**
   - Remove the runner-local loose selector and validator.
   - Project `exit_code` and safe output facts during JSONL parsing.
   - Require the strict persisted shape during checkpoint validation.
   - Clarify the judge's evidence rules without changing its labels or answer schema.
   - Add a precise incompatible-protocol restart error.

3. **Add adversarial and regression coverage.**
   - Verify successful and exit-1 completed commands.
   - Verify exact PnP path projection and valid/invalid Moldea envelopes.
   - Verify empty and unrecognized output, oversized output, malformed JSON, unrecognized paths, path traversal, NULs, malformed exit codes, and unsupported event shapes.
   - Verify credential-looking output, copied auth-file content, JSON with extra sensitive fields, and arbitrary file content never appear in projected or serialized evidence.
   - Verify started events, command text, command identifiers, and MCP events are discarded.
   - Verify the validator rejects injected `aggregated_output`, result fields on the wrong event, extra keys, malformed facts, and oversized serialized evidence.
   - Preserve count and command-size limit tests and final-response separation.
   - Extend the real PnP fixture integration so this exact regression would fail if exit code or envelope facts disappeared again.

4. **Bump the semantic protocol and synchronize durable documentation.**
   - Set protocol 13 and update hard-coded protocol expectations.
   - Keep historical attempt-history fixtures on older protocols where they intentionally prove historical compatibility.
   - Document safe result projections and the fresh-run requirement in the three directly affected state-bearing documents.
   - Confirm no portable artifact or semantic case digest changed.

5. **Verify the source correction before any model call.**
   - Run the new focused module test and runner unit test.
   - Run the semantic runner integration suite, including the real PnP fixture.
   - Run the complete root unit and integration suites.
   - Run model-free semantic preflight and immutable attempt verification.
   - Run release identity and formatting checks.
   - Inspect the full diff and the six untouched attempt directories for secrets, private paths, and accidental mutation.
   - `docs:check` and `website:check` are expected to reject the protocol-12 latest pointer after the protocol bump. Do not weaken those checks. Run them after the first protocol-13 recorded attempt exists.

6. **Review and commit the correction before paid verification.**
   - Stop for `review`.
   - Require a separate `repo push` command to commit the cohesive evaluator correction, documentation, and six transparent current attempts.
   - Require a clean committed source boundary before running Codex.

7. **Run one exact non-recording PnP diagnostic after fresh authorization.**
   - Report the two-call estimate and expected duration, then obtain explicit authorization.
   - Run only `pnpm-pnp-local-cli-provider` with `--case` and without `--record`.
   - Inspect the actor response, commands, workspace, projected path and envelope facts, exit code, and judge rationale.
   - Require the actor to execute the safe PnP proof and require the judge to observe all three unchanged criteria from independent evidence.
   - If it fails, stop. Do not retry, alter the portable skill, or start the full suite automatically.

8. **Run a fresh official semantic candidate after separate authorization.**
   - After the diagnostic passes, report the estimate of up to 96 Terra calls and the expected duration, then obtain explicit authorization.
   - Confirm clean committed source, protocol 13, the exact portable and case-suite digests, CLI `4.0.1`, model `gpt-5.6-terra`, medium reasoning, and five-minute timeout.
   - Use `--record --restart`. Restart may remove only the ignored terminal protocol-12 checkpoint; it must preserve all six published attempts.
   - Start all 48 cases from the beginning because protocol-12 trials lack the result evidence required by protocol 13.
   - Preserve atomic checkpoints and stop at the first failed initial trial. Do not confirm, retry, or resume without the existing separate authorization.

9. **Verify and present the new terminal evidence.**
   - Run `npm run eval:semantic:verify` immediately after any recorded terminal attempt.
   - Inspect raw projected command facts, actor and judge hosts, workspace evidence, pointers, digests, token usage, secrets, and private paths.
   - Run `npm run docs:check` and `npm run website:check` against the new protocol-13 latest attempt.
   - On a failure or incomplete attempt, preserve it and stop with the exact case evidence.
   - On a 48/48 pass, run the full release-candidate verification boundary and stop for `review` and a separate `repo push` before qualifications.

## Verification commands

Source correction:

```bash
node --test tooling/semantic-evaluation/actor-execution-evidence.test-unit.mjs tests/semantic-evaluation-runner.test-unit.mjs
node --test tests/semantic-evaluation-runner.test-integration.mjs
npm run test:unit
npm run test:integration
npm test
npm run eval:semantic:preflight
npm run eval:semantic:verify
npm run release:identity:check
git diff --check
```

After a protocol-13 terminal attempt:

```bash
npm run eval:semantic:verify
npm run docs:check
npm run website:check
```

After a promoted 48/48 result:

```bash
python3 /home/jesusgraterol/.codex/skills/.system/skill-creator/scripts/quick_validate.py moldea
npm test
npm run eval:semantic:verify
npm run qualification:verify
npm run docs:check
npm run website:check
npm run release:identity:check
npm run release:check
git diff --check
```

The non-recording diagnostic and full semantic evaluation commands remain outside implementation authorization because each makes paid model calls and requires its own immediate approval.

## Persistence, compatibility, and rollback

- The six current attempts are append-only historical evidence. Protocol 13 does not edit them or make them invalid as history; it only prevents them from satisfying current release freshness.
- The ignored protocol-12 checkpoint is not migrated because its command-result evidence was discarded and cannot be reconstructed honestly. A source backup would not restore the missing output.
- Checkpoint/result schema 4 stays stable, avoiding unnecessary migration code. `evaluationProtocolVersion` is the authoritative compatibility boundary.
- A protocol-13 checkpoint remains resumable across ordinary Codex CLI version updates when artifact, suite, coverage, release CLI, model, reasoning, and protocol remain compatible and the installed CLI still emits the required event shape.
- If a future Codex version omits or changes the required fields, parsing fails before evidence is accepted. The operator must inspect and deliberately revise the evaluator protocol rather than silently degrading proof.
- Rollback of the source correction is an ordinary Git revert before new protocol-13 evidence exists. Once a protocol-13 attempt is committed, history remains append-only and rollback must not rewrite that evidence.

## Security and integrity controls

- Raw command output is untrusted and may contain copied Codex credentials, repository secrets, developer data, or host-specific paths.
- Strict full-output recognition prevents a safe prefix followed by secret content from being projected as valid evidence.
- Workspace paths are accepted only under `/mnt`, normalized, bounded in number, and stripped of the sandbox mount prefix.
- Moldea envelope projection accepts only release-bound scalar fields and result/error presence. Diagnostic bodies, messages, paths, metadata, and unknown fields are never forwarded.
- Unrecognized and oversized outputs retain only byte count and disposition. No content hash is stored because low-entropy secret material could be guessed offline.
- The strict validator prevents hand-edited checkpoints from introducing raw output through unrecognized fields.
- Existing Bubblewrap, empty environment, protected Git and skill mounts, restricted HTTPS relay, separate actor and judge workspaces, and five-minute timeout remain unchanged.
- Paid diagnostic, full run, confirmation, resume, qualification, publication, and release remain separate authorization boundaries.

## Risks and controls

- **Another false negative:** the real PnP fixture integration must exercise exit `1` plus the exact schema-2 CLI envelope before any paid diagnostic.
- **Credential leakage:** raw output is never persisted or hashed; only strict safe facts survive.
- **Overfitting the skill:** portable instructions, prompt, case, criteria, and coverage remain unchanged.
- **Weak proof:** a command string or actor claim cannot substitute for a matching completed event, exit code, and relevant projection.
- **Silent evidence loss after a Codex update:** missing or malformed completed-command fields fail validation rather than producing weaker evidence.
- **Unnecessary migration complexity:** protocol 13 intentionally requires restart; schema 4 and historical verification stay intact.
- **Repeated expensive runs:** only one two-call targeted diagnostic is allowed before the fresh full run, with a hard stop on failure.
- **Misleading website state:** website checks continue rejecting stale latest evidence until a real protocol-13 attempt exists.

## Acceptance criteria

- The exact PnP confirmation output can produce judge-visible safe facts for the resolved workspace path, exit code `1`, CLI `4.0.1`, schema `2`, command `inspect`, status `invalid`, present result, and absent error.
- No raw command output, credential, private key, auth-file content, arbitrary JSON field, full diagnostic, `/home` path, or `/mnt` mount prefix can appear in serialized actor execution evidence.
- Completed-command evidence has one strict bounded shape and excludes started commands and MCP events.
- The judge contract requires result evidence for result-dependent criteria and continues to reject actor prose alone.
- Semantic protocol is `13`; checkpoint/result schema remains `4`; protocol-12 checkpoints receive a clear restart requirement.
- All six current attempts remain byte-identical and `npm run eval:semantic:verify` continues to accept them as history.
- `moldea/`, the 48 cases, prompts, criteria, coverage, CLI identity, model, reasoning, timeout, sandbox, network policy, and confirmation policy remain unchanged.
- All model-free source checks pass before paid execution.
- A separately authorized two-call PnP diagnostic passes for all three existing criteria.
- A separately authorized fresh official run produces valid protocol-13 evidence and ultimately a 48/48 canonical result before qualifications resume.
- No qualification, release, tag, publication, commit, or push occurs without its separate command or authorization.

## Approval required

Approval authorizes only the source implementation described above: add strict safe command-result projection and validation, integrate it with the semantic runner and judge, add the exact regression coverage, bump semantic protocol 12 to 13 while retaining schema 4 and historical attempts, and synchronize the three affected documentation files. Approval does not authorize a commit, push, paid PnP diagnostic, full semantic evaluation, confirmation, resume, qualification, publication, tag, or release. Each paid operation retains its stated fresh authorization boundary.
