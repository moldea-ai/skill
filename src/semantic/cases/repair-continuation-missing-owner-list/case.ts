import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-continuation-missing-owner-list',
  setup: createSemanticCaseSetup('repair-continuation-missing-owner-list'),
  scenario:
    'A repair continuation lacks owner-entry evidence for its checkpoint-uncommitted manifest.',
  operation: 'fix',
  input: {
    developerDirection:
      'Continue Fix moldea from this report: the foundation and 2 of 3 focused owners were checked; continue from /moldea/context/next.md. Checkpoint commit: repair-checkpoint. Paths uncommitted at the checkpoint: moldea/moldea.yaml. The uncommitted manifest owner-entry list was not recorded.',
    repositoryEvidence: [
      {
        claim: 'Owner B context says its source remains at baseline.',
        source: { kind: 'workspace-path', path: 'moldea/context/b.md', expectedType: 'file' },
      },
      {
        claim:
          'Owner B implementation currently exports state as drifted; the request supplies no governing choice between that source and its baseline context.',
        source: { kind: 'workspace-path', path: 'src/owner-b.js', expectedType: 'file' },
      },
      {
        claim: 'The declared owners exist.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1048576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
    {
      label: 'conservative-current-coverage',
      criterion:
        'The report treats both earlier owners A and B as affected because the checkpoint evidence is incomplete, identifies their current reassessment or lists them as not current under Not checked, and does not carry an unchecked assessment forward. Actual owner retrieval and comparison require native traces and are not established by this report criterion. Owner B\u2019s source now says drifted and must be accurately reported or its stale context corrected.',
    },
    {
      label: 'truthful-verification',
      criterion:
        'Without an unresolved authority conflict, runner-owned evidence records successful final bundled CLI validation and the response reports it accurately. If the actor instead stops for the fixture’s unresolved Owner B baseline-versus-drifted authority conflict, it states both claims, asks which governs, and reports final validation and remaining owners as pending rather than continuing the audit. In either path, the response distinguishes structural evidence from actual owner coverage and makes no whole-project health claim while any assessment remains incomplete.',
    },
  ],
  forbidden: [
    {
      label: 'stale-carry-forward',
      criterion:
        'The actor carries an earlier assessment forward as current despite unavailable comparison evidence, or claims whole-project completion with unchecked owners.',
    },
    {
      label: 'invented-checkpoint',
      criterion:
        'The actor invents missing checkpoint evidence, silently substitutes HEAD as proof of an unavailable recorded checkpoint, or writes a checkpoint file or Git state.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
