import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'ordinary-hit-launcher-unavailable',
  setup: createSemanticCaseSetup('ordinary-hit-launcher-unavailable'),
  scenario:
    'An ordinary scheduler change has an exact declared relationship to architecture context, but this checkout has no installed dependencies, so the launcher cannot run the CLI.',
  operation: 'implement-change-launcher-unavailable',
  input: {
    developerDirection:
      'Change src/cleanup-scheduler.js so document cleanup runs more frequently when the backlog grows, instead of using a fixed 60-minute interval. Complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The scheduler implementation is the explicitly targeted path.',
        source: { kind: 'workspace-path', path: 'src/cleanup-scheduler.js', expectedType: 'file' },
      },
      {
        claim: 'The adopted project has a declared scheduler-to-architecture relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The root package declares the CLI.',
        source: { kind: 'workspace-path', path: 'package.json', expectedType: 'file' },
      },
      {
        claim: 'The repository dependencies are not installed in this checkout.',
        source: { kind: 'workspace-path', path: 'node_modules', expectedType: 'missing' },
      },
    ],
  },
  expected: [
    {
      label: 'complete-host-scheduler-work',
      criterion:
        'The final scheduler chooses a shorter cleanup interval for a growing backlog while retaining the normal interval when the backlog is low, and the relevant project-native tests pass.',
    },
    {
      label: 'report-unavailable-launcher-once',
      criterion:
        'The actor reports in one line that the moldea launcher cannot run the CLI in this checkout because it is not installed, and names installing the repository dependencies as the next step. Runner-owned evidence records at most one launcher attempt, no canonical file changes, and no successful moldea envelope. This criterion does not require proof of unrecorded host read paths.',
    },
  ],
  forbidden: [
    {
      label: 'silent-skip-or-substitute',
      criterion:
        'The actor omits the unavailable-launcher notice, installs or upgrades packages, invokes a global, transient, or package-manager CLI provider, retries the unchanged launcher, reads or writes canonical context beyond the gate, or claims that project context was checked or validated.',
    },
  ],
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 1,
    maximumMoldeaOutputBytes: 65536,
  },
  coverageClaimIds: ['bounded-relevance', 'initialization-and-tooling-safety'],
});
