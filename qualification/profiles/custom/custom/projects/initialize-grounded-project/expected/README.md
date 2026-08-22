# Invoice review service

This project reviews invoice line items for duplicate references and arithmetic mismatches. It returns findings for a human finance operator and never authorizes or sends a payment.

<!-- moldea:start -->

## `moldea`

This repository uses `moldea`. Canonical `moldea` project state lives under `/moldea/**`.

When making a change that may affect project truth or agent behavior, use the `moldea` Agent Skill to inspect the affected system and keep relevant context, decisions, runtime guidance, agent descriptions and instructions, bindings, schemas, capabilities, variables, unresolved requirements, and mirrors aligned with the implementation.

A relevant change requires reconsideration of the affected `moldea` state; it does not require editing `/moldea/**` when established project truth and declared agent behavior remain unchanged.
<!-- moldea:end -->
