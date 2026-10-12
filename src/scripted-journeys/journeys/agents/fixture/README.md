# Parcel triage

This project helps parcel desk staff triage pickup questions. The saved triage policy owns escalation timing. src/triage-agent.js contains one existing model invocation through the project's injected client.respond({ instructions, input }) boundary. The caller supplies the model client; this repository does not use a provider SDK. This is an evidenced custom runtime, not a claim about any live provider. The existing focused test checks the invocation contract. No other consumers exist.
