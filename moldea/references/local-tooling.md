# Local tooling

Read this reference before deterministic CLI use or any write-capable workflow that may establish or reconcile tooling.

## Compatibility contract

Release `1.0.1` supports:

- Git `>=2.30.0`
- Node.js `^22.11.0 || ^24.11.0`
- `@moldea.ai/cli >=1.0.0 <1.1.0`
- CLI JSON schema `1`
- npm `>=10.9.0 <12.0.0`
- pnpm `>=11.20.0 <12.0.0`
- Yarn `>=4.0.0 <5.0.0`

Use node-semver range semantics. Do not broaden these ranges or automatically select a prerelease CLI.

`plan` does not establish this tooling merely to produce an architecture recommendation. It may use an already available compatible repository-local CLI read-only after verifying the same provider and envelope contract. When tooling is absent or incompatible, continue planning from sufficient repository evidence and disclose the unavailable deterministic evidence without selecting a package manager, creating metadata, or changing dependencies.

## Determine the package manager

Inspect repository-root `package.json`, recognized root lockfiles, workspace configuration when material, and the actual executables without changing them.

1. A concrete `packageManager` value is strong identity and version evidence.
2. A sole recognized lockfile establishes its manager family when explicit metadata does not contradict it: `package-lock.json` or `npm-shrinkwrap.json` for npm, `pnpm-lock.yaml` for pnpm, and `yarn.lock` for Yarn.
3. Matching metadata and lockfile evidence select that manager.
4. Conflicting metadata, multiple manager lockfiles, or materially ambiguous workspace evidence require investigation and, if unresolved, developer clarification. Never guess, delete a lockfile, or switch managers.
5. An explicitly established unsupported manager is a prerequisite conflict.
6. When no manager is established, select npm because it ships with Node.js.

Resolve the executable that will perform the operation and verify its actual version with `npm --version`, `pnpm --version`, or `yarn --version`. The version must satisfy this release's range. When concrete `packageManager` metadata exists, its version and the actual executable version must be the same semantic version. Do not silently install or upgrade Node.js or a package manager.

## Establish the exact local CLI

Compatible tooling state requires all of the following:

- `@moldea.ai/cli` is a root `devDependency` declared as one exact semantic version, not a range, tag, URL, workspace protocol, alias, or other floating specifier.
- the declared version satisfies `>=1.0.0 <1.1.0`
- the installed repository-local package manifest reports the same exact version
- the established manager resolves the repository-local `moldea` executable from that root package
- the machine envelope reports the same exact `cliVersion` and schema `1`

Preserve an existing compatible exact declaration and executable. Do not upgrade it merely because a newer compatible version exists. A write-capable workflow may replace it within the supported range only when an official adapter or machine-contract capability materially required by the authorized work is absent from the installed composition and a released supported replacement providing it is established.

During a write-capable workflow:

- if a floating declaration has a compatible installed executable, pin that same installed version exactly and update the ordinary lockfile
- if no compatible installed executable exists, query published registry metadata through the established manager, select the highest published non-prerelease version satisfying the supported range, install it exactly, and update the ordinary lockfile
- if installed and declared state conflict in a way that cannot be established reliably, stop and report the prerequisite instead of guessing

During `plan`, `evaluate`, or `validate`, never create `package.json`, change dependency declarations or lockfiles, or install packages. Report the detected state and the write-capable remediation when relevant.

When a write-capable workflow needs tooling and root `package.json` is absent, create only a minimal private manifest needed for the development dependency. Do not invent application name, version, scripts, package-manager metadata, or unrelated dependencies.

## Suppress executable installation surfaces

Automatic installation or pinning must suppress project and dependency lifecycle scripts and must not load repository-supplied executable package-manager extensions, hooks, or plugins. Substitute only an actually resolved exact version:

```text
npm install --save-dev --save-exact --ignore-scripts @moldea.ai/cli@<resolved-version>
pnpm add --save-dev --save-exact --ignore-scripts @moldea.ai/cli@<resolved-version>
pnpm add --workspace-root --save-dev --save-exact --ignore-scripts @moldea.ai/cli@<resolved-version>
yarn add --dev --exact --mode=skip-build @moldea.ai/cli@<resolved-version>
```

Use the pnpm `--workspace-root` form only when the root is a pnpm workspace; otherwise use the non-workspace form. Yarn's supported `skip-build` mode omits the build step. npm and pnpm use their supported `ignore-scripts` setting. Do not write the literal placeholder or the compatibility range into a client manifest.

Inspect applicable package-manager configuration as data before execution. Treat pnpmfiles, hook-bearing pnpm configuration, repository-declared third-party Yarn plugins, and equivalent extension mechanisms as executable repository code. Use only tested controls that prevent those surfaces from loading without making dependency resolution materially different or unreliable.

