import { parseArgs } from 'node:util';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { loadProjectRun, loadPublicProjectRuns } from '../src/lib/project-runs/index.ts';
import { loadQualificationWebsiteModel } from '../../qualification/src/public-evidence/index.ts';
import { loadSemanticCases } from '../../src/semantic/cases/index.ts';
import { createSemanticCatalogWebsiteModel } from '../../src/semantic/public-evidence/index.ts';
import {
  createWebsiteModel,
  getRepositoryRoot,
  writeWebsiteModel,
} from '../src/lib/generation/generation.ts';

const repositoryRoot = getRepositoryRoot();
const { values } = parseArgs({
  options: { 'project-runs-root': { type: 'string' }, 'project-run': { type: 'string' } },
});
const localRoot = values['project-runs-root'];
const runId = values['project-run'];
if ((localRoot === undefined) !== (runId === undefined))
  throw new Error('Supply both --project-runs-root and --project-run.');
const projectRuns =
  localRoot !== undefined && runId !== undefined
    ? await loadProjectRun({ kind: 'local', root: localRoot, runId })
    : await loadPublicProjectRuns(path.join(repositoryRoot, 'website/project-runs.json'));
const developmentRoot = path.join(repositoryRoot, '.evidence', 'fixtures', 'website-development');
const qualificationResultsRoot = path.join(developmentRoot, 'qualification-results');
await rm(developmentRoot, { force: true, recursive: true });
await Promise.all([
  mkdir(qualificationResultsRoot, { recursive: true }),
  rm(path.join(repositoryRoot, 'website', 'public', 'evidence-assets'), {
    force: true,
    recursive: true,
  }),
]);

const semanticCases = await loadSemanticCases(
  path.join(repositoryRoot, 'src', 'semantic', 'cases'),
);
const qualification = loadQualificationWebsiteModel(repositoryRoot, {
  resultsRoot: qualificationResultsRoot,
});

await writeWebsiteModel(
  createWebsiteModel({
    projectRuns,
    unrecordedEvidence: {
      qualification,
      semantic: createSemanticCatalogWebsiteModel(semanticCases),
    },
  }),
);
