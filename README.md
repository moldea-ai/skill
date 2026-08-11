# moldea Agent Skill

The open-source `moldea` Agent Skill helps coding agents establish and maintain Git-owned
project context and complete agent instructions under `moldea/**`.

It works locally without a `moldea` Cloud account. Canonical content remains in the client
repository, and every write stays visible in the ordinary working tree.

## Project blueprint

- `moldea/SKILL.md` defines context-first initialization, evaluation, reconciliation, and agent
  maintenance workflows.
- `moldea/agents/openai.yaml` provides the host-facing skill metadata.
- `README.md` describes this source repository; it is not bundled project context and does not
  replace a client's canonical `moldea/project.md`.

Deterministic repository interpretation belongs to the repository-local `@moldea.ai/cli` and its
shared Core implementation. This skill consumes that JSON contract rather than maintaining a
parallel parser or validator.
