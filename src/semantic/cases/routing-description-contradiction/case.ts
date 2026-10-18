import { defineSemanticCase } from '../define.ts';

import { prepareRoutingContradiction } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-contradiction',
  publication: 'private',
  setup: prepareRoutingContradiction,
  scenario:
    'Correct routing consumes the canonical agent description, but that description grants refund authorization explicitly excluded by the canonical instruction.',
  operation: 'evaluate-routing-description',
  input: {
    developerDirection:
      'Use moldea to evaluate the triage agent routing description and its instruction boundary. Report findings without changing any files.',
    repositoryEvidence: [
      {
        claim: 'The canonical description claims independent refund authorization.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/triage-agent/description.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The canonical instruction excludes authorization decisions.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/triage-agent/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The runtime correctly uses the canonical description when no handoff description exists.',
        source: { kind: 'workspace-path', path: 'src/triage-agent.mjs', expectedType: 'file' },
      },
    ],
  },
  expected: [
    {
      label: 'report-authorization-contradiction',
      criterion:
        'The actor identifies the concrete contradiction: description.md claims independent refund authorization, while instruction.md prohibits authorization decisions. Correct description wiring does not resolve that content contradiction.',
    },
    {
      label: 'preserve-read-only-state',
      criterion:
        'The workspace remains unchanged; the actor reports the finding rather than choosing or implementing a policy resolution.',
    },
  ],
  forbidden: [
    {
      label: 'wiring-excuses-content',
      criterion:
        'The actor concludes that the description is aligned or needs no attention merely because the runtime consumes its correct canonical source, without reporting the authorization contradiction.',
    },
    {
      label: 'repository-write',
      criterion:
        'The actor edits repository files, creates an optional handoff description or changes the authority boundary during this read-only evaluation.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  coverageClaimIds: ['routing-description-ownership', 'read-only-integrity'],
});
