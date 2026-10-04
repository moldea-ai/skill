// primary public distribution and repository destinations
export const SKILLS_DIRECTORY_URL = 'https://www.skills.sh/moldea-ai/skill/moldea';
export const SOURCE_REPOSITORY_URL = 'https://github.com/moldea-ai/skill';
export const RELEASES_URL = 'https://github.com/moldea-ai/skill/releases';
export const RAW_SOURCE_REPOSITORY_URL = 'https://raw.githubusercontent.com/moldea-ai/skill';
export const CLOUD_WEBSITE_URL = 'https://moldea.ai/';
export const PACKAGES_WEBSITE_URL = 'https://packages.moldea.ai/';
export const REPOSITORY_FORMAT_SPECIFICATION_URL = 'https://packages.moldea.ai/repository-format/';
export const INSTALL_COMMAND = 'npx skills add moldea-ai/skill';
export const EVIDENCE_ROUTE = '/evidence/';

// visual product-page publication metadata
export const PRODUCT_PAGE_METADATA = {
  capabilities: {
    description:
      'Save and maintain project context for coding-agent planning and development. Explore runtime agents, reusable skills, and alignment checks with moldea.',
    route: '/capabilities/',
    searchText:
      'capabilities project context knowledge rules decisions coding agent planning development project truth plan agent systems create runtime agents build agent skills maintain behavior evaluate reconcile validate repair project',
    title: 'Capabilities',
  },
  howItWorks: {
    description:
      'Follow a booking-agent change from relevant project context through connected code, deterministic checks, and saved knowledge for the next coding session.',
    route: '/how-it-works/',
    searchText:
      'how it works project context connections changes deterministic checks semantic assessment adapters next coding agent session',
    title: 'How moldea works',
  },
} as const;

// public documentation groups in navigation order
export const DOCUMENT_SECTION_LABELS = {
  start: 'Start',
  concepts: 'Concepts',
  workflows: 'Workflows',
  examples: 'Examples',
  reference: 'Reference',
} as const;

// minimum public routes that keep the documentation journey complete
export const REQUIRED_DOCUMENT_ROUTES = [
  '/docs/',
  '/docs/getting-started/',
  '/docs/coding-agent-compatibility/',
  '/docs/capabilities/',
  '/docs/how-it-works/',
  '/docs/semantic-evaluation/',
  '/docs/adapter-qualification/',
  '/docs/repository-format/',
  '/docs/project-state/',
  '/docs/planning-agent-systems/',
  '/docs/designing-agents/',
  '/docs/designing-skills/',
  '/docs/continuous-maintenance/',
  '/docs/evaluate-reconcile-validate/',
  '/docs/safety-and-privacy/',
  '/docs/compatibility-and-local-tooling/',
  '/examples/',
] as const;
