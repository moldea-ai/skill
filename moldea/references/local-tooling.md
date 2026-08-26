# Local tooling

Read this reference after the skill entrypoint and before any Git, package-manager, deterministic CLI, or tooling-establishment command. Finish reading it before the first governed command; do not combine reference loading and that command in one shell expression. Establish the candidate repository root by inert filesystem traversal before using Git.

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

`plan` may use an already available verified release CLI read-only but never establishes tooling. Otherwise continue from sufficient repository evidence and disclose unavailable deterministic evidence without selecting a manager or changing files.

## Determine the package manager

Before invoking a manager, inspect root `package.json`, recognized lockfiles, workspace configuration, and applicable manager configuration as file data.

1. A concrete `packageManager` value is strong identity and version evidence.
2. A sole recognized lockfile establishes its manager family when explicit metadata does not contradict it: `package-lock.json` or `npm-shrinkwrap.json` for npm, `pnpm-lock.yaml` for pnpm, and `yarn.lock` for Yarn.
3. Matching metadata and lockfile evidence select that manager.
4. Conflicting metadata, multiple manager lockfiles, or materially ambiguous workspace evidence require investigation and, if unresolved, developer clarification. Never guess, delete a lockfile, or switch managers.
5. An explicitly established unsupported manager is a prerequisite conflict.
6. When no manager is established, select npm because it ships with Node.js.

Before any npm, pnpm, Yarn, Corepack, or related command, inspect pnpmfiles, hook-bearing pnpm configuration, Yarn plugins, and equivalent executable extensions. A `.yarnrc.yml` `plugins[].path` is executable even when unread. Any such extension blocks manager execution, including version discovery, because this release cannot prove it stays unloaded.

Inspect these extensions only as file data with direct inert readers; do not load or parse them through Node.js, a package manager, a repository executable, or a project script. Once one is established, stop executable discovery for manager-dependent work; finish only the minimum inert file inspection needed to identify independent prerequisites, then report every established blocker before asking the focused question that can resolve the remaining ambiguity.

This gate blocks only manager-dependent work. Report each extension path, blocked operation, unavailable evidence, and safe prerequisite. Remove or disable the extension and retry; invoke without the manager only for an already declared and installed exact CLI. Never bypass, trust, or execute the extension.

After the file-only gate passes, verify the selected executable with `npm --version`, `pnpm --version`, or `yarn --version`. It must satisfy the release range and exactly match concrete `packageManager` metadata. Do not silently install or upgrade Node.js or a manager.

## Establish the exact local CLI

Release tooling state requires all of the following:

- `@moldea.ai/cli` is a root `devDependency` declared as one exact semantic version, not a range, tag, URL, workspace protocol, alias, or other floating specifier.
- the declared version is exactly `4.0.1`
- the installed repository-local package manifest reports the same exact version
- the established manager resolves the repository-local `moldea` executable from that root package
- the machine envelope reports the same exact `cliVersion` and schema `2`

Preserve the exact version `4.0.1`. Another installed version belongs to another skill release. If the exact release CLI lacks a required official adapter or machine capability, report the release defect rather than selecting another version.

Inspect the manager-specific manifest and executable directly; Git or `rg` omission does not prove absence.

During a write-capable workflow:

- if the installed repository-local CLI is exactly `4.0.1` but the declaration floats, pin `4.0.1` exactly and update the ordinary lockfile
- if the exact release CLI is absent or another version is installed, verify published registry metadata for `4.0.1`, install that version exactly, and update the ordinary lockfile
- if installed and declared state conflict in a way that cannot be established reliably, stop and report the prerequisite instead of guessing

During `plan`, `evaluate`, or `validate`, do not create manifests, change dependencies or lockfiles, or install packages. Report the state and relevant write-capable remediation.

When authorized tooling work lacks a root `package.json`, create only the minimal private manifest needed for the dependency; do not invent other metadata or dependencies.

## Suppress executable installation surfaces

Automatic installation or pinning must suppress project and dependency lifecycle scripts and must not load repository-supplied executable package-manager extensions, hooks, or plugins. Substitute only an actually resolved exact version:

