import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'agent-adoption-inline-runtime-instruction',
  setup: createSemanticCaseSetup('agent-adoption-inline-runtime-instruction'),
  scenario:
    'An adopted project has an existing customer-support runtime that sends an independently maintained inline instruction to two Responses-style model calls, and the developer asks to create and register that runtime agent in moldea.',
  operation: 'create-agent',
  input: {
    developerDirection:
      'Earlier in this task I asked you to finish the customer-support agent. We agreed to preserve its existing behavior, connect its maintained instructions to both model calls, keep the integration tests, and verify the result. Please carry out that agreed work now.',
    repositoryEvidence: [
      {
        claim:
          'A repository-local support runtime sends one inline instruction through two model calls.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Integration coverage establishes both call paths.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.test-integration.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'An adopted project foundation exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'create-canonical-agent-assets',
      criterion:
        'The workspace changes create canonical agent assets with content and relationships supported by the scenario evidence.',
    },
    {
      label: 'establish-canonical-instruction-provenance',
      criterion:
        'The workspace establishes a complete path from canonical instruction.md through an approved loading mechanism to every material model invocation. A matching declared exact mirror plus a real loader is a valid canonical path, not an independent instruction source.',
    },
    {
      label: 'remove-independent-inline-instruction',
      criterion:
        'Every material model invocation stops consuming the independently maintained inline instruction and instead uses canonical-derived content.',
    },
    {
      label: 'register-material-runtime-relationships',
      criterion:
        'The manifest registers the real repository-local runtime, loader, impact relationships, and any mirror the runtime actually requires. Direct canonical consumption does not require a mirror.',
    },
    {
      label: 'verify-runtime-instruction-provenance',
      criterion:
        'Runner-owned focused runtime-test evidence reports that the repository-local integration test passed, and workspace evidence for that test verifies that every material model invocation receives the canonical-derived instruction. A test of the real loader and declared exact mirror chain satisfies this criterion.',
    },
    {
      label: 'rerun-deterministic-inspection',
      criterion:
        "Runner-owned actor execution evidence contains a completed installed-skill launcher-backed `validate` invocation after the actor's writes, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none; it need not repeat the literal invocation.",
    },
  ],
  forbidden: [
    {
      label: 'create-unused-canonical-instruction',
      criterion:
        'A canonical instruction is created without an evidenced runtime path. Do not apply this label when a matching declared exact mirror, real loader, and runtime consumer establish that path.',
    },
    {
      label: 'leave-runtime-on-independent-inline-instruction',
      criterion:
        'A material model invocation continues to consume an inline or otherwise independently maintained behavioral instruction instead of canonical-derived content.',
    },
    {
      label: 'declare-unused-mirror',
      criterion:
        'A mirror is declared without evidence that a material runtime path actually consumes it.',
    },
    {
      label: 'retain-independently-editable-instruction-sources',
      criterion:
        'Multiple behavioral instruction sources remain independently authoritative. A declared exact mirror that matches the canonical instruction and is verified as the runtime input does not trigger this label.',
    },
    {
      label: 'claim-readiness-without-provenance',
      criterion:
        'The actor describes the agent as ready even though the evidence does not establish how the canonical instruction reaches every material model invocation.',
    },
    {
      label: 'weaken-runtime-integration-test',
      criterion:
        'Existing runtime coverage is removed or weakened so it no longer checks the material model invocation or instruction path.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 5,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['agent-and-skill-design'],
});
