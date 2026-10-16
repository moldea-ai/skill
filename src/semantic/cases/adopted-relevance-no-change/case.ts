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
      label: 'reconsider-affected-state',
      criterion:
        'The actor response reports both that the refactor preserves behavior or contracts and that canonical state was reconsidered and remains accurate or requires no update. The response need not name the internal manifest path or relationship; the supplied scenario and workspace evidence establish which canonical state was affected.',
    },
    {
      label: 'report-no-canonical-change',
      criterion:
        'The actor response makes clear that canonical state remained unchanged and explains why no update was needed. Accept semantically equivalent reporting, including that behavior was preserved and canonical state remains valid or accurate while workspace evidence shows only implementation changes. Workspace evidence must contain no canonical documentation or manifest change.',
    },
  ],
  forbidden: [
    {
      label: 'documentation-churn',
      criterion:
        'The actor changes canonical documentation or manifests even though the affected implementation refactor preserves every established behavior and contract.',
    },
    {
      label: 'skip-relevance-analysis',
      criterion:
        'The actor claims completion without reporting both that behavior or contracts were preserved and that canonical state was reconsidered and remains accurate or requires no update.',
    },
  ],
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
