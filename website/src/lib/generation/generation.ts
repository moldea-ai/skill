import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import {
  assertPublishableQualificationEvidence,
  composeQualificationProfile,
  loadQualificationWebsiteModel,
  type IQualificationWebsiteModel,
} from '../qualification/index.ts';
import {
  loadSemanticEvaluationWebsiteModel,
  type ISemanticEvaluationWebsiteModel,
} from '../semantic-evaluation/index.ts';
import {
  DOCUMENT_SECTION_LABELS,
  EVIDENCE_ROUTE,
  INSTALL_COMMAND,
  REQUIRED_DOCUMENT_ROUTES,
  SKILLS_DIRECTORY_URL,
  SOURCE_REPOSITORY_URL,
} from '../model/constants.ts';
import type {
  IDocumentSection,
  INavigationGroup,
  ISearchRecord,
  ISkillMetadata,
  IWebsiteDocument,
  IWebsiteModel,
} from '../model/types.ts';
import {
  getQualificationReleaseEvidenceSummary,
  getSemanticReleaseEvidenceSummary,
  loadReleaseEvidenceWebsiteState,
  type ISemanticReleaseEvidenceSummary,
} from '../release-evidence/index.ts';
import { DEFAULT_SITE_URL } from '../site/constants.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const GENERATED_NOTICE =
  'Generated from repository-owned documentation, semantic evaluation, qualification evidence, and moldea/SKILL.md metadata. Do not edit generated output.';
let cachedWebsiteModel: IWebsiteModel | null = null;

interface IGeneratedWebsiteModelEnvelope {
  formatVersion: 1;
  model: IWebsiteModel;
  semanticAssuranceAttemptId: string | null;
}

const DocumentFrontmatterSchema = z.strictObject({
  description: z.string().min(1),
  navigationTitle: z.string().min(1),
  order: z.number().int().nonnegative(),
  section: z.enum(['start', 'concepts', 'workflows', 'examples', 'reference']),
  title: z.string().min(1),
});

const SkillFrontmatterSchema = z.object({
  description: z.string().min(1),
  metadata: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  }),
  name: z.literal('moldea'),
});

/** Returns the Git repository root that owns the website. */
export const getRepositoryRoot = (): string => {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
};

const parseFrontmatterDocument = (
  source: string,
  sourcePath: string,
): { body: string; metadata: unknown } => {
  const normalizedSource = source.replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(normalizedSource);

  if (!match) throw new Error(`${sourcePath} must start with YAML frontmatter.`);

  return {
    body: (match[2] ?? '').trim(),
    metadata: parseYaml(match[1] ?? ''),
  };
};

const listMarkdownFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !EXCLUDED_DIRECTORY_NAMES.has(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry): string[] => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) return listMarkdownFiles(path);
      if (entry.isFile() && entry.name.endsWith('.md')) return [path];

      return [];
    });
};

const getDocumentIdentity = (
  path: string,
  docsDirectory: string,
): { route: string; slug: string } => {
  const relativePath = relative(docsDirectory, path).replaceAll(sep, '/');
  const sourceSlug = relativePath.replace(/\.md$/u, '').replace(/\/index$/u, '');

  if (sourceSlug === 'index') return { route: '/docs/', slug: '' };
  if (sourceSlug === 'examples') return { route: '/examples/', slug: 'examples' };
  if (sourceSlug.startsWith('examples/')) {
    const exampleSlug = sourceSlug.slice('examples/'.length);
    return { route: `/examples/${exampleSlug}/`, slug: exampleSlug };
  }

  return { route: `/docs/${sourceSlug}/`, slug: sourceSlug };
};

