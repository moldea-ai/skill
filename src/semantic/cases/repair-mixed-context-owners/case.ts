import { defineSemanticCase } from '../define.ts';

import {
  APPROVAL_GATE_PATH,
  DELIVERY_PATHS,
  EDITION_COLLECTION_PATH,
  GOVERNED_EDITION_PATH,
  LOCKFILE_PATH,
  MIXED_OWNER,
  REMOVED_PATHS,
  RETAINED_PATHS,
  REVIEW_NOTES_PATH,
  UNREFERENCED_SELECTION_PATH,
  createMixedOwnerSetup,
} from './setup.ts';
import { verifyMixedOwnerRepair } from './verification.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-mixed-context-owners',
  setup: createMixedOwnerSetup(true),
  verifyWorkspace: verifyMixedOwnerRepair,
  scenario:
    'An adopted shop and journal has a founding brief that mixes refund eligibility, editorial approval and website delivery. Its manifest points to real enforcement, human docs and a lockfile of uncertain relevance.',
  operation: 'fix-context-structure-and-relationships',
  input: {
    developerDirection: 'fix moldea',
    repositoryEvidence: [
      {
        claim: 'The entry point routes refund and editorial work to a combined owner.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The owner identifies rules for refunds and publishing and links to their sources.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/operating-rules.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The manifest declares the owner’s current relationships.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1_048_576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git capture shows only permitted read-only orientation and installed repair-helper reads. The installed helper supplies the checkpoint and review of changed paths.',
    },
    {
      label: 'propose-focused-owners',
      criterion:
        'The response records a mixed verdict, proposes exact destinations for refund eligibility, editorial approval, and website delivery, and proposes the corresponding project.md routes. The combined owner and routing remain intact pending approval.',
    },
    {
      label: 'correct-material-paths',
      criterion:
        `The mixed owner's report reconciles ${RETAINED_PATHS.length} kept, ${REMOVED_PATHS.length + 1} removed and 1 unchecked to its ${RETAINED_PATHS.length + REMOVED_PATHS.length + 2} starting declarations. The kept count identifies the refund deadline, publication gate and delivery roles. Tie each sole enforcement point to its owner-stated rule: sponsor name above the article body at ${DELIVERY_PATHS[0]}, canonical trailing slashes at ${DELIVERY_PATHS[1]}, and manual production dispatch at ${DELIVERY_PATHS[2]}. Report the additions with their owner references and evidence: ${APPROVAL_GATE_PATH} enforces the editor role, ${REVIEW_NOTES_PATH} supplies the model-facing instruction, and ${EDITION_COLLECTION_PATH} covers the governed editions. List ${GOVERNED_EDITION_PATH} as removed because the glob replaces it. Name each other removal from ` +
        REMOVED_PATHS.join(', ') +
        '. Group the human-document removals with their shared reason and link them from the owner. Distinguish the stylesheet and installed copy from the sole layout, build and CI enforcement points.',
    },
    {
      label: 'carry-unchecked-lockfile',
      criterion:
        'The whole-project report is paused or stopped for developer input. It marks ' +
        LOCKFILE_PATH +
        ` as unchecked with any accurate explanation of the evidence gap. Keep the file and its declaration. Include that exact path, the owner ${MIXED_OWNER} and the reason in the Resume point, and do not report Fix complete.`,
    },
    {
      label: 'verify-repaired-manifest',
      criterion:
        'Runner-owned evidence shows successful bundled Validate and independent relationship checks. Preserve the whole-project status block and sections and name the pending split and unchecked evidence without calling Fix complete.',
    },
  ],
  forbidden: [
    {
      label: 'unapproved-split-or-churn',
      criterion: `The actor creates a focused owner, moves context, changes routing, alters implementation, retains a clearly ineligible relationship, enumerates edition members instead of using the collection glob, adds the unreferenced ${UNREFERENCED_SELECTION_PATH}, or changes unrelated files or Git state.`,
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'project-repair-and-recovery'],
});
