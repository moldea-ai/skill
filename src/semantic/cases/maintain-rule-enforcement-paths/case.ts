import { defineSemanticCase } from '../define.ts';

import { prepareEnforcementPaths } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-rule-enforcement-paths',
  setup: prepareEnforcementPaths,
  scenario:
    'Three focused owners are routed from project.md. Their implementation, project-owned instructions and governed post lack manifest relationships.',
  operation: 'maintain-material-relationships',
  input: {
    developerDirection:
      'Maintain moldea’s Stock, Release review and Editorial relationships. Check what owns the editorial post.',
    repositoryEvidence: [
      {
        claim: 'The entry point routes three independently owned responsibilities.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The project-owned release-review skill contains the governing review instruction.',
        source: {
          kind: 'workspace-path',
          path: '.agents/skills/release-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The editorial owner directly governs the authored post.',
        source: {
          kind: 'workspace-path',
          path: 'content/spring-catalogue.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524_288,
  },
  expected: [
    {
      label: 'relate-code-and-project-instructions',
      criterion:
        'Stock relates /src/reserve-stock.js and Release review relates /.agents/skills/release-review/SKILL.md, each to its existing owner. The files enforce or govern the stated rules.',
    },
    {
      label: 'relate-governed-deliverable',
      criterion:
        'The existing editorial owner gains an affectedBy entry for /content/spring-catalogue.md as its only manifest relationship. There is no code binding for this owner. The routed owner and authored post stay intact.',
    },
    {
      label: 'validate-and-scope',
      criterion:
        'Runner-owned evidence shows successful bundled Validate and a relevant Scope result, and the response names the post and /moldea/context/editorial.md as the match.',
    },
  ],
  forbidden: [
    {
      label: 'change-owners-or-invent-paths',
      criterion:
        'The actor invents a binding or relationship, adds a second owner, changes owner prose, broadens scope beyond the requested owners, or changes their code, project skill or authored output.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