const parseDocument = (
  path: string,
  docsDirectory: string,
  repositoryRoot: string,
): IWebsiteDocument => {
  const sourcePath = relative(repositoryRoot, path).replaceAll(sep, '/');
  const { body, metadata: unknownMetadata } = parseFrontmatterDocument(
    readFileSync(path, 'utf8'),
    sourcePath,
  );
  const metadata = DocumentFrontmatterSchema.parse(unknownMetadata);
  const identity = getDocumentIdentity(path, docsDirectory);

  if (!body.startsWith('# ')) throw new Error(`${sourcePath} must begin with one level-one title.`);
  if (identity.route.startsWith('/examples/') !== (metadata.section === 'examples')) {
    throw new Error(`${sourcePath} has a route and section that contradict one another.`);
  }

  return {
    description: metadata.description,
    markdown: body,
    navigationTitle: metadata.navigationTitle,
    order: metadata.order,
    route: identity.route,
    section: metadata.section,
    slug: identity.slug,
    sourcePath,
    title: metadata.title,
  };
};

/**
 * Discovers and validates every repository-owned public documentation source.
 * @param repositoryRoot Git repository root.
 * @returns Public documents in deterministic navigation order.
 */
export const discoverDocuments = (repositoryRoot: string): IWebsiteDocument[] => {
  const docsDirectory = join(repositoryRoot, 'docs');

  if (!existsSync(docsDirectory)) throw new Error('The repository has no docs directory.');

  const documents = listMarkdownFiles(docsDirectory)
    .map((path) => parseDocument(path, docsDirectory, repositoryRoot))
    .sort((left, right) => left.order - right.order || left.route.localeCompare(right.route));
  const routeSet = new Set(documents.map(({ route }) => route));
  const orderSet = new Set(documents.map(({ order }) => order));

  if (routeSet.size !== documents.length) throw new Error('Documentation routes must be unique.');
  if (orderSet.size !== documents.length)
    throw new Error('Documentation order values must be unique.');

  for (const route of REQUIRED_DOCUMENT_ROUTES) {
    if (!routeSet.has(route)) throw new Error(`Required documentation route ${route} is missing.`);
  }

  return documents;
};

/**
 * Reads portable skill identity without treating the website as a second version authority.
 * @param repositoryRoot Git repository root.
 * @returns Name, description, and release version from portable skill metadata.
 */
export const readSkillMetadata = (repositoryRoot: string): ISkillMetadata => {
  const sourcePath = 'moldea/SKILL.md';
  const { metadata: unknownMetadata } = parseFrontmatterDocument(
    readFileSync(join(repositoryRoot, sourcePath), 'utf8'),
    sourcePath,
  );
  const metadata = SkillFrontmatterSchema.parse(unknownMetadata);

  return {
    description: metadata.description,
    name: metadata.name,
    version: metadata.metadata.version,
  };
};

/** Creates navigation groups from the ordered document model. */
export const createNavigation = (documents: IWebsiteDocument[]): INavigationGroup[] => {
  return (Object.keys(DOCUMENT_SECTION_LABELS) as IDocumentSection[]).map((id) => ({
    documents: documents.filter(({ section }) => section === id),
    id,
    label: DOCUMENT_SECTION_LABELS[id],
  }));
};

