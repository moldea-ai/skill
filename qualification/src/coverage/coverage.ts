import type { IRuntimeAdapterEntry, IRuntimeTarget } from '../compatibility/index.ts';
import { QUALIFICATION_CASES_PATH } from '../constants/index.ts';
import {
  QualificationCaseCatalogSchema,
  QualificationProbesSchema,
  type IQualificationCaseCatalog,
  type IQualificationProfile,
} from '../contracts/index.ts';
import { calculateSha256, readYamlFile, resolveContainedPath } from '../filesystem/index.ts';
import type { IQualificationCoverageResult } from './types.ts';

const deriveKnownLimitationId = (knownLimitation: string): string =>
  calculateSha256(knownLimitation).slice(0, 16);

/** Derives every compatibility claim that requires qualification evidence for one target. */
export const deriveRequiredQualificationClaims = (
  adapter: IRuntimeAdapterEntry,
  target: IRuntimeTarget,
): string[] => {
  const claims = ['qualification.support-gate', 'target.kind', 'target.language'];

  if (adapter.compatibleCoreRange !== undefined) {
    claims.push(`adapter.compatible-core-range.${adapter.compatibleCoreRange}`);
  }

  for (const formatVersion of adapter.supportedRepositoryFormatVersions ?? []) {
    claims.push(`adapter.supported-repository-format-version.${formatVersion}`);
  }

  if (adapter.runtimeGuidance !== undefined) {
    claims.push('adapter.runtime-guidance');
  }

  for (const packageRequirement of target.packages ?? []) {
    claims.push(
      `target.package.${packageRequirement.ecosystem}.${packageRequirement.name}.${packageRequirement.role}.${packageRequirement.versionRange}`,
    );
  }

  for (const evidenceKind of target.evidenceKinds ?? []) {
    claims.push(`target.evidence-kind.${evidenceKind}`);
  }

  for (const bindingSubject of Object.keys(target.bindingSupport ?? {})) {
    claims.push(`target.binding-support.${bindingSubject}`);
  }

  for (const pattern of target.patterns ?? []) {
    claims.push(`target.pattern.${pattern.id}`);
  }

  for (const providerLimit of target.providerLimits ?? []) {
    claims.push(`target.provider-limit.${providerLimit.id}`);
  }

  for (const knownLimitation of target.knownLimitations ?? []) {
    claims.push(`target.known-limitation.${deriveKnownLimitationId(knownLimitation)}`);
  }

  return claims.sort((left, right) => left.localeCompare(right, 'en'));
};

/** Validates that profile probes cover every current matrix claim and every semantic case. */
export const inspectQualificationCoverage = async (
  profileDirectory: string,
  profile: IQualificationProfile,
  adapter: IRuntimeAdapterEntry,
  target: IRuntimeTarget,
  caseCatalog?: IQualificationCaseCatalog,
): Promise<IQualificationCoverageResult> => {
  const probesPath = resolveContainedPath(profileDirectory, profile.probesFile);
  const probes = await readYamlFile(probesPath, QualificationProbesSchema);

  if (
    probes.adapterId !== profile.adapterId ||
    probes.implementationId !== profile.implementationId
  ) {
    throw new Error('Qualification probe identity does not match its owning profile.');
  }

  const resolvedCaseCatalog =
    caseCatalog ?? (await readYamlFile(QUALIFICATION_CASES_PATH, QualificationCaseCatalogSchema));
  const profileCaseIds = new Set(profile.cases.map(({ id }) => id));
  const sharedCaseIds = resolvedCaseCatalog.cases
    .filter(({ layer }) => layer === 'universal-baseline')
    .map(({ id }) => id);
  const isCustom = profile.adapterId === 'custom' && profile.implementationId === 'custom';
  const expectedCaseIds = new Set([...(isCustom ? [] : sharedCaseIds), ...profileCaseIds]);
  const coveredCaseIds = new Set<string>();
  const declaredClaims = probes.probes.map(({ matrixPath }) => matrixPath);
  const requiredClaims = deriveRequiredQualificationClaims(adapter, target);
  const requiredClaimSet = new Set(requiredClaims);
  const declaredClaimSet = new Set(declaredClaims);

  for (const probe of probes.probes) {
    for (const caseId of probe.coveredBy) {
      if (!expectedCaseIds.has(caseId)) {
        throw new Error(`Probe ${probe.id} references unknown profile case ${caseId}.`);
      }

      coveredCaseIds.add(caseId);
    }
  }

  const missingClaims = requiredClaims.filter((claim) => !declaredClaimSet.has(claim));
  const unknownClaims = [...declaredClaimSet]
    .filter((claim) => !requiredClaimSet.has(claim))
    .sort((left, right) => left.localeCompare(right, 'en'));
  const uncoveredCaseIds = [...expectedCaseIds]
    .filter((caseId) => !coveredCaseIds.has(caseId))
    .sort((left, right) => left.localeCompare(right, 'en'));

  return {
    passed:
      missingClaims.length === 0 && unknownClaims.length === 0 && uncoveredCaseIds.length === 0,
    requiredClaims,
    declaredClaims: [...declaredClaimSet].sort((left, right) => left.localeCompare(right, 'en')),
    missingClaims,
    unknownClaims,
    uncoveredCaseIds,
  };
};
