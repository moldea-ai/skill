const ACTIVE_SEMANTIC_CASE_COUNT = 74;
const FORMER_SEMANTIC_CASE_COUNT = 57;
const DISPOSITION_VALUES = new Set([
  'restored-bounded-blocker',
  'restored-explicit',
  'restored-relationship',
  'retained-current',
  'replaced-technical-boundary',
  'rewritten-abstention',
]);
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Validates complete traceability from the former suite into the active suite. */
export const validateSemanticDispositions = (dispositions, activeCaseDefinitions) => {
  if (
    !isPlainRecord(dispositions) ||
    Object.keys(dispositions).length !== 4 ||
    dispositions.schemaVersion !== 1 ||
    dispositions.activeSemanticCaseCount !== ACTIVE_SEMANTIC_CASE_COUNT ||
    !isPlainRecord(dispositions.source) ||
    Object.keys(dispositions.source).length !== 2 ||
    dispositions.source.ref !== 'v4.0.2' ||
    dispositions.source.semanticCaseCount !== FORMER_SEMANTIC_CASE_COUNT ||
    !Array.isArray(dispositions.cases) ||
    dispositions.cases.length !== FORMER_SEMANTIC_CASE_COUNT ||
    !Array.isArray(activeCaseDefinitions) ||
    activeCaseDefinitions.length !== ACTIVE_SEMANTIC_CASE_COUNT
  ) {
    throw new Error('Semantic dispositions require the exact 57-to-74 clean-slate inventory.');
  }

  const activeCaseIds = new Set(activeCaseDefinitions.map(({ id }) => id));
  const formerCaseIds = new Set();
  const mappedActiveCaseIds = new Set();
  for (const disposition of dispositions.cases) {
    if (
      !isPlainRecord(disposition) ||
      Object.keys(disposition).length !== 4 ||
      typeof disposition.formerId !== 'string' ||
      !STABLE_ID_PATTERN.test(disposition.formerId) ||
      formerCaseIds.has(disposition.formerId) ||
      typeof disposition.activeId !== 'string' ||
      mappedActiveCaseIds.has(disposition.activeId) ||
      !activeCaseIds.has(disposition.activeId) ||
      !DISPOSITION_VALUES.has(disposition.disposition) ||
      typeof disposition.rationale !== 'string' ||
      disposition.rationale.trim().length === 0 ||
      disposition.rationale !== disposition.rationale.trim()
    ) {
      throw new Error('Semantic dispositions contain an invalid or duplicate case mapping.');
    }
    formerCaseIds.add(disposition.formerId);
    mappedActiveCaseIds.add(disposition.activeId);
  }

  return dispositions;
};
