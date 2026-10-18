import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Grounds this refactor's declared relationship without changing shared fixture setup.
 * @returns The prepared tools, mounts and baseline hooks for this case.
 */
const prepareNoChangeRefactor: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
  await writeFile(
    join(context.repositoryPath, 'moldea/project.md'),
    '# Refund identifiers\n\nThe project normalizes refund identifiers by trimming surrounding whitespace with `normalizeRefundId` in `/src/internal-helper.js`. Its export and trimming behavior are established contracts.\n',
    'utf8',
  );
  return result;
};

export const semanticCase = defineSemanticCase({
  id: 'adopted-relevance-no-change',
  setup: prepareNoChangeRefactor,
  scenario:
    'A refactor touches an affected implementation path but preserves every established behavior and contract.',
  operation: 'maintain-relevant-change',
  input: {
    developerDirection: 'Refactor src/internal-helper.js without changing behavior.',
    repositoryEvidence: [
      {
        claim: 'Canonical context declares the affected implementation path.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The refactored implementation preserves behavior.',
        source: {
          kind: 'workspace-path',
          path: 'src/internal-helper.js',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'preserve-behavior-and-canonical-state',
      criterion:
        'The refactor preserves the normalizeRefundId export and whitespace-trimming behavior, and the response reports preserved behavior or contracts. Workspace evidence shows only implementation changes, with no canonical documentation or manifest change. The supplied scenario and workspace evidence establish that canonical content remains accurate; no additional sentence claiming that it was reconsidered is required. These outcomes do not establish file-read history.',
    },
  ],
  forbidden: [
    {
      label: 'documentation-churn',
      criterion:
        'The actor changes canonical documentation or manifests even though the affected implementation refactor preserves every established behavior and contract.',
    },
  ],
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
