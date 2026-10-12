import type { IJourneyCheck } from '../../../../src/scripted-journeys/index.ts';
import { isCurrentJourneyCell } from '../../../../src/scripted-journeys/public-evidence/index.ts';

import type { IScriptedJourneysWebsiteModel, IJourneyRenderRevision } from './types.ts';

// the two product surfaces under test, rather than underlying API model providers
export const JOURNEY_PLATFORM_LABELS = { chatgpt: 'ChatGPT', claude: 'Claude' } as const;

// labels describe stored producer resolutions, never a new website vote
export const JOURNEY_RESOLUTION_LABELS = {
  'passed-initially': 'Passed',
  'awaiting-confirmation': 'Needs another run',
  recovered: 'Passed on repeat',
  'confirmed-failure': 'Failed on repeat',
  blocked: 'Blocked',
  'not-run': 'Not run',
  'legacy-passed': 'Passed (historical)',
  'legacy-failed': 'Failed (historical)',
  'legacy-blocked': 'Blocked (historical)',
} as const;
export const JOURNEYS_PAGE_SIZE = 16;

/** Reads the selected group's stored resolution, preserving historical single-trial meaning. */
export const getJourneyPlatformStatus = (
  model: IScriptedJourneysWebsiteModel,
  journeyId: string,
  platform: keyof typeof JOURNEY_PLATFORM_LABELS,
): keyof typeof JOURNEY_RESOLUTION_LABELS => {
  const cell = model.cells.find(
    (cell) => cell.journeyId === journeyId && cell.platform === platform,
  );
  const source = model.sources.find((source) => source.id === cell?.sourceId);
  if (!source) return 'not-run';
  if (source.kind === 'campaign')
    return source.assessment.platforms
      .find((entry) => entry.platform === platform)!
      .resolutions.find((entry) => entry.journeyId === journeyId)!.status;
  const results = source.model.journeys
    .find((entry) => entry.id === journeyId)!
    .steps.map((step) => step.results.find((result) => result.platform === platform));
  return results.some((result) => result?.status === 'failed')
    ? 'legacy-failed'
    : results.every((result) => result?.status === 'passed')
      ? 'legacy-passed'
      : 'legacy-blocked';
};

/** Groups exact source requests by recorded definition/fixture identity, including unknown legacy identity. */
export const getJourneyRevisions = (
  model: IScriptedJourneysWebsiteModel,
  journeyId: string,
): IJourneyRenderRevision[] => {
  const groups = new Map<string, IJourneyRenderRevision>();
  const target = model.sources.find((source) => source.id === model.currentSourceId)!;
  const row = model.journeys.find(({ id }) => id === journeyId)!;
  const catalog = model.sources.find(
    ({ id }) => id === (row.catalogSourceId ?? model.currentSourceId),
  )!;
  const keyFor = (source: IScriptedJourneysWebsiteModel['sources'][number]) => {
    if (source.kind === 'legacy') return `legacy-${source.id}`;
    const identity = source.assessment.bundle.journeys.find((entry) => entry.id === journeyId)!;
    return `${identity.definitionDigest}-${identity.fixtureSha256}`;
  };
  const add = (source: IScriptedJourneysWebsiteModel['sources'][number]) => {
    const key = keyFor(source);
    if (!groups.has(key)) {
      const definition =
        source.kind === 'campaign'
          ? source.assessment.definitions.find((entry) => entry.id === journeyId)!
          : source.model.journeys.find((entry) => entry.id === journeyId)!;
      groups.set(key, {
        id: `revision-${groups.size + 1}`,
        label:
          source.kind === 'legacy'
            ? 'Historical requests · fixture identity unavailable'
            : !row.current && source.id === catalog.id
              ? 'Earlier catalog requests'
              : source.id === target.id
                ? 'Current catalog requests'
                : 'Earlier test revision',
        steps: definition.steps.map((step) => ({
          id: step.id,
          request: step.request,
          results: [],
        })),
      });
    }
    return groups.get(key)!;
  };
  if (
    (catalog.kind === 'campaign' ? catalog.assessment.definitions : catalog.model.journeys).some(
      (entry) => entry.id === journeyId,
    )
  )
    add(catalog);
  for (const cell of model.cells.filter((cell) => cell.journeyId === journeyId)) {
    const source = model.sources.find((source) => source.id === cell.sourceId)!;
    const group = add(source);
    if (source.kind === 'legacy') {
      const journey = source.model.journeys.find((entry) => entry.id === journeyId)!;
      for (const step of journey.steps) {
        const result = step.results.find((entry) => entry.platform === cell.platform);
        if (result)
          group.steps
            .find((entry) => entry.id === step.id)!
            .results.push({
              ...result,
              journeyStatus: journey.steps.some((step) =>
                step.results.some(
                  (result) => result.platform === cell.platform && result.status === 'failed',
                ),
              )
                ? 'failed'
                : journey.steps.every((step) =>
                      step.results.some(
                        (result) => result.platform === cell.platform && result.status === 'passed',
                      ),
                    )
                  ? 'passed'
                  : 'blocked',
              trialId: source.id,
              label: 'Initial observation',
              provenance: `Skill ${source.model.skill.version} · ${source.model.evaluatedAt.slice(0, 10)} · historical policy unavailable`,
            });
      }
      continue;
    }
    const provider = source.assessment.platforms.find((entry) => entry.platform === cell.platform)!;
    const resolution = provider.resolutions.find((entry) => entry.journeyId === journeyId)!;
    for (const trialId of [resolution.initialTrialId, ...resolution.confirmationTrialIds]) {
      const trial = provider.trials.find((entry) => entry.trialId === trialId)!;
      const journey = trial.journeys.find((entry) => entry.id === journeyId)!;
      for (const step of journey.steps) {
        const prefix = `${cell.platform}/${journeyId}/${trial.confirmationIndex === null ? 'initial' : `c${trial.confirmationIndex}`}/${step.id}`;
        const capture = source.captures[prefix]!;
        group.steps
          .find((entry) => entry.id === step.id)!
          .results.push({
            ...step,
            journeyStatus: journey.status,
            ...capture,
            platform: cell.platform,
            patchUrl: `${source.artifactRoot}${prefix}/changes.patch`,
            replyUrl: `${source.artifactRoot}${prefix}/reply.md`,
            activityUrl: `${source.artifactRoot}${prefix}/activity.json`,
            trialId,
            label:
              trial.kind === 'initial'
                ? 'Initial observation'
                : `Confirmation ${trial.confirmationIndex}`,
            provenance: `Skill ${source.assessment.bundle.skill.version} · ${trial.observation!.configuration.model ?? 'Model not recorded'} · ${trial.observation!.observedAt?.slice(0, 10) ?? 'Observation date unknown'}`,
          });
      }
    }
  }
  return [...groups.values()];
};

