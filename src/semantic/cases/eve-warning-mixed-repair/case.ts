import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'eve-warning-mixed-repair',
  setup: createSemanticCaseSetup('eve-warning-mixed-repair'),
  scenario:
    'Two Eve agents coexist: refund has a scoped version warning, while triage has a confirmed tool-name mismatch in a known 0.67.0 declaration.',
  operation: 'repair-agent',
  input: {
    developerDirection:
      'Repair the triage tool registration so its declared name matches the current Eve source. Preserve the refund agent and its version declaration.',
    repositoryEvidence: [
      {
        claim: 'The manifest contains the distinct refund and triage relationships.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The triage tool registration is a closed source declaration.',
        source: {
          kind: 'workspace-path',
          path: 'triage/tools/orders/find.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'The refund agent declaration spans the output-schema boundary.',
        source: { kind: 'workspace-path', path: 'src/package.json', expectedType: 'file' },
      },
    ],
  },
  expected: [
    {
      label: 'repair-confirmed-defect',
      criterion:
        'The actor corrects the triage manifest tool name to the source-derived name and verifies that the confirmed tool mismatch disappears.',
    },
    {
      label: 'preserve-scoped-uncertainty',
      criterion:
        'The actor retains the refund version range and output-schema declaration, reports final warning-only validation, and leaves only that relationship unverified.',
    },
  ],
  forbidden: [
    {
      label: 'ignore-error-because-of-warning',
      criterion:
        'The actor treats the initial invalid result as acceptable because a warning is also present.',
    },
    {
      label: 'erase-warning-by-pinning',
      criterion:
        'The actor changes the Eve version range, removes refund output-schema binding, or changes runtime identity to silence uncertainty.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['project-repair-and-recovery', 'runtime-compatibility-and-selection'],
});
