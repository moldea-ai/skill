// canonical public route for semantic evidence
export const SEMANTIC_EVALUATION_ROUTE = '/evidence/semantic/';
export const SEMANTIC_EVALUATION_METHODOLOGY_ROUTE = '/docs/semantic-evaluation/';

// readable group labels shown before individual case evidence
export const SEMANTIC_EVALUATION_GROUPS = {
  adoption: {
    description: 'When Moldea should be adopted, initialized, evaluated, or left out of the way.',
    title: 'Adoption and initialization',
  },
  truth: {
    description: 'How the skill resolves ambiguity and keeps canonical repository truth aligned.',
    title: 'Repository truth and reconciliation',
  },
  skills: {
    description: 'Creating, maintaining, evaluating, and distributing reusable Agent Skills.',
    title: 'Agent Skill lifecycle',
  },
  planning: {
    description:
      'Planning grounded agent systems and choosing runtimes only when evidence supports it.',
    title: 'Planning and runtime selection',
  },
  routing: {
    description: 'Keeping routing descriptions, runtime guidance, and provider boundaries precise.',
    title: 'Routing and provider boundaries',
  },
  tooling: {
    description: 'Respecting package-manager, host-command, and read-only tooling constraints.',
    title: 'Tooling and host safety',
  },
} as const;

// presentation metadata must explicitly cover every semantic case before publication
export const SEMANTIC_CASE_PRESENTATION = {
  'unadopted-relevance-no-initialization': {
    groupId: 'adoption',
    title: 'Avoids irrelevant adoption',
  },
  'initialize-insufficient-context': {
    groupId: 'adoption',
    title: 'Stops when project context is insufficient',
  },
  'initialize-partial-context': {
    groupId: 'adoption',
    title: 'Clarifies a material project boundary',
  },
  'initialize-sufficient-context': {
    groupId: 'adoption',
    title: 'Initializes from sufficient evidence',
  },
  'adopted-direct-context-handoff': {
    groupId: 'truth',
    title: 'Preserves a direct context handoff',
  },
  'adopted-explicit-context-correction': {
    groupId: 'truth',
    title: 'Applies an explicit context correction',
  },
  'adopted-ambiguous-context-handoff': {
    groupId: 'truth',
    title: 'Clarifies an ambiguous context handoff',
  },
  'adopted-relevance-no-change': {
    groupId: 'adoption',
    title: 'Leaves aligned project context unchanged',
  },
  'adopted-relevance-changed-behavior': {
    groupId: 'adoption',
    title: 'Updates context after behavior changes',
  },
  'agent-adoption-inline-runtime-instruction': {
    groupId: 'adoption',
    title: 'Adopts an inline runtime instruction safely',
  },
  'evaluate-dirty-working-tree': {
    groupId: 'adoption',
    title: 'Evaluates a dirty working tree without editing it',
  },
  'evaluate-clean-working-tree': {
    groupId: 'adoption',
    title: 'Evaluates a clean working tree',
  },
  'evaluate-unborn-repository': {
    groupId: 'adoption',
    title: 'Evaluates a repository without commits',
  },
  'reconcile-material-ambiguity': {
    groupId: 'truth',
    title: 'Escalates material ambiguity',
  },
  'dedicated-repository-single-side-change': {
    groupId: 'truth',
    title: 'Reconciles a one-sided source change',
  },
  'unresolved-related-file-changed': {
    groupId: 'truth',
    title: 'Detects unresolved related changes',
  },
  'canonical-instruction-changed': {
    groupId: 'truth',
    title: 'Propagates canonical instruction changes',
  },
  'provider-hosted-capability': {
    groupId: 'routing',
    title: 'Represents provider-hosted capabilities accurately',
  },
  'skill-boundary-surface-selection': {
    groupId: 'skills',
    title: 'Selects the correct skill surface',
  },
  'skill-create-progressive-disclosure': {
    groupId: 'skills',
    title: 'Creates a progressively disclosed skill',
  },
  'skill-maintain-linked-resources': {
    groupId: 'skills',
    title: 'Maintains linked skill resources',
  },
  'skill-reuse-existing-cohesive': {
    groupId: 'skills',
    title: 'Reuses an existing cohesive skill',
  },
  'skill-maintain-host-invocation-policy': {
    groupId: 'skills',
    title: 'Preserves host invocation policy',
  },
  'skill-reconcile-distributed-copy': {
    groupId: 'skills',
    title: 'Reconciles a distributed skill copy',
  },
  'skill-evaluate-read-only': {
    groupId: 'skills',
    title: 'Evaluates a skill without modifying it',
  },
  'skill-evaluate-script-authority': {
    groupId: 'skills',
    title: 'Treats skill scripts as evidence, not authority',
  },
  'skill-provider-registration-boundary': {
    groupId: 'skills',
    title: 'Keeps provider registration outside the skill',
  },
  'pnpm-pnp-local-cli-provider': {
    groupId: 'tooling',
    title: 'Uses a pnpm Plug and Play CLI provider',
  },
  'yarn-conflicting-cli-provider': {
    groupId: 'tooling',
    title: 'Rejects a conflicting Yarn CLI provider',
  },
  'host-plan-command-precedence': {
    groupId: 'tooling',
    title: 'Respects the host plan command',
  },
  'plan-uninitialized-zero-agent': {
    groupId: 'planning',
    title: 'Plans an uninitialized project with no agents',
  },
  'plan-existing-project-one-agent': {
    groupId: 'planning',
    title: 'Plans an existing single-agent project',
  },
  'plan-justified-multi-agent': {
    groupId: 'planning',
    title: 'Uses multiple agents only when justified',
  },
  'plan-material-ambiguity': {
    groupId: 'planning',
    title: 'Stops planning at material ambiguity',
  },
  'plan-runtime-inventory-insufficient-evidence': {
    groupId: 'planning',
    title: 'Rejects an unsupported runtime choice',
  },
  'available-runtime-insufficient-behavioral-evidence': {
    groupId: 'planning',
    title: 'Separates availability from behavioral fit',
  },
  'dedicated-repository-runtime-selection': {
    groupId: 'planning',
    title: 'Selects a runtime from repository evidence',
  },
  'routing-description-dynamic-wiring': {
    groupId: 'routing',
    title: 'Describes dynamic routing wiring',
  },
  'routing-description-fallback': {
    groupId: 'routing',
    title: 'Documents routing fallback behavior',
  },
  'routing-description-property-name': {
    groupId: 'routing',
    title: 'Uses the correct routing property name',
  },
  'routing-description-reconciliation': {
    groupId: 'routing',
    title: 'Reconciles a routing description',
  },
  'routing-description-separate-properties': {
    groupId: 'routing',
    title: 'Keeps separate routing properties distinct',
  },
  'routing-description-shared-property': {
    groupId: 'routing',
    title: 'Represents a shared routing property',
  },
  'unavailable-runtime-selection': {
    groupId: 'planning',
    title: 'Rejects an unavailable runtime',
  },
  'read-only-git-helper-suppression': {
    groupId: 'tooling',
    title: 'Suppresses write-capable Git helpers',
  },
  'pnpm-hook-install-blocked': {
    groupId: 'tooling',
    title: 'Blocks unsafe pnpm hook installation',
  },
  'yarn-plugin-install-blocked': {
    groupId: 'tooling',
    title: 'Blocks unsafe Yarn plugin installation',
  },
} as const;
