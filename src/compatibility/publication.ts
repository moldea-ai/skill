import {
  RuntimeCompatibilityPublicationSchema,
  type IRuntimeCompatibilityPublication,
} from './types.ts';

const ADAPTER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** The artifact name shared by candidate construction and verification. */
export const RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME =
  'runtime-compatibility-publication.json';

/**
 * Validates technical packages-publication fields for release-candidate tooling.
 * @param input The untrusted parsed publication value.
 * @returns The validated publication value, including harmless additive metadata.
 * @throws
 * - The runtime compatibility publication has an unsupported root contract.
 * - The runtime compatibility publication has an invalid adapter.
 */
export const validateRuntimeCompatibilityPublication = (
  input: unknown,
): IRuntimeCompatibilityPublication => {
  const parsedPublication = RuntimeCompatibilityPublicationSchema.safeParse(input);
  if (!parsedPublication.success) {
    if (
      typeof input !== 'object' ||
      input === null ||
      !('schemaVersion' in input) ||
      input.schemaVersion !== 1 ||
      !('matrixVersion' in input) ||
      input.matrixVersion !== 2 ||
      !('adapters' in input) ||
      typeof input.adapters !== 'object' ||
      input.adapters === null ||
      Array.isArray(input.adapters)
    ) {
      throw new Error('The runtime compatibility publication has an unsupported root contract.');
    }

    const adapterId = Object.keys(input.adapters).find((candidateAdapterId) => {
      const candidate = RuntimeCompatibilityPublicationSchema.shape.adapters.safeParse({
        [candidateAdapterId]: (input.adapters as Record<string, unknown>)[candidateAdapterId],
      });
      return !ADAPTER_ID_PATTERN.test(candidateAdapterId) || !candidate.success;
    });
    throw new Error(
      `The runtime compatibility publication has an invalid ${adapterId ?? 'unknown'} adapter.`,
    );
  }

  const invalidAdapterId = Object.keys(parsedPublication.data.adapters).find(
    (adapterId) => !ADAPTER_ID_PATTERN.test(adapterId),
  );
  if (invalidAdapterId !== undefined) {
    throw new Error(
      `The runtime compatibility publication has an invalid ${invalidAdapterId} adapter.`,
    );
  }

  return input as IRuntimeCompatibilityPublication;
};

/**
 * Parses and validates one untrusted runtime compatibility publication response.
 * @param source The complete publication response text.
 * @returns The validated publication value.
 * @throws
 * - The runtime compatibility publication is not valid JSON.
 * - The runtime compatibility publication violates its contract.
 */
export const parseRuntimeCompatibilityPublication = (
  source: string,
): IRuntimeCompatibilityPublication => {
  let publication: unknown;
  try {
    publication = JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error('The runtime compatibility publication is not valid JSON.', {
      cause: error,
    });
  }

  return validateRuntimeCompatibilityPublication(publication);
};
