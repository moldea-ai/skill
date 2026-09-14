import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';

const getFileName = (path: string): string => path.split('/').at(-1) ?? path;

// the verified fixture rendered as one real project tree
export const REPOSITORY_FORMAT_EXAMPLE = {
  agent: {
    behaviorFiles: [
      getFileName(LANDING_EXAMPLE.paths.agentDescription),
      getFileName(LANDING_EXAMPLE.paths.instruction),
    ],
    id: 'support',
  },
  contextFiles: [getFileName(LANDING_EXAMPLE.paths.policyContext)],
  foundationFiles: [
    getFileName(LANDING_EXAMPLE.paths.manifest),
    getFileName(LANDING_EXAMPLE.paths.project),
  ],
  projectDirectory: 'my-store/',
  sourceFiles: [
    getFileName(LANDING_EXAMPLE.paths.agent),
    getFileName(LANDING_EXAMPLE.paths.instructionLoader),
    getFileName(LANDING_EXAMPLE.paths.orderLookup),
    getFileName(LANDING_EXAMPLE.paths.contracts),
    getFileName(LANDING_EXAMPLE.paths.refundPolicy),
    getFileName(LANDING_EXAMPLE.paths.refundPolicyTest),
  ],
} as const;
