# Semantic evaluation results

This directory stores append-only semantic evaluation history. Every terminal recorded run writes one immutable attempt directory containing:

- `attempt.json`: a concise derived status, case, confirmation, and provenance summary
- `evidence.json`: the exact candidate checkpoint or canonical result that produced the summary

`latest.json` points independently to the newest attempt and the last passing attempt. A later failure never overwrites a pass, and an earlier pass never makes a newer failure look successful.

The release gate does not treat history as current passing evidence. Only a complete compatible run can create `fixtures/semantic-evaluation-result.json`, and that canonical result must match the exact release inputs.

Semantic protocol 13 records a completed command's status, exit code, and safe projected result facts without retaining command text, identifiers, MCP events, or raw output. Facts require an exact evaluator-owned invocation and matching complete output, and are limited to the evaluator-owned pnpm Plug'n'Play CLI resolution paths and release-bound Moldea envelope fields. Empty, unrecognized, mismatched, and oversized outputs retain only a byte count and disposition and cannot prove a result-dependent criterion.

Older protocol attempts remain immutable, verifiable history. They cannot satisfy a protocol-13 release gate or resume as a current checkpoint because their discarded command results cannot be reconstructed. Starting the current evaluation requires an explicit `--restart`, which removes only the ignored local checkpoint and preserves this history.

Run `npm run eval:semantic:verify` to recalculate every evidence digest, summary, directory identity, and pointer without making model calls.
