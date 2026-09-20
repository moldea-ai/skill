import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import type { IQualificationWebsiteModel } from '../qualification/index.ts';
import type { ISemanticEvaluationWebsiteModel } from '../semantic-evaluation/index.ts';
import {
  DOCUMENT_SECTION_LABELS,
  EVIDENCE_ROUTE,
  INSTALL_COMMAND,
  PRODUCT_PAGE_METADATA,
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
  type IReleaseEvidenceWebsiteState,
  type ISemanticReleaseEvidenceSummary,
} from '../release-evidence/index.ts';
import { DEFAULT_SITE_URL } from '../site/constants.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const GENERATED_NOTICE =
  'Generated from repository-owned documentation, semantic evaluation, qualification evidence, and moldea/SKILL.md metadata. Do not edit generated output.';
let cachedWebsiteModel: IWebsiteModel | null = null;

/** Formats the product name as semantic inline code in generated Markdown prose. */
const formatProductNameAsMarkdownCode = (value: string): string =>
  value.replaceAll(/\bmoldea\b/giu, '`moldea`');

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

/** Creates concise search records for the visual product pages. */
export const createProductPageSearchRecords = (): ISearchRecord[] => {
  return Object.values(PRODUCT_PAGE_METADATA).map((page) => ({
    description: page.description,
    route: page.route,
    searchText: normalizeSearchText([page.title, page.description, page.searchText].join(' ')),
    title: page.title,
  }));
};

