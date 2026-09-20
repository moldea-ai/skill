import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'eve-later-stable-local-eligibility',
  setup: createSemanticCaseSetup('eve-later-stable-local-eligibility'),
  scenario:
    'An adopted Eve filesystem agent uses Eve 0.54.3 with a recognized direct defineAgent pattern and a local official adapter whose best-effort eligibility range is >=0.39.1. No network capability is available.',
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
      label: 'accept-later-stable-eligibility',
      criterion:
        'The actor recognizes that Eve 0.54.3 satisfies the installed adapter range >=0.39.1 and remains eligible for local source inspection without requiring online approval or a fresh qualification date.',
    },
    {
      label: 'ground-source-pattern-support',
      criterion:
        'The actor grounds recognized source-pattern support in the bound direct defineAgent source and local adapter contract or inspection evidence, keeping unverified application behavior separate.',
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
