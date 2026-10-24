import type { ICodexEvaluationHostIdentity } from '../../execution/host/index.ts';

/** Projects the required host contract while retaining version only in recorded observations. */
export const createSemanticHostContract = (
  host: ICodexEvaluationHostIdentity,
): Omit<ICodexEvaluationHostIdentity, 'version'> => ({
  developerInstructionsSha256: host.developerInstructionsSha256,
  model: host.model,
  name: host.name,
  reasoningEffort: host.reasoningEffort,
  role: host.role,
});
