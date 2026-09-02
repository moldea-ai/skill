# Custom runtime

The runtime calls `createOrderTriageAgent` with an instruction loader. The factory requests `/moldea/agents/order-triage/instruction.md` from that loader for every invocation and uses the returned canonical content as its `instruction`. The runtime may classify an order for human review but does not expose refund approval or financial mutation authority.
