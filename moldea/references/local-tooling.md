# Local tooling

Read this reference after the skill entrypoint and before any Git, package-manager, deterministic CLI, or tooling-establishment command. Finish reading it before the first governed command; do not combine reference loading and that command in one shell expression.

## Compatibility contract

Release `3.1.0` supports:

- Git `>=2.30.0`
- Node.js `^22.11.0 || ^24.11.0`
- `@moldea.ai/cli 4.0.1`
- CLI JSON schema `2`
- npm `>=10.9.0 <12.0.0`
- pnpm `>=11.20.0 <12.0.0`
- Yarn `>=4.0.0 <5.0.0`

Use node-semver range semantics for the Node.js and package-manager entries. Do not substitute another CLI release or select a prerelease CLI.

`plan` does not establish this tooling merely to produce an architecture recommendation. It may use an already available exact release CLI read-only after verifying the same provider and envelope contract. When tooling is absent or does not match this release, continue planning from sufficient repository evidence and disclose the unavailable deterministic evidence without selecting a package manager, creating metadata, or changing dependencies.

## Determine the package manager

Determine the package manager from repository data before invoking any package-manager executable. Inspect repository-root `package.json`, recognized root lockfiles, workspace configuration, and applicable manager configuration as ordinary file data without changing them.

1. A concrete `packageManager` value is strong identity and version evidence.
2. A sole recognized lockfile establishes its manager family when explicit metadata does not contradict it: `package-lock.json` or `npm-shrinkwrap.json` for npm, `pnpm-lock.yaml` for pnpm, and `yarn.lock` for Yarn.
3. Matching metadata and lockfile evidence select that manager.
4. Conflicting metadata, multiple manager lockfiles, or materially ambiguous workspace evidence require investigation and, if unresolved, developer clarification. Never guess, delete a lockfile, or switch managers.
5. An explicitly established unsupported manager is a prerequisite conflict.
6. When no manager is established, select npm because it ships with Node.js.

Before any npm, pnpm, Yarn, Corepack, or related command, inspect pnpmfiles, hook-bearing pnpm configuration, Yarn plugins, and equivalent executable extensions. A `.yarnrc.yml` `plugins[].path` declaration is executable configuration even if the plugin remains unread and unrun. Any such extension blocks manager execution, including version or discovery, because this release cannot prove it stays unloaded.

This gate does not block the entire `moldea` workflow. If dependency changes or exact provider proof or invocation requires the manager, retain an independent blocker record in the final report even when another clarification or stop applies: exact path, blocked operation, unavailable evidence, and safe prerequisite. Remove or disable the extension and retry, or independently verify and invoke an already declared and installed exact CLI without the manager. Never propose bypassing, trusting, or executing the extension.

Only after that file-only safety gate passes, resolve the executable that will perform the operation and verify its actual version with `npm --version`, `pnpm --version`, or `yarn --version`. The version must satisfy this release's range. When concrete `packageManager` metadata exists, its version and the actual executable version must be the same semantic version. Do not silently install or upgrade Node.js or a package manager.

## Establish the exact local CLI

Release tooling state requires all of the following:

- `@moldea.ai/cli` is a root `devDependency` declared as one exact semantic version, not a range, tag, URL, workspace protocol, alias, or other floating specifier.
- the declared version is exactly `4.0.1`
- the installed repository-local package manifest reports the same exact version
- the established manager resolves the repository-local `moldea` executable from that root package
- the machine envelope reports the same exact `cliVersion` and schema `2`

Preserve an existing exact `4.0.1` declaration and executable. A different installed version belongs to a different skill release and must not be treated as interchangeable. If this release's exact CLI lacks a required official adapter or machine-contract capability, stop and report the release defect instead of selecting another CLI version.

Inspect the manager-specific manifest and executable directly; ignored-tree omission from Git or `rg` does not prove absence.

During a write-capable workflow:

- if the installed repository-local CLI is exactly `4.0.1` but the declaration floats, pin `4.0.1` exactly and update the ordinary lockfile
- if the exact release CLI is absent or another version is installed, verify published registry metadata for `4.0.1`, install that version exactly, and update the ordinary lockfile
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

