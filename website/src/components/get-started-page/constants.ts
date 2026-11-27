import managedAgentsBlock from '../../../../moldea/assets/managed-agents-block.md?raw';
import managedReadmeBlock from '../../../../moldea/assets/managed-readme-block.md?raw';

import {
  getLandingExampleFile,
  type ILandingExampleFiles,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_BEFORE_AGENT_FILES,
  LANDING_EXAMPLE_INITIAL_FILES,
  LANDING_EXAMPLE_MAINTAINED_FILES,
} from '../../lib/landing-example/index.ts';
import type { IProjectFileTreeEntry, IProjectFileTreeFile } from '../project-file-tree/index.ts';

// the installation path the managed AGENTS.md block names for a skills.sh repository install
const SKILL_INSTALL_PATH = '.agents/skills/moldea';
const readmeBefore = `# Trailside API

Serves orders and refunds for Trailside's customers and support team.
`;
const agentsBefore = `# Agent instructions

Run the focused tests before you commit.
`;
// only what the developer's answer and the code establish
const projectFoundation = `# Trailside

Trailside sells hiking and camping gear online. This backend serves its customers and support team.

The TypeScript code owns order status and refund eligibility.
`;
const projectWithPolicy = `${projectFoundation}
## Context routing

- Refunds: [Refund policy](context/refund-policy.md) governs the request window and eligibility boundary.
`;
const initialRefundPolicy = `# Refund policy

Customers may request a refund within ${LANDING_EXAMPLE.initialRefundWindowDays} completed days of purchase.
The application decides eligibility.
`;
const updatedRefundPolicy = initialRefundPolicy.replace(
  String(LANDING_EXAMPLE.initialRefundWindowDays),
  String(LANDING_EXAMPLE.maintainedRefundWindowDays),
);
const manifestWithPolicy = `version: 1
context:
  /moldea/context/refund-policy.md:
    affectedBy:
      - /src/refund-policy.ts
`;
/**
 * Creates one TypeScript file of the Trailside code from two snapshots of the landing example.
 * @param id The tree identifier.
 * @param label The dialog title.
 * @param path The repository path.
 * @param before The snapshot before the change.
 * @param after The snapshot after the change; equal to `before` for an untouched file.
 * @returns The file with both sources.
 */
const createCodeFile = (
  id: string,
  label: string,
  path: string,
  before: ILandingExampleFiles,
  after: ILandingExampleFiles,
): IProjectFileTreeFile => ({
  id,
  label,
  language: 'typescript',
  path,
  before: getLandingExampleFile(before, path),
  source: getLandingExampleFile(after, path),
});

// the existing code initialization leaves untouched: the order lookup and the 30-day refund rule
const orderLookupFile = createCodeFile(
  'order-lookup',
  'Order lookup',
  LANDING_EXAMPLE.paths.orderLookup,
  LANDING_EXAMPLE_BEFORE_AGENT_FILES,
  LANDING_EXAMPLE_BEFORE_AGENT_FILES,
);
const existingCodeFiles: readonly IProjectFileTreeFile[] = [
  orderLookupFile,
  createCodeFile(
    'refund-rule',
    'Refund rule',
    LANDING_EXAMPLE.paths.refundPolicy,
    LANDING_EXAMPLE_INITIAL_FILES,
    LANDING_EXAMPLE_INITIAL_FILES,
  ),
  createCodeFile(
    'refund-test',
    'Refund test',
    LANDING_EXAMPLE.paths.refundPolicyTest,
    LANDING_EXAMPLE_INITIAL_FILES,
    LANDING_EXAMPLE_INITIAL_FILES,
  ),
];

/*
 * Trailside after confirming Refunds, including the Skill's managed README and AGENTS.md blocks.
 */
