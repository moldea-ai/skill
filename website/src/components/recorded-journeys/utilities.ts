import {
  getJourneyRevisions,
  type IScriptedJourneysWebsiteModel,
  type IJourneyRenderStep,
  type IJourneyRenderResult,
} from '../../lib/scripted-journeys/index.ts';

/** Selects distinct captured examples for the homepage and evidence overview. */
export const getRecordedJourneyPreview = (
  model: IScriptedJourneysWebsiteModel,
  isCompact = false,
): { step: IJourneyRenderStep; result: IJourneyRenderResult } | null => {
  const preferredJourney = model.journeys.find(
    ({ id }) => id === (isCompact ? 'agents' : 'everyday-work'),
  );
  const preferredStep = preferredJourney
    ? getJourneyRevisions(model, preferredJourney.id)
        .flatMap(({ steps }) => steps)
        .find(
          ({ id, results }) =>
            id === (isCompact ? 'create' : 'identity-option') && results.length > 0,
        )
    : undefined;
  let step = preferredStep;
  if (!step) {
    for (const journey of model.journeys) {
      step = getJourneyRevisions(model, journey.id)
        .flatMap(({ steps }) => steps)
        .find(({ results }) => results.length > 0);
      if (step) break;
    }
  }
  if (!step) return null;
  const result = step.results.find(({ platform }) => platform === 'claude') ?? step.results[0]!;
  return { step, result };
};

/** Keeps compact agent previews focused on captured canonical files, without inventing changes. */
export const getRecordedJourneyPreviewFiles = (
  result: IJourneyRenderResult,
  isCompact: boolean,
): IJourneyRenderResult['files'] => {
  const agentFiles = result.files.filter(({ path }) =>
    /^moldea\/agents\/[^/]+\/(description|instruction)\.md$/u.test(path),
  );
  if (!isCompact || agentFiles.length === 0) return result.files.slice(0, 4);
  const manifest = result.files.find(({ path }) => path === 'moldea/moldea.yaml');
  return [...agentFiles.slice(0, 2), ...(manifest ? [manifest] : [])];
};
