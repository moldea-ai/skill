# Local moldea tooling

Read this reference only after relevance when local CLI proof, machine-contract interpretation, or validation recovery is required. It owns observation, invocation, and diagnostic recovery, not installation. Read-only work never authorizes dependency, lockfile, or configuration changes; report unavailable deterministic evidence. Only a separately authorized write-capable operation may use `tooling-installation.md` to establish missing tooling.

For a direct request to prove or safely invoke the local CLI, apply this reference before inspecting a declared dependency, package-manager provider, binary link, or other provider evidence and before reaching any conclusion. The required first proof attempt is the closed launcher `composition --json` call below.

## Supported contract

Skill 5.0.12 supports Git `>=2.30.0`, Node.js `>=22.11.0`, stable `@moldea.ai/core` releases satisfying `^4.0.1`, stable `@moldea.ai/cli` releases satisfying `^8.0.0`, repository format 1, and CLI JSON schema 4. Never substitute a global, transient, out-of-range, or prerelease CLI.

Use only `<installed-skill-root>/scripts/moldea-cli.mjs`. The launcher resolves the repository-root-local package and executable, verifies the package name, exact installed stable version, supported repository declaration, declared `moldea` binary, installed Core against both the CLI's declared range and moldea's supported range, and resolved-path containment from inert package metadata, then invokes the executable without a shell. Package management and repository setup or CI own lockfile consistency; the launcher does not read target-project lockfiles. Require the exact envelope version to match that installed version. Do not reproduce these probes, inspect links manually, search parent workspaces, inspect unrelated repositories, use package-manager launchers, or search `PATH` for another copy.

Reuse the exact skill root already selected by the host. Package metadata and containment establish a supported local layout, not executable authenticity. The launcher is not an OS sandbox and may execute repository-installed code under the host's existing repository-trust and execution controls. Do not weaken those controls or add a new per-command approval ceremony. The pre-activation gate is separate: it executes only shipped skill code, never repository dependencies.

A declaration, lockfile entry, package name, reported version, Plug'n'Play package location, or package-manager binary shim is not launcher-verifiable installation provenance. The closed launcher supports only the repository-contained package and executable closure it can resolve and validate directly. A Plug'n'Play-only layout without that closure is unavailable; do not guess another provider. A package-manager shim that selects a different provider does not override a launcher-verified package-owned executable, and the package manager must not be invoked to resolve the disagreement.

For every direct request to prove or safely invoke local CLI availability, invoke the installed skill launcher once with `composition --json` after adoption is established. This attempted launcher proof is required even when repository metadata already suggests that the closure is unavailable or a package-manager provider conflicts. Do not stop at package declarations or manually execute a package-manager shim. If the launcher cannot resolve a Plug'n'Play-only package location into its required repository-contained `node_modules` closure, report that the declared compatible dependency exists but the launcher-verifiable package and executable provenance is unavailable in that layout. If the launcher verifies its package-owned executable while supplied Yarn evidence identifies another `node_modules/.bin/moldea` provider, report both facts separately: the conflicting symlink is not authority for the supported launcher path, and neither Yarn nor that provider was invoked. The launcher owns executable provenance; when the direct task explicitly asks to compare an already identified conflicting provider, one inert exact-path symlink-target read may establish that separate Yarn-provider fact without invoking it.

These rules govern only moldea invocation. They never govern host-owned package-manager, planning, review, Git, commit, or publication commands.

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

Repository-logical paths begin with `/`. For stdin scope, encode each path's UTF-8 bytes followed by one NUL, never put a delimiter before the first path, and pass the complete stream once. Never call `scope` separately per path.

## Envelope verification

Interpret JSON only after the child process completes. Require:

- integer `schemaVersion: 4`
- string `cliVersion` equal to the exact installed stable CLI version satisfying `^8.0.0`
- the exact invoked `command`
- `status` equal to `valid`, `invalid`, or `error`
- `error: null` and a non-null result only for `valid` or `invalid`
- a non-null machine error and `result: null` only for `error`
- exit code 0 for `valid`, 1 for `invalid`, and 2 or 3 for `error`

