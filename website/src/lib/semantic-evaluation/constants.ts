// canonical public route for semantic evidence
export const SEMANTIC_EVALUATION_ROUTE = '/evidence/semantic/';
export const SEMANTIC_EVALUATION_METHODOLOGY_ROUTE = '/docs/semantic-evaluation/';

// readable group labels shown before individual case evidence
export const SEMANTIC_EVALUATION_GROUPS = {
  abstention: {
    description:
      'How moldea stays silent when changed paths and explicit intent establish no relevance.',
    title: 'Unrelated work and host precedence',
  },
  relevance: {
    description:
      'How direct canonical changes and declared relationships activate the smallest relevant moldea workflow.',
    title: 'Bounded relevance',
  },
  scale: {
    description:
      'How zero-agent and large-context repositories remain valid without unbounded content output.',
    title: 'Large-repository safety',
  },
  integrity: {
    description: 'How read-only evaluation preserves repository files and Git control state.',
    title: 'Read-only integrity',
  },
} as const;

// presentation metadata must explicitly cover every semantic case before publication
export const SEMANTIC_CASE_PRESENTATION = {
  'unrelated-documentation-review': {
    groupId: 'abstention',
    title: 'Leaves unrelated documentation review alone',
  },
  'unrelated-source-review': {
    groupId: 'abstention',
    title: 'Leaves unrelated source review alone',
  },
  'readme-outside-managed-block': {
    groupId: 'abstention',
    title: 'Ignores README changes outside the managed block',
  },
  'generic-knowledge-handoff': {
    groupId: 'abstention',
    title: 'Does not capture generic durable knowledge',
  },
  'host-plan-command-precedence': {
    groupId: 'abstention',
    title: 'Preserves host planning workflow ownership',
  },
  'host-review-command-precedence': {
    groupId: 'abstention',
    title: 'Preserves host review workflow ownership',
  },
  'exact-binding-relevance': {
    groupId: 'relevance',
    title: 'Activates for an exact agent binding',
  },
  'affected-by-relevance': {
    groupId: 'relevance',
    title: 'Activates for an affectedBy relationship',
  },
  'direct-canonical-relevance': {
    groupId: 'relevance',
    title: 'Recognizes direct canonical changes',
  },
  'managed-readme-relevance': {
    groupId: 'relevance',
    title: 'Recognizes managed README changes',
  },
  'explicit-moldea-validation': {
    groupId: 'relevance',
    title: 'Honors explicit moldea validation',
  },
  'zero-agent-project-validation': {
    groupId: 'scale',
    title: 'Validates a project with no agents',
  },
  'large-context-bounded-evaluation': {
    groupId: 'scale',
    title: 'Pages large context without exposing bodies',
  },
  'moldea-evaluate-read-only': {
    groupId: 'integrity',
    title: 'Preserves repository state during evaluation',
  },
} as const;
