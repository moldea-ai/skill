import { prepareSyntheticWebsiteEvidence } from './evidence-fixture/index.ts';
import { createWebsiteModel, getRepositoryRoot } from '../src/lib/generation/generation.ts';

const repositoryRoot = getRepositoryRoot();
const fixture = await prepareSyntheticWebsiteEvidence(repositoryRoot);
createWebsiteModel({
  allowFixtureEvidence: true,
  preparedEvidenceDirectory: fixture.preparedDirectory,
  selectionPath: fixture.selectionPath,
});
