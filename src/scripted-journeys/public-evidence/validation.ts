import { isEqual } from 'jg-utilities';

import { deriveCampaignStatus, resolveJourneyTrials } from '../confirmation/index.ts';
import { deriveJourneyOutcome, deriveStepOutcome } from '../assessment/index.ts';
import { selectJourneys, assertSafePath } from '../harness/index.ts';
import { createFixtureFingerprint } from '../identity/index.ts';
import { createJourneyDefinitionDigest } from '../journeys/index.ts';
import type { IJourneyCampaign } from '../index.ts';

import { LegacyWebsiteModelSchema } from './legacy.ts';
import {
  ScriptedJourneysWebsiteModelSchema,
  type IScriptedJourneysWebsiteModel,
  type IJourneyEvidenceSource,
  type IJourneyEvidenceCell,
} from './types.ts';

/** Finds a retained group's resolution without interpreting historical outcomes as confirmations. */
export const getCellStatus = (
  source: IJourneyEvidenceSource,
  cell: IJourneyEvidenceCell,
): string => {
  if (source.kind === 'campaign')
    return (
      source.assessment.platforms
        .find((platform) => platform.platform === cell.platform)
        ?.resolutions.find((resolution) => resolution.journeyId === cell.journeyId)?.status ??
      'not-run'
    );
  const steps =
    source.model.journeys
      .find((journey) => journey.id === cell.journeyId)
      ?.steps.map(
        (step) => step.results.find((result) => result.platform === cell.platform)?.status,
      ) ?? [];
  if (!steps.some((status) => status !== undefined)) return 'not-run';
  return steps.includes('failed')
    ? 'legacy-failed'
    : steps.length && steps.every((status) => status === 'passed')
      ? 'legacy-passed'
      : 'legacy-blocked';
};

/** Compares actual skill/test inputs; method matching is additionally required for assurance. */
export const isCurrentJourneyCell = (
  model: Pick<IScriptedJourneysWebsiteModel, 'sources' | 'currentSourceId'>,
  cell: IJourneyEvidenceCell,
  withMethod = false,
): boolean => {
  const target = model.sources.find((source) => source.id === model.currentSourceId);
  const source = model.sources.find((source) => source.id === cell.sourceId);
  if (target?.kind !== 'campaign' || source?.kind !== 'campaign') return false;
  const expected = target.assessment.bundle.journeys.find(
    (journey) => journey.id === cell.journeyId,
  );
  const recorded = source.assessment.bundle.journeys.find(
    (journey) => journey.id === cell.journeyId,
  );
  if (
    !expected ||
    !recorded ||
    expected.definitionDigest !== recorded.definitionDigest ||
    expected.fixtureSha256 !== recorded.fixtureSha256 ||
    !isEqual(target.assessment.bundle.skill, source.assessment.bundle.skill)
  )
    return false;
  if (!withMethod) return true;
  const harness = (assessment: IJourneyCampaign) =>
    Object.fromEntries(
      Object.entries(assessment.bundle.files).filter(([name]) => name.startsWith('harness/')),
    );
  return (
    target.assessment.assessor.sourceSha256 === source.assessment.assessor.sourceSha256 &&
    isEqual(target.assessment.bundle.instructions, source.assessment.bundle.instructions) &&
    isEqual(target.assessment.bundle.policy, source.assessment.bundle.policy) &&
    isEqual(harness(target.assessment), harness(source.assessment))
  );
};

/** Computes separate recorded and current-target coverage for the fixed provider set. */
export const deriveJourneyCoverage = (
  model: Pick<IScriptedJourneysWebsiteModel, 'sources' | 'currentSourceId' | 'cells' | 'journeys'>,
): IScriptedJourneysWebsiteModel['coverage'] =>
  (['chatgpt', 'claude'] as const).map((platform) => {
    const cells = model.cells.filter((cell) => cell.platform === platform);
    const statuses = cells.map((cell) =>
      getCellStatus(
        model.sources.find((source) => source.id === cell.sourceId)!,
        cell,
      ),
    );
    return {
      platform,
      recorded: cells.length,
      current: cells.filter((cell) => isCurrentJourneyCell(model, cell)).length,
      total: model.journeys.filter((journey) => journey.current).length,
      recovered: statuses.filter((status) => status === 'recovered').length,
      pending: statuses.filter((status) => status === 'awaiting-confirmation').length,
    };
  });

/** Derives public assurance without making partial or mixed observations a full passing run. */
export const deriveJourneyPublicStatus = (
  model: Pick<IScriptedJourneysWebsiteModel, 'sources' | 'currentSourceId' | 'cells' | 'journeys'>,
): IScriptedJourneysWebsiteModel['status'] => {
  const target = model.sources.find((source) => source.id === model.currentSourceId)!;
  if (target.kind === 'legacy' && model.sources.length === 1) return target.model.status;
  const statuses = model.cells.map((cell) =>
    getCellStatus(
      model.sources.find((source) => source.id === cell.sourceId)!,
      cell,
    ),
  );
  if (
    statuses.some((status) =>
      ['awaiting-confirmation', 'blocked', 'legacy-blocked'].includes(status),
    )
  )
    return 'incomplete';
  if (statuses.includes('confirmed-failure')) return 'failed';
  const coverage = deriveJourneyCoverage(model);
  return coverage.every((entry) => entry.total > 0 && entry.current === entry.total) &&
    model.cells.every((cell) => isCurrentJourneyCell(model, cell, true))
    ? 'passed'
    : 'incomplete';
};

