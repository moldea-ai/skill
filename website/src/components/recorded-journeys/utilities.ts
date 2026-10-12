import {
  getJourneyRevisions,
  type IScriptedJourneysWebsiteModel,
  type IJourneyRenderStep,
  type IJourneyRenderResult,
} from '../../lib/scripted-journeys/index.ts';

/** Selects an actual captured step, preferring agent creation in the compact homepage preview. */
export const getRecordedJourneyPreview = (
  model: IScriptedJourneysWebsiteModel,
  isCompact = false,
): { step: IJourneyRenderStep; result: IJourneyRenderResult } | null => {
  const agents = isCompact ? model.journeys.find(({ id }) => id === 'agents') : undefined;
  const creation = agents
    ? getJourneyRevisions(model, agents.id)
        .flatMap(({ steps }) => steps)
        .find(({ id, results }) => id === 'create' && results.length > 0)
    : undefined;
  let step = creation;
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
