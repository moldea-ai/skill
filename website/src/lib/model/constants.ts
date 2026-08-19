// primary public distribution and repository destinations
export const SKILLS_DIRECTORY_URL = 'https://www.skills.sh/moldea-ai/skill/moldea';
export const SOURCE_REPOSITORY_URL = 'https://github.com/moldea-ai/skill';
export const PACKAGES_WEBSITE_URL = 'https://packages.moldea.ai/';
export const INSTALL_COMMAND = 'npx skills add moldea-ai/skill';

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