```text
npm install --save-dev --save-exact --ignore-scripts @moldea.ai/cli@<resolved-version>
pnpm add --save-dev --save-exact --ignore-scripts @moldea.ai/cli@<resolved-version>
pnpm add --workspace-root --save-dev --save-exact --ignore-scripts @moldea.ai/cli@<resolved-version>
yarn add --dev --exact --mode=skip-build @moldea.ai/cli@<resolved-version>
```

Use pnpm `--workspace-root` only for a root workspace. Yarn uses `skip-build`; npm and pnpm use `ignore-scripts`. Replace the placeholder with the exact version `4.0.1`, never a range.

The file-only gate precedes command selection. Lifecycle-script suppression does not neutralize repository-supplied extensions and cannot bypass the manager prohibition.

If the manager rejects the control, configuration defeats it, or suppression materially changes resolution, report the prerequisite. A Moldea request never implies lifecycle-script authority.

## Preserve decision gates

Run every command whose safety or authority depends on earlier output separately. Accept the completed result before authorizing the next command; never batch a result-dependent sequence.

This applies to manager configuration and versions, installed identity, provider proof, executable resolution, invocation, and deterministic CLI operations.

## Invoke only the root-local CLI

Resolve the executable from the exact root dependency through the established manager. Yarn may use Plug'n'Play and need not expose `node_modules`.

### Prove and invoke the repository-local executable

Retain cumulative proof of the root declaration, installed identity and version, exported `bin.moldea`, and effective provider. Never use a bare `moldea`, `npx`, `pnpx`, `pnpm dlx`, `yarn dlx`, or another form that can download or use a global fallback.

- For npm, resolve the root `node_modules/@moldea.ai/cli/package.json`, validate its exact name and version, read its `bin.moldea` entry, and canonicalize both that target and `node_modules/.bin/moldea`. Require the executable to resolve inside that same installed package before invoking the canonical local path.
- For pnpm with the `isolated` or `hoisted` linker, perform the same manifest, `bin.moldea`, canonical-target, package-name, and exact-version checks before invoking the canonical root `node_modules/.bin/moldea` path.
- For pnpm with `nodeLinker: pnp` or another configuration without a root `node_modules/.bin`, first pass the file-only extension gate, then run `pnpm --version` as its own process. In a separate repository-root `pnpm node` process, use the active `pnpapi.resolveToUnqualified('@moldea.ai/cli', '<root-package-json>')` to locate the package. Read that root's manifest; require exact name `@moldea.ai/cli`, the exact release version, and a relative `bin.moldea`. Canonicalize the package root and resolved bin and require the bin to remain inside that package. Only after accepting those checks may another process invoke `pnpm node <resolved-bin> <command> --json`. Do not use `pnpm exec moldea`: it does not prove a project-local provider. If the active linker cannot prove and invoke the exact provider without fallback, stop rather than changing linker configuration.
- For Yarn 4, after the file-only safety gate, prove each stage separately: exact root declaration; installed identity, version, and exported `bin.moldea` through `yarn info @moldea.ai/cli --json`; then effective provider through `yarn bin -v --json`. Parse its newline-delimited JSON records and require exactly one `moldea` entry sourced by `@moldea.ai/cli`; `source` identifies the package, not its version. Any missing, malformed, duplicate, conflicting, or non-CLI provider ends this proof branch. Do not then resolve or invoke the executable through Yarn, symlink inspection, `readlink`, `realpath`, Node.js filesystem APIs, or another tool. Report accepted stages and later stages as unattempted; unrelated safe reporting checks may continue. Only an accepted provider record permits a new `yarn bin moldea` process; require its canonical path to equal the recorded path before another process runs `yarn exec moldea`.

When repository evidence is accessible, perform safe provider and CLI checks even for an explanation; otherwise provide a procedure. Report provider, exact version, command, and envelope. Version alone does not prove provider.

`inspect --json` is primary. Use `compatibility --json` only when package composition, adapter IDs, formats, or runtime requirements matter; it proves no behavioral claims. Use `validate --json` for narrower structure.

## Verify the machine envelope

Run each CLI invocation independently, without shell-chaining it to manager checks, project verification, mirror comparison, Git inspection, or another CLI command. After completion, validate the version `2` envelope before reading `result`:

