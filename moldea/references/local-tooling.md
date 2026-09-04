# Local moldea tooling

Read this reference only after the entrypoint has established moldea relevance and the selected operation requires deterministic CLI evidence.

## Supported contract

Skill 5.0.0 supports exactly Node.js `>=22.11.0`, `@moldea.ai/core` 2.1.0, `@moldea.ai/cli` 6.0.0, format version 1, and CLI JSON schema 3. Never substitute a global, transient, older, newer, or prerelease CLI.

Prefer an already installed repository-root-local package whose exact CLI version is 6.0.0. Verify its package metadata as inert file data before execution. Do not search unrelated workspaces or user-level installation paths.

When a relevant write-capable moldea operation requires the CLI and the exact local dependency is missing, use the repository's already established package manager and ordinary root dependency location. Install `@moldea.ai/cli@6.0.0` exactly with lifecycle scripts disabled, update its normal lockfile, and do not load repository-supplied executable package-manager extensions. A read-only operation does not authorize installation or dependency changes; report that deterministic evidence is unavailable.

These rules govern only moldea CLI establishment. They do not govern package-manager commands already owned by the host task and do not define Git inspection, review, commit, or publication procedures.

## Machine commands

Invoke the resolved executable directly with arguments rather than through a shell or package-manager launcher. Use the repository root explicitly when current-working-directory ownership is unclear.

Use only the command required by the active operation:

- `scope --paths-stdin --json --max-output-bytes 65536` for one relationship gate before loading other resources
- `validate --json --max-output-bytes 65536` for structural validity
- `inspect --json --max-output-bytes 65536` for content-free project inventory
- `content --path <canonical-path> --json --max-output-bytes 65536` for one required canonical asset
- `composition --json --max-output-bytes 65536` only when installed package composition matters

Repository-logical paths begin with `/`. The stdin scope form accepts NUL-delimited UTF-8 paths and must receive the complete known path set in one invocation. Do not wrap CLI output in a custom stripping or summarization program; schema 3 already returns bounded metadata.

## Envelope verification

Interpret JSON only after the child process completes. Require:

- integer `schemaVersion: 3`
- string `cliVersion: "6.0.0"`
- the exact invoked `command`
- `status` equal to `valid`, `invalid`, or `error`
- a non-null result only for a completed `valid` or `invalid` command
- a machine error only for `error`

Exit code 0 represents `valid`, 1 represents `invalid`, and 2 or 3 represents `error`. Signals and launcher failures are incomplete evidence. An `invalid` result is useful diagnostic evidence but does not establish validity. An `error`, malformed envelope, version mismatch, unsupported schema, stale cursor, truncated process, or contradictory result establishes no deterministic conclusion.

Every page carries a snapshot identity. Supply only the opaque cursor returned by the preceding page and stop if the snapshot cannot be continued. Do not restart pagination and merge records from different snapshots.

## Resource limits

Use a 65,536-byte page for ordinary work. Stop when the relevant record or diagnostic has been obtained. Keep every CLI invocation within the 1 MiB CLI maximum and ordinary relevant moldea output within 262,144 bytes in aggregate. An explicitly required large-context traversal may exceed the ordinary aggregate, but must remain paginated and purpose-bounded. Treat a 16 MiB host buffer as failure containment only.

Record command count and emitted bytes when evaluation or qualification requires resource evidence. Do not turn a diagnostic budget into a user-facing runtime failure without explaining which required evidence could not fit and how to continue safely.