/** Checks computed campaign outcomes and exact request/check associations at the producer boundary.
 * @throws When stored evidence contradicts its recorded definitions, identities, or computed resolution.
 */
export const validateJourneyCampaign = (assessment: IJourneyCampaign): void => {
  if (
    assessment.runId !== assessment.bundle.runId ||
    new Set(assessment.definitions.map((definition) => definition.id)).size !==
      assessment.definitions.length
  )
    throw new Error('Campaign identity/catalog mismatch.');
  if (assessment.assessor.sourceSha256 !== assessment.bundle.assessorSourceSha256)
    throw new Error('Campaign assessor identity mismatch.');
  if (assessment.definitions.length !== assessment.bundle.journeys.length)
    throw new Error('Campaign catalog mismatch.');
  for (const [index, definition] of assessment.definitions.entries())
    if (
      assessment.bundle.journeys[index]?.id !== definition.id ||
      assessment.bundle.journeys[index]?.title !== definition.title ||
      assessment.bundle.journeys[index]?.definitionDigest !==
        createJourneyDefinitionDigest(definition) ||
      assessment.bundle.journeys[index]?.stepCount !== definition.steps.length ||
      !isEqual(assessment.bundle.journeys[index].fixture, definition.fixture) ||
      assessment.bundle.journeys[index]?.fixtureSha256 !==
        createFixtureFingerprint(assessment.bundle.files, definition.id)
    )
      throw new Error('Campaign definition identity mismatch.');
  const seen = new Set<string>();
  const archives = new Set<string>();
  const providers = new Set<string>();
  if (
    assessment.platforms.reduce((count, provider) => count + provider.trials.length, 0) >
    assessment.definitions.length * 8
  )
    throw new Error('Campaign exceeds the 8N trial bound.');
  for (const platform of assessment.platforms) {
    if (providers.has(platform.platform)) throw new Error('Duplicate campaign provider.');
    providers.add(platform.platform);
    for (const trial of platform.trials) {
      if (seen.has(trial.trialId) || archives.has(trial.archiveSha256))
        throw new Error('Duplicate campaign trial.');
      seen.add(trial.trialId);
      archives.add(trial.archiveSha256);
      if (
        !isEqual(
          trial.selectedJourneys,
          selectJourneys(
            assessment.bundle.journeys,
            trial.selectedJourneys,
            trial.confirmationIndex,
          ),
        ) ||
        (trial.kind === 'initial') !== (trial.confirmationIndex === null)
      )
        throw new Error('Campaign trial selection mismatch.');
      if (
        !isEqual(
          trial.journeys.map((journey) => journey.id),
          trial.selectedJourneys,
        )
      )
        throw new Error('Campaign trial journey inventory mismatch.');
      if (!isEqual(Object.keys(trial.restartCounts).sort(), [...trial.selectedJourneys].sort()))
        throw new Error('Campaign restart-count inventory mismatch.');
      for (const journey of trial.journeys) {
        const definition = assessment.definitions.find(
          (definition) => definition.id === journey.id,
        )!;
        if (
          !isEqual(
            journey.steps.map((step) => step.id),
            definition.steps.map((step) => step.id),
          )
        )
          throw new Error('Campaign step inventory mismatch.');
        for (const [index, step] of journey.steps.entries()) {
          const defined = definition.steps[index]!;
          const dependencies = defined.dependsOn.map(
            (id) => journey.steps.find((step) => step.id === id)!.status,
          );
          const expected = dependencies.every((status) => status === 'passed')
            ? defined.checks.map((check, criterion) => ({ check, criterion }))
            : [];
          if (!step.reply.trim())
            expected.push({
              check: { kind: 'reply-matches', pattern: '\\S', skillBehavior: false },
              criterion: -1,
            });
          const actual = step.checks.map((check) => ({
            check: check.check,
            criterion: check.criterion === 'nonempty-reply' ? -1 : check.criterion,
          }));
          if (
            !isEqual(expected, actual) ||
            !step.facts ||
            !step.activity ||
            !isEqual(step.unverified, defined.unverified) ||
            step.checks.some(
              (check) => check.criterion === 'nonempty-reply' && check.status !== 'failed',
            ) ||
            step.status !== deriveStepOutcome(step.checks, dependencies)
          )
            throw new Error('Campaign check association or step outcome mismatch.');
        }
        if (journey.status !== deriveJourneyOutcome(journey.steps.map((step) => step.status)))
          throw new Error('Campaign journey outcome mismatch.');
      }
    }
    if (!isEqual(platform.resolutions, resolveJourneyTrials(platform.trials)))
      throw new Error('Campaign resolution mismatch.');
  }
  if (
    assessment.status !==
    deriveCampaignStatus(assessment.platforms.flatMap((platform) => platform.resolutions))
  )
    throw new Error('Campaign scope status mismatch.');
};

