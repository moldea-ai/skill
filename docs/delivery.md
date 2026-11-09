---
title: Task delivery
navigationTitle: Task delivery
description: Source integration, maintainer release stops and live delivery verification.
section: reference
order: 195
---

# Task delivery

Default stop: `development`.

Stops run in this order; reaching a later stop includes earlier stops.

| Stop          | Operator |
| ------------- | -------- |
| `development` | agent    |
| `main`        | agent    |
| `release`     | agent    |

## development

Follow [testing](../testing/) and the [development workflow](https://github.com/moldea-ai/skill#development). Commit and push the reviewed task, merge into `development`, and confirm the remote branch contains its HEAD.

## main

Merge the reviewed development work into `main`, push, and verify the checks and website deployment described in the [project blueprint](https://github.com/moldea-ai/skill#project-blueprint). Verify the live artifact when the website is affected.

## release

After `main`, follow the [release contract](https://github.com/moldea-ai/skill#releases) and [release evidence procedure](../release-evidence/). Publish the immutable version tag only after its required conformance, identity and installation checks. Verify the tag and official distribution bytes. Historical semantic evidence retains its recorded scope; deterministic publication does not claim a new semantic evaluation.

## Verification and cleanup

Use fresh Git and remote reads to confirm committed/pushed HEAD and each required merge. Verify any publication or deployment at its procedure owner. Remove only task-owned temporary folders, worktrees, merged local/remote task branches and claims after confirming no active session uses them. Retain unique or dirty work and report the reason. A developer-operated or unverified remaining step means delivery is incomplete.
