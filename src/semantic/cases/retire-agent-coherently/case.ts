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
      'The support runtime implementation was intentionally removed. Retire its canonical agent, binding, sole custom runtime guidance, obsolete README prose, and the test and package test script that depend exclusively on the removed source together. Preserve moldea/project.md, src/project-state.ts, and all surviving project context. Validate the final repository and report the evidence showing which declarations and files became obsolete.',
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
    maximumMoldeaCommands: 8,
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
        'The obsolete support description, instruction, sole /moldea/runtimes/custom.md, src/support-agent.test-integration.ts, and the package.json test script targeting that test are removed together; obsolete README prose is removed, while the removed source is not recreated.',
    },
    {
      label: 'preserves-surviving-context',
      criterion:
        'Project foundation, /src/project-state.ts, surviving context relationships, shared policy, and unrelated README content remain unchanged.',
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
        'The actor leaves obsolete agent declarations, assets, bindings, sole runtime guidance, README prose, agent test, or package test script behind.',
    },
    {
      label: 'deletes-survivors',
      criterion:
        'The actor deletes or rewrites project foundation, surviving context, shared policy, unrelated README content, or source, or recreates the removed agent implementation.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design', 'context-maintenance-and-compression'],
});
