---
title: Work across dedicated repositories
navigationTitle: Dedicated repositories
description: A two-repository example that uses external implementation evidence without inventing cross-repository bindings or atomicity.
section: examples
order: 160
---

# Keep canonical state and implementation separately owned

## Developer and coding agent

**Developer**

```text
The canonical agent repository is open here, and the application implementation is in ../storefront. Evaluate the checkout agent across both repositories without changing either one.
```

**Coding agent**

```text
I inspected the canonical repository and the developer-identified storefront repository. Canonical state is structurally valid, and the application loads the canonical instruction through its provisioning step. The local adapter evidence is partial because implementation lives externally; that is an evidence-location limitation, not proof that the runtime is absent. No files changed in either repository.
```

## Coding agent and `moldea` under the hood

1. The coding agent treats the current repository as the canonical owner and the identified application as separate semantic evidence.
2. It runs deterministic inspection only against the canonical repository's verified local tooling.
3. It inspects the external application's actual runtime construction, instruction provisioning, capabilities, and tests proportionally.
4. It does not register cross-repository paths, mirrors, bindings, or impact relationships in format version 1.
5. It evaluates each repository independently and does not imply cross-repository Git atomicity.

If a later write request authorizes only one repository, the coding agent completes only that side and reports what remains incomplete on the other.
