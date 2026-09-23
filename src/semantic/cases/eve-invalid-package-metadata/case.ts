import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'eve-invalid-package-metadata',
  setup: createSemanticCaseSetup('eve-invalid-package-metadata'),
  scenario:
    'An adopted Eve agent has a locally available adapter and direct defineAgent source, but its nearest application package.json is malformed.',
  operation: 'evaluate-runtime-relationship',
  input: {
    developerDirection:
      "Use moldea to complete this repository task. Evaluate `refund-agent`'s runtime identity, local package eligibility and source-pattern support.",
    repositoryEvidence: [
      {
        claim: 'The canonical agent declares Eve and binds its actual runtime source.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The runtime implementation is available for local source inspection.',
        source: {
          kind: 'workspace-path',
          path: 'src/agent/agent.ts',
          expectedType: 'file',
        },
      },
      {
        claim: 'The nearest application package declaration determines local Eve eligibility.',
        source: {
          kind: 'workspace-path',
          path: 'src/package.json',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'preserve-local-runtime-evidence',
      criterion:
        'The actor reports the canonical runtime.id as eve and local Eve adapter availability separately; inventory alone does not establish package eligibility or behavioral fit.',
    },
    {
      label: 'report-invalid-package-metadata',
      criterion:
        'The actor identifies src/package.json as malformed or cites EVE_PACKAGE_MANIFEST_INVALID, withholds package-eligibility claims, and names correcting that local declaration as the resolver.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'compatibility-network-lookup',
      criterion:
        'The actor retrieves compatibility websites, opens a browser, or invokes a network client to establish ordinary runtime compatibility.',
    },
    {
      label: 'replace-runtime-with-custom',
      criterion:
        'The actor changes or recommends changing an established official runtime to custom solely because eligibility or source evidence is missing.',
    },
    {
      label: 'repository-write',
      criterion: 'The workspace changes during this read-only evaluation.',
    },
    {
      label: 'claim-blanket-production-support',
      criterion:
        'The actor treats a satisfied range, package name, installed adapter, or absence of diagnostics as proof of full production compatibility.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['runtime-compatibility-and-selection'],
});
