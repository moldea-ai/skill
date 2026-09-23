import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-evaluate-read-only',
  setup: createSemanticCaseSetup('skill-evaluate-read-only'),
  scenario:
    'An existing incident-review skill has a vague activation description and links to a missing focused reference, while the developer requests evaluation only.',
  operation: 'evaluate-agent-skill',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate the incident-review skill and report structural and semantic alignment without changing files.',
    repositoryEvidence: [
      {
        claim: 'The existing skill has a vague activation description.',
        source: {
          kind: 'workspace-path',
          path: 'skills/incident-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The linked focused reference is missing.',
        source: {
          kind: 'workspace-path',
          path: 'skills/incident-review/references/incident-policy.md',
          expectedType: 'missing',
        },
      },
    ],
  },
  skillEvidence: {
    activationScenarios: [],
    artifacts: [
      {
        role: 'authoritative-source',
        root: 'skills/incident-review',
      },
    ],
  },
  expected: [
    {
      label: 'report-missing-skill-resource',
      criterion:
        'The actor response explicitly reports missing skill resource, with the supplied workspace evidence remaining consistent with that report.',
    },
    {
      label: 'report-activation-contract-problem',
      criterion:
        'The actor response explicitly reports activation contract problem, with the supplied workspace evidence remaining consistent with that report.',
    },
    {
      label: 'separate-structural-and-semantic-findings',
      criterion:
        'The evaluation distinguishes the missing linked reference as a structural defect from the vague activation wording as a semantic defect.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'repair-skill-during-evaluate',
      criterion:
        'The actor changes the evaluated skill or creates its missing reference during an operation that must remain read-only.',
    },
    {
      label: 'create-missing-reference',
      criterion:
        'The workspace changes create missing reference even though this scenario does not authorize or support it.',
    },
    {
      label: 'claim-structural-validity',
      criterion:
        'The actor claims structural validity despite supplied independent structural evidence demonstrating an error or missing resource.',
    },
    {
      label: 'repository-write',
      criterion:
        'The workspace evidence contains a repository change during an operation whose contract is read-only.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['agent-and-skill-design'],
});
