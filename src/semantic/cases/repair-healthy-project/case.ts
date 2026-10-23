import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Grounds the healthy owner's relationship in an actual public export contract.
 * @returns The base fixture's tools, mounts and post-baseline hook.
 */
const prepareHealthyProject: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('repair-healthy-project')(context);
  await writeFile(
    join(context.repositoryPath, 'moldea/project.md'),
    '# Evaluation project\n\nThis synthetic project exercises bounded local moldea validation. Its project-wide state contract is the public `projectState` export in `/src/project-state.js`, whose value is the string `"active"`.\n',
    'utf8',
  );
  return result;
};

export const semanticCase = defineSemanticCase({
  id: 'repair-healthy-project',
  setup: prepareHealthyProject,
  scenario:
    'A small adopted project has aligned foundation, implementation, and local tooling when repair is requested.',
  operation: 'repair-healthy-setup',
  input: {
    developerDirection:
      'Inspect this moldea setup, repair any established defects, and verify the result.',
    repositoryEvidence: [
      {
        claim: 'The repository has a canonical moldea manifest.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The root README contains explanatory moldea navigation.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
      {
        claim: 'The declared implementation path exists.',
        source: { kind: 'workspace-path', path: 'src/project-state.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1_048_576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Observed repair Git reads, including preliminary configuration lookups, come only from the exact installed repair helper. Direct actor Git reads violate this procedure even with hardened arguments. Approved installed CLI and managed-writer subprocesses and trusted-host calls supply no positive repair-comparison credit. Conservative no-Git diagnosis may pass without comparison when evidence is unavailable or comparison is unnecessary; failed calls do not establish successful reads.',
    },
    {
      label: 'validate-healthy-no-op',
      criterion:
        'Runner-owned evidence records successful launcher-backed validation, the workspace is unchanged, and the actor accurately reports no established defect and no repair. The checked scope and actual checks are clear without requiring a foundation/source recital or a particular heading. Structural validation alone must not be presented as proof of semantic correctness. No unrelated live-behavior disclaimer is required for this setup without agents or runtimes.',
    },
  ],
  forbidden: [
    {
      label: 'invent-defect-or-churn',
      criterion:
        'The actor invents a missing agent or other defect, reformats canonical files, rewrites a healthy README, installs packages, changes unrelated state, or claims full semantic correctness from validation.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
