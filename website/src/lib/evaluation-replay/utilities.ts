import { posix } from 'node:path';

import type { IEvaluationReplayPathTreeNode, IEvaluationReplayWorkspaceChange } from './types.ts';

interface IMutablePathTreeNode {
  children: Map<string, IMutablePathTreeNode>;
  kind: IEvaluationReplayPathTreeNode['kind'];
  name: string;
  path: string;
}

/** Validates one repository-relative path before it enters a public replay tree. */
const validateReplayPath = (path: string): string[] => {
  const segments = path.split('/');
  if (
    path.length === 0 ||
    posix.isAbsolute(path) ||
    path.includes('\\') ||
    posix.normalize(path) !== path ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new Error(`Evaluation replay path ${JSON.stringify(path)} is not repository-relative.`);
  }

  return segments;
};

/** Converts an internal tree node into its immutable public representation. */
const createPublicNode = (node: IMutablePathTreeNode): IEvaluationReplayPathTreeNode => {
  const children = [...node.children.values()]
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
    .map(createPublicNode);
  const changeCount =
    node.kind === 'folder' ? children.reduce((sum, child) => sum + child.changeCount, 0) : 1;

  return {
    changeCount,
    children,
    kind: node.kind,
    name: node.name,
    path: node.path,
  };
};

/**
 * Builds a deterministic structural folder tree from recorded file and symlink changes.
 * @param changes Recorded path-only workspace changes.
 * @returns A stable structural tree containing every changed path.
 * @throws
 * - If a path is unsafe, duplicated, or structurally contradictory
 */
export const buildEvaluationReplayPathTree = (
  changes: IEvaluationReplayWorkspaceChange[],
): IEvaluationReplayPathTreeNode[] => {
  const root = new Map<string, IMutablePathTreeNode>();
  const seenPaths = new Set<string>();

  for (const change of changes) {
    const segments = validateReplayPath(change.path);
    if (seenPaths.has(change.path)) {
      throw new Error(`Evaluation replay path ${JSON.stringify(change.path)} is duplicated.`);
    }
    seenPaths.add(change.path);

    let siblings = root;
    let currentPath = '';
    for (const [index, segment] of segments.entries()) {
      currentPath = currentPath.length === 0 ? segment : `${currentPath}/${segment}`;
      const isLeaf = index === segments.length - 1;
      const expectedKind = isLeaf ? change.type : 'folder';
      const existingNode = siblings.get(segment);
      if (existingNode !== undefined && existingNode.kind !== expectedKind) {
        throw new Error(
          `Evaluation replay path ${JSON.stringify(change.path)} conflicts with ${JSON.stringify(currentPath)}.`,
        );
      }

      const node =
        existingNode ??
        ({
          children: new Map<string, IMutablePathTreeNode>(),
          kind: expectedKind,
          name: segment,
          path: currentPath,
        } satisfies IMutablePathTreeNode);
      siblings.set(segment, node);
      siblings = node.children;
    }
  }

  return [...root.values()]
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
    .map(createPublicNode);
};
