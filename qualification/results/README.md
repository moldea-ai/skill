# Qualification results

This directory stores public, append-only adapter qualification evidence produced by the local workflow documented in [`../README.md`](../README.md).

Each adapter implementation owns `latest.json` plus immutable attempt directories under `attempts/<attempt-id>/`. Results are committed whether a paid attempt passes, fails, or ends with an execution error. An interrupted attempt is published only when the operator explicitly runs `record`.

Official attempts record `source-state.json` before candidate construction. Dirty package, qualification-suite, or portable-skill inputs stop there and are published as failed preflight evidence without making a paid model call. The same fingerprints are checked again before publication. Passing results therefore always reference clean committed source. Attempt provenance also records the selected target's maturity as context; maturity is not itself a qualification claim.

Do not hand-edit result JSON, model transcripts, patches, or digests. Inspect them for unexpected or sensitive content, then run:

```bash
npm run qualification -- verify
```

The verifier checks strict schemas, artifact SHA-256 digests, the latest-attempt pointer, and the independent last-passing pointer. Dry runs never write into this directory.
