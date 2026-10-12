import type {
  IScriptedJourneysWebsiteModel,
  IJourneyWebsiteResult,
} from '../../../../src/scripted-journeys/public-evidence/index.ts';

// producer-owned presentation contracts
export type { IScriptedJourneysWebsiteModel, IJourneyWebsiteResult };

// bounded view data keeps each retained trial attached to its exact request revision
export interface IJourneyRenderResult extends IJourneyWebsiteResult {
  journeyStatus: IJourneyWebsiteResult['status'];
  trialId: string;
  label: string;
  provenance: string;
}
export interface IJourneyRenderStep {
  id: string;
  request: string;
  results: IJourneyRenderResult[];
}
export interface IJourneyRenderRevision {
  id: string;
  label: string;
  steps: IJourneyRenderStep[];
}
