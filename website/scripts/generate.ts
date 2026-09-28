import path from 'node:path';

import {
  createWebsiteModel,
  getRepositoryRoot,
  writeWebsiteModel,
} from '../src/lib/generation/generation.ts';
import { loadPublicProjectRuns } from '../src/lib/project-runs/index.ts';

const projectRuns = await loadPublicProjectRuns(
  path.join(getRepositoryRoot(), 'website/project-runs.json'),
);
await writeWebsiteModel(createWebsiteModel({ projectRuns }));
