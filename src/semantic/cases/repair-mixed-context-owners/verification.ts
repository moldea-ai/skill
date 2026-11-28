import {
  checkCaseScope,
  hasCaseLink,
  listCaseChanges,
  readCaseFile,
  readCaseImpactPaths,
} from '../../workspace/index.ts';
import type { ISemanticWorkspaceVerifier } from '../index.ts';

import {
  APPROVAL_GATE_PATH,
  EDITION_COLLECTION_PATH,
  GOVERNED_EDITION_PATH,
  HUMAN_GUIDES,
  LOCKFILE_PATH,
  MISSING_RELATIONSHIPS,
  MIXED_OWNER,
  RETAINED_PATHS,
  REVIEW_NOTES_PATH,
  SUMMER_EDITION_PATH,
  UNREFERENCED_SELECTION_PATH,
} from './setup.ts';

const canonicalManifest = 'moldea/moldea.yaml';
const projectRouter = 'moldea/project.md';

/** Checks the first Fix's bounded relationship cleanup while the split awaits approval. */
export const verifyMixedOwnerRepair: ISemanticWorkspaceVerifier = ({
  snapshot,
  workspaceChanges,
}) => {
  const expected = [...RETAINED_PATHS, ...MISSING_RELATIONSHIPS, LOCKFILE_PATH].sort();
  const impactPaths = readCaseImpactPaths(snapshot)
    .get('/' + MIXED_OWNER)
    ?.toSorted();
  const ownerText = readCaseFile(snapshot, MIXED_OWNER);
  const changes = listCaseChanges(workspaceChanges);
  return [
    {
      id: 'pending-split-and-relationship-cleanup',
      passed:
        JSON.stringify(impactPaths) === JSON.stringify(expected) &&
        changes.includes(canonicalManifest) &&
        changes.every((file) => file === canonicalManifest || file === MIXED_OWNER),
    },
    {
      id: 'human-doc-links-retained',
      passed: HUMAN_GUIDES.every((guide) => hasCaseLink(ownerText, MIXED_OWNER, guide.slice(1))),
    },
  ];
};

/** Checks the actual approved split and applies Scope to the final plain Fix cycle. */
export const verifyMixedOwnerConvergence: ISemanticWorkspaceVerifier = (input) => {
  const { requestIndex, snapshot, repositoryPath, workspaceChanges } = input;
  if (requestIndex === 0) return verifyMixedOwnerRepair(input);
  const impactPaths = readCaseImpactPaths(snapshot);
  const refundOwner = [...impactPaths].find(([, paths]) => paths.includes(RETAINED_PATHS[0]))?.[0];
  const editorialOwner = [...impactPaths].find(([, paths]) =>
    paths.includes(APPROVAL_GATE_PATH),
  )?.[0];
  const hasSplitOwners =
    !snapshot.has(MIXED_OWNER) &&
    refundOwner !== undefined &&
    editorialOwner !== undefined &&
    refundOwner !== editorialOwner &&
    [refundOwner, editorialOwner].every(
      (owner) =>
        owner.startsWith('/moldea/context/') &&
        hasCaseLink(readCaseFile(snapshot, projectRouter), projectRouter, owner.slice(1)),
    ) &&
    [EDITION_COLLECTION_PATH, REVIEW_NOTES_PATH, RETAINED_PATHS[1]].every((path) =>
      impactPaths.get(editorialOwner)?.includes(path),
    ) &&
    [...impactPaths.values()].every((paths) =>
      [GOVERNED_EDITION_PATH, SUMMER_EDITION_PATH, UNREFERENCED_SELECTION_PATH].every(
        (path) => !paths.includes(path),
      ),
    );
  if (requestIndex === 1) {
    return [
      {
        id: 'approved-split-applied',
        passed:
          hasSplitOwners &&
          listCaseChanges(workspaceChanges).every((file) => file.startsWith('moldea/')),
      },
    ];
  }
  const guide = checkCaseScope(repositoryPath, HUMAN_GUIDES[0]);
  const editions = [GOVERNED_EDITION_PATH, SUMMER_EDITION_PATH];
  return [
    { id: 'plain-fix-byte-identical', passed: listCaseChanges(workspaceChanges).length === 0 },
    {
      id: 'guide-path-selects-no-owner',
      passed: guide?.relevant === false && guide.records.length === 0,
    },
    {
      id: 'edition-selects-editorial-owner',
      passed:
        hasSplitOwners &&
        editions.every((path) => {
          const edition = checkCaseScope(repositoryPath, path);
          return (
            edition?.relevant === true &&
            edition.records.length === 1 &&
            edition.records[0]?.path === editorialOwner &&
            edition.records[0].relationships.some(
              (relationship) =>
                relationship.field === 'affectedBy' &&
                relationship.path === EDITION_COLLECTION_PATH,
            )
          );
        }),
    },
  ];
};