/** Describes selected provenance without interpreting checks or merging confirmation votes. */
export const getJourneyCellProvenance = (
  model: IScriptedJourneysWebsiteModel,
  journeyId: string,
  platform: keyof typeof JOURNEY_PLATFORM_LABELS,
): string | null => {
  const cell = model.cells.find(
    (cell) => cell.platform === platform && cell.journeyId === journeyId,
  );
  if (!cell) return null;
  const source = model.sources.find(({ id }) => id === cell.sourceId)!;
  const metadata = source.kind === 'campaign' ? source.assessment.bundle : source.model;
  const date =
    source.kind === 'campaign' ? source.assessment.evaluatedAt : source.model.evaluatedAt;
  const relation =
    source.kind === 'legacy'
      ? 'Historical policy unavailable'
      : !isCurrentJourneyCell(model, cell)
        ? 'Earlier skill or test revision'
        : !isCurrentJourneyCell(model, cell, true)
          ? 'Different evaluation method'
          : 'Current target';
  return `Skill ${metadata.skill.version} · ${date.slice(0, 10)} · ${relation}`;
};

/** Labels mixed recorded identities while keeping their complete details with each source. */
export const getJourneyProvenanceSummary = (model: IScriptedJourneysWebsiteModel): string => {
  const skills = new Set(
    model.sources.map((source) => {
      const metadata = source.kind === 'campaign' ? source.assessment.bundle : source.model;
      return `${metadata.skill.version}/${metadata.skill.commit}/${metadata.skill.treeSha256}`;
    }),
  );
  const methods = new Set(
    model.sources.map((source) =>
      source.kind === 'legacy'
        ? 'historical-policy-unavailable'
        : `${source.assessment.assessor.sourceSha256}/${source.assessment.bundle.instructions.sha256}/${JSON.stringify(source.assessment.bundle.policy)}/${JSON.stringify(
            Object.entries(source.assessment.bundle.files)
              .filter(([name]) => name.startsWith('harness/'))
              .sort(),
          )}`,
    ),
  );
  return [
    skills.size > 1 ? 'Multiple skill versions are present.' : 'One skill version is represented.',
    methods.size > 1
      ? 'Multiple evaluation methods are present.'
      : 'One evaluation method is represented.',
  ].join(' ');
};

/** Returns immutable numbered overview slices; invalid pages are not generated. */
export const getJourneysPage = (model: IScriptedJourneysWebsiteModel, page: number) => {
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > Math.max(1, Math.ceil(model.journeys.length / JOURNEYS_PAGE_SIZE))
  )
    throw new Error('Invalid journeys overview page.');
  return model.journeys.slice((page - 1) * JOURNEYS_PAGE_SIZE, page * JOURNEYS_PAGE_SIZE);
};

/** Keeps first, last and neighboring pages available without a growing row of links. */
export const getJourneyPagination = (page: number, pages: number): (number | 'ellipsis')[] => {
  const selected = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((number) => number >= 1 && number <= pages)
    .sort((left, right) => left - right);
  const items: (number | 'ellipsis')[] = [];
  for (const [index, number] of selected.entries()) {
    const previous = selected[index - 1];
    if (previous !== undefined && number - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && number - previous > 2) items.push('ellipsis');
    items.push(number);
  }
  return items;
};

/** Describes the exact local criterion without implying that agent activity was observed. */
export const describeJourneyCheck = (check: IJourneyCheck): string => {
  switch (check.kind) {
    case 'path-exists':
      return `File exists: ${check.path}`;
    case 'path-absent':
      return `File absent: ${check.path}`;
    case 'no-changes':
      return 'Expected no file changes';
    case 'paths-changed':
      return `Changed paths: ${check.paths.join(', ')}`;
    case 'paths-unchanged':
      return `Preserved paths since ${check.since}: ${check.paths.join(', ')}`;
    case 'content-matches':
      return `Content in ${check.path} matches /${check.pattern}/`;
    case 'validate':
      return `Local CLI validation: ${check.result}`;
    case 'reply-matches':
      return `Reply matches /${check.pattern}/${check.absent ? ` and excludes /${check.absent}/` : ''}`;
  }
};
