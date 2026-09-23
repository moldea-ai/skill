import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'plan-existing-project-one-agent',
  setup: createSemanticCaseSetup('plan-existing-project-one-agent'),
  scenario:
    'An adopted moldea project with compatible local inspection needs a plan for semantically triaging support messages while keeping authorization and state transitions deterministic.',
  operation: 'plan-agent-system',
  input: {
    developerDirection: 'Plan the smallest agent system for support triage.',
    repositoryEvidence: [
      {
        claim:
          'The support API and deterministic authorization and persistence boundaries are implemented.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-api.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Project documentation identifies semantic triage as the model-owned boundary.',
        source: {
          kind: 'workspace-path',
          path: 'docs/support-triage.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The project is adopted.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'use-existing-evidence-read-only',
      criterion:
        'The response and workspace changes use existing evidence read only in the material behavior exercised by this scenario.',
    },
    {
      label: 'recommend-one-justified-agent',
      criterion:
        'The proposed architecture recommends one justified agent and explains how it serves the requested objective.',
    },
    {
      label: 'keep-enforcement-deterministic',
      criterion:
        'The proposed or implemented design keeps enforcement deterministic instead of moving that responsibility into an unsupported boundary.',
    },
    {
      label: 'define-data-authority-and-contracts',
      criterion:
        'The proposed architecture defines data authority and contracts explicitly enough to evaluate ownership and implementation boundaries.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'create-or-update-agent',
      criterion:
        'The workspace changes create or update agent even though this scenario does not authorize or support it.',
    },
    {
      label: 'model-orchestrator-without-semantic-routing',
      criterion:
        'A model-based orchestrator is proposed even though sequencing and routing do not require semantic judgment. Deterministic application orchestration does not trigger this label.',
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
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['agent-system-planning'],
});