const normalizeSearchText = (source: string): string =>
  source
    .replaceAll(/[^\p{L}\p{N}@._/:-]+/gu, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

/** Creates deterministic local-search records from public documents. */
export const createSearchRecords = (documents: IWebsiteDocument[]): ISearchRecord[] => {
  return documents.map((document) => ({
    description: document.description,
    route: document.route,
    searchText: normalizeSearchText(
      [document.title, document.navigationTitle, document.description, document.markdown].join(' '),
    ),
    title: document.title,
  }));
};

/** Creates bounded search records for qualification profiles without indexing transcripts. */
export const createQualificationSearchRecords = (
  qualification: IQualificationWebsiteModel,
): ISearchRecord[] => {
  const verifiedSourceAttemptCount = qualification.profiles.filter(
    (profile) => getQualificationReleaseEvidenceSummary(profile).kind === 'pinned',
  ).length;
  const landingRecord: ISearchRecord = {
    description: `Follow realistic coding projects that verify ${qualification.profiles.length} integrations${verifiedSourceAttemptCount === 0 ? '.' : `, including ${verifiedSourceAttemptCount} results backed by authenticated release sources.`}`,
    route: qualification.route,
    searchText: normalizeSearchText(
      'Adapter qualification support gate methodology profiles projects attempts evidence results',
    ),
    title: 'Adapter qualification',
  };
  const profileRecords = qualification.profiles.map((profile): ISearchRecord => {
    return {
      description: profile.description,
      route: profile.route,
      searchText: normalizeSearchText(
        [
          profile.title,
          profile.adapterId,
          profile.implementationId,
          profile.description,
          ...profile.cases.flatMap((profileCase) => [
            profileCase.title,
            profileCase.catalogDescription,
            profileCase.catalogChallenge,
            profileCase.purpose,
          ]),
          ...profile.probes.flatMap(({ description, matrixPath }) => [description, matrixPath]),
          ...profile.runtimePackages.flatMap(({ name, version }) => [name, version]),
          ...(profile.pinnedPriorEvidence === null
            ? []
            : [
                profile.pinnedPriorEvidence.attemptId,
                profile.pinnedPriorEvidence.createdAt,
                profile.pinnedPriorEvidence.completedAt,
                ...profile.pinnedPriorEvidence.packages.flatMap(({ name, version }) => [
                  name,
                  version,
                ]),
              ]),
        ].join(' '),
      ),
      title: profile.title,
    };
  });

  return [landingRecord, ...profileRecords];
};

/** Creates concise semantic evidence search records without indexing actor transcripts. */
export const createSemanticEvaluationSearchRecords = (
  semanticEvaluation: ISemanticEvaluationWebsiteModel,
  releaseEvidence: IWebsiteModel['releaseEvidence'],
): ISearchRecord[] => {
  const releaseSummary = getSemanticReleaseEvidenceSummary(
    releaseEvidence,
    semanticEvaluation.currentAssurance,
  );
  const landingRecord: ISearchRecord = {
    description: `Follow ${semanticEvaluation.caseCount} difficult coding-agent decisions from developer request to independent verdict.`,
    route: semanticEvaluation.route,
    searchText: normalizeSearchText(
      [
        'Semantic evaluation behavioral scenarios expected behavior forbidden behavior passing evidence',
        releaseSummary.result?.attemptId ?? '',
      ].join(' '),
    ),
    title: 'Semantic evaluation',
  };
  const groupRecords = semanticEvaluation.groups.map((group): ISearchRecord => ({
    description: group.description,
    route: `${semanticEvaluation.route}#${group.id}`,
    searchText: normalizeSearchText(
      [
        group.title,
        group.description,
        ...group.cases.flatMap(({ expectedCriteria, forbiddenCriteria, scenario, title }) => [
          title,
          scenario,
          ...expectedCriteria.map(({ criterion }) => criterion),
          ...forbiddenCriteria.map(({ criterion }) => criterion),
        ]),
      ].join(' '),
    ),
    title: group.title,
  }));
  const attemptRecords = semanticEvaluation.attempts.map(({ result, route }): ISearchRecord => ({
    description: `Recorded ${result.status} semantic attempt with ${result.passedCaseCount + result.recoveredCaseCount} of ${result.totalCaseCount} scenarios successful.`,
    route,
    searchText: normalizeSearchText(
      [
        result.attemptId,
        result.status,
        result.stopReason,
        ...result.cases.flatMap(({ id, status }) => [id, status]),
      ].join(' '),
    ),
    title: `Semantic attempt: ${result.attemptId}`,
  }));

  return [landingRecord, ...groupRecords, ...attemptRecords];
};

/** Describes the release-effective semantic result without relabeling pinned evidence as current. */
const createSemanticReleaseEvidenceLine = (summary: ISemanticReleaseEvidenceSummary): string => {
  if (summary.kind === 'not-recorded') return 'Semantic release evidence: not recorded.';

  const successfulCaseCount = summary.result.passedCaseCount + summary.result.recoveredCaseCount;
  if (summary.kind === 'pinned') {
    return `Semantic release evidence: ${successfulCaseCount}/${summary.result.totalCaseCount} scenarios successful (${summary.result.passedCaseCount} direct passes, ${summary.result.recoveredCaseCount} recoveries, ${summary.result.failedCaseCount} failed, ${summary.result.pendingCaseCount} pending) from verified source attempt [${summary.result.attemptId}](${summary.sourceUrl}).`;
  }

  return `Semantic release evidence: ${successfulCaseCount}/${summary.result.totalCaseCount} scenarios have exact current assurance.`;
};

/** Creates the concise machine-oriented skill map from canonical public sources. */
export const createLlmsText = (
  documents: IWebsiteDocument[],
  skill: ISkillMetadata,
  qualification: IQualificationWebsiteModel,
  currentQualification: IQualificationWebsiteModel,
  releaseEvidence: IWebsiteModel['releaseEvidence'],
  semanticEvaluation: ISemanticEvaluationWebsiteModel,
  currentSemanticAssurance: ISemanticEvaluationWebsiteModel['currentAssurance'],
): string => {
  const semanticReleaseSummary = getSemanticReleaseEvidenceSummary(
    releaseEvidence,
    currentSemanticAssurance,
  );
  const qualificationReleaseSummaries = qualification.profiles.map(
    getQualificationReleaseEvidenceSummary,
  );
  const releaseQualifiedProfileCount = qualificationReleaseSummaries.filter(
    ({ status }) => status === 'passed',
  ).length;
  const verifiedQualificationSourceCount = qualificationReleaseSummaries.filter(
    ({ kind }) => kind === 'pinned',
  ).length;
  const currentSemanticSuccessfulCaseCount = currentSemanticAssurance
    ? currentSemanticAssurance.result.passedCaseCount +
      currentSemanticAssurance.result.recoveredCaseCount
    : 0;
  const currentQualifiedProfileCount = currentQualification.profiles.filter(
    ({ currentAssurance }) => currentAssurance !== null,
  ).length;
  const releaseEvidenceLines =
    releaseEvidence.mode === 'not-recorded'
      ? [`Release evidence has not been recorded for ${releaseEvidence.targetVersion}.`]
      : (['semantic', 'qualification'] as const).map((kind) => {
          const section = releaseEvidence[kind];
          const label = kind === 'semantic' ? 'Semantic' : 'Qualification';
          return section.mode === 'pinned'
            ? `${label} release provenance uses verified prior evidence from [${section.sourceLabel}](${section.sourceUrl}). Reason: ${section.reason}`
            : `${label} evidence for release ${releaseEvidence.targetVersion} is fresh.`;
        });
  const lines = [
    '# `moldea` Agent Skill',
    '',
    '> The Git-native semantic operating layer that helps coding agents plan, create, maintain, evaluate, reconcile, and validate grounded agents, reusable Agent Skills, and project context.',
    '',
    `Current skill release: ${skill.version}.`,
    '',
    `Primary distribution: [\`moldea\` on skills.sh](${SKILLS_DIRECTORY_URL})`,
    '',
    '```bash',
    INSTALL_COMMAND,
    '```',
    '',
    'Developers interact with their coding agent in natural language. The coding agent loads the skill and handles repository-local evidence and deterministic tooling underneath.',
    '',
  ];

  for (const [section, label] of Object.entries(DOCUMENT_SECTION_LABELS)) {
    const sectionDocuments = documents.filter((document) => document.section === section);

    if (sectionDocuments.length === 0) continue;

    lines.push(`## ${label}`, '');

    for (const document of sectionDocuments) {
      lines.push(`- [${document.title}](${document.route}): ${document.description}`);
    }

    lines.push('');
  }

  lines.push(
    '## Evidence',
    '',
    ...releaseEvidenceLines,
    '',
    createSemanticReleaseEvidenceLine(semanticReleaseSummary),
    `Qualification release evidence: ${releaseQualifiedProfileCount}/${qualification.profiles.length} profiles passing${verifiedQualificationSourceCount === 0 ? '.' : `, including ${verifiedQualificationSourceCount} verified source ${verifiedQualificationSourceCount === 1 ? 'attempt' : 'attempts'}.`}`,
    '',
    `Current semantic contract: ${currentSemanticSuccessfulCaseCount}/${semanticEvaluation.caseCount} scenarios have exact current assurance.`,
    `Current qualification contracts: ${currentQualifiedProfileCount}/${qualification.profiles.length} profiles have exact current assurance.`,
    '',
    `- [Evidence overview](${EVIDENCE_ROUTE}): Choose behavioral semantic evaluation or real-project adapter qualification evidence.`,
    `- [Semantic evaluation](${semanticEvaluation.route}): Follow ${semanticEvaluation.caseCount} difficult coding-agent decisions from request to independent verdict.`,
    `- [Adapter qualification](${qualification.route}): Follow realistic project journeys that verify the complete skill, tooling, packages, and supported integrations.`,
  );

  for (const profile of qualification.profiles) {
    lines.push(`- [${profile.title}](${profile.route}): ${profile.description}`);
  }

  lines.push('');

  lines.push(
    '## Canonical references',
    '',
    `- [Source repository](${SOURCE_REPOSITORY_URL})`,
    '- [Installation and first use](/docs/getting-started/)',
    '- [Complete capabilities](/docs/capabilities/)',
    '- [Interaction examples](/examples/)',
    '',
  );

  return lines.join('\n');
};

/** Creates the unique deterministic public route manifest. */
export const createRouteManifest = (
  documents: IWebsiteDocument[],
  qualification: IQualificationWebsiteModel,
  semanticEvaluation: ISemanticEvaluationWebsiteModel,
): string[] => {
  const routes = new Set([
    '/',
    '/404.html',
    '/llms.txt',
    '/robots.txt',
    '/search/',
    '/search-index.json',
    EVIDENCE_ROUTE,
    semanticEvaluation.route,
    ...semanticEvaluation.attempts.map(({ route }) => route),
  ]);

  for (const document of documents) {
    if (routes.has(document.route))
      throw new Error(`Two public items resolve to ${document.route}.`);
    routes.add(document.route);
  }

  for (const route of [qualification.route, ...qualification.profiles.map(({ route }) => route)]) {
    if (routes.has(route)) throw new Error(`Two public items resolve to ${route}.`);
    routes.add(route);
  }

  return [...routes].sort();
};

/** Selects one complete qualification profile per identity without combining attempt histories. */
const selectQualificationWebsiteModel = (
  current: IQualificationWebsiteModel,
  pinned: IQualificationWebsiteModel | null,
): IQualificationWebsiteModel => {
  if (pinned === null) return current;
  const pinnedProfilesByIdentity = new Map(
    pinned.profiles.map((profile) => [
      `${profile.adapterId}\0${profile.implementationId}`,
      profile,
    ]),
  );
  if (
    pinnedProfilesByIdentity.size !== pinned.profiles.length ||
    pinned.profiles.length !== current.profiles.length
  ) {
    throw new Error('Current and pinned qualification profile inventories do not match.');
  }
  const profiles = current.profiles.map((profile) => {
    const pinnedProfile = pinnedProfilesByIdentity.get(
      `${profile.adapterId}\0${profile.implementationId}`,
    );
    if (pinnedProfile === undefined) {
      throw new Error('Current and pinned qualification profile inventories do not match.');
    }
    return profile.currentAssurance === null ? pinnedProfile : profile;
  });

  return {
    ...current,
    profiles,
    uniqueJourneyCount: profiles.reduce((total, profile) => total + profile.cases.length, 0),
  };
};

/**
 * Builds the complete deterministic website model without writing generated output.
 * @param qualificationRepositoryRoot Repository root used to load qualification evidence.
 * @returns The validated documentation, navigation, search, route, and LLM model.
 */
export const createWebsiteModel = (
  qualificationRepositoryRoot: string = getRepositoryRoot(),
): IWebsiteModel => {
  const repositoryRoot = getRepositoryRoot();
  const documents = discoverDocuments(repositoryRoot);
  const skill = readSkillMetadata(repositoryRoot);
  const releaseEvidenceState = loadReleaseEvidenceWebsiteState(repositoryRoot, skill.version);
  const { releaseEvidence } = releaseEvidenceState;
  const loadedQualification = loadQualificationWebsiteModel(qualificationRepositoryRoot);
  const isReleaseQualification = resolve(qualificationRepositoryRoot) === repositoryRoot;
  const qualification = isReleaseQualification
    ? selectQualificationWebsiteModel(loadedQualification, releaseEvidenceState.pinnedQualification)
    : loadedQualification;
  if (releaseEvidence.mode === 'not-recorded' || releaseEvidence.qualification.mode === 'fresh') {
    assertPublishableQualificationEvidence(qualification);
  }
  const currentSemanticEvaluation = loadSemanticEvaluationWebsiteModel(repositoryRoot);
  const hasPassingCurrentSemanticAssurance =
    currentSemanticEvaluation.currentAssurance?.evidenceSource.kind === 'current' &&
    currentSemanticEvaluation.currentAssurance.result.status === 'passed';
  const semanticEvaluation = hasPassingCurrentSemanticAssurance
    ? currentSemanticEvaluation
    : (releaseEvidenceState.pinnedSemantic ?? currentSemanticEvaluation);
  const readme = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');
  const customDomain = readFileSync(join(repositoryRoot, 'CNAME'), 'utf8').trim();
  const productionHostname = new URL(DEFAULT_SITE_URL).hostname;

  if (customDomain !== productionHostname) {
    throw new Error(`CNAME must declare ${productionHostname}.`);
  }

  for (const requiredText of [SKILLS_DIRECTORY_URL, INSTALL_COMMAND, 'https://skill.moldea.ai']) {
    if (!readme.includes(requiredText)) {
      throw new Error(`README.md must include ${requiredText}.`);
    }
  }

  return {
    currentSemanticAssurance: currentSemanticEvaluation.currentAssurance,
    documents,
    generatedNotice: GENERATED_NOTICE,
    llmsText: createLlmsText(
      documents,
      skill,
      qualification,
      loadedQualification,
      releaseEvidence,
      semanticEvaluation,
      currentSemanticEvaluation.currentAssurance,
    ),
    navigation: createNavigation(documents),
    qualification,
    releaseEvidence,
    routes: createRouteManifest(documents, qualification, semanticEvaluation),
    searchRecords: [
      ...createSearchRecords(documents),
      {
        description:
          'Choose behavioral semantic evaluation or real-project adapter qualification evidence.',
        route: EVIDENCE_ROUTE,
        searchText: normalizeSearchText(
          'Evidence testing evaluation semantic behavior qualification adapters projects proof',
        ),
        title: 'Evidence',
      },
      ...createSemanticEvaluationSearchRecords(semanticEvaluation, releaseEvidence),
      ...createQualificationSearchRecords(qualification),
    ],
    semanticEvaluation,
    skill,
  };
};

/** Removes repeated object references before serializing the static-build cache. */
const createGeneratedWebsiteModelEnvelope = (
  model: IWebsiteModel,
): IGeneratedWebsiteModelEnvelope => {
  const semanticAssuranceAttemptId =
    model.semanticEvaluation.currentAssurance?.result.attemptId ?? null;
  const semanticEvaluation =
    semanticAssuranceAttemptId === null
      ? model.semanticEvaluation
      : {
          ...model.semanticEvaluation,
          currentAssurance: null,
          groups: model.semanticEvaluation.groups.map((group) => ({ ...group, cases: [] })),
          lastPassing: null,
          latest: null,
        };
  const qualification = {
    ...model.qualification,
    profiles: model.qualification.profiles.map((profile) => ({
      ...profile,
      boundBaseline: null,
      currentAssurance: null,
      currentLastPassing: null,
      currentLatest: null,
      sharedCases: [],
    })),
  };

  return {
    formatVersion: 1,
    model: { ...model, qualification, semanticEvaluation },
    semanticAssuranceAttemptId,
  };
};

/** Restores shared evidence references after reading the compact static-build cache. */
const restoreGeneratedWebsiteModel = (envelope: IGeneratedWebsiteModelEnvelope): IWebsiteModel => {
  if (envelope.formatVersion !== 1) {
    throw new Error('Generated website model has an unsupported format version.');
  }
  const directProfiles = envelope.model.qualification.profiles.map((profile) => ({
    ...profile,
    currentLastPassing:
      profile.attempts.filter(({ result }) => result.status === 'passed').at(-1) ?? null,
    currentLatest: profile.attempts.at(-1) ?? null,
  }));
  const customProfile = directProfiles.find(
    ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
  );
  if (customProfile === undefined) {
    throw new Error('Generated qualification model has no Custom baseline.');
  }
  const qualification = {
    ...envelope.model.qualification,
    profiles: directProfiles.map((profile) => composeQualificationProfile(profile, customProfile)),
  };

  const semanticEvaluation = envelope.model.semanticEvaluation;
  if (envelope.semanticAssuranceAttemptId === null) {
    return { ...envelope.model, qualification };
  }
  const currentAssurance = semanticEvaluation.attempts.find(
    ({ result }) => result.attemptId === envelope.semanticAssuranceAttemptId,
  );
  if (currentAssurance === undefined) {
    throw new Error('Generated semantic assurance does not resolve to an attempt.');
  }
  const groups = semanticEvaluation.groups.map((group) => ({
    ...group,
    cases: currentAssurance.cases.filter(({ groupId }) => groupId === group.id),
  }));
  if (
    groups.reduce((total, group) => total + group.cases.length, 0) !== currentAssurance.cases.length
  ) {
    throw new Error('Generated semantic groups do not cover the selected assurance.');
  }

  return {
    ...envelope.model,
    qualification,
    semanticEvaluation: {
      ...semanticEvaluation,
      currentAssurance,
      groups,
      lastPassing:
        semanticEvaluation.latestPointer?.lastPassingAttemptId === currentAssurance.result.attemptId
          ? currentAssurance
          : null,
      latest:
        semanticEvaluation.latestPointer?.latestAttemptId === currentAssurance.result.attemptId
          ? currentAssurance
          : null,
    },
  };
};

/**
 * Writes the deterministic model consumed by Astro into the ignored website cache.
 * @param model Fully validated website model.
 * @returns A promise that resolves after the generated model is written.
 */
export const writeWebsiteModel = async (model: IWebsiteModel): Promise<void> => {
  const outputPath = join(getRepositoryRoot(), 'website/.generated/model.json');

  await mkdir(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify(createGeneratedWebsiteModelEnvelope(model), null, 2)}\n`,
    'utf8',
  );
};

/**
 * Reads the generated website model for static route generation.
 * @returns The previously generated deterministic website model.
 * @throws
 * - If the website model has not been generated
 */
export const loadWebsiteModel = (): IWebsiteModel => {
  if (cachedWebsiteModel !== null) return cachedWebsiteModel;
  const path = join(getRepositoryRoot(), 'website/.generated/model.json');

  if (!existsSync(path)) throw new Error('Website model is missing. Run npm run docs:generate.');

  cachedWebsiteModel = restoreGeneratedWebsiteModel(
    JSON.parse(readFileSync(path, 'utf8')) as IGeneratedWebsiteModelEnvelope,
  );
  return cachedWebsiteModel;
};