export const INITIALIZE_EXAMPLE_FILES: readonly IProjectFileTreeFile[] = [
  ...existingCodeFiles,
  {
    id: 'manifest',
    label: 'Manifest',
    language: 'yaml',
    path: LANDING_EXAMPLE.paths.manifest,
    source: manifestWithPolicy,
  },
  {
    id: 'project',
    label: 'Project foundation',
    language: 'markdown',
    path: LANDING_EXAMPLE.paths.project,
    source: projectWithPolicy,
  },
  {
    id: 'policy',
    label: 'Refund policy',
    language: 'markdown',
    path: LANDING_EXAMPLE.paths.policyContext,
    source: initialRefundPolicy,
  },
  {
    id: 'agents',
    label: 'Coding agent instructions',
    language: 'markdown',
    path: '/AGENTS.md',
    before: agentsBefore,
    source: `${agentsBefore}\n${managedAgentsBlock.replaceAll('{{skill-path}}', SKILL_INSTALL_PATH)}`,
  },
  {
    id: 'readme',
    label: 'README',
    language: 'markdown',
    path: '/README.md',
    before: readmeBefore,
    source: `${readmeBefore}\n${managedReadmeBlock}`,
  },
];

// initialization tree: existing code beside the new moldea/ folder and the updated root files
export const INITIALIZE_EXAMPLE_ENTRIES: readonly IProjectFileTreeEntry[] = [
  { kind: 'directory', label: 'src/', depth: 0 },
  { kind: 'file', id: 'order-lookup', depth: 1 },
  { kind: 'file', id: 'refund-rule', depth: 1 },
  { kind: 'file', id: 'refund-test', depth: 1 },
  { kind: 'directory', label: 'moldea/', depth: 0 },
  { kind: 'file', id: 'manifest', depth: 1 },
  { kind: 'file', id: 'project', depth: 1 },
  { kind: 'directory', label: 'context/', depth: 1 },
  { kind: 'file', id: 'policy', depth: 2 },
  { kind: 'file', id: 'agents', depth: 0 },
  { kind: 'file', id: 'readme', depth: 0 },
];

/*
 * A policy change updates the governing context and the related code and tests.
 */
export const MAINTENANCE_EXAMPLE_FILES: readonly IProjectFileTreeFile[] = [
  orderLookupFile,
  createCodeFile(
    'refund-rule',
    'Refund rule',
    LANDING_EXAMPLE.paths.refundPolicy,
    LANDING_EXAMPLE_INITIAL_FILES,
    LANDING_EXAMPLE_MAINTAINED_FILES,
  ),
  createCodeFile(
    'refund-test',
    'Refund test',
    LANDING_EXAMPLE.paths.refundPolicyTest,
    LANDING_EXAMPLE_INITIAL_FILES,
    LANDING_EXAMPLE_MAINTAINED_FILES,
  ),
  {
    id: 'manifest',
    label: 'Manifest',
    language: 'yaml',
    path: LANDING_EXAMPLE.paths.manifest,
    before: manifestWithPolicy,
    source: manifestWithPolicy,
  },
  {
    id: 'project',
    label: 'Project foundation',
    language: 'markdown',
    path: LANDING_EXAMPLE.paths.project,
    before: projectWithPolicy,
    source: projectWithPolicy,
  },
  {
    id: 'policy',
    label: 'Refund policy',
    language: 'markdown',
    path: LANDING_EXAMPLE.paths.policyContext,
    before: initialRefundPolicy,
    source: updatedRefundPolicy,
  },
];

// maintenance tree: the changed code beside the context it now keeps aligned
export const MAINTENANCE_EXAMPLE_ENTRIES: readonly IProjectFileTreeEntry[] = [
  { kind: 'directory', label: 'src/', depth: 0 },
  { kind: 'file', id: 'order-lookup', depth: 1 },
  { kind: 'file', id: 'refund-rule', depth: 1 },
  { kind: 'file', id: 'refund-test', depth: 1 },
  { kind: 'directory', label: 'moldea/', depth: 0 },
  { kind: 'directory', label: 'context/', depth: 1 },
  { kind: 'file', id: 'policy', depth: 2 },
  { kind: 'file', id: 'manifest', depth: 1 },
  { kind: 'file', id: 'project', depth: 1 },
];
