import { defineScriptedJourney } from '../index.ts';

// exercise one evidenced custom invocation through planning, registration, maintenance, and retirement
export const scriptedJourney = defineScriptedJourney({
  id: 'agents',
  title: 'An agent through its lifecycle',
  summary: 'Plan a parcel triage agent, ground its invocation, update policy, and retire it.',
  order: 4,
  fixture: { adopted: true, installCli: true },
  steps: [
    {
      id: 'plan',
      request:
        'Plan how to register our existing parcel-triage model call as one grounded agent. Inspect src/triage-agent.js and the saved triage policy. State its responsibility and the work needed; do not edit files.',
      dependsOn: [],
      checks: [
        { kind: 'no-changes' },
        { kind: 'reply-matches', pattern: 'parcel[- ]triage|triage[\\s\\S]{0,80}parcel' },
      ],
      unverified: ['The plan distinguishes agent responsibility from ordinary software.'],
    },
    {
      id: 'create',
      request:
        'Approved. Create and register the parcel-triage agent with description.md and instruction.md under moldea/agents/parcel-triage/. Ground it in moldea/context/triage.md. Make the existing createTriageAgent invocation in src/triage-agent.js consume the canonical instruction, preserve the injected client.respond interface, and verify instruction consumption with the existing tests. Use the evidenced custom runtime; do not install an SDK.',
      dependsOn: ['plan'],
      checks: [
        { kind: 'path-exists', path: 'moldea/agents/parcel-triage/description.md' },
        { kind: 'path-exists', path: 'moldea/agents/parcel-triage/instruction.md' },
        {
          kind: 'content-matches',
          path: 'moldea/moldea.yaml',
          pattern: 'path:\\s*/src/triage-agent\\.js',
        },
        {
          kind: 'content-matches',
          path: 'moldea/moldea.yaml',
          pattern: 'symbol:\\s*createTriageAgent',
        },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: [
        'Focused tests prove canonical instruction consumption; no live provider behavior is claimed.',
      ],
    },
    {
      id: 'policy',
      request:
        'The approved escalation threshold is now 48 hours instead of 24 hours. Update the saved triage policy and the parcel-triage canonical instruction so that both state 48 hours, preserve instruction consumption, and run the focused tests.',
      dependsOn: ['create'],
      checks: [
        { kind: 'content-matches', path: 'moldea/context/triage.md', pattern: '\\b48\\b' },
        {
          kind: 'content-matches',
          path: 'moldea/agents/parcel-triage/instruction.md',
          pattern: '\\b48\\b',
        },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['The actual invocation consumes the updated instruction.'],
    },
    {
      id: 'retire',
      request:
        'Retire the parcel-triage agent and its custom runtime call. Remove its canonical agent directory, src/triage-agent.js and its now-obsolete focused test, and all manifest declarations made unnecessary by that retirement. Preserve the shared triage policy and project foundation. No replacement agent is needed.',
      dependsOn: ['policy'],
      checks: [
        { kind: 'path-absent', path: 'moldea/agents/parcel-triage' },
        { kind: 'path-absent', path: 'src/triage-agent.js' },
        { kind: 'path-exists', path: 'moldea/context/triage.md' },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['Every superseded consumer and relationship was removed.'],
    },
  ],
});
