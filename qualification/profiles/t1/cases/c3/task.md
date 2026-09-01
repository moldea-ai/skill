# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Anthropic Messages API wrapper, its instruction loader, and the `classify_order` client tool with its repository-established implementation, registration, and input schema to their exact existing symbols. Add no redundant runtime guide and do not invent output-schema, routing, handoff, subagent, agent input-schema, or refund authority. Validate the complete project.
