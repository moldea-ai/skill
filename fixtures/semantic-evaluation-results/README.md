# Semantic evaluation results

This directory stores append-only semantic evaluation history. Every terminal recorded run writes one immutable attempt directory containing:

- `attempt.json`: a concise derived status, case, confirmation, and provenance summary
- `evidence.json`: the exact candidate checkpoint or canonical result that produced the summary

`latest.json` points independently to the newest attempt and the last passing attempt. A later failure never overwrites a pass, and an earlier pass never makes a newer failure look successful.

The release gate does not treat history as current passing evidence. Only a complete compatible run can create `fixtures/semantic-evaluation-result.json`, and that canonical result must match the exact release inputs.

Run `npm run eval:semantic:verify` to recalculate every evidence digest, summary, directory identity, and pointer without making model calls.