/** Normalizes historical presentation and verifies current source/cell associations and derived counts.
 * @throws When source references, computed resolutions, artifacts, coverage, or status are inconsistent.
 */
export const parseScriptedJourneysWebsiteModel = (
  input: unknown,
): IScriptedJourneysWebsiteModel => {
  if (typeof input === 'object' && input !== null && !('presentationVersion' in input)) {
    const legacy = LegacyWebsiteModelSchema.parse(input);
    const id = `legacy-${legacy.runId}`;
    const base = {
      presentationVersion: 2 as const,
      route: legacy.route,
      runId: legacy.runId,
      evaluatedAt: legacy.evaluatedAt,
      status: legacy.status,
      currentSourceId: id,
      sources: [{ id, kind: 'legacy' as const, model: legacy }],
      cells: legacy.journeys.flatMap((journey) =>
        legacy.platforms
          .filter((platform) =>
            journey.steps.some((step) =>
              step.results.some((result) => result.platform === platform.platform),
            ),
          )
          .map((platform) => ({
            journeyId: journey.id,
            platform: platform.platform,
            sourceId: id,
          })),
      ),
      journeys: legacy.journeys.map((journey) => ({
        id: journey.id,
        title: journey.title,
        summary: journey.summary,
        route: journey.route,
        current: false,
      })),
    };
    return parseScriptedJourneysWebsiteModel({
      ...base,
      coverage: deriveJourneyCoverage(base),
    });
  }
  const model = ScriptedJourneysWebsiteModelSchema.parse(input);
  if (
    new Set(model.sources.map((source) => source.id)).size !== model.sources.length ||
    !model.sources.some((source) => source.id === model.currentSourceId)
  )
    throw new Error('Duplicate or missing journey source.');
  if (new Set(model.journeys.map((journey) => journey.id)).size !== model.journeys.length)
    throw new Error('Duplicate journey row.');
  for (const source of model.sources)
    if (source.kind === 'campaign') {
      validateJourneyCampaign(source.assessment);
      if (
        !source.artifactRoot.startsWith('/evidence-assets/journeys/') ||
        !source.artifactRoot.endsWith('/')
      )
        throw new Error('Unsafe journey artifact root.');
      const suffix = source.artifactRoot.slice('/evidence-assets/journeys/'.length, -1);
      if (suffix) assertSafePath(suffix);
      if (
        source.assessmentUrl !== `${source.artifactRoot}assessment.json` ||
        source.definitionsUrl !== `${source.artifactRoot}definitions.json`
      )
        throw new Error('Journey raw artifact URL mismatch.');
      for (const platform of source.assessment.platforms)
        for (const trial of platform.trials)
          for (const journey of trial.journeys)
            for (const step of journey.steps) {
              const prefix = `${platform.platform}/${journey.id}/${trial.confirmationIndex === null ? 'initial' : `c${trial.confirmationIndex}`}/${step.id}`;
              assertSafePath(`${prefix}/changes.patch`);
              if (!source.captures[prefix]) throw new Error('Missing journey capture.');
            }
    }
  const current = model.sources.find((source) => source.id === model.currentSourceId)!;
  if (
    current.kind === 'campaign' &&
    !isEqual(
      model.journeys.filter((journey) => journey.current).map((journey) => journey.id),
      current.assessment.definitions.map((definition) => definition.id),
    )
  )
    throw new Error('Current catalog coverage inventory mismatch.');
  for (const journey of model.journeys) {
    journey.catalogSourceId ??= model.currentSourceId;
    const catalog = model.sources.find((source) => source.id === journey.catalogSourceId);
    const definition =
      catalog?.kind === 'campaign'
        ? catalog.assessment.definitions.find(({ id }) => id === journey.id)
        : catalog?.model.journeys.find(({ id }) => id === journey.id);
    if (
      !definition ||
      journey.title !== definition.title ||
      journey.summary !== definition.summary ||
      (journey.current && journey.catalogSourceId !== model.currentSourceId)
    )
      throw new Error('Journey row/catalog source association mismatch.');
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(journey.id) ||
      journey.id.length > 48 ||
      journey.route !== `/evidence/journeys/${journey.id}/`
    )
      throw new Error('Invalid journey route.');
  }
  const slots = new Set<string>();
  for (const cell of model.cells) {
    const key = `${cell.platform}/${cell.journeyId}`;
    if (slots.has(key)) throw new Error('Duplicate snapshot cell.');
    slots.add(key);
    const source = model.sources.find((source) => source.id === cell.sourceId);
    if (
      !source ||
      !model.journeys.some((journey) => journey.id === cell.journeyId) ||
      getCellStatus(source, cell) === 'not-run'
    )
      throw new Error('Missing journey source/cell reference.');
  }
  if (
    !isEqual(model.coverage, deriveJourneyCoverage(model)) ||
    model.status !== deriveJourneyPublicStatus(model)
  )
    throw new Error('Journey public coverage/status mismatch.');
  return model;
};
