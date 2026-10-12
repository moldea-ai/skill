import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import {
  getJourneyRevisions,
  JOURNEYS_PAGE_SIZE,
  type IScriptedJourneysWebsiteModel,
} from '../scripted-journeys/index.ts';
import type { IProjectRunModel } from '../project-runs/index.ts';
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
  getSemanticReleaseEvidenceSummary,
  loadReleaseEvidenceWebsiteState,
  type IReleaseEvidenceWebsiteState,
  type ISemanticReleaseEvidenceSummary,
} from '../release-evidence/index.ts';
import { DEFAULT_SITE_URL } from '../site/constants.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const GENERATED_NOTICE =
  'Generated from repository-owned documentation, semantic evaluation, scripted journeys, project runs, and moldea/SKILL.md metadata. Do not edit generated output.';
let cachedWebsiteModel: {
  model: IWebsiteModel;
  modifiedTime: bigint;
  size: bigint;
} | null = null;

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
  releaseEvidence: IWebsiteModel['releaseEvidence'],
  semanticEvaluation: ISemanticEvaluationWebsiteModel,
  projectRuns: IProjectRunModel | null = null,
  scriptedJourneys: IScriptedJourneysWebsiteModel | null = null,
): string => {
  const semanticReleaseSummary = getSemanticReleaseEvidenceSummary(
    releaseEvidence,
    semanticEvaluation.currentAssurance,
  );
  const releaseEvidenceLines =
    releaseEvidence.mode === 'not-recorded'
      ? [`Release evidence has not been recorded for ${releaseEvidence.targetVersion}.`]
      : (['semantic'] as const).map((kind) => {
          const section = releaseEvidence[kind];
          const label = 'Semantic';
          return `${label} evidence uses the selected recorded bundle from [${section.sourceLabel}](${section.sourceUrl}).`;
        });
  const lines = [
    '# `moldea` Agent Skill',
    '',
    '> Keep durable project knowledge in Git and bring relevant context into coding-agent planning and development. The same foundation supports runtime agents, reusable Agent Skills, and their instructions.',
    '',
    `Current skill release: ${skill.version}.`,
    '',
    `Primary distribution: [\`moldea\` on skills.sh](${SKILLS_DIRECTORY_URL})`,
    '',
    '```bash',
    INSTALL_COMMAND,
    '```',
    '',
    'Initialize project context explicitly, then describe outcomes to your coding agent in natural language. Direct context requests and declared relationships select relevant knowledge; unrelated implementation work does not load all project context. The coding agent handles repository-local evidence and deterministic tooling.',
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
    '',
    `- [Evidence overview](${EVIDENCE_ROUTE}): Explore the recorded evidence and its source records.`,
    `- [Semantic evaluation](${semanticEvaluation.route}): Follow ${semanticEvaluation.caseCount} difficult coding-agent decisions from request to independent verdict.`,
  );

  if (projectRuns !== null) {
    lines.push(
      `- [Project runs](${projectRuns.pages[0]!.route}): Recorded coding sessions in mock projects. Independent of semantic evaluation.`,
    );
  }

  if (scriptedJourneys !== null) {
    lines.push(
      `- [Scripted journeys](${scriptedJourneys.route}): The same requests in ChatGPT and Claude projects, with local assessments.`,
      ...scriptedJourneys.journeys.map(
        (journey) => `- [${journey.title}](${journey.route}): ${journey.summary}`,
      ),
    );
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
  semanticEvaluation: ISemanticEvaluationWebsiteModel,
  projectRuns: IProjectRunModel | null = null,
  scriptedJourneys: IScriptedJourneysWebsiteModel | null = null,
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
    ...(scriptedJourneys === null
      ? []
      : [
          scriptedJourneys.route,
          ...Array.from(
            {
              length: Math.max(
                0,
                Math.ceil(scriptedJourneys.journeys.length / JOURNEYS_PAGE_SIZE) - 1,
              ),
            },
            (_, index) => `${scriptedJourneys.route}page/${index + 2}/`,
          ),
          ...scriptedJourneys.journeys.map(({ route }) => route),
        ]),
    semanticEvaluation.route,
    ...semanticEvaluation.attempts.map(({ route }) => route),
    ...(projectRuns?.pages.flatMap((page) => [
      page.route,
      ...page.attempts.map(({ route }) => route),
    ]) ?? []),
  ]);

  for (const document of documents) {
    if (routes.has(document.route))
      throw new Error(`Two public items resolve to ${document.route}.`);
    routes.add(document.route);
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
    projectRuns?: IProjectRunModel | null;
    allowFixtureEvidence?: boolean | undefined;
    preparedEvidenceDirectory?: string | undefined;
    selectionPath?: string | undefined;
    unrecordedEvidence?: Pick<IReleaseEvidenceWebsiteState, 'semantic'> | undefined;
  } = {},
): IWebsiteModel => {
  const projectRuns = options.projectRuns ?? null;
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
          scriptedJourneys: null,
          releaseEvidence: { mode: 'not-recorded', targetVersion: skill.version },
        };
  const { releaseEvidence, scriptedJourneys } = releaseEvidenceState;
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
    projectRuns,
    scriptedJourneys: releaseEvidenceState.scriptedJourneys,
    currentSemanticAssurance: semanticEvaluation.currentAssurance,
    documents,
    generatedNotice: GENERATED_NOTICE,
    llmsText: createLlmsText(
      documents,
      skill,
      releaseEvidence,
      semanticEvaluation,
      projectRuns,
      scriptedJourneys,
    ),
    navigation: createNavigation(documents),
    releaseEvidence,
    routes: createRouteManifest(documents, semanticEvaluation, projectRuns, scriptedJourneys),
    searchRecords: [
      ...(scriptedJourneys === null
        ? []
        : [
            {
              title: 'Scripted journeys in ChatGPT and Claude',
              route: scriptedJourneys.route,
              description: 'The same project requests in ChatGPT and Claude, locally assessed.',
              searchText: 'scripted journeys ChatGPT Claude platform evaluation',
            },
            ...scriptedJourneys.journeys.map((journey) => ({
              title: journey.title,
              route: journey.route,
              description: journey.summary,
              searchText: `${journey.title} ${journey.summary} ${getJourneyRevisions(
                scriptedJourneys,
                journey.id,
              )
                .flatMap((revision) => revision.steps.map(({ request }) => request))
                .join(' ')}`,
            })),
          ]),
      ...(projectRuns === null
        ? []
        : [
            {
              title: 'Project runs',
              route: projectRuns.pages[0]!.route,
              description: projectRuns.summary,
              searchText: projectRuns.summary,
            },
            ...projectRuns.pages.flatMap(({ attempts }) =>
              attempts.map((attempt) => ({
                title: attempt.title,
                route: attempt.route,
                description: attempt.excerpt,
                searchText: `${attempt.title} ${attempt.summary}`,
              })),
            ),
          ]),
      ...createProductPageSearchRecords(),
      ...createSearchRecords(documents),
      {
        description:
          'See how moldea keeps saved project rules connected to code and checks them again.',
        route: EVIDENCE_ROUTE,
        searchText: normalizeSearchText(
          'Evidence testing evaluation semantic behavior projects proof',
        ),
        title: 'Evidence',
      },
      ...createSemanticEvaluationSearchRecords(semanticEvaluation, releaseEvidence),
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
  const temporaryPath = join(dirname(outputPath), `model.${randomUUID()}.json`);

  await mkdir(dirname(outputPath), { recursive: true });
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(createGeneratedWebsiteModelEnvelope(model), null, 2)}\n`,
      'utf8',
    );
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

/**
 * Reads the generated website model for static route generation.
 * @returns The previously generated deterministic website model.
 * @throws
 * - If the website model has not been generated
 */
export const loadWebsiteModel = (): IWebsiteModel => {
  const path = join(getRepositoryRoot(), 'website/.generated/model.json');

  if (!existsSync(path)) throw new Error('Website model is missing. Run npm run docs:generate.');
  const { mtimeNs: modifiedTime, size } = statSync(path, { bigint: true });
  if (
    cachedWebsiteModel !== null &&
    cachedWebsiteModel.modifiedTime === modifiedTime &&
    cachedWebsiteModel.size === size
  ) {
    return cachedWebsiteModel.model;
  }

  const model = restoreGeneratedWebsiteModel(
    JSON.parse(readFileSync(path, 'utf8')) as IGeneratedWebsiteModelEnvelope,
  );
  cachedWebsiteModel = { model, modifiedTime, size };
  return model;
};
