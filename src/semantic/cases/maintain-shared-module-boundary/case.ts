import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-shared-module-boundary',
  setup: createSemanticCaseSetup('maintain-shared-module-boundary'),
  scenario: 'A tracking policy source and shared UI tab styling change in one batch.',
  operation: 'maintain-relevant-change',
  input: {
    developerDirection:
      'Orders marked delivered must never return to in-transit. Implement that rule in src/orders/tracking.js and keep its focused context current. Also change src/ui/tabs/tabs.js so its selected tab uses the active class. The tab component hosts the tracking screen but does not own tracking policy.',
    repositoryEvidence: [
      {
        claim: 'The tracking context owns the rule.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/tracking.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The policy implementation is bound.',
        source: {
          kind: 'workspace-path',
          path: 'src/orders/tracking.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The shared tab component exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/ui/tabs/tabs.js',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'maintain-policy-boundary',
      criterion:
        'The tracking implementation and focused context reflect the approved rule, and the existing tracking relationship remains.',
    },
    {
      label: 'exclude-shared-ui-impact',
      criterion:
        'No tracking-owner affectedBy entry is added for /src/ui/tabs/**; final validation passes.',
    },
  ],
  forbidden: [
    {
      label: 'shared-ui-overreach',
      criterion:
        'The actor relates /src/ui/tabs/** or /src/** to tracking, alters other owners, or treats the tab layout as a tracking-policy fact.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
