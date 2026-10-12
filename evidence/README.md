# Manual evidence selection

The execution runners keep exact checkpoint and automatic reuse identities. Website evidence is selected separately from completed local official runs. Selection does not invoke a model or claim that an older case ran against current inputs.

For semantic cases, record a targeted replacement with `npm run eval:semantic -- --record --cases <comma-separated-case-ids>`. Preview an ordered selection with `npm run eval:semantic:compose -- --sources <attempt-id>,<earlier-attempt-id> --preview`; omit `--preview` to store it. Add `--cases <comma-separated-case-ids>` to limit the selected cases. The first source containing a case is used unless `--review <repository-relative-json-file>` names its source. The review JSON needs `formatVersion: 1`; optional `caseSources` entries contain `caseId` and `attemptId`, while `acceptedCriteria` and `reassessments` entries contain `caseId` and a concrete `rationale`.

The compose command can select recorded cases across skill versions and changed current case inputs. Each selected case keeps its recorded request and source identity. A semantic case with changed inputs keeps its original verdict unless an explicit same-request reassessment applies. The command reports failed and unavailable cases in its preview output. Pack and pin the resulting bundle through the ordinary release-evidence workflow.

In a composed semantic attempt, the top-level CLI, host, and artifact fields identify the basis attempt named by `composition.basisAttemptId`. Each trial's `carriedFrom` identifies the source of that case. A reviewed outcome retains the original judge verdict and every recorded trial in its replay.

Scripted journeys use the same pack, publish, pin, and prepare pipeline with `--scope journeys` for packing and pinning. `selection.json` keeps `journeys: null` until an official run is selected. Semantic evidence remains required; release verification requires every selected bundle to pass. See [Scripted journeys](../docs/scripted-journeys.md) for recording and assessing both platforms.

Journeys selection uses one complete locally assessed run from both platforms. It does not compose step captures from different attempts. The input bundle release is separate from the assessed output release, and publishing either does not update the website selection. Preserve operator interventions and reported deviations; a passing run establishes its defined checks, while unverified expectations remain unverified.
