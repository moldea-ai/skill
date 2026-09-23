import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'initialize-sufficient-context',
  setup: createSemanticCaseSetup('initialize-sufficient-context'),
  scenario:
    "Explicit initialization finds concise authoritative documentation and corroborating implementation that clearly establish the project's purpose, consumers, goals, and payment-authority boundary.",
  operation: 'initialize',
  input: {
    developerDirection: 'Initialize moldea',
    repositoryEvidence: [
      {
        claim: 'The README defines extraction, validation, consumers, and the payment boundary.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Implementation corroborates extraction and validation.',
        source: {
          kind: 'workspace-path',
          path: 'src/invoice.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'No canonical state exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea',
          expectedType: 'missing',
        },
      },
    ],
  },
  expected: [
    {
      label: 'report-adopted-project',
      criterion:
        'After completing initialization, the actor reports the project as adopted because the complete canonical foundation and owned README awareness block now exist.',
    },
    {
      label: 'create-minimum-canonical-foundation',
      criterion:
        'The workspace changes create minimum canonical foundation with content and relationships supported by the scenario evidence.',
    },
    {
      label: 'add-owned-readme-awareness',
      criterion:
        'The workspace contains exactly one correctly marked owned README awareness block with the required moldea guidance, while preserving unrelated README content.',
    },
    {
      label: 'report-evidence-backed-foundation',
      criterion:
        'The actor response explicitly reports evidence backed foundation, with the supplied workspace evidence remaining consistent with that report.',
    },
    {
      label: 'rerun-deterministic-inspection',
      criterion:
        "Runner-owned actor execution evidence contains a completed installed-skill launcher-backed `validate` invocation after the actor's writes, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none; it need not repeat the literal invocation.",
    },
    {
      label: 'offer-practical-next-actions',
      criterion:
        'The completion response offers practical next actions without steering the developer toward unnecessary agent creation.',
    },
    {
      label: 'avoid-automatic-agent',
      criterion:
        'The response and workspace changes avoid automatic agent while still completing the requested outcome.',
    },
  ],
  forbidden: [
    {
      label: 'ask-ceremonial-question',
      criterion:
        'The actor asks ceremonial question even though the available evidence already supports a complete decision.',
    },
    {
      label: 'create-agent',
      criterion:
        'The workspace changes create agent even though this scenario does not authorize or support it.',
    },
    {
      label: 'create-unnecessary-context',
      criterion:
        'The workspace changes create unnecessary context even though this scenario does not authorize or support it.',
    },
    {
      label: 'claim-validity-without-deterministic-evidence',
      criterion:
        'The actor claims the resulting project is valid without reporting compatible launcher-backed validation evidence.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['initialization-and-tooling-safety'],
});
