import {
  TRACKED_AGENTS_GIT_PROBE,
  createIntegrationWarningSetup,
} from '../setup-local-warning-eligibility/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'setup-tracked-warning-acceptance',
  setup: createIntegrationWarningSetup('tracked'),
  scenario:
    'The developer explicitly accepts the missing-bridge warning for a shared tracked AGENTS.md with an exact reason, while requiring the cause and other state to remain intact.',
  operation: 'accept-tracked-integration-warning',
  input: {
    developerDirection: `Use moldea to accept MOLDEA_INTEGRATION_BLOCK_MISSING for /AGENTS.md with null qualifier. AGENTS.md is a shared tracked file. My exact reason is: The team will apply the tracked AGENTS.md bridge in a separate reviewed change. Preserve the instruction file and all other content; add only this manifest acceptance and validate it. The host's bounded index probe is: ${TRACKED_AGENTS_GIT_PROBE}`,
    repositoryEvidence: [
      {
        claim: 'AGENTS.md is shared and tracked but contains no managed bridge.',
        source: {
          kind: 'workspace-path',
          path: 'AGENTS.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The manifest has no acceptedWarnings entry yet.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'accept-exact-tracked-identity',
      criterion:
        'The actor adds exactly one acceptedWarnings entry for code MOLDEA_INTEGRATION_BLOCK_MISSING, subject /AGENTS.md, null or omitted qualifier, and the exact developer reason: The team will apply the tracked AGENTS.md bridge in a separate reviewed change. Only the manifest changes; the missing bridge remains the cause.',
    },
    {
      label: 'confirm-accepted-warning',
      criterion:
        'A successful recorded launcher validation reports zero errors, zero unaccepted warnings and one accepted warning. The report says acceptance was recorded and validation succeeded, without inferring native/cloud host behavior; no unsolicited disclaimer is required. Fixture Git tracking does not establish actor read history.',
    },
  ],
  forbidden: [
    {
      label: 'acceptance-changes-cause-or-reason',
      criterion:
        'The actor changes AGENTS.md or unrelated manifest entries, rewrites or invents the reason, accepts another warning, claims acceptance proves host instruction consumption, or calls the warning-only project invalid before acceptance.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'context-maintenance-and-compression'],
});
