import { extractFirstMarkdownHeadingName, truncateText } from 'web-utils-kit';

import {
  PROJECT_RUN_EXCERPT_LENGTH,
  PROJECT_RUN_PAGE_SIZE,
  PROJECT_RUN_REPOSITORY,
  PROJECT_RUN_ROUTE,
} from './constants.ts';
import type {
  IProjectAttempt,
  IProjectAttemptRecord,
  IProjectRunLink,
  IProjectRunModel,
  IProjectRunRecord,
  IProjectRunSource,
  IProjectSessionEntry,
} from './types.ts';

const repositoryUrl = `https://github.com/${PROJECT_RUN_REPOSITORY}`;
const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });
// published project names for records whose original scenario brief was not imported
const PROJECT_TITLES: Record<string, string> = {
  fixture_skill_only: 'Skill only',
  fixture_initialized: 'Cedar Workshop',
  fixture_context_only: 'Trail Ledger',
  fixture_anthropic: 'Vendor Desk',
  fixture_google_genai: 'Catalog Studio',
  fixture_openai: 'Parcel Desk',
  fixture_langchain: 'Case Router',
  fixture_cloudflare_agents: 'Mesa Help',
  fixture_langgraph: 'Incident Desk',
  fixture_vercel_ai_sdk: 'Store Guide',
  fixture_claude_agent_sdk: 'Release Desk',
  fixture_openai_agents_sdk: 'Trip Care',
  fixture_eve: 'Field Notes',
  fixture_custom_complex: 'Harbor Supply',
};

const createProjectPages = (attempts: IProjectAttempt[]): IProjectRunModel['pages'] => {
  const count = Math.max(1, Math.ceil(attempts.length / PROJECT_RUN_PAGE_SIZE));
  const route = (index: number): string =>
    index === 0 ? PROJECT_RUN_ROUTE : `${PROJECT_RUN_ROUTE}${index + 1}/`;
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    route: route(index),
    previous: index === 0 ? null : route(index - 1),
    next: index === count - 1 ? null : route(index + 1),
    attempts: attempts.slice(index * PROJECT_RUN_PAGE_SIZE, (index + 1) * PROJECT_RUN_PAGE_SIZE),
  }));
};

/** Encodes logical path components without changing the source's path boundaries. */
export const encodeProjectRunPath = (sourcePath: string): string =>
  sourcePath.split('/').map(encodeURIComponent).join('/');

/** Returns source links only for public or clearly attributed synthetic records. */
export const createProjectRecordLinks = (
  source: IProjectRunSource,
  manifestPath: string,
  review: IProjectRunRecord['review'],
): IProjectRunLink[] => {
  if (source.kind === 'local') return [];
  const links = [
    {
      label: 'Full record',
      href: `${repositoryUrl}/blob/${source.commit}/${encodeProjectRunPath(manifestPath)}`,
    },
  ];
  if (typeof review === 'string')
    links.push({
      label: 'Read the review',
      href: `${repositoryUrl}/blob/${source.commit}/${encodeProjectRunPath(review)}`,
    });
  return links;
};

/** Projects recorded facts into a concise story without inferring an outcome. */
export const createProjectAttempt = (
  record: IProjectAttemptRecord,
  source: IProjectRunSource,
  manifestPath: string,
  scenario: string | null,
  session: IProjectSessionEntry[] | null = null,
): IProjectAttempt => {
  const projectKey = record.branch?.replace(/_\d+$/u, '') ?? record.scenarioId;
  const title =
    (scenario === null ? null : extractFirstMarkdownHeadingName(scenario)) ??
    PROJECT_TITLES[projectKey] ??
    record.scenarioId.replaceAll(/[-_]+/gu, ' ').replace(/^./u, (letter) => letter.toUpperCase());
  const requests = Array.isArray(record.requests)
    ? [...record.requests].sort((a, b) => a.ordinal - b.ordinal)
    : [];
  const notes = [...record.limitations];
  if (record.outcomeReason) notes.unshift(record.outcomeReason);
  if (Array.isArray(record.interventions)) {
    for (const intervention of record.interventions)
      notes.push(
        `Before intervention: ${intervention.originalResult}\nAfter intervention: ${intervention.assistedResult}`,
      );
  }
  if (Array.isArray(record.failures))
    notes.push(...record.failures.map(({ description }) => description));
  if (record.interventions !== undefined && !Array.isArray(record.interventions))
    notes.push(record.interventions.reason);
  if (record.failures !== undefined && !Array.isArray(record.failures))
    notes.push(record.failures.reason);
  const reachedCommit = record.finalCommit ?? record.lastDurableCommit;
  const links = createProjectRecordLinks(source, manifestPath, record.review);
  if (source.kind !== 'local') {
    links.unshift(
      { label: 'Explore the code', href: `${repositoryUrl}/tree/${reachedCommit}` },
      {
        label: 'See the changes',
        href: `${repositoryUrl}/compare/${record.baseCommit}...${reachedCommit}`,
      },
    );
    if (Array.isArray(record.assets)) {
      for (const asset of record.assets)
        links.push({
          label: `${asset.kind === 'session' ? 'Session' : 'Evidence'}: ${asset.name}`,
          href: `${repositoryUrl}/releases/download/${encodeURIComponent(asset.tag)}/${encodeURIComponent(asset.name)}`,
        });
    }
  }
  return {
    id: record.attemptId,
    projectKey,
    title,
    route: `${PROJECT_RUN_ROUTE}projects/${record.attemptId}/`,
    summary: record.observedSummary,
    excerpt: truncateText(record.observedSummary, PROJECT_RUN_EXCERPT_LENGTH),
    initialRequest: requests.find(({ kind }) => kind === 'initial') ?? null,
    followUps: requests.filter(({ kind }) => kind !== 'initial'),
    notes: [...new Set(notes)],
    links,
    skillRelease: typeof record.skillRelease === 'string' ? record.skillRelease : null,
    baseCommit: record.baseCommit,
    reachedCommit,
    session,
  };
};

/** Groups one immutable run into static pages without shipping a complete browser-side list. */
export const createProjectRunModel = (
  record: IProjectRunRecord,
  source: IProjectRunSource,
  manifestPath: string,
  attempts: IProjectAttempt[],
): IProjectRunModel => {
  return {
    id: record.runId,
    date: record.date,
    dateLabel: dateFormatter.format(new Date(`${record.date}T00:00:00Z`)),
    summary: record.summary,
    provenance: source.kind,
    notes: record.limitations,
    links: createProjectRecordLinks(source, manifestPath, record.review),
    pages: createProjectPages(attempts),
  };
};

/** Shows each project once, favoring the selected run when a branch family was revisited. */
export const combineProjectRuns = (
  selected: IProjectRunModel,
  history: IProjectRunModel[],
): IProjectRunModel => {
  const projects = new Map<string, IProjectAttempt>();
  const attemptIds = new Set<string>();
  for (const attempt of [
    ...selected.pages.flatMap(({ attempts }) => attempts),
    ...history.flatMap(({ pages }) => pages.flatMap(({ attempts }) => attempts)),
  ]) {
    if (attemptIds.has(attempt.id)) throw new Error('Duplicate project attempt ID across runs.');
    attemptIds.add(attempt.id);
    if (!projects.has(attempt.projectKey)) projects.set(attempt.projectKey, attempt);
  }
  return {
    ...selected,
    summary: `Explore ${projects.size} mock projects through coding-agent sessions and their source records.`,
    pages: createProjectPages([...projects.values()]),
  };
};
