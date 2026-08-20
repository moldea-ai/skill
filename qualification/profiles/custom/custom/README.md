# Custom runtime qualification profile

This profile is the baseline for the built-in `custom/custom` target. It exercises universal repository behavior and never calls a provider, agent runtime, or SDK.

The three projects test recognition of an already valid repository, safe maintenance in a dirty worktree, and conservative repair when a binding has drifted. `probes/claims.yaml` maps every current behavior-affecting Custom compatibility claim, including its compatible Core range and supported repository format, to concrete cases. Target maturity is recorded in attempt provenance rather than used as a qualifying claim. A behavioral claim added to the compatibility matrix must be covered explicitly before this profile can run.

Each project contains its baseline under `seed/`, optional pre-existing changes under `overlay/`, the actor task in `task.md`, the expected dry-run state under `expected/`, and machine-readable assertions in `scenario.yaml`. The dirty-project case also preserves project-owned `.agents` content independently from the runner-mounted Moldea skill.