Use the pnpm `--workspace-root` form only when the root is a pnpm workspace; otherwise use the non-workspace form. Yarn's supported `skip-build` mode omits the build step. npm and pnpm use their supported `ignore-scripts` setting. Replace the placeholder with exact version `4.0.1`; never write a range into a client manifest.

The file-only safety gate occurs before selecting one of these commands. Lifecycle-script suppression does not neutralize a repository-supplied manager extension, hook, or plugin and must not be used to bypass the prohibition on package-manager execution.

If the selected manager or version rejects the documented lifecycle-script control, repository configuration defeats it, or suppression would change dependency resolution materially, stop and report the prerequisite. Separately authorized lifecycle-script execution remains subject to coding instructions and is never implied by a `moldea` request.

## Preserve decision gates

Run every command whose safety or authority depends on earlier output as a separate process execution. Wait for the process to complete, interpret its exact result, and decide whether the next command is authorized. Never batch a result-dependent sequence into one shell command merely because the individual steps are read-only.

This boundary applies to package-manager configuration and version checks, installed-package and executable-provider checks, executable resolution and invocation, and deterministic CLI operations. A later command must not begin before the preceding gate has been accepted.

## Invoke only the root-local CLI

Verify the executable resolves from the exact root dependency through the established manager. Do not require a `node_modules` layout from Yarn because supported Yarn repositories may use Plug'n'Play.

### Prove and invoke the repository-local executable

Retain cumulative CLI proof: exact root declaration; installed package identity and version; exported `bin.moldea`; effective provider. Later conflicts do not erase accepted proof. Never invoke a bare `moldea`, `npx`, `pnpx`, `pnpm dlx`, `yarn dlx`, or any execution form that can download a missing package or fall back to a global executable.

- For npm, resolve the root `node_modules/@moldea.ai/cli/package.json`, validate its exact name and version, read its `bin.moldea` entry, and canonicalize both that target and `node_modules/.bin/moldea`. Require the executable to resolve inside that same installed package before invoking the canonical local path.
- For pnpm with the `isolated` or `hoisted` linker, perform the same manifest, `bin.moldea`, canonical-target, package-name, and exact-version checks before invoking the canonical root `node_modules/.bin/moldea` path.
- For pnpm with `nodeLinker: pnp` or another configuration without a root `node_modules/.bin`, first pass the file-only extension gate, then run `pnpm --version` as its own process. In a separate repository-root `pnpm node` process, use the active `pnpapi.resolveToUnqualified('@moldea.ai/cli', '<root-package-json>')` to locate the package. Read that root's manifest; require exact name `@moldea.ai/cli`, the exact release version, and a relative `bin.moldea`. Canonicalize the package root and resolved bin and require the bin to remain inside that package. Only after accepting those checks may another process invoke `pnpm node <resolved-bin> <command> --json`. Do not use `pnpm exec moldea`: it does not prove a project-local provider. If the active linker cannot prove and invoke the exact provider without fallback, stop rather than changing linker configuration.
- For Yarn 4, after the file-only safety gate passes, prove and retain each stage separately: the root manifest declares exact `@moldea.ai/cli`; `yarn info @moldea.ai/cli --json` establishes the installed identity, exact version, and exported `bin.moldea`; and only then `yarn bin -v --json` establishes the effective provider. Parse its newline-delimited JSON records and require exactly one `moldea` entry whose `source` is exactly `@moldea.ai/cli`; Yarn's `source` field identifies the provider package, not its version. Stop immediately on missing, malformed, duplicate, conflicting, or non-CLI providers: do not run `yarn bin moldea`, `yarn exec moldea`, or any resolved executable. Report every accepted proof field even when a later provider conflict stops execution. Only after accepting the provider record may the next process resolve the executable with `yarn bin moldea`; require its canonical path to equal the recorded provider path before a later process invokes `yarn exec moldea`.

