import { defineSemanticCase } from '../define.ts';

import { createInvokedSkillSetup } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'invoked-skill-unrelated-run',
  setup: createInvokedSkillSetup(false),
  scenario:
    'An adopted project runs a project-owned skill with a bound instructional resource, while its actual task input and requested output have no declared relationships.',
  operation: 'run-project-skill',
  input: {
    developerDirection:
      '$report-note Use docs/release-input.md to write reports/release-note.md. Follow the installed report-note skill and preserve other files.',
    repositoryEvidence: [
      {
        claim:
          'The invoked skill owns a short release-note workflow; consuming its instructions does not change its behavior.',
        source: {
          kind: 'workspace-path',
          path: '.agents/skills/report-note/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The supplied input marks CSV export verified and search queued.',
        source: {
          kind: 'workspace-path',
          path: 'docs/release-input.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The input and requested output have no declared relationships; the skill instruction path is bound but is loaded only as host instructions.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'complete-invoked-skill-output',
      criterion:
        'The actor completes reports/release-note.md with CSV export verified and search queued, grounded in the supplied input, and accurately reports completion. Only the requested report changes.',
    },
    {
      label: 'instruction-loading-does-not-activate',
      criterion:
        'Running the invoked skill does not become moldea maintenance merely because its instructions are an Agent Skill. The actor completes the host task without a moldea status report, CLI operation or canonical write. Silent routing checks and entrypoint reads needed to decide routing are permitted; the outcome does not establish instruction-read history.',
    },
  ],
  forbidden: [
    {
      label: 'instruction-loading-overreach',
      criterion:
        'The actor treats consuming report-note instructions as changing a skill, changes the skill or canonical state, invokes moldea operations, or reframes the unrelated output task around moldea.',
    },
  ],
  coverageClaimIds: ['activation-abstention', 'restored-activation-regressions'],
});
