# Local moldea tooling

Read this reference only after direct relevance or a successful relationship gate when the selected operation needs deterministic CLI evidence. Explicit initialization may read it after `continuous-maintenance.md` selects the required tooling step.

## Supported contract

Skill 5.0.0 supports Git `>=2.30.0`, Node.js `>=22.11.0`, stable `@moldea.ai/core` releases satisfying `^3.0.0`, stable `@moldea.ai/cli` releases satisfying `^7.0.0`, repository format 1, and CLI JSON schema 4. Never substitute a global, transient, out-of-range, or prerelease CLI.

Resolve only the repository-root-local package and executable. Verify the package name, exact installed stable version, supported repository declaration, declared `moldea` binary, and resolved binary containment from inert package metadata before execution. Require the exact envelope version to match that installed version. Do not search parent workspaces, unrelated repositories, user installation paths, or `PATH` for another copy.

When explicit initialization or another authorized write-capable moldea operation requires a missing CLI, use the repository's established package manager and root development-dependency location. Install `@moldea.ai/cli@^7.0.0` with lifecycle scripts disabled and update the ordinary lockfile. The manifest may retain a compatible caret range or the exact stable version selected by the lockfile. Do not load or execute repository-supplied package-manager extensions. Read-only work never authorizes installation or dependency changes; after direct relevance, report that deterministic evidence is unavailable.

These rules govern only moldea CLI establishment. They never govern host-owned package-manager, planning, review, Git, commit, or publication commands.

## Machine commands

Invoke the resolved executable directly with an argument array, not through a shell, package-manager launcher, or wrapper that rewrites output. Use only the command required by the active operation:

- `scope --paths-stdin --json --max-output-bytes 65536` for the single pre-reference relationship gate
- `validate --json --max-output-bytes 65536` for structural diagnostics
- `inspect --json --max-output-bytes 65536` for content-free project inventory
- `content --path <canonical-path> --json --max-output-bytes 65536` for one explicit canonical asset
- `composition --json --max-output-bytes 65536` only when installed package composition matters

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

Signals, launcher failures, malformed output, contradictory status, version mismatch, unsupported schema, and incomplete output establish no conclusion. An `invalid` result is diagnostic evidence, not validity.

Every paged result carries a snapshot identity. Continue only with the opaque cursor returned by the preceding page. Never restart and merge pages from different snapshots.

## Resource limits

Use a 65,536-byte output page for ordinary work and stop after obtaining the relevant record, diagnostic, or passage. Keep ordinary aggregate moldea output within 262,144 bytes. Explicitly required large traversal remains purpose-bounded and paginated, with each invocation below 1 MiB.

`OUTPUT_BUDGET_TOO_SMALL` means the next complete record cannot fit and increasing the page within the 1 MiB ceiling may be appropriate when the record is necessary. `RESOURCE_LIMIT_EXCEEDED` means repository reading exceeded a configured compute or storage guard; do not treat it as an output-page problem or retry unboundedly. Report the observed operation, safe error code, and missing conclusion after direct activation.

Evaluation and qualification record command count and emitted bytes from the completed process evidence. Host failure-containment ceilings do not define normal skill consumption and must never be presented as repository-capacity limits.

The operating targets come from the source-controlled resource profiles and reproducible calibration corpus. The ordinary cases retain at least 25 percent cumulative headroom over their largest recorded command-count and output observations; the large-traversal profile raises cumulative capacity without increasing the 65,536-byte page peak.
