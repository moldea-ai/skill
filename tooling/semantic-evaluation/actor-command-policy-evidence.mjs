const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Classifies one completed top-level command without retaining its command text. */
export const classifyActorCommandPolicyEvent = (event) =>
  isPlainRecord(event) &&
  event.type === 'item.completed' &&
  isPlainRecord(event.item) &&
  event.item.type === 'command_execution'
    ? 'completed'
    : null;

/** Creates the minimal command-count aggregate for one actor stage. */
export const createActorCommandPolicyEvidence = (classifications) => ({
  completedCommandCount: classifications.filter((value) => value === 'completed').length,
});

/** Checks the strict aggregate retained after raw command text is discarded. */
export const hasValidActorCommandPolicyEvidence = (evidence) =>
  isPlainRecord(evidence) &&
  Object.keys(evidence).length === 1 &&
  Number.isSafeInteger(evidence.completedCommandCount) &&
  evidence.completedCommandCount >= 0 &&
  evidence.completedCommandCount <= 128;
