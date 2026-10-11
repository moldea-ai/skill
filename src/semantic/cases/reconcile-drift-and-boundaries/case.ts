import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'reconcile-drift-and-boundaries',
  setup: createSemanticCaseSetup('reconcile-drift-and-boundaries'),
  scenario: 'Repair a renamed implementation binding without guessing a dynamic tool registration.',
  operation: 'repair-agent-binding',
  input: {
    developerDirection:
      'The support implementation was renamed to src/support-assistant.ts. Update its stale runtime-agent binding to the existing supportAssistant export. src/dynamic-tools.ts assembles tool registrations dynamically; record that boundary under agents.support.unresolved with category tool-registration, effect warning, a concrete resolution, and the related source path. Preserve the accurate support instruction and both implementation files. Do not recreate src/support-agent.ts or invent a tool binding. Validate and inspect the final task diff.',
    repositoryEvidence: [
      {
        claim: 'The old implementation was removed.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.ts',
          expectedType: 'missing',
        },
      },
      {
        claim: 'The renamed implementation exports supportAssistant.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-assistant.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'The tool registry is dynamically assembled.',
        source: {
          kind: 'workspace-path',
          path: 'src/dynamic-tools.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'The canonical instruction remains accurate.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/support/instruction.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'repairs-binding',
      criterion:
        'The runtime-agent binding points to /src/support-assistant.ts at supportAssistant, with no obsolete /src/support-agent.ts relationship or recreated source.',
    },
    {
      label: 'records-boundary',
      criterion:
        'agents.support.unresolved records the dynamic tool-registration gap with effect warning, a concrete source-or-test resolution, and /src/dynamic-tools.ts as related evidence; no unproven tool binding is invented.',
    },
    {
      label: 'preserves-source',
      criterion:
        'Both surviving implementation files, canonical support assets, and custom runtime guidance remain unchanged; only the necessary manifest relationships and unresolved record change.',
    },
    {
      label: 'validates-repair',
      criterion:
        'Runner-owned evidence records successful launcher-backed final validation, and the report distinguishes explicit file/export coverage from the unresolved runtime connection.',
    },
  ],
  forbidden: [
    {
      label: 'invented-static-proof',
      criterion:
        'The actor claims the dynamic tool registration was verified by Core, fabricates a tool binding, or recreates the removed source.',
    },
    {
      label: 'unrelated-rewrite',
      criterion:
        'The actor changes implementation, accurate instructions, or runtime guidance to force a preferred code pattern.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design', 'project-repair-and-recovery'],
});
