# Custom runtime qualification profile

This profile is the baseline for the built-in `custom/custom` target. It exercises universal repository behavior and never calls a provider, agent runtime, or SDK.

The three projects test recognition of an already valid repository, safe maintenance in a dirty worktree, and conservative repair when a binding has drifted. `probes/claims.yaml` maps every current Custom compatibility claim, including its compatible Core range and supported repository format, to concrete cases. A claim added to the compatibility matrix must be covered explicitly before this profile can run.

Each project contains its baseline under `seed/`, optional pre-existing changes under `overlay/`, the actor task in `task.md`, the expected dry-run state under `expected/`, and machine-readable assertions in `scenario.yaml`.
