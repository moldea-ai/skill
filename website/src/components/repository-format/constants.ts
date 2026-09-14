import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';

// the verified fixture grouped by what initialization creates and later work adds
export const REPOSITORY_FORMAT_EXAMPLE = {
  agentFiles: [LANDING_EXAMPLE.paths.agentDescription, LANDING_EXAMPLE.paths.instruction],
  initializedFiles: [LANDING_EXAMPLE.paths.manifest, LANDING_EXAMPLE.paths.project],
  projectDirectory: 'my-store/',
  sourceFiles: [
    LANDING_EXAMPLE.paths.agent,
    LANDING_EXAMPLE.paths.instructionLoader,
    LANDING_EXAMPLE.paths.orderLookup,
    LANDING_EXAMPLE.paths.contracts,
    LANDING_EXAMPLE.paths.refundPolicy,
    LANDING_EXAMPLE.paths.refundPolicyTest,
  ],
  taskContextFiles: [LANDING_EXAMPLE.paths.policyContext],
} as const;
