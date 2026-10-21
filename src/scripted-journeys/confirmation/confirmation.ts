import { isEqual } from 'jg-utilities';

import { getEvaluationConfirmationResolution } from '../../execution/confirmation/index.ts';
import type { IJourneyCampaign, IJourneyResolution, IJourneyTrial } from '../index.ts';

/** Resolves provider-local journey groups, excluding initial failures from the shared quorum.
 * @throws When baseline slots, confirmation order, eligibility, or experimental settings conflict.
 */
export const resolveJourneyTrials = (trials: IJourneyTrial[]): IJourneyResolution[] => {
  const initial = new Map<string, IJourneyTrial>();
  for (const trial of trials.filter((trial) => trial.kind === 'initial'))
    for (const id of trial.selectedJourneys) {
      if (initial.has(id)) throw new Error(`Overlapping initial journey slot: ${id}`);
      initial.set(id, trial);
    }
  if (
    trials.some(
      (trial) => trial.kind === 'confirmation' && !initial.has(trial.selectedJourneys[0]!),
    )
  )
    throw new Error('Confirmation has no admitted initial journey.');
  return [...initial].map(([journeyId, baseline]) => {
    const journey = baseline.journeys.find((journey) => journey.id === journeyId);
    if (!journey) throw new Error('Initial journey evidence is missing.');
    const confirmations = trials
      .filter((trial) => trial.kind === 'confirmation' && trial.selectedJourneys[0] === journeyId)
      .sort((left, right) => left.confirmationIndex! - right.confirmationIndex!);
    const votes: boolean[] = [];
    let status: IJourneyResolution['status'] =
      journey.status === 'passed'
        ? 'passed-initially'
        : journey.status === 'blocked'
          ? 'blocked'
          : 'awaiting-confirmation';
    if (confirmations.length && status !== 'awaiting-confirmation')
      throw new Error('Initial journey is not eligible for confirmations.');
    for (const [index, trial] of confirmations.entries()) {
      if (
        trial.confirmationIndex !== index + 1 ||
        trial.selectedJourneys.length !== 1 ||
        status !== 'awaiting-confirmation'
      )
        throw new Error('Confirmation sequence is noncontiguous or continues after resolution.');
      if (
        !baseline.observation ||
        !trial.observation ||
        baseline.observation.configuration.model !== trial.observation.configuration.model ||
        !isEqual(
          baseline.observation.configuration.settings,
          trial.observation.configuration.settings,
        )
      )
        throw new Error('Confirmation model/settings differ from the initial trial.');
      const observed = trial.journeys.find((journey) => journey.id === journeyId);
      if (!observed) throw new Error('Confirmation journey evidence is missing.');
      if (observed.status === 'blocked') status = 'blocked';
      else {
        votes.push(observed.status === 'passed');
        status = getEvaluationConfirmationResolution(votes);
      }
    }
    const group = [baseline, ...confirmations];
    return {
      journeyId,
      initialTrialId: baseline.trialId,
      confirmationTrialIds: confirmations.map((trial) => trial.trialId),
      status,
      failedChecks: group.flatMap((trial) =>
        trial.journeys
          .find((journey) => journey.id === journeyId)!
          .steps.flatMap((step) =>
            step.checks
              .filter((check) => check.status === 'failed')
              .map((check) => ({
                trialId: trial.trialId,
                stepId: step.id,
                criterion: check.criterion,
              })),
          ),
      ),
    };
  });
};

/** Separates the admitted campaign's resolution from its independent catalog coverage. */
export const deriveCampaignStatus = (
  resolutions: IJourneyResolution[],
): IJourneyCampaign['status'] =>
  !resolutions.length ||
  resolutions.some((resolution) => ['awaiting-confirmation', 'blocked'].includes(resolution.status))
    ? 'incomplete'
    : resolutions.some((resolution) => resolution.status === 'confirmed-failure')
      ? 'failed'
      : 'passed';

/** Refuses to replace admitted evidence or observations during campaign reassessment.
 * @throws When the bundle changes or an admitted trial is omitted or modified.
 */
export const assertRetainedTrials = (
  previous: IJourneyCampaign,
  current: IJourneyCampaign,
): void => {
  if (previous.bundleSha256 !== current.bundleSha256)
    throw new Error('Campaign bundle identity changed.');
  for (const platform of previous.platforms)
    for (const trial of platform.trials) {
      const retained = current.platforms
        .find((entry) => entry.platform === platform.platform)
        ?.trials.find((entry) => entry.trialId === trial.trialId);
      if (!retained || !isEqual(retained, trial))
        throw new Error(`Previously admitted trial omitted or changed: ${trial.archiveSha256}`);
    }
};
