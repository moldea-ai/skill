import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import {
  loadQualificationWebsiteModel,
  type IQualificationWebsiteModel,
} from '../qualification/index.ts';
import {
  DOCUMENT_SECTION_LABELS,
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
import { DEFAULT_SITE_URL } from '../site/constants.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const GENERATED_NOTICE =
  'Generated from repository-owned documentation, qualification evidence, and moldea/SKILL.md metadata. Do not edit generated output.';

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

/** Creates bounded search records for qualification profiles and attempts without transcripts. */
export const createQualificationSearchRecords = (
  qualification: IQualificationWebsiteModel,
): ISearchRecord[] => {
  const landingRecord: ISearchRecord = {
    description:
      'Inspect adapter support-gate methodology, transparent project profiles, and complete recorded evidence.',
    route: qualification.route,
    searchText: normalizeSearchText(
      'Adapter qualification support gate methodology profiles projects attempts evidence results',
    ),
    title: 'Adapter qualification',
  };
  const profileRecords = qualification.profiles.flatMap((profile): ISearchRecord[] => {
    const profileRecord: ISearchRecord = {
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
        ].join(' '),
      ),
      title: profile.title,
    };
    const attemptRecords = profile.attempts.map(({ result, route }): ISearchRecord => ({
      description: `Recorded ${result.status} qualification attempt for ${profile.adapterId}/${profile.implementationId}.`,
      route,
      searchText: normalizeSearchText(
        [
          result.attemptId,
          result.status,
          result.summary,
          profile.adapterId,
          profile.implementationId,
          ...result.cases.flatMap(({ caseId, failures, title }) => [caseId, title, ...failures]),
          ...result.provenance.packages.flatMap(({ name, version }) => [name, version]),
        ].join(' '),
      ),
      title: `${profile.title}: ${result.attemptId}`,
    }));

    return [profileRecord, ...attemptRecords];
  });

  return [landingRecord, ...profileRecords];
};

/** Creates the concise machine-oriented skill map from canonical public sources. */
export const createLlmsText = (
  documents: IWebsiteDocument[],
  skill: ISkillMetadata,
  qualification: IQualificationWebsiteModel,
): string => {
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
    '## Adapter qualification',
    '',
    '- [Qualification evidence](/qualification/): Inspect the support gate, transparent profiles, latest outcomes, last passing baselines, and immutable attempt history.',
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
): string[] => {
  const routes = new Set([
    '/',
    '/404.html',
    '/llms.txt',
    '/robots.txt',
    '/search/',
    '/search-index.json',
  ]);

  for (const document of documents) {
    if (routes.has(document.route))
      throw new Error(`Two public items resolve to ${document.route}.`);
    routes.add(document.route);
  }

  for (const route of [
    qualification.route,
    ...qualification.profiles.flatMap((profile) => [
      profile.route,
      ...profile.attempts.map(({ route }) => route),
    ]),
  ]) {
    if (routes.has(route)) throw new Error(`Two public items resolve to ${route}.`);
    routes.add(route);
  }

  return [...routes].sort();
};

/**
 * Builds the complete deterministic website model without writing generated output.
 * @returns The validated documentation, navigation, search, route, and LLM model.
 */
export const createWebsiteModel = (): IWebsiteModel => {
  const repositoryRoot = getRepositoryRoot();
  const documents = discoverDocuments(repositoryRoot);
  const qualification = loadQualificationWebsiteModel(repositoryRoot);
  const skill = readSkillMetadata(repositoryRoot);
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
    documents,
    generatedNotice: GENERATED_NOTICE,
    llmsText: createLlmsText(documents, skill, qualification),
    navigation: createNavigation(documents),
    qualification,
    routes: createRouteManifest(documents, qualification),
    searchRecords: [
      ...createSearchRecords(documents),
      ...createQualificationSearchRecords(qualification),
    ],
    skill,
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
  writeFileSync(outputPath, `${JSON.stringify(model, null, 2)}\n`, 'utf8');
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

  return JSON.parse(readFileSync(path, 'utf8')) as IWebsiteModel;
};
