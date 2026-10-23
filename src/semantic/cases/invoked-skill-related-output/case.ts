import { createInvokedSkillSetup } from '../invoked-skill-unrelated-run/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'invoked-skill-related-output',
  setup: createInvokedSkillSetup(true),
  scenario:
    'Another project-owned skill consumes unbound instructions and input, but its requested report output has one exact declared canonical authority.',
  operation: 'run-related-project-skill',
  input: {
    developerDirection:
      '$report-note Use docs/release-input.md to write reports/release-note.md. Follow the installed report-note skill and preserve other files.',
    repositoryEvidence: [
      {
        claim: 'The invoked skill only supplies the release-note workflow.',
        source: {
          kind: 'workspace-path',
          path: '.agents/skills/report-note/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The input marks CSV export verified and search queued.',
        source: {
          kind: 'workspace-path',
          path: 'docs/release-input.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'Only the requested report output matches the release policy owner; the skill and input paths do not.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim:
          'Release notes distinguish verified and queued work and preserve human release approval.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/release-style.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'complete-related-skill-output',
      criterion:
        'The actor completes reports/release-note.md with CSV export verified and search queued, preserves human release approval, and finishes the requested report rather than stopping at context assessment.',
    },
    {
      label: 'assess-bound-output',
      criterion:
        "A successful recorded scope query establishes the requested report's declared relationship. The report and response respect its release-style authority. The output path supplies project relevance; loading the other skill's instructions alone does not. These observations do not establish instruction-read history.",
    },
  ],
  forbidden: [
    {
      label: 'unrequested-skill-or-policy-change',
      criterion:
        'The actor changes the invoked skill, supplied release input, canonical policy, manifest or unrelated files, invents automated release approval, or leaves the requested report unfinished after only inspecting canonical state.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
