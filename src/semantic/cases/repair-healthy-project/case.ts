import { stringify } from 'yaml';

import {
  createSemanticCaseSetup,
  listCaseChanges,
  writeCaseFixture,
} from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';
import type { ISemanticCaseSetup } from '../index.ts';

const healthyManifest = {
  version: 1,
  context: {
    '/moldea/project.md': { affectedBy: ['/src/project-state.js'] },
    '/moldea/context/packing.md': { affectedBy: ['/src/packing.js'] },
    '/moldea/context/returns.md': { affectedBy: ['/src/returns.js'] },
  },
};

/**
 * Grounds the healthy owner's relationship in an actual public export contract.
 * @returns The base fixture's tools, mounts and post-baseline hook.
 */
const prepareHealthyProject: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('repair-healthy-project')(context);
  await writeCaseFixture(context.repositoryPath, {
    'moldea/project.md':
      '# Fulfillment desk\n\nThe desk tracks packing and returns. The public projectState export in /src/project-state.js is "active". [Packing](context/packing.md) owns package release. [Returns](context/returns.md) owns return request eligibility.\n',
    'moldea/context/packing.md':
      '# Packing\n\nOnly inspected packages can leave the packing desk.\n',
    'moldea/context/returns.md':
      '# Returns\n\nCustomers can request a return within 14 days of purchase.\n',
    'src/packing.js': 'export const canReleasePackage = (parcel) => parcel.inspected === true;\n',
    'src/returns.js': 'export const canRequestReturn = (ageDays) => ageDays <= 14;\n',
    'moldea/moldea.yaml': stringify(healthyManifest),
  });
  return result;
};

export const semanticCase = defineSemanticCase({
  id: 'repair-healthy-project',
  setup: prepareHealthyProject,
  verifyWorkspace: ({ workspaceChanges }) => [
    {
      id: 'healthy-project-byte-identical',
      passed: listCaseChanges(workspaceChanges).length === 0,
    },
  ],
  scenario:
    'A small adopted project has aligned foundation, implementation, and local tooling when repair is requested.',
  operation: 'fix-healthy-setup',
  input: {
    developerDirection: 'fix moldea',
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
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
    {
      label: 'validate-healthy-no-op',
      criterion:
        'Runner-owned CLI capture records successful composition before inspect in observed startup order and successful final validation. The report records these cohesive owners with their kept counts and behavior roles: ' +
        Object.entries(healthyManifest.context)
          .map(
            ([owner, { affectedBy }]) =>
              `${owner} kept ${affectedBy.length} of ${affectedBy.length}`,
          )
          .join(', ') +
        '. Each owner has zero removed and unchecked declarations. The workspace is byte-identical and Git controls are unchanged. Structural validation is distinct from semantic assessment.',
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
