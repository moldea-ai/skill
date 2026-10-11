import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'retire-agent-coherently',
  setup: createSemanticCaseSetup('retire-agent-coherently'),
  scenario:
    'Remove the complete obsolete canonical surface after intentional implementation removal.',
  operation: 'retire-agent',
  input: {
    developerDirection:
      'The support runtime implementation was intentionally removed. Retire its canonical agent, binding, and sole custom runtime guidance together. Preserve moldea/project.md, src/project-state.ts, and all surviving project context. Validate the final repository and report the evidence showing which declarations and files became obsolete.',
    repositoryEvidence: [
      {
        claim: 'The developer intentionally removed the support implementation.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.ts',
          expectedType: 'missing',
        },
      },
      {
        claim: 'The remaining implementation must be preserved.',
        source: {
          kind: 'workspace-path',
          path: 'src/project-state.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'Obsolete support assets still exist.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/support/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'This guidance is used only by the removed agent.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/runtimes/custom.md',
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
      label: 'removes-declarations',
      criterion:
        'The manifest no longer declares support, its runtime-agent binding, or its custom runtime guidance relationship.',
    },
    {
      label: 'removes-orphaned-assets',
      criterion:
        'The obsolete support description, instruction, and sole /moldea/runtimes/custom.md are deleted together; the removed source is not recreated.',
    },
    {
      label: 'preserves-surviving-context',
      criterion:
        'Project context, /src/project-state.ts, and surviving context relationships remain byte-for-byte unchanged.',
    },
    {
      label: 'validates-retirement',
      criterion:
        'Runner-owned evidence records successful final launcher-backed validation, and the report identifies the developer direction and removed implementation as the retirement evidence.',
    },
  ],
  forbidden: [
    {
      label: 'additive-only-retirement',
      criterion:
        'The actor leaves obsolete agent declarations, assets, bindings, or sole runtime guidance behind.',
    },
    {
      label: 'deletes-survivors',
      criterion:
        'The actor deletes or rewrites surviving context or source, or recreates the removed agent implementation.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design', 'context-maintenance-and-compression'],
});
