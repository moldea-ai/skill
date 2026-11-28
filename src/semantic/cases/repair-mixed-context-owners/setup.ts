import { readFile } from 'node:fs/promises';

import { createSemanticCaseSetup, writeCaseFixture } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

export const MIXED_OWNER = 'moldea/context/operating-rules.md';
export const LOCKFILE_PATH = '/website/package-lock.json';
export const GOVERNED_EDITION_PATH = '/content/editions/spring.md';
export const EDITION_COLLECTION_PATH = '/content/editions/**';
export const HUMAN_GUIDES = [
  '/docs/editorial-review.md',
  '/docs/publishing-policy.md',
  '/docs/refund-desk.md',
  '/README.md',
] as const;
export const DELIVERY_PATHS = [
  '/website/src/layouts/article.astro',
  '/website/astro.config.mjs',
  '/.github/workflows/edition.yml',
] as const;
export const REMOVED_PATHS = [
  ...HUMAN_GUIDES,
  '/website/src/styles/article.css',
  '/.agents/skills/moldea/SKILL.md',
] as const;
export const RETAINED_PATHS = [
  '/src/refunds/eligibility.js',
  '/src/publishing/publish.js',
  ...DELIVERY_PATHS,
] as const;
export const APPROVAL_GATE_PATH = '/src/publishing/review-gate.js';
export const REVIEW_NOTES_PATH = '/prompts/review-notes.md';
export const SUMMER_EDITION_PATH = '/content/editions/summer.md';
export const UNREFERENCED_SELECTION_PATH = '/src/publishing/release-selection.js';
export const MISSING_RELATIONSHIPS = [
  APPROVAL_GATE_PATH,
  REVIEW_NOTES_PATH,
  EDITION_COLLECTION_PATH,
] as const;

const routes = (owner: string) =>
  '# Lantern Field Shop and Journal\n\nLantern Field operates an outdoor shop and publishes the Lantern Field quarterly.\n\n## Routing\n\n- [Founding brief](context/operating-rules.md) covers ' +
  owner +
  '.\n';

const sourceFiles: Readonly<Record<string, string>> = {
  'src/refunds/eligibility.js':
    'export const isRefundEligible = (daysSincePurchase) => daysSincePurchase <= 14;\n',
  'src/publishing/review-gate.js':
    'export const canApproveArticle = (reviewer) => reviewer.role === "editor";\n',
  'src/publishing/publish.js':
    'export const canPublishArticle = (article) => article.approvedByEditor === true;\n',
};

const websiteFiles: Readonly<Record<string, string>> = {
  'website/src/layouts/article.astro':
    '---\nconst { sponsor } = Astro.props;\n---\n<main>{sponsor && <p>Sponsored by {sponsor}</p>}<article><slot /></article></main>\n',
  'website/src/styles/article.css': '.article { max-width: 70ch; margin-inline: auto; }\n',
  'website/astro.config.mjs': 'export default { output: "static", trailingSlash: "always" };\n',
  'website/package-lock.json':
    '{ "name": "lantern-preview", "lockfileVersion": 3, "requires": true, "packages": { "": { "name": "lantern-preview" } } }\n',
  '.github/workflows/edition.yml':
    'name: Build production edition\non: workflow_dispatch\npermissions:\n  contents: read\njobs:\n  edition:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps:\n      - uses: actions/checkout@v7\n      - run: node scripts/build-edition.mjs\n',
  'scripts/build-edition.mjs': 'console.log("Preparing the production edition.");\n',
};

const docFiles: Readonly<Record<string, string>> = {
  'docs/editorial-review.md':
    '# Editorial review\n\nTriage draft notes into copy, attribution and artwork queues. Record open questions beside the draft and schedule a reviewer.\n',
  'docs/publishing-policy.md':
    '# Publishing procedure\n\nSend the approved issue list and the proposed production window to the web team. Record the build link in the issue notes.\n',
  'docs/refund-desk.md':
    '# Refund desk\n\nCollect the order number, purchase date and customer contact before triage. Use the queue tag to show which orders need a receipt lookup.\n',
  'content/editions/spring.md':
    '# The Spring Issue\n\n- Preparing a day hike\n- Two towns and a trail\n- The repair cafe\n',
  [SUMMER_EDITION_PATH.slice(1)]:
    '# The Summer Issue\n\n- Recording the water level\n- How a field repair holds up\n- A morning at the trailhead\n',
};

const editorialModelFiles: Readonly<Record<string, string>> = {
  'src/publishing/publish.js':
    'import { readFile } from "node:fs/promises";\n\n' +
    sourceFiles['src/publishing/publish.js'] +
    '\nexport const prepareReviewNotesRequest = async (draft) => ({\n' +
    '  instructions: await readFile(new URL("../../prompts/review-notes.md", import.meta.url), "utf8"),\n' +
    '  input: draft,\n});\n',
  [REVIEW_NOTES_PATH.slice(1)]:
    '# Editorial review notes\n\nSummarize open questions about the draft and its supporting material for the human editor. Only an editor can approve an article.\n',
  [UNREFERENCED_SELECTION_PATH.slice(1)]:
    "import { canPublishArticle } from './publish.js';\n\nexport const selectReleaseArticles = (articles) => articles.filter(canPublishArticle);\n",
};

const smallerOwner =
  '# Operating rules\n\n## Refund eligibility\n\nCustomers can request a refund within 14 days. [Refund eligibility](../../src/refunds/eligibility.js) enforces the deadline.\n\n## Editorial approval\n\nOnly an editor can approve an article. An article can be published only after that approval. See the [approval gate](../../src/publishing/review-gate.js) and [publication](../../src/publishing/publish.js).\n';

/** Materializes the shared mixed-owner Fix case and the focused native restructuring fixture. */
export const createMixedOwnerSetup =
  (includeRelationshipDefects: boolean): ISemanticCaseSetup =>
  async (context) => {
    const result = await createSemanticCaseSetup('repair-healthy-project')(context);
    const impactPaths = includeRelationshipDefects
      ? [...RETAINED_PATHS, GOVERNED_EDITION_PATH, ...REMOVED_PATHS, LOCKFILE_PATH]
      : [RETAINED_PATHS[0], RETAINED_PATHS[1], APPROVAL_GATE_PATH];
    await writeCaseFixture(context.repositoryPath, {
      'moldea/moldea.yaml':
        `version: 1\ncontext:\n  /${MIXED_OWNER}:\n    affectedBy:\n` +
        impactPaths.map((file) => `      - ${file}\n`).join(''),
      'moldea/project.md': routes(
        includeRelationshipDefects
          ? 'refunds, editorial approval and website delivery'
          : 'refund eligibility and editorial approval',
      ),
      [MIXED_OWNER]: includeRelationshipDefects
        ? await readFile(new URL('./founding-brief.md', import.meta.url), 'utf8')
        : smallerOwner,
      ...sourceFiles,
      ...(includeRelationshipDefects
        ? { ...websiteFiles, ...docFiles, ...editorialModelFiles }
        : {}),
    });
    return result;
  };
