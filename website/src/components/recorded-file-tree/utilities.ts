import {
  buildEvaluationReplayPathTree,
  type IEvaluationReplayPathTreeNode,
} from '@moldea.ai/website-ui/evaluation-replay-model';

import type { IRecordedFileChange, IRecordedFileTreeRow } from './types.ts';

/**
 * Builds compact folder rows without dropping recorded paths or change statuses.
 * @param changes The bounded recorded paths and their change statuses.
 * @returns Folder and file rows with their original paths and hierarchy depths.
 * @throws
 * - If a recorded path is unsafe, duplicated, or structurally contradictory
 */
export const buildRecordedFileTreeRows = (
  changes: IRecordedFileChange[],
): IRecordedFileTreeRow[] => {
  const tree = buildEvaluationReplayPathTree(changes.map(({ path }) => ({ path, type: 'file' })));
  const statuses = new Map(changes.map(({ path, status }) => [path, status]));
  const rows: IRecordedFileTreeRow[] = [];

  /** Appends rows in tree order, combining single-child folders to keep mobile previews compact. */
  const appendRows = (nodes: readonly IEvaluationReplayPathTreeNode[], depth: number): void => {
    for (const originalNode of nodes) {
      let node = originalNode;
      let name = node.name;
      while (node.kind === 'folder' && node.children.length === 1) {
        const child = node.children[0]!;
        if (child.kind !== 'folder') break;
        node = child;
        name = `${name}/${node.name}`;
      }
      if (node.kind === 'folder') {
        rows.push({ depth, kind: 'folder', name: `${name}/`, path: node.path });
        appendRows(node.children, depth + 1);
      } else {
        rows.push({ depth, kind: 'file', name, path: node.path, status: statuses.get(node.path)! });
      }
    }
  };
  appendRows(tree, 0);
  return rows;
};
