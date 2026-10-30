// closed suite selections and ordered correctness stages
export const TEST_SUITE_VALUES = ['essential', 'full'] as const;
export const TEST_STAGE_VALUES = ['unit', 'integration', 'e2e'] as const;

// secondary evaluator/tooling files omitted before imports and setup in essential runs
export const FULL_ONLY_TEST_FILES = [
  'src/{semantic,scripted-journeys,execution,evidence,packages,resources,command-line,process}/**/*.test-{unit,integration}.ts',
  'src/release/{updater,publication}.test-{unit,integration}.ts',
  'src/portable/runtime-generation.test-integration.ts',
];
