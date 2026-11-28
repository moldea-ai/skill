# Validating structure

Use for an explicit structural Validate or when the selected operation needs CLI evidence. Validate is deterministic and read-only. A completed result reports structure, diagnostics, and binding checks. Assess semantic alignment or actual model behavior separately.

## Supported contract

Skill 11.0.3 supports Git `>=2.32.0`, Node.js `>=22.17.0`, repository format 1, and CLI JSON schema 9. The skill ships its CLI and requires no package manifest or dependency install in the adopted repository.

## Run the requested check

Use the adopted Git worktree and exact host-selected installation. Report unavailable Git, Node, or host execution as an incomplete check. On an adoption miss or when the foundation is inaccessible, use the bounded [Check diagnosis](checking-and-fixing.md#diagnose-blocked-adoption) without writes or CLI calls. A completed valid or invalid result already proves invocation. For the whole-project Fix identity check, see [Check owners progressively](checking-and-fixing.md#check-owners-progressively).

For an explicit setup check, follow [Check setup integration](checking-and-fixing.md#check-setup-integration).

For a data or policy change, complete affected native checks before final validation. When diagnostics establish a bounded correction within the authorized scope, correct the entire affected contract and rerun affected checks. Validate again only after a corrective write. Stop when failures repeat without progress or corrections oscillate. Report source or authority gaps, required handoffs, and material errors and warnings. Do not accept warnings on the developer's behalf. Binding coverage checks files in any project language. Export checks cover supported JavaScript and TypeScript ESM sources. Report other named symbols as `not-checked`; neither static check proves instruction consumption.

## Machine commands

Run the bundled entry with Node. Use `composition` to answer direct questions about the installed CLI or its package versions.

```text
node <installed-skill-root>/scripts/moldea-cli/moldea.mjs scope --repository <absolute-repository-root> --paths-stdin --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli/moldea.mjs validate --repository <absolute-repository-root> --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli/moldea.mjs inspect --repository <absolute-repository-root> --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli/moldea.mjs content --repository <absolute-repository-root> --path <canonical-path> --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli/moldea.mjs composition --json
```

Send normalized repository-logical paths starting with `/` to `scope` in one batch. Encode each path as UTF-8 followed by one NUL, with no leading delimiter, within the 2 MiB raw input limit. Read one explicit canonical asset with `content`.

## Interpret and continue output

Use complete JSON with the expected command and schema. Exit 0 goes with `valid`, exit 1 with `invalid`, and exit 2 or 3 with `error`. A failed process or incomplete output leaves the operation unverified. After a canonical write, run final validation and report the actual result and unresolved diagnostics. Preserve unverified changes when tooling cannot run.

Use Validate diagnostics and full binding coverage counts for structural checks. Its pages include coverage records for failed or unchecked checks, with the reason when an export could not be checked. Missing or wrong-type binding files appear in diagnostics. Inspect pages provide the content-free inventory and structural diagnostics. Use the full result counts even when only one page was returned. Warnings stay visible and do not invalidate an otherwise valid project.

Continue a page with its returned opaque `--cursor` and the same command, repository, and selection. Discard cursors when the underlying snapshot changes. Stop when the necessary evidence is complete or a resource limit is reached.

## Resource limits

A budget covers one work cycle, from the relevance check through final validation. The next developer request, including `continue`, or the next step of a multi-step request planned before execution starts a new cycle. Never autonomously start a new cycle to continue work that reached a limit. A developer request may resume that work in a new cycle; it does not extend the stopped cycle's budget. Never extend a budget within a cycle or ask the developer for an extension. In ordinary work, a reached limit never blocks the developer's task: complete the task, still run final validation for any canonical writes already made, skip further assessment reads, and report in one line which canonical checks remain for the next request. Use reserved capacity for validation; if the ordinary aggregate moldea-output allowance is already exhausted, still run one bounded final validation for those writes, without further assessment, a budget reset or another correction loop. In an explicit moldea operation such as repair or initialization, stop at the limit and report the completed work and continuation point. Offering the next round among a report's options is not an extension request; the developer's reply starts a new cycle.

Use a 65,536-byte output page for ordinary work and stop after obtaining the relevant record, diagnostic, or passage. Keep ordinary aggregate moldea output within 524,288 bytes per cycle. Explicit project repair is a `largeTraversal` operation that continues by complete owner when it reaches a per-cycle limit. It remains purpose-bounded and paginated, with each invocation below 1 MiB and within its profile's per-command output limit. The bundled CLI accepts page limits from 4 KiB through 1 MiB.

`OUTPUT_BUDGET_TOO_SMALL` means the next complete record cannot fit. For Validate, Inspect, or Content, a necessary record can justify a larger page within the 1 MiB ceiling and the active profile's per-command output limit. Apply the [unverified batch rule](using-context.md#scope-ordinary-work) for Scope. `RESOURCE_LIMIT_EXCEEDED` means a compute or storage guard was reached. Verified heap exhaustion is non-retryable for unchanged input; it does not prove the application code is wrong. `INSPECTION_TIMEOUT` is an elapsed-time failure, `INSPECTION_BUSY` is capacity contention, and `INSPECTION_PROCESS_FAILED` is an operational inspection failure. Retryable metadata never authorizes an unchanged retry loop. Preserve completed corrections and report the missing inspection conclusion. Do not tune internal limits, split or delete healthy source, or silently skip files. Output pagination bounds transfer, not arbitrary source parsing. Report the observed operation, safe error code, and missing conclusion after direct activation.

In every operation, moldea's limits count only moldea's own work: moldea CLI calls and output, bundled helpers (including the repair Git helper), and canonical file reads and writes. In explicit repair and initialization, source reads made for that assessment count toward completed host commands and model-visible output, not the aggregate moldea-output allowance. Commands the project itself needs, including tests, builds, Git and project checks, never count, whether the work is ordinary maintenance, initialization or repair.

For explicit repair and initialization, the `largeTraversal` profile allows per cycle 64 completed host commands, 16 moldea CLI calls, at most 262,144 model-visible bytes from one completed host command, 1,048,576 aggregate moldea-output bytes, and 4,194,304 aggregate model-visible tool-output bytes. These limits use the counting rule above and remain separate from the unchanged 65,536-byte CLI response-page guidance. Initialization and repair retain their existing stop-and-continue behavior.
