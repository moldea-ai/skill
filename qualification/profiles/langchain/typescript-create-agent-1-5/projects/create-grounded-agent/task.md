# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct LangChain agent definition, its instruction loader, structured output, and the `classify_order` function tool with its implementation, registration, and input schema to their exact existing symbols. Add no redundant runtime guide and do not invent provider, model, routing, handoff, subagent, or refund authority. Validate the complete project.
