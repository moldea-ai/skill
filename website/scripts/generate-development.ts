import { parseArgs } from 'node:util';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { loadProjectRun, loadPublicProjectRuns } from '../src/lib/project-runs/index.ts';
import { loadSemanticCases } from '../../src/semantic/cases/index.ts';
import { createSemanticCatalogWebsiteModel } from '../../src/semantic/public-evidence/index.ts';
import {
  createWebsiteModel,
  getRepositoryRoot,
  writeWebsiteModel,
} from '../src/lib/generation/generation.ts';

const repositoryRoot = getRepositoryRoot();
const { values } = parseArgs({
  options: {
    'project-runs-root': { type: 'string' },
    'project-run': { type: 'string' },
    'project-runs-selection': { type: 'string' },
  },
});
const localRoot = values['project-runs-root'];
const runId = values['project-run'];
const selectionPath = values['project-runs-selection'];
if ((localRoot === undefined) !== (runId === undefined))
  throw new Error('Supply both --project-runs-root and --project-run.');
if (selectionPath !== undefined && localRoot !== undefined)
  throw new Error('Choose either a project-run selection or a local preview.');
const projectRuns =
  localRoot !== undefined && runId !== undefined
    ? await loadProjectRun({ kind: 'local', root: localRoot, runId })
    : await loadPublicProjectRuns(
        selectionPath ?? path.join(repositoryRoot, 'website/project-runs.json'),
      );
await rm(path.join(repositoryRoot, 'website', 'public', 'evidence-assets'), {
  force: true,
  recursive: true,
});

const semanticCases = await loadSemanticCases(
  path.join(repositoryRoot, 'src', 'semantic', 'cases'),
);

await writeWebsiteModel(
  createWebsiteModel({
    projectRuns,
    unrecordedEvidence: {
      semantic: createSemanticCatalogWebsiteModel(semanticCases),
    },
  }),
);
