// only these website directories have no root consumers
export const PRESENTATION_DIRECTORIES = [
  'website/src/components/',
  'website/src/layouts/',
  'website/src/pages/',
  'website/src/styles/',
  'website/public/',
] as const;

// bytes the changed-path listing may take, far above any reviewed change (64 MiB)
export const CHANGED_PATHS_MAX_OUTPUT_BYTES = 67_108_864;
