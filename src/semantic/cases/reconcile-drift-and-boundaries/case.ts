import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'reconcile-drift-and-boundaries',
  setup: createSemanticCaseSetup('reconcile-drift-and-boundaries'),
  scenario: 'Repair a renamed implementation binding without guessing a dynamic tool registration.',
  operation: 'fix-agent-binding',
  input: {
    developerDirection:
      'Fix moldea for the support agent. The support implementation was renamed to src/support-assistant.ts. Update its stale runtime-agent binding to the existing supportAssistant export. src/dynamic-tools.ts assembles tool registrations dynamically; report that limitation and the source or test needed to verify the connection. Preserve the accurate support instruction and both implementation files. Do not recreate src/support-agent.ts or invent a tool binding. Validate and inspect the final task diff.',
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
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
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
        'The report identifies the dynamic tool-registration gap in /src/dynamic-tools.ts and the focused source or test evidence that could resolve it. The manifest contains no invented tool binding.',
    },
    {
      label: 'preserves-source',
      criterion:
        'Both surviving implementation files and canonical support assets remain unchanged. Only the necessary binding changes.',
    },
    {
      label: 'validates-repair',
      criterion:
        'Runner-owned evidence records successful bundled CLI final validation, and the report distinguishes explicit file/export coverage from the unresolved runtime connection.',
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
        'The actor changes implementation or accurate instructions to force a preferred code pattern.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design', 'project-repair-and-recovery'],
});
