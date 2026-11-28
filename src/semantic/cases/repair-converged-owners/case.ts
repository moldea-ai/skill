import { defineSemanticCase } from '../define.ts';
import { semanticCase as mixedOwnerCase } from '../repair-mixed-context-owners/case.ts';
import { verifyMixedOwnerConvergence } from '../repair-mixed-context-owners/verification.ts';

export const semanticCase = defineSemanticCase({
  ...mixedOwnerCase,
  id: 'repair-converged-owners',
  scenario:
    'The shop and journal owner is split with approval, then the same project gets another plain Fix.',
  operation: 'fix-convergence',
  input: {
    ...mixedOwnerCase.input,
    followUpDeveloperRequests: ['Yes, apply that split.', 'fix moldea'],
  },
  verifyWorkspace: verifyMixedOwnerConvergence,
  expected: [
    mixedOwnerCase.expected[0]!,
    {
      label: 'propose-before-approval',
      criterion:
        'Request 1 gives the exact mixed-owner verdict, split and project.md routes, performs only independent relationship cleanup, and carries the unchecked lockfile into its Resume point. The combined owner and routing are unchanged until approval. Reconcile all 13 starting declarations and report the exact added, removed and unchecked paths separately with their evidence, reasons and gaps. Add only candidate paths referenced by the owner and replace the spring edition declaration with the coherent collection glob.',
    },
    {
      label: 'apply-the-accepted-split',
      criterion:
        'Request 2 applies the actual proposal from request 1. It retains the refund, editorial, and delivery facts and rules, routes to each resulting owner, distributes the relationships to their actual owners, preserves each necessary supporting link, and removes the combined declaration. Unresolved lockfile evidence remains visible without inventing a relationship. Validate succeeds after writing.',
    },
    {
      label: 'second-fix-no-edits',
      criterion:
        'Request 3 gives each resulting owner a verdict and reconciles the kept counts and roles, removals and unchecked paths with that owner’s post-split manifest. Name each kept sole-enforcement path and its individual rule. Any unresolved declaration is named exactly with its evidence gap. The workspace is byte-identical, Git controls are unchanged, and validation succeeds. The guide probe matches no owner and both governed editions select the editorial owner through the same collection glob.',
    },
  ],
  forbidden: [
    {
      label: 'skip-approval-or-hide-drift',
      criterion:
        'The actor applies a split before approval, applies a different split than was approved, loses unique knowledge, rewrites a healthy second-pass workspace, changes Git state, or calls Fix complete with an unchecked path.',
    },
  ],
});