Accessible repository evidence makes local CLI proof executable, even when requested as an explanation: run safe provider and CLI checks. Only requests without such evidence may receive a procedure. Report provider, exact version, command, and envelope. Never infer provider from version.

`inspect --json` is primary. Run `compatibility --json` only when package composition, adapter IDs, format versions, or Node.js and Git requirements affect the task; it proves no maturity, provider limits, patterns, or other behavioral claims. Use `validate --json` for narrower structural validation.

## Verify the machine envelope

Run each `inspect --json`, `validate --json`, or `compatibility --json` invocation as an independent process execution. Do not shell-chain deterministic CLI invocations with each other or with package-manager checks, project-native verification, mirror comparisons, or Git inspection. Parse JSON only after that exact process completes, then validate the version `2` envelope before reading `result`:

- `schemaVersion` is integer `2`
- `cliVersion` is exactly `4.0.1` and equals the declared and installed CLI version
- `command` equals the command invoked
- `status` is `valid`, `invalid`, or `error`
- `valid` has non-null `result` and null `error`
- `invalid` is accepted only for `inspect` or `validate`, has non-null `result`, and has null `error`
- `error` has null `result` and a non-null safe error object
- `compatibility` never uses `invalid`

Expected handled exit codes are `0` for `valid`, `1` for `invalid`, `2` or `3` for `error`, `130` for `SIGINT`, and `143` for `SIGTERM`. A package-manager launcher can fail before the CLI starts; distinguish that from a CLI envelope.

Only the completed isolated process, its exit code, and its matching envelope establish the command's deterministic result. A failed or incomplete process, a failed aggregate shell command, an unsupported schema, a mismatched command, an invalid status/payload combination, malformed JSON, contradictory versions, or unexplained exit/envelope disagreement cannot support a validity claim. Stop deterministic interpretation and report the incompatibility.

Structural `invalid` output is deterministic project evidence when its expected exit code and envelope are complete; it is not successful validation or an operational failure. `error` represents usage, Git, repository-source, Core-operation, compatibility-integrity, resource, cancellation, or unexpected operational failure. Preserve that distinction and never report either result as `valid`.

## Preserve responsibility boundaries

Consume CLI, Core, and runtime-adapter results rather than reimplementing Git inventory, repository snapshots, repository-format parsing, path validation, placeholder validation, mirror comparison, diagnostics, adapter invocation, or compatibility interpretation. Do not import private CLI modules.

When additional read-only Git evidence is materially necessary, use command-specific safe options rather than a bare Git command. No Git command, including `rev-parse`, `status`, `log`, or `diff`, is harmless before this reference is loaded. For every command disable fsmonitor and pagers with `-c core.fsmonitor=false`, `-c core.pager=cat`, and `--no-pager`; disable global attributes and LFS processing where relevant with `-c core.attributesFile=/dev/null`, empty LFS process and smudge settings, and `-c filter.lfs.required=false`. For `diff`, `show`, or another patch-producing command, also use `-c diff.external=`, `--no-ext-diff`, and `--no-textconv`; repository attributes may still exist, so `--no-textconv` is required. Avoid submodule recursion and request explicit machine-oriented output such as porcelain or NUL-delimited paths. Apply only options supported by the selected Git subcommand.

Use these command shapes, adding only the required pathspec or supported output options:

```text
git -c core.fsmonitor=false -c core.pager=cat --no-pager status --porcelain=v2 -z --ignore-submodules=all
git -c core.fsmonitor=false -c core.pager=cat -c core.attributesFile=/dev/null -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false -c diff.external= --no-pager diff --no-ext-diff --no-textconv --ignore-submodules=all -- <pathspec>
```

After every supplemental Git command, especially a failure, inspect the workspace and any helper sentinel before claiming no writes. Report observed changes truthfully. If the required evidence cannot be gathered without executing repository code, use other reliable evidence or report the limitation instead of weakening these controls.

Treat `inspect --json` as sensitive local content. Use it only for the active task; do not persist the raw envelope, expose canonical content unnecessarily, or copy machine output into README guidance.
