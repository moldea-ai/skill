import { prepareProjectRunFixture } from './project-run-fixture/index.ts';
import { prepareSyntheticWebsiteEvidence } from './evidence-fixture/index.ts';
import {
  createWebsiteModel,
  getRepositoryRoot,
  writeWebsiteModel,
} from '../src/lib/generation/generation.ts';

const repositoryRoot = getRepositoryRoot();
const projectRuns = await prepareProjectRunFixture(repositoryRoot);
const fixture = await prepareSyntheticWebsiteEvidence(repositoryRoot);
await writeWebsiteModel(
  createWebsiteModel({
    projectRuns,
    allowFixtureEvidence: true,
    preparedEvidenceDirectory: fixture.preparedDirectory,
    selectionPath: fixture.selectionPath,
  }),
);
