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
} from './types.ts';

const repositoryUrl = `https://github.com/${PROJECT_RUN_REPOSITORY}`;
const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });

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
): IProjectAttempt => {
  const title =
    (scenario === null ? null : extractFirstMarkdownHeadingName(scenario)) ??
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
    title,
    route: `${PROJECT_RUN_ROUTE}projects/${record.attemptId}/`,
    summary: record.observedSummary,
    excerpt: truncateText(record.observedSummary, PROJECT_RUN_EXCERPT_LENGTH),
    initialRequest: requests.find(({ kind }) => kind === 'initial') ?? null,
    followUp: requests.find(({ kind }) => kind === 'follow-up') ?? null,
    notes: [...new Set(notes)],
    links,
    skillRelease: typeof record.skillRelease === 'string' ? record.skillRelease : null,
    baseCommit: record.baseCommit,
    reachedCommit,
  };
};

/** Groups one immutable run into static pages without shipping a complete browser-side list. */
export const createProjectRunModel = (
  record: IProjectRunRecord,
  source: IProjectRunSource,
  manifestPath: string,
  attempts: IProjectAttempt[],
): IProjectRunModel => {
  const count = Math.max(1, Math.ceil(attempts.length / PROJECT_RUN_PAGE_SIZE));
  const route = (index: number): string =>
    index === 0 ? PROJECT_RUN_ROUTE : `${PROJECT_RUN_ROUTE}${index + 1}/`;
  return {
    id: record.runId,
    date: record.date,
    dateLabel: dateFormatter.format(new Date(`${record.date}T00:00:00Z`)),
    summary: record.summary,
    provenance: source.kind,
    notes: record.limitations,
    links: createProjectRecordLinks(source, manifestPath, record.review),
    pages: Array.from({ length: count }, (_, index) => ({
      number: index + 1,
      route: route(index),
      previous: index === 0 ? null : route(index - 1),
      next: index === count - 1 ? null : route(index + 1),
      attempts: attempts.slice(index * PROJECT_RUN_PAGE_SIZE, (index + 1) * PROJECT_RUN_PAGE_SIZE),
    })),
  };
};
