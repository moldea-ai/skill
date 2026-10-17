import { defineSemanticCase } from '../define.ts';

import { prepareFeatureBoundary } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-feature-relationship-boundary',
  setup: prepareFeatureBoundary,
  scenario:
    'A refund policy changes its owner content while the same task changes shared presentation, navigation, routing and a display-data helper.',
  operation: 'maintain-relevant-change',
  input: {
    developerDirection:
      'Lower the refund approval threshold in src/refund-policy.js to 500 units and keep the refund context current. In src/refund-request.js, compute the approval decision before building the response without changing its public shape. Also change the shared src/ui/card.js component to uppercase its supplied label (Refund becomes REFUND), src/ui/navigation.js to return Refunds, src/router.js to return /support/refunds, and src/data/refund-view.js to format amounts with two decimal places. These four modules own display and navigation only, not refund approval. Preserve exports and unrelated state, update the relevant native tests including the 500/501 boundary, and run the checks.',
    repositoryEvidence: [
      {
        claim:
          'The refund owner has an existing caller relationship and states the approval policy.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'Refund approval policy lives in the targeted policy module.',
        source: { kind: 'workspace-path', path: 'src/refund-policy.js', expectedType: 'file' },
      },
      {
        claim: 'The targeted caller exposes approval without owning presentation infrastructure.',
        source: { kind: 'workspace-path', path: 'src/refund-request.js', expectedType: 'file' },
      },
      ...['src/ui/card.js', 'src/ui/navigation.js', 'src/router.js', 'src/data/refund-view.js'].map(
        (filePath) => ({
          claim: 'This targeted module owns display or navigation, not refund approval.',
          source: {
            kind: 'workspace-path' as const,
            path: filePath,
            expectedType: 'file' as const,
          },
        }),
      ),
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
      label: 'complete-policy-and-display-changes',
      criterion:
        'The policy requires approval only above 500 units; the caller preserves its public response shape. The four display/navigation modules implement the requested outputs. Refund context changes to the 500-unit policy. Meaningful native tests cover 500/501 and the changed display outputs, and runner evidence records passing tests and successful launcher-backed validation.',
    },
    {
      label: 'add-only-governing-policy-relationship',
      criterion:
        'The added manifest relationship names the exact /src/refund-policy.js file for the existing refunds owner whose content changes. Either an affectedBy entry or an evidenced binding is valid, without duplicating the bound path as affectedBy. Its existing /src/refund-request.js relationship remains. At most one additional exact relationship to a test that protects the changed refund approval policy is allowed. No other path or owner relationship is added or changed.',
    },
  ],
  forbidden: [
    {
      label: 'over-add-inspected-infrastructure',
      criterion:
        'Any added relationship other than the exact refund-policy path and at most one exact test protecting the changed refund approval policy fails. Shared UI, navigation, router, display-data helper, broad globs, unrelated or presentation-only tests, multiple added test relationships, and another owner still fail. The actor also fails if it rewrites unrelated canonical content, changes approval beyond the requested rule, or leaves requested work unchecked.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression'],
});
