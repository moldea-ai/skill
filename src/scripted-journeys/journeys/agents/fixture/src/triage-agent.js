// the project's sole model invocation currently owns an inline durable instruction
export const createTriageAgent = (client, ticket) =>
  client.respond({
    instructions:
      'You triage parcel pickup questions. Escalate parcels waiting more than 24 hours to staff. Never promise a collection without a pickup code.',
    input: ticket,
  });
