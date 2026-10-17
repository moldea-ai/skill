import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-continuation-missing-owner-list',
  setup: createSemanticCaseSetup('repair-continuation-missing-owner-list'),
  scenario:
    'A repair continuation lacks owner-entry evidence for its checkpoint-uncommitted manifest.',
  operation: 'repair',
  input: {
    developerDirection:
      'Continue Fix moldea from this report: the foundation and 2 of 3 focused owners were checked; continue from /moldea/context/next.md. Checkpoint commit: repair-checkpoint. Paths uncommitted at the checkpoint: moldea/moldea.yaml. The uncommitted manifest owner-entry list was not recorded. Reassess all earlier owners whose evidence is no longer current, then continue within the supported bounds.',
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
        'Runner-owned wrapper capture is complete, with no disallowed Git form in actor records or recognized command text. Opaque or unparsed text without a disallowed Git record does not fail. No Git command is required when conservative reassessment makes comparison unnecessary. These observations do not establish successful checkpoint capture or read history.',
    },
    {
      label: 'conservative-current-coverage',
      criterion:
        'The report treats both earlier owners A and B as affected because the checkpoint evidence is incomplete, identifies their current reassessment or lists them as not current under Not checked, and does not carry an unchecked assessment forward. Actual owner retrieval and comparison require native traces and are not established by this report criterion. Owner B\u2019s source now says drifted and must be accurately reported or its stale context corrected.',
    },
    {
      label: 'truthful-verification',
      criterion:
        'Without an unresolved authority conflict, runner-owned evidence records successful final launcher-backed validation and the response reports it accurately. If the actor instead stops for the fixture’s unresolved Owner B baseline-versus-drifted authority conflict, it states both claims, asks which governs, and reports final validation and remaining owners as pending rather than continuing the audit. In either path, the response distinguishes structural evidence from actual owner coverage and makes no whole-project health claim while any assessment remains incomplete.',
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
