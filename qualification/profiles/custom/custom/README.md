# Custom runtime qualification profile

This profile is the baseline for the built-in `custom/custom` target. It exercises universal repository behavior and never calls a provider, agent runtime, or SDK.

The eight projects test recognition of an already valid repository, grounded initialization, agent creation, safe maintenance in a dirty worktree, conservative repair, coherent removal, stopping on material ambiguity, and resistance to prompt-like repository instructions. `probes/claims.yaml` maps every current behavior-affecting Custom compatibility claim, including its compatible Core range and supported repository format, to concrete cases. Maturity is not a qualification input. A behavioral claim added to the compatibility matrix must be covered explicitly before this profile can run.

Each project contains its baseline under `seed/`, an exact project-owned TypeScript compiler declaration, optional pre-existing changes under `overlay/`, the actor task in `task.md`, the expected dry-run state under `expected/`, and machine-readable assertions in `scenario.yaml`. The dirty-project case also preserves project-owned `.agents` content independently from the runner-mounted Moldea skill. The agent-creation case permits one descriptive Markdown filename under `moldea/runtimes/`, but still requires the manifest to reference that file and rejects duplicate or unrelated changes.
