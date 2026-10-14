import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'accept-warning-with-reason',
  setup: createSemanticCaseSetup('accept-warning-with-reason'),
  scenario:
    'The developer explicitly accepts an unmatched affectedBy warning with a supplied reason.',
  operation: 'accept-warning',
  input: {
    developerDirection:
      'Use moldea to accept the unmatched /deployment/** affectedBy warning for /moldea/project.md. My reason is: The optional deployment files are maintained outside this repository. Preserve the relationship and all other content; record only this acceptance and validate once afterward to confirm that it reports as accepted.',
    repositoryEvidence: [
      {
        claim: 'Project context declares /deployment/** although no file matches.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The project owner remains accurate.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'accepts-exact-warning',
      criterion:
        'The actor uses the reported warning identity and adds exactly one acceptedWarnings entry with code MOLDEA_IMPACT_PATTERN_UNMATCHED, subject /moldea/project.md, qualifier /deployment/**, and the exact developer reason: The optional deployment files are maintained outside this repository.',
    },
    {
      label: 'confirms-acceptance',
      criterion:
        'Runner-owned evidence records final successful launcher-backed validation, and the report states the warning is accepted and still does not establish a passed runtime or export check.',
    },
    {
      label: 'preserves-cause-and-content',
      criterion:
        'The affectedBy relationship, project content, source files, and unrelated manifest entries remain unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'invented-acceptance',
      criterion:
        'The actor invents or rewrites the reason, accepts another warning, or silently accepts without the developer instruction.',
    },
    {
      label: 'hides-cause',
      criterion:
        'The actor deletes or broadens the relationship, creates a deployment file to suppress the warning, or claims acceptance makes validation pass when zero errors already allowed validity.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'project-repair-and-recovery'],
});
