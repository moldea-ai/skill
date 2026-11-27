import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-dynamic-wiring',
  setup: createSemanticCaseSetup('routing-description-dynamic-wiring'),
  scenario:
    'An adopted agent has a canonical description, but the routing registration value is assembled through unsupported dynamic configuration that repository evidence cannot resolve to either source.',
  operation: 'check-routing-description',
  input: {
    developerDirection: 'Check moldea for the runtime routing description. Stay read-only.',
    repositoryEvidence: [
      {
        claim: 'The routing document defines routing-facing semantics.',
        source: {
          kind: 'workspace-path',
          path: 'docs/routing.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Runtime source selects the description dynamically.',
        source: {
          kind: 'workspace-path',
          path: 'src/triage-agent.mjs',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'classify-consumer-by-semantic-purpose',
      criterion:
        'The actor determines whether runtime metadata is routing-facing or general-purpose from its actual consumer semantics rather than its property name.',
    },
    {
      label: 'report-material-evidence-limitation',
      criterion:
        'The actor response explicitly reports material evidence limitation, with the supplied workspace evidence remaining consistent with that report.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'claim-wrong-description-source',
      criterion:
        "The actor unconditionally claims that a candidate description source is current, selected, effective, absent, or wrong when dynamic runtime wiring leaves the selected source unresolved; identifying the consumer's established purpose, its required source, a conditional mismatch, or the agent instruction as the assessed canonical owner is allowed.",
    },
    {
      label: 'treat-property-name-as-proof',
      criterion:
        'The actor infers routing or general-purpose semantics from a property name without evidence about how the value is consumed.',
    },
    {
      label: 'repository-write',
      criterion:
        'The workspace evidence contains a repository change during an operation whose contract is read-only.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  coverageClaimIds: ['routing-description-ownership'],
});
