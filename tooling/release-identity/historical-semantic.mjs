/** Selects source-attested semantic evidence only when it matches current behavior inputs. */
export const resolveCompatibleHistoricalSemanticAttemptId = ({
  attestation,
  candidateCliClosureDigest,
  candidatePortableSkillBehaviorDigest,
  candidateSemanticCompatibilityDigest,
  semanticResultSha256,
}) =>
  attestation !== null &&
  attestation.semantic.cliClosureDigest === candidateCliClosureDigest &&
  attestation.semantic.portableSkillBehaviorDigest === candidatePortableSkillBehaviorDigest &&
  attestation.semantic.semanticCompatibilityDigest === candidateSemanticCompatibilityDigest &&
  (semanticResultSha256 === null || attestation.semantic.resultSha256 === semanticResultSha256)
    ? attestation.semantic.attemptId
    : null;
