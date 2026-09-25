import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-known-context-owners',
  setup: createSemanticCaseSetup('maintain-known-context-owners'),
  scenario:
    'An adopted invoice service has two known stale context owners and an exact implementation path without declared relationships.',
  operation: 'maintain-knowledge-handoff',
  input: {
    developerDirection:
      'The service now extracts and validates invoice data for accounting systems; it never authorizes payments. The existing src/invoice.js shows this behavior. Bring moldea/project.md and moldea/context/processing.md up to date. Do not change the application.',
    repositoryEvidence: [
      {
        claim:
          'The project foundation still describes invoice processing and payment authorization as planned.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The focused processing owner also retains the stale behavior.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/processing.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The exact source implements extraction and validation without payment authorization.',
        source: { kind: 'workspace-path', path: 'src/invoice.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 3,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'reconcile-both-known-owners',
      criterion:
        'The actor updates both existing canonical owners to current invoice extraction and validation without payment authorization. Detailed processing truth stays in moldea/context/processing.md; moldea/project.md keeps a concise current summary and a link to that owner.',
    },
    {
      label: 'ground-exact-relationships',
      criterion:
        'The manifest records exact affectedBy relationships from /src/invoice.js to both maintained owners because the inspected implementation materially governs their facts. The actor preserves unrelated declarations and adds no broad source glob.',
    },
    {
      label: 'validate-final-state',
      criterion:
        'A completed launcher-backed validation follows all canonical and relationship writes. The actor reports the actual result without treating structural validity as proof of full semantic alignment.',
    },
  ],
  forbidden: [
    {
      label: 'partial-or-broad-maintenance',
      criterion:
        'The actor updates only one stale owner, searches unrelated context, creates another owner or agent, changes application code or unrelated files, or adds speculative bindings.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
