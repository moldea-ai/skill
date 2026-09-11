// deterministic failure label for incorrect human-facing product casing
export const INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL = 'incorrect-moldea-product-name-casing';

const MOLDEA_PRODUCT_NAME_PATTERN = /(^|[^\p{L}\p{N}_])(moldea)(?=$|[^\p{L}\p{N}_])/giu;

/** Returns whether public model text avoids the incorrectly capitalized product name. */
export const hasValidMoldeaProductNameCasing = (text) => {
  if (typeof text !== 'string') return false;

  return [...text.matchAll(MOLDEA_PRODUCT_NAME_PATTERN)].every((match) => match[2] === 'moldea');
};

/** Adds the deterministic casing failure to one semantic assessment without rewriting text. */
export const enforceMoldeaProductNameCasing = (assessment, actorResponse) => {
  const hasValidCasing =
    hasValidMoldeaProductNameCasing(actorResponse) &&
    hasValidMoldeaProductNameCasing(assessment.rationale);
  const forbidden = hasValidCasing
    ? assessment.forbidden
    : [...new Set([...assessment.forbidden, INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL])];

  return {
    ...assessment,
    forbidden,
    isPassed: assessment.isPassed && forbidden.length === 0,
  };
};
