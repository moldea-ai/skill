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
      'Use moldea to accept the unmatched /src/fraud-review/** affectedBy warning for /moldea/project.md. My reason is: This subtree is reserved for the optional fraud review service. Preserve the relationship and all other content. Record only this acceptance and validate once afterward to confirm that it reports as accepted.',
    repositoryEvidence: [
      {
        claim: 'Project context declares /src/fraud-review/** although no file matches.',
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
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'accepts-exact-warning',
      criterion:
        'The actor uses the reported warning identity and adds exactly one acceptedWarnings entry with code MOLDEA_IMPACT_PATTERN_UNMATCHED, subject /moldea/project.md, qualifier /src/fraud-review/**, and the exact developer reason: This subtree is reserved for the optional fraud review service.',
    },
    {
      label: 'confirms-acceptance',
      criterion:
        'Runner-owned evidence records final successful bundled CLI validation, and the report states the warning is accepted. It does not claim untested runtime or export correctness; an unsolicited disclaimer is not required.',
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
        'The actor deletes or broadens the relationship, creates a file to suppress the warning, or claims acceptance makes validation pass when zero errors already allowed validity.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'project-repair-and-recovery'],
});
