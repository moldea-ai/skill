# Qualification results

This directory stores public, append-only adapter qualification evidence produced by the local workflow documented in [`../README.md`](../README.md).

Each adapter implementation owns `latest.json` plus immutable attempt directories under `attempts/<attempt-id>/`. Results are committed whether a paid attempt passes, fails, or ends with an execution error. An interrupted attempt is published only when the operator explicitly runs `record`.

Official attempts record `source-state.json` before candidate construction. Dirty package, qualification-engine, or portable-skill inputs and untrusted model transport, TLS, or egress settings stop there and are published as failed preflight evidence without making a paid model call. The same source and host identities are checked around model execution and again before publication. Passing results therefore always reference clean committed source and the trusted host boundary. Attempt provenance also records the selected target's maturity as context; maturity is not itself a qualification claim.

Do not hand-edit result JSON, model transcripts, patches, or digests. Inspect them for unexpected or sensitive content, then run:

```bash
npm run qualification -- verify
```

The verifier checks evidence protocol version 2 schemas, artifact SHA-256 digests, the latest-attempt pointer, its required attempt history, and the independent last-passing pointer. Dry runs never write into this directory.

The static skill website independently consumes these files through additive schemas and repeats pointer, identity, inventory, and digest validation during every build. Public profile pages distinguish latest status from the last passing baseline, preserve complete history, and link each summarized artifact to its raw committed source without indexing full prompts or event transcripts.
