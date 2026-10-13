# Declared relationships

Use this policy for context, decisions, agents, tools, and skills when an authorized task assesses or changes their manifest relationships. A relationship records material ownership and relevance. It is not a dependency inventory or proof that the prose and code agree.

## Bindings establish relevance

A binding names the regular file, and optionally the exported symbol, that implements an owner's fact or behavior. Core checks the declared file and supported exports. The binding itself makes a change to that path relevant; do not repeat the bound file as an exact `affectedBy` entry. A glob may also cover the file when it covers other material files in the same coherent subsystem. A passing file or export check never proves runtime wiring or behavior.

## Impact paths

An `affectedBy` path names repository content whose change can make the owner's stated material facts or an agent's behavior wrong. For context and decisions, this can include policy sources, deployment and operating documents, and configuration that sets runtime behavior. For agents, tools, and skills, it can include policy modules, schema sources, tool implementations, instruction loaders, routing, and runtime integration not already named by a binding. Package manifests and lockfiles qualify when they select dependencies or runtime settings that materially affect the owner, not by default. Compiler settings and type declarations require an evidenced behavioral effect beyond compilation participation. Relate tests only to the behavior they protect. These are evidence rules, not filename bans. Relate each path to the owner whose facts or behavior it can actually affect.

## Material facts only

Record product rules, contracts, invariants, security, billing, data and retention guarantees, and agent behavior. Layout, styling, navigation, scrolling, and component composition do not create a relationship, even when an owner document mentions them. A link from `/moldea/project.md` to focused context is navigation, not an impact relationship; the project document owns project-wide facts only.

## Shared infrastructure

A module shared across features, including shared UI components, routers, query and data helpers, and error or logging services, is not an impact path of a feature owner merely because that feature uses it. Relate the feature module that uses the shared code. Relate a shared module only to an owner that states the shared module's own contract.

## Granularity

Use an exact file when the material relationship belongs to that file. Use `/<directory>/**` when a coherent subsystem owns the behavior. Never use a catch-all such as `/src/**`. Exact entries identify regular files; a bare directory is invalid and removing a trailing slash does not turn it into a file. Preserve the supported version 1 field shapes and repository-root-absolute logical paths.

## Lifecycle

Add, correct, or remove a relationship only when evidence from the authorized task establishes its role, when `validate` reports a dead exact path or a no-match glob, or during explicit repair. A match calls for reconsideration, not an automatic edit. Inspect the relevant change, preserve accurate declarations, and do not scan for candidate paths or run background freshness audits. In explicit repair, remove an entry that demonstrably cannot change the owner's material facts or behavior and give the reason under **Fixed**.

## Report uncertainty

Bind only paths the task has already inspected. If a path's role cannot be established, name the path and the reason under **Needs input** in explicit repair, or report the unresolved relationship in ordinary work. Do not silently add, remove, or omit a material relationship, invent an owner, or widen a pattern to hide uncertainty.
