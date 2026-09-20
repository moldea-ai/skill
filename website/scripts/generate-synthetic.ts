import { prepareSyntheticWebsiteEvidence } from './evidence-fixture/index.ts';
import {
  createWebsiteModel,
  getRepositoryRoot,
  writeWebsiteModel,
} from '../src/lib/generation/generation.ts';

const repositoryRoot = getRepositoryRoot();
const fixture = await prepareSyntheticWebsiteEvidence(repositoryRoot);
await writeWebsiteModel(
  createWebsiteModel({
    allowFixtureEvidence: true,
    preparedEvidenceDirectory: fixture.preparedDirectory,
    selectionPath: fixture.selectionPath,
  }),
);
