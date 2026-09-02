# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct OpenAI Responses API wrapper, its instruction loader, and the `classify_order` function tool with its repository-established implementation, registration, and input schema to their exact existing symbols. Add no redundant runtime guide and do not claim the adapter proves runtime execution or invent output schemas, routing, handoffs, subagents, agent input schemas, or refund authority. Validate the complete project.
