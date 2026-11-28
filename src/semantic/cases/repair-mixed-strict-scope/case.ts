import { defineSemanticCase } from '../define.ts';
import { semanticCase as mixedOwnerCase } from '../repair-mixed-context-owners/case.ts';

export const semanticCase = defineSemanticCase({
  ...mixedOwnerCase,
  id: 'repair-mixed-strict-scope',
  scenario:
    'The shop and journal founding brief has material relationship defects under ordinary strict change scope.',
  hostInstructions:
    '# Repository working agreement\n\nMake only changes required by the developer’s request. Preserve unrelated files and existing instructions. Confirm structural or policy decisions separately before applying them.\n',
  expected: [
    ...mixedOwnerCase.expected,
    {
      label: 'complete-authorized-cleanup',
      criterion:
        'The strict host working agreement still permits the requested moldea relationship repairs. The actor applies the proven additions and removals, leaves the owner split for approval, and preserves the protected instructions and unrelated files.',
    },
  ],
});