- `schemaVersion` is integer `2`
- `cliVersion` is exactly `4.0.1` and equals the declared and installed CLI version
- `command` equals the command invoked
- `status` is `valid`, `invalid`, or `error`
- `valid` has non-null `result` and null `error`
- `invalid` is accepted only for `inspect` or `validate`, has non-null `result`, and has null `error`
- `error` has null `result` and a non-null safe error object
- `compatibility` never uses `invalid`

Expected handled exit codes are `0` for `valid`, `1` for `invalid`, `2` or `3` for `error`, `130` for `SIGINT`, and `143` for `SIGTERM`. A package-manager launcher can fail before the CLI starts; distinguish that from a CLI envelope.

Only the completed process, exit code, and matching envelope establish a result. Failure, incompleteness, aggregation, unsupported schema, command mismatch, invalid payload, malformed JSON, contradictory version, or exit/envelope disagreement stops interpretation.

Complete structural `invalid` is diagnostic evidence, not successful validation or operational failure. `error` is an operational failure. Never report either as `valid`.

## Preserve responsibility boundaries

Consume public CLI, Core, and adapter results rather than reimplementing their mechanics or importing private CLI modules.

When additional read-only Git evidence is materially necessary, no Git command, including `rev-parse`, `status`, `log`, or `diff`, is presumed harmless. Before worktree-aware Git, inspect every `.gitattributes` file under the candidate working tree and the applicable Git directory's `info/attributes` as inert file data. Resolve a `.git` file only by reading its declared Git-directory path. Do not use Git, repository code, a project script, or a language runtime for this preflight.

If any inspected attribute source assigns, unsets, resets, or defines a macro involving `filter`, or if every applicable source cannot be located and read completely, do not run worktree-aware Git. Report the attribute path, filter risk, unavailable Git evidence, and concrete safe prerequisite: remove or disable the filter before retrying, or supply independently captured inert worktree evidence. A clean filter can execute during `status` or `diff`; command-line Git configuration cannot universally neutralize repository attribute rules.

Only after that preflight passes, use command-specific hardened options instead of a bare Git command. Set `GIT_ATTR_NOSYSTEM=1` and `-c core.attributesFile=/dev/null` to disable system and global attributes. For every command, disable fsmonitor and pagers with `-c core.fsmonitor=false`, `-c core.pager=cat`, and `--no-pager`. Disable LFS clean, process, and smudge settings where relevant with empty `filter.lfs.clean`, `filter.lfs.process`, and `filter.lfs.smudge` values plus `-c filter.lfs.required=false`. For `diff`, `show`, or another patch-producing command, also use `-c diff.external=`, `--no-ext-diff`, and `--no-textconv`. Avoid submodule recursion and request explicit machine-oriented output such as porcelain or NUL-delimited paths. Apply only options supported by the selected Git subcommand.

Use these command shapes, adding only the required pathspec or supported output options:

```text
env GIT_ATTR_NOSYSTEM=1 git -c core.fsmonitor=false -c core.pager=cat -c core.attributesFile=/dev/null -c filter.lfs.clean= -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false --no-pager status --porcelain=v2 -z --ignore-submodules=all
env GIT_ATTR_NOSYSTEM=1 git -c core.fsmonitor=false -c core.pager=cat -c core.attributesFile=/dev/null -c filter.lfs.clean= -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false -c diff.external= --no-pager diff --no-ext-diff --no-textconv --ignore-submodules=all -- <pathspec>
```

Run each hardened Git invocation alone in its tool call from the repository root. Run workspace and helper-sentinel checks in separate later calls; do not combine the Git invocation with chaining, piping, redirection, substitution, or inline parsing.

When hardened status reports changes and the operation requires evaluating them, status does not describe their content. Run the documented hardened diff separately for each material path before drawing semantic conclusions; file reads, Git history, and the final report do not replace that diff evidence. This remains conditional on the completed attribute preflight.

After every supplemental Git command, especially a failure, inspect the workspace and any helper sentinel before claiming no writes. Report observed changes truthfully. If the required evidence cannot be gathered without executing repository code, use other reliable evidence or report the limitation instead of weakening these controls.

Treat `inspect --json` as sensitive local content. Use it only for the active task; do not persist the raw envelope, expose canonical content unnecessarily, or copy machine output into README guidance.