Signals, launcher failures, output-boundary termination, malformed output, contradictory status, version mismatch, unsupported schema, and incomplete output establish no conclusion. The launcher sends the requested termination signal first and force-terminates a child that remains active after five seconds. An `invalid` result is diagnostic evidence, not validity.

Every paged result carries a snapshot identity. Continue only with the opaque cursor returned by the preceding page. Repeat the same standalone launcher operation, append `--cursor "<opaque-cursor>"`, and retain `--json --max-output-bytes 65536`. Keep every page as one raw launcher envelope instead of using a pipeline, command substitution, scripted loop, parser, output filter, or aggregate wrapper. Never restart and merge pages from different snapshots, and never claim completeness before the final raw envelope returns a null cursor.

## Validation recovery

For authorized canonical writes requiring validation, complete the writes and applicable project-native checks before final launcher-backed validation. Success ends verification without unnecessary inspection. Structural validity does not prove semantic alignment or runtime readiness. Read-only and independent Agent Skill operations retain their own verification boundaries.

On failure, establish the complete affected contract from diagnostics and the smallest relevant evidence before editing. Inspect equivalent occurrences in the authorized change set, apply the supported complete correction, rerun native checks affected by it, and validate the resulting state. Continue while changed state and new evidence support progress; a newly exposed diagnostic can represent progress even when the diagnostic count is unchanged.

Never retry unchanged input without new resolving evidence. Stop when no supported correction remains, failures repeat without progress, corrections oscillate, authority is unresolved, tooling is unavailable, the next change exceeds scope, or a real resource limit prevents completion. Reserve output capacity for final validation. After writes invalidate a snapshot, discard its cursors and obtain only necessary fresh evidence within the same budget.

Report the actual changes, final status, material diagnostics, completed checks, and remaining work. Every repair requires validation after its writes; earlier validation cannot support completion. Preserve unverified changes when recovery cannot finish and identify them as unverified.

## Resource limits

Use a 65,536-byte output page for ordinary work and stop after obtaining the relevant record, diagnostic, or passage. Keep ordinary aggregate moldea output within 262,144 bytes. Explicitly required large traversal remains purpose-bounded and paginated, with each invocation below 1 MiB. The launcher rejects missing, malformed, smaller-than-4-KiB, or larger-than-1-MiB page budgets and terminates a child that exceeds the declared stdout boundary. It also bounds stderr independently.

`OUTPUT_BUDGET_TOO_SMALL` means the next complete record cannot fit and increasing the page within the 1 MiB ceiling may be appropriate when the record is necessary. `RESOURCE_LIMIT_EXCEEDED` means repository reading exceeded a configured compute or storage guard; do not treat it as an output-page problem or retry unboundedly. Report the observed operation, safe error code, and missing conclusion after direct activation.

Evaluation and qualification record command count and emitted bytes from the completed process evidence. Host failure-containment ceilings do not define normal skill consumption and must never be presented as repository-capacity limits.

The operating targets come from the source-controlled resource profiles and reproducible calibration corpus. Every qualification scenario declares `ordinary` or `largeTraversal`. Both profiles allow 64 completed host commands, 16 moldea calls, 1,625,000 input-plus-output model tokens, and at most 131,072 model-visible bytes from one completed host command. This host-command ceiling is separate from the unchanged 65,536-byte limit on each raw moldea CLI response page. The ordinary profile also allows 262,144 moldea-output bytes and 1,048,576 aggregate model-visible tool-output bytes. The large-traversal profile also allows 1,048,576 moldea-output bytes and 4,194,304 aggregate model-visible tool-output bytes. Absolute host ceilings remain higher failure containment. Each operating limit is enforced independently before judging, and failures identify the profile, dimension, observed value, and limit.
