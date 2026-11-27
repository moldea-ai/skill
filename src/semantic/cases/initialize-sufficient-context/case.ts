import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'initialize-sufficient-context',
  publication: 'private',
  setup: createSemanticCaseSetup('initialize-sufficient-context'),
  scenario:
    "Explicit initialization finds concise authoritative documentation and corroborating implementation that clearly establish the project's purpose, consumers, goals, and payment-authority boundary.",
  operation: 'initialize',
  input: {
    developerDirection: 'Initialize moldea',
    followUpDeveloperRequests: ['yes', 'Stop here.'],
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
      label: 'guided-round-from-evidence',
      criterion:
        'After writing the sufficient foundation and integration, the actor sends a single numbered Round 1 with up to five proposed, source-specific questions on real gaps such as invoice-validation rules or the source relationship. It shows progress and waits for confirmation before writing proposed additions or running final validation.',
    },
    {
      label: 'report-adopted-project',
      criterion:
        'Report adoption for the covered scope once the complete canonical foundation exists. Identify unfinished integration separately when present. When both are complete, a concise combined status is sufficient.',
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
        'Identify the established foundation in the first guided round or foundation report. Compare the reported and recorded purpose, users, goals, and payment-authority boundary with the supplied documentation and corroborating code to establish grounding.',
    },
    {
      label: 'rerun-deterministic-inspection',
      criterion:
        'Runner-owned actor execution evidence contains a completed bundled CLI `validate` invocation, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none; it need not repeat the literal invocation.',
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
        'The actor asks a generic questionnaire or restates questions already answered by the README. Specific, evidence-backed proposals for unresolved context gaps are expected.',
    },
    {
      label: 'create-agent',
      criterion:
        'The workspace changes create agent even though this scenario does not authorize or support it.',
    },
    {
      label: 'create-unnecessary-context',
      criterion:
        'The actor persists an unconfirmed or unsupported proposal, invents policy, or writes unnecessary context.',
    },
    {
      label: 'claim-validity-without-deterministic-evidence',
      criterion:
        'The actor claims the resulting project is valid without reporting compatible bundled CLI validation evidence.',
    },
  ],
  resourceBudget: {
    profile: 'largeTraversal',
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 12,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['initialization-and-tooling-safety'],
});
