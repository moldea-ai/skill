# Qualification results

This directory stores public, append-only adapter qualification evidence produced by the local workflow documented in [`../README.md`](../README.md).

Each adapter implementation owns `latest.json` plus immutable attempt directories under `attempts/<attempt-id>/`. Results are committed whether a model-backed attempt passes, fails, or ends with an execution error. An interrupted attempt is published only when the operator explicitly runs `record`.

The current official evidence begins with the fresh Custom baseline for release `3.1.0`. Previous Custom attempts were experimental and were removed before this baseline was produced. Future official attempts are appended without replacing this history.

Official attempts record `source-state.json` before candidate construction. Dirty package, qualification-engine, or portable-skill inputs and untrusted model transport, TLS, or egress settings stop there and are published as failed preflight evidence without making a model call. The same source and host identities are checked around model execution and again before publication. Passing results therefore always reference clean committed source and the trusted host boundary. Adapter attempts also record the exact compatible passing Custom baseline that authorized their model stages.

Do not hand-edit result JSON, model transcripts, patches, or digests. Inspect them for unexpected or sensitive content, then run:

```bash
npm run qualification -- verify
```

The verifier checks evidence protocol version 3 schemas, artifact SHA-256 digests, exact passing artifact and stage inventories, profile and scenario identity, cross-artifact consistency, the latest-attempt pointer, its required attempt history, and the independent last-passing pointer. Dry runs never write into this directory.

The static skill website independently consumes these files through additive schemas and repeats pointer, identity, inventory, and digest validation during every build. Public profile pages distinguish latest status from the last passing baseline, preserve complete history, and link each summarized artifact to its raw committed source without indexing full prompts or event transcripts.
