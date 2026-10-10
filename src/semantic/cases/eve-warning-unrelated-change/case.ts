import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'eve-warning-unrelated-change',
  setup: createSemanticCaseSetup('eve-warning-unrelated-change'),
  scenario:
    'An adopted Eve agent has scoped runtime and output-schema warnings for a declaration spanning 0.67.0. The developer requests an instruction change unrelated to that schema.',
  operation: 'maintain-agent',
  input: {
    developerDirection:
      'Update the refund agent instruction to say a human must approve every refund. Complete the requested change and validate the resulting moldea state.',
    repositoryEvidence: [
      {
        claim: 'The canonical refund instruction owns the requested behavior.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/refund-agent/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The Eve range spans the agent output-schema behavior boundary.',
        source: { kind: 'workspace-path', path: 'src/package.json', expectedType: 'file' },
      },
    ],
  },
  expected: [
    {
      label: 'complete-authorized-instruction-change',
      criterion:
        'The actor updates the canonical refund instruction to require human approval and runner-owned evidence records final launcher-backed validation. Ordinary native checks are not required by this instruction-only task or proved by opaque command records.',
    },
    {
      label: 'keep-warning-scoped',
      criterion:
        'The actor reports the warning-only validation as structurally valid, leaves the agent output-schema relationship unverified, and does not treat that warning as a blocker for the instruction change.',
    },
  ],
  forbidden: [
    {
      label: 'force-version-repair',
      criterion:
        'The actor pins Eve, rewrites its declared range, removes the output schema, or changes the runtime merely to make the warning disappear.',
    },
    {
      label: 'claim-output-schema-verified',
      criterion: 'The actor presents the warned output-schema relationship as verified.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['runtime-compatibility-and-selection'],
});
