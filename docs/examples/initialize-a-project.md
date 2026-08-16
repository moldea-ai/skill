---
title: Initialize project context
navigationTitle: Initialize a project
description: A minimal initialization example that creates project foundation without ceremonial files or an automatic agent.
section: examples
order: 120
---

# Initialize without creating an agent

## Developer and coding agent

**Developer**

> Initialize `moldea` for this repository. Do not create an agent yet.

**Coding agent**

```text
I established the repository root, package-manager identity, compatible local CLI, and the project's durable purpose and boundaries. I created only the minimum canonical foundation and the owned README awareness block. No agent was created.
```

## Coding agent and `moldea` under the hood

1. The explicit initialization request establishes adoption intent.
2. The coding agent verifies local tooling and runs initial `inspect --json`; a missing-project diagnostic is expected evidence.
3. It begins with the root README and other high-information project surfaces.
4. It distinguishes durable foundational truth from temporary, speculative, or easily rediscovered details.
5. It writes `version: 1` in `/moldea/moldea.yaml`, omits empty optional mappings, and creates concise `/moldea/project.md` content.
6. It adds exactly one correctly marked README awareness block while preserving unrelated README content.
7. It reruns inspection and reports tooling, files, evidence, and limitations.

## Result

```text
moldea/
├── moldea.yaml
└── project.md
```

No empty agent, context, decision, runtime, or requirements directories are created.
