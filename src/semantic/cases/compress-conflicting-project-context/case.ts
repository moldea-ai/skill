import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'compress-conflicting-project-context',
  setup: createSemanticCaseSetup('compress-conflicting-project-context'),
  scenario:
    'An adopted project has two canonical context files that make consequential conflicting current ownership claims within the requested compression scope.',
  operation: 'maintain-context-compression',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Consolidate the duplicated project context so each durable fact has one authoritative owner.',
    repositoryEvidence: [
      {
        claim: 'The manifest registers both conflicting current context files.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'One canonical context file says Finance owns escalation approval.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/finance-operations.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Another canonical context file says Customer Operations owns escalation approval.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/customer-operations.md',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'identify-compression-conflict',
      criterion:
        'The actor identifies the exact Finance and Customer Operations ownership claims as consequential same-scope current-state conflict rather than proven duplication.',
    },
    {
      label: 'ask-focused-compression-question',
      criterion:
        'The actor asks one focused question establishing which team currently owns escalation approval or whether one claim describes proposed or future state.',
    },
    {
      label: 'preserve-conflicting-context-before-answer',
      criterion:
        'The actor explicitly states that it cannot safely complete compression before the conflict is resolved, or gives an equivalent no-write explanation, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'choose-conflicting-context-owner',
      criterion:
        'The actor selects Finance or Customer Operations as current owner without developer clarification or reliable independent resolving evidence, including by treating source type, list position, recency, formatting, specificity, canonical location, or inspection order as conflict precedence.',
    },
    {
      label: 'merge-contradictory-current-claims',
      criterion:
        'The workspace changes merge both incompatible ownership claims into ambiguous current wording.',
    },
    {
      label: 'write-during-compression-conflict',
      criterion:
        'Workspace evidence contains any repository change while the consequential conflict remains unresolved.',
    },
    {
      label: 'claim-compression-complete',
      criterion:
        'The actor claims compression is complete despite the unresolved ownership conflict.',
    },
  ],
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 65536,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
