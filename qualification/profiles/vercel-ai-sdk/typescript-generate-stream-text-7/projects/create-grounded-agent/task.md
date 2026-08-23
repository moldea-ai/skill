# Create the order-triage agent

Create and register the Moldea agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Vercel AI SDK wrapper, its instruction loader, structured output, and the `classify_order` function tool to their exact existing symbols. Add no redundant runtime guide and do not invent provider, model, routing, handoff, subagent, input-schema, or refund authority. Validate the complete project.
