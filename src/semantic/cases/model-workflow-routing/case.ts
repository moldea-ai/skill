import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'model-workflow-routing',
  setup: createSemanticCaseSetup('model-workflow-routing'),
  scenario:
    'An adopted project has an unbound one-shot model workflow with inline instructions and an evidenced injected runtime boundary. A natural implementation request changes its model responsibilities without naming agents or moldea.',
  operation: 'maintain-model-workflow',
  input: {
    developerDirection:
      'Extend src/incident-workflow.js so the model can classify billing incidents as well as availability and performance incidents. It must return unknown when the report does not support a category. Its briefing must separate reported facts from uncertainty and never invent a resolution. Preserve the client.generate contract and complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The actual workflow supplies inline model instructions to its injected client.',
        source: { kind: 'workspace-path', path: 'src/incident-workflow.js', expectedType: 'file' },
      },
      {
        claim: 'A native integration test observes the real workflow invocation.',
        source: {
          kind: 'workspace-path',
          path: 'src/incident-workflow.test-integration.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Runtime documentation establishes the local protocol and its evidence limits.',
        source: { kind: 'workspace-path', path: 'docs/model-runtime.md', expectedType: 'file' },
      },
      {
        claim: 'The adopted project has no declared workflow relationship or registered agent.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  expected: [
    {
      label: 'maintain-model-responsibility',
      criterion:
        'The actor recognizes direct model work after adoption and maintains canonical instructions covering billing, availability, performance, unknown on insufficient evidence, facts versus uncertainty, and no invented resolution. It preserves the injected client protocol and registers only evidenced runtime and instruction-consumption relationships, without requiring a separate agent per model call.',
    },
    {
      label: 'prove-instruction-consumption',
      criterion:
        'Workspace evidence establishes a complete path from canonical instructions to the real model invocation, with no independently maintained inline policy left behind. A real loader or required exact mirror is acceptable. The focused native integration test verifies that consumption and runner-owned runtime-test evidence reports a passing test.',
    },
    {
      label: 'bound-and-verify-canonical-work',
      criterion:
        'The actor completes relevant native checks and launcher-backed validation, reports the structural result accurately, and preserves material provider or behavioral evidence gaps as unresolved limitations rather than claiming production readiness from a canned response.',
    },
  ],
  forbidden: [
    {
      label: 'miss-direct-model-work',
      criterion:
        'The actor treats the absent relationship as a permanent exclusion, updates only inline instructions, or creates canonical instructions that the runtime never consumes.',
    },
    {
      label: 'invent-runtime-assurance',
      criterion:
        'The actor invents provider support, runtime bindings, broad relationships, or behavioral verification beyond the local protocol and controlled test evidence, or removes meaningful runtime coverage to obtain a pass.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 7,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['agent-and-skill-design', 'bounded-relevance'],
});