/** Creates bounded search records for qualification profiles without indexing transcripts. */
export const createQualificationSearchRecords = (
  qualification: IQualificationWebsiteModel,
): ISearchRecord[] => {
  const verifiedSourceAttemptCount = qualification.profiles.filter(
    (profile) => getQualificationReleaseEvidenceSummary(profile).kind === 'recorded',
  ).length;
  const landingRecord: ISearchRecord = {
    description: `See how saved project fixtures check the files used by ${qualification.profiles.length} AI service integrations${verifiedSourceAttemptCount === 0 ? '.' : `, including ${verifiedSourceAttemptCount} results backed by authenticated release sources.`}`,
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
          ...profile.attempts.flatMap(({ result }) => [
            result.attemptId,
            result.createdAt,
            ...result.provenance.packages.flatMap(({ name, version }) => [name, version]),
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
        ...group.cases.flatMap(
          ({ expectedCriteria, forbiddenCriteria, scenario, summary, title }) => [
            title,
            summary,
            scenario,
            ...expectedCriteria.map(({ criterion }) => criterion),
            ...forbiddenCriteria.map(({ criterion }) => criterion),
          ],
        ),
      ].join(' '),
    ),
    title: group.title,
  }));
  const attemptRecords = semanticEvaluation.attempts.map(({ result, route }): ISearchRecord => ({
    description: `Recorded ${result.status} semantic attempt with ${result.totalCaseCount} decisions and their verdicts.`,
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

/** Describes the selected recorded semantic result. */
const createSemanticReleaseEvidenceLine = (summary: ISemanticReleaseEvidenceSummary): string => {
  if (summary.kind === 'not-recorded') return 'Semantic release evidence: not recorded.';

  const successfulCaseCount = summary.result.passedCaseCount + summary.result.recoveredCaseCount;
  return `Semantic release evidence: ${successfulCaseCount}/${summary.result.totalCaseCount} scenarios successful (${summary.result.passedCaseCount} direct passes, ${summary.result.recoveredCaseCount} recoveries, ${summary.result.failedCaseCount} failed, ${summary.result.pendingCaseCount} pending) from selected recorded attempt [${summary.result.attemptId}](${summary.sourceUrl}).`;
};

/** Creates the concise machine-oriented skill map from canonical public sources. */
export const createLlmsText = (
  documents: IWebsiteDocument[],
  skill: ISkillMetadata,
  qualification: IQualificationWebsiteModel,
  releaseEvidence: IWebsiteModel['releaseEvidence'],
  semanticEvaluation: ISemanticEvaluationWebsiteModel,
): string => {
  const semanticReleaseSummary = getSemanticReleaseEvidenceSummary(
    releaseEvidence,
    semanticEvaluation.currentAssurance,
  );
  const qualificationReleaseSummaries = qualification.profiles.map(
    getQualificationReleaseEvidenceSummary,
  );
  const releaseQualifiedProfileCount = qualificationReleaseSummaries.filter(
    ({ status }) => status === 'passed',
  ).length;
  const verifiedQualificationSourceCount = qualificationReleaseSummaries.filter(
    ({ kind }) => kind === 'recorded',
  ).length;
  const releaseEvidenceLines =
    releaseEvidence.mode === 'not-recorded'
      ? [`Release evidence has not been recorded for ${releaseEvidence.targetVersion}.`]
      : (['semantic', 'qualification'] as const).map((kind) => {
          const section = releaseEvidence[kind];
          const label = kind === 'semantic' ? 'Semantic' : 'Qualification';
          return `${label} evidence uses the selected recorded bundle from [${section.sourceLabel}](${section.sourceUrl}).`;
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

  lines.push(
    '## Explore',
    '',
    ...Object.values(PRODUCT_PAGE_METADATA).map(
      (page) =>
        `- [${formatProductNameAsMarkdownCode(page.title)}](${page.route}): ${formatProductNameAsMarkdownCode(page.description)}`,
    ),
    '',
  );

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
    `Qualification release evidence: ${releaseQualifiedProfileCount}/${qualification.profiles.length} profiles passing${verifiedQualificationSourceCount === 0 ? '.' : ` across ${verifiedQualificationSourceCount} selected recorded ${verifiedQualificationSourceCount === 1 ? 'profile' : 'profiles'}.`}`,
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
    '- [Capability reference](/docs/capabilities/)',
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
    ...Object.values(PRODUCT_PAGE_METADATA).map(({ route }) => route),
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

/**
 * Builds the complete deterministic website model without writing generated output.
 * @param options Evidence source used to build the website model.
 * @returns The validated documentation, navigation, search, route, and LLM model.
 */
export const createWebsiteModel = (
  options: {
    allowFixtureEvidence?: boolean | undefined;
    preparedEvidenceDirectory?: string | undefined;
    selectionPath?: string | undefined;
    unrecordedEvidence?:
      Pick<IReleaseEvidenceWebsiteState, 'qualification' | 'semantic'> | undefined;
  } = {},
): IWebsiteModel => {
  const repositoryRoot = getRepositoryRoot();
  const documents = discoverDocuments(repositoryRoot);
  const skill = readSkillMetadata(repositoryRoot);
  const releaseEvidenceState: IReleaseEvidenceWebsiteState =
    options.unrecordedEvidence === undefined
      ? loadReleaseEvidenceWebsiteState(repositoryRoot, skill.version, {
          allowFixture: options.allowFixtureEvidence,
          preparedDirectory: options.preparedEvidenceDirectory,
          selectionPath: options.selectionPath,
        })
      : {
          ...options.unrecordedEvidence,
          releaseEvidence: { mode: 'not-recorded', targetVersion: skill.version },
        };
  const { releaseEvidence } = releaseEvidenceState;
  const qualification = releaseEvidenceState.qualification;
  const semanticEvaluation = releaseEvidenceState.semantic;
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
    currentSemanticAssurance: semanticEvaluation.currentAssurance,
    documents,
    generatedNotice: GENERATED_NOTICE,
    llmsText: createLlmsText(documents, skill, qualification, releaseEvidence, semanticEvaluation),
    navigation: createNavigation(documents),
    qualification,
    releaseEvidence,
    routes: createRouteManifest(documents, qualification, semanticEvaluation),
    searchRecords: [
      ...createProductPageSearchRecords(),
      ...createSearchRecords(documents),
      {
        description:
          'See how moldea keeps saved project rules connected to code and checks them again.',
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

/** Wraps the selected static website model for generated-cache versioning. */
const createGeneratedWebsiteModelEnvelope = (
  model: IWebsiteModel,
): IGeneratedWebsiteModelEnvelope => ({
  formatVersion: 1,
  model,
  semanticAssuranceAttemptId: model.semanticEvaluation.currentAssurance?.result.attemptId ?? null,
});

/** Reads the selected static website model from its versioned generated cache. */
const restoreGeneratedWebsiteModel = (envelope: IGeneratedWebsiteModelEnvelope): IWebsiteModel => {
  if (envelope.formatVersion !== 1) {
    throw new Error('Generated website model has an unsupported format version.');
  }
  return envelope.model;
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
