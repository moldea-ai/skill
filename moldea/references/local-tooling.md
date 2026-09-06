# Local moldea tooling

Read this reference only after direct relevance or a successful relationship gate when the selected operation needs deterministic CLI evidence. Explicit initialization may read it after `continuous-maintenance.md` selects the required tooling step.

## Supported contract

Skill 5.0.0 supports Git `>=2.30.0`, Node.js `>=22.11.0`, stable `@moldea.ai/core` releases satisfying `^3.0.0`, stable `@moldea.ai/cli` releases satisfying `^7.0.0`, repository format 1, and CLI JSON schema 4. Never substitute a global, transient, out-of-range, or prerelease CLI.

Use only `<installed-skill-root>/scripts/moldea-cli.mjs`. The launcher resolves the repository-root-local package and executable, verifies the package name, exact installed stable version, supported repository declaration, declared `moldea` binary, Core dependency range, and resolved-path containment from inert package metadata, then invokes the executable without a shell. Require the exact envelope version to match that installed version. Do not reproduce these probes, inspect links manually, search parent workspaces, inspect unrelated repositories, use package-manager launchers, or search `PATH` for another copy.

When explicit initialization or another authorized write-capable moldea operation requires a missing CLI, use the repository's established package manager and root development-dependency location. Install `@moldea.ai/cli@^7.0.0` with lifecycle scripts disabled and update the ordinary lockfile. The manifest may retain a compatible caret range or the exact stable version selected by the lockfile. Do not load or execute repository-supplied package-manager extensions. Read-only work never authorizes installation or dependency changes; after direct relevance, report that deterministic evidence is unavailable.

These rules govern only moldea CLI establishment. They never govern host-owned package-manager, planning, review, Git, commit, or publication commands.

## Machine commands

Invoke the launcher with an argument array, never through a shell or package-manager command. The launcher permits only the closed commands and options below, requires an absolute repository root, requires JSON, supplies the CLI repository argument itself, and preserves the child's exit status:

```text
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- scope --paths-stdin --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- validate --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- inspect --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- content --path <canonical-path> --json --max-output-bytes 65536
node <installed-skill-root>/scripts/moldea-cli.mjs --repository <absolute-repository-root> -- composition --json
```

`scope` is the single pre-reference relationship query, `validate` returns structural diagnostics, `inspect` returns content-free inventory, `content` reads one explicit canonical asset, and `composition` is used only when installed package composition matters. The launcher's fixed 65,536-byte composition boundary replaces a caller-supplied page budget.

Repository-logical paths begin with `/`. The stdin scope form accepts one complete NUL-delimited UTF-8 path set. Never call `scope` separately per path.

## Envelope verification

Interpret JSON only after the child process completes. Require:

- integer `schemaVersion: 4`
- string `cliVersion` equal to the exact installed stable CLI version satisfying `^7.0.0`
- the exact invoked `command`
- `status` equal to `valid`, `invalid`, or `error`
- `error: null` and a non-null result only for `valid` or `invalid`
- a non-null machine error and `result: null` only for `error`
- exit code 0 for `valid`, 1 for `invalid`, and 2 or 3 for `error`

Signals, launcher failures, output-boundary termination, malformed output, contradictory status, version mismatch, unsupported schema, and incomplete output establish no conclusion. The launcher sends the requested termination signal first and force-terminates a child that remains active after five seconds. An `invalid` result is diagnostic evidence, not validity.

Every paged result carries a snapshot identity. Continue only with the opaque cursor returned by the preceding page. Repeat the same standalone launcher operation, append `--cursor "<opaque-cursor>"`, and retain `--json --max-output-bytes 65536`. Keep every page as one raw launcher envelope instead of using a pipeline, command substitution, scripted loop, parser, output filter, or aggregate wrapper. Never restart and merge pages from different snapshots, and never claim completeness before the final raw envelope returns a null cursor.

## Resource limits

Use a 65,536-byte output page for ordinary work and stop after obtaining the relevant record, diagnostic, or passage. Keep ordinary aggregate moldea output within 262,144 bytes. Explicitly required large traversal remains purpose-bounded and paginated, with each invocation below 1 MiB. The launcher rejects missing, malformed, smaller-than-4-KiB, or larger-than-1-MiB page budgets and terminates a child that exceeds the declared stdout boundary. It also bounds stderr independently.

`OUTPUT_BUDGET_TOO_SMALL` means the next complete record cannot fit and increasing the page within the 1 MiB ceiling may be appropriate when the record is necessary. `RESOURCE_LIMIT_EXCEEDED` means repository reading exceeded a configured compute or storage guard; do not treat it as an output-page problem or retry unboundedly. Report the observed operation, safe error code, and missing conclusion after direct activation.

Evaluation and qualification record command count and emitted bytes from the completed process evidence. Host failure-containment ceilings do not define normal skill consumption and must never be presented as repository-capacity limits.

The operating targets come from the source-controlled resource profiles and reproducible calibration corpus. Every qualification scenario declares `ordinary` or `largeTraversal`. Both profiles allow 64 completed host commands, 16 moldea calls, 1,250,000 input-plus-output model tokens, and at most 131,072 model-visible bytes from one completed host command. This host-command ceiling is separate from the unchanged 65,536-byte limit on each raw moldea CLI response page. The ordinary profile also allows 262,144 moldea-output bytes and 1,048,576 aggregate model-visible tool-output bytes. The large-traversal profile also allows 1,048,576 moldea-output bytes and 4,194,304 aggregate model-visible tool-output bytes. Absolute host ceilings remain higher failure containment. Each operating limit is enforced independently before judging, and failures identify the profile, dimension, observed value, and limit.