If the selected manager or version rejects the documented controls, repository configuration defeats them, an executable surface cannot be prevented from loading, or suppression would change the dependency-resolution contract materially, stop and report the prerequisite. Separately authorized lifecycle-script or package-manager-extension execution remains subject to coding instructions and is never implied by a `moldea` request.

## Invoke only the root-local CLI

Verify the executable resolves from the exact root dependency through the established manager. Do not require a `node_modules` layout from Yarn because supported Yarn repositories may use Plug'n'Play.

### Prove and invoke the repository-local executable

Treat the declaration, installed package, and executable provider as separate checks. Never invoke a bare `moldea`, `npx`, `pnpx`, `pnpm dlx`, `yarn dlx`, or any execution form that can download a missing package or fall back to a global executable.

- For npm, resolve the root `node_modules/@moldea.ai/cli/package.json`, validate its exact name and version, read its `bin.moldea` entry, and canonicalize both that target and `node_modules/.bin/moldea`. Require the executable to resolve inside that same installed package before invoking the canonical local path.
- For pnpm with the `isolated` or `hoisted` linker, perform the same manifest, `bin.moldea`, canonical-target, package-name, and exact-version checks before invoking the canonical root `node_modules/.bin/moldea` path.
- For pnpm with `nodeLinker: pnp` or another configuration without a root `node_modules/.bin`, use `pnpm node` and the active `pnpapi` resolution to locate the root `@moldea.ai/cli` package, validate its manifest name, exact version, and `bin.moldea`, and invoke that resolved bin with `pnpm node`. Do not use `pnpm exec moldea`: it does not prove a project-local provider. If the active linker cannot prove and invoke the exact provider without fallback, stop and report the local-executable prerequisite rather than changing linker configuration.
- For Yarn 4, run `yarn bin -v --json` first. Require exactly one `moldea` entry whose provider locator identifies the root `@moldea.ai/cli` dependency at the declared exact version. Then resolve its path with `yarn bin moldea` and invoke it with `yarn exec moldea`. Stop on missing, duplicate, conflicting, or non-CLI providers.

After provider verification, require the executable's machine envelope to report the same CLI version as the exact root dependency. Never infer provider identity from the reported version alone.

Never use a bare global command, `npx`, `pnpm dlx`, `yarn dlx`, or another form that may download an undeclared CLI.

Use `inspect --json` as the primary deterministic integration. Use `compatibility --json` only when current adapter, runtime, package, provider-limit, or feature support can affect the task. Use `validate --json` when narrower structural validation is sufficient.

## Verify the machine envelope

Parse JSON only after the process completes, then validate the version `1` envelope before reading `result`:

- `schemaVersion` is integer `1`
- `cliVersion` is an exact semantic version equal to the declared and installed CLI version and satisfies `>=1.0.0 <1.1.0`
- `command` equals the command invoked
- `status` is `valid`, `invalid`, or `error`
- `valid` has non-null `result` and null `error`
- `invalid` is accepted only for `inspect` or `validate`, has non-null `result`, and has null `error`
- `error` has null `result` and a non-null safe error object
- `compatibility` never uses `invalid`

Expected handled exit codes are `0` for `valid`, `1` for `invalid`, `2` or `3` for `error`, `130` for `SIGINT`, and `143` for `SIGTERM`. A package-manager launcher can fail before the CLI starts; distinguish that from a CLI envelope.

Do not infer fields from unsupported schemas, mismatched commands, invalid status/payload combinations, malformed JSON, contradictory versions, or unexplained exit/envelope disagreement. Stop deterministic interpretation and report the incompatibility.

Structural `invalid` output is deterministic project evidence, not an operational failure. `error` represents usage, Git, repository-source, Core-operation, compatibility-integrity, resource, cancellation, or unexpected operational failure. Preserve that distinction.

## Preserve responsibility boundaries

Consume CLI, Core, and runtime-adapter results rather than reimplementing Git inventory, repository snapshots, repository-format parsing, path validation, placeholder validation, mirror comparison, diagnostics, adapter invocation, or compatibility interpretation. Do not import private CLI modules.

When additional read-only Git evidence is materially necessary, disable repository-configured execution paths relevant to the command: filesystem-monitor hooks, external diff helpers, text-conversion drivers, pagers, filters, LFS, and unintended submodule recursion. Use machine-oriented output for parsed paths and change sets. If the required inspection cannot be performed without executing repository code, use other reliable evidence or report the limitation.

Treat `inspect --json` as sensitive local content. Use it only for the active task; do not persist the raw envelope, expose canonical content unnecessarily, or copy machine output into README guidance.
