const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const COMPATIBLE_MAJOR_RANGE_PATTERN = /^\^([1-9]\d*)\.0\.0$/u;
const COMPATIBLE_STABLE_RANGE_PATTERN = /^\^([1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Parses one stable exact semantic version without normalization. */
export const parseStableVersion = (version: unknown): string => {
  if (typeof version !== 'string' || !STABLE_VERSION_PATTERN.test(version)) {
    throw new Error(`Expected a stable exact semantic version, received ${String(version)}.`);
  }
  return version;
};

/** Returns the canonical compatible-major range for one stable release. */
export const createCompatibleMajorRange = (version: unknown): string => {
  const [major] = parseStableVersion(version).split('.');
  return `^${major}.0.0`;
};

/** Parses one canonical nonzero-major compatibility range. */
export const parseCompatibleMajorRange = (versionRange: unknown): string => {
  if (typeof versionRange !== 'string' || !COMPATIBLE_MAJOR_RANGE_PATTERN.test(versionRange)) {
    throw new Error(`Expected a compatible major range, received ${String(versionRange)}.`);
  }
  return versionRange;
};

/** Parses one canonical nonzero-major caret range with an exact stable minimum. */
export const parseCompatibleStableRange = (versionRange: unknown): string => {
  if (typeof versionRange !== 'string' || !COMPATIBLE_STABLE_RANGE_PATTERN.test(versionRange)) {
    throw new Error(`Expected a compatible stable range, received ${String(versionRange)}.`);
  }
  return versionRange;
};
