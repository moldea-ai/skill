# Create the order-triage agent

Add the order-triage agent implemented by `OrderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the directly exported Cloudflare Think class, its instruction loader, and the `classify_order` function tool with its implementation, registration, input schema, and output schema to their exact existing symbols. Add no redundant runtime guide and do not invent provider, model, routing, handoff, subagent, agent schema, or refund authority. Validate the complete project.
