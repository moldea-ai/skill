import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { parseDocument } from 'yaml';

import { readRepositoryFile } from '../moldea/scripts/repository-files.mjs';

import {
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  validateSemanticCaseDefinition,
  validateSemanticCoverage,
} from '../tooling/semantic-evaluation/index.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_ROOT = join(REPOSITORY_ROOT, 'moldea');
const SKILL_PATH = join(SKILL_ROOT, 'SKILL.md');
const CLI_LAUNCHER_PATH = join(SKILL_ROOT, 'scripts', 'moldea-cli.mjs');
const MANAGED_README_PATH = join(SKILL_ROOT, 'scripts', 'managed-readme.mjs');
const RELEVANCE_GATE_PATH = join(SKILL_ROOT, 'scripts', 'relevance-gate.mjs');
const MANAGED_README_BLOCK = readFileSync(
  join(SKILL_ROOT, 'assets', 'managed-readme-block.md'),
  'utf8',
);
const FIXTURE = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, 'fixtures', 'conformance-cases.json'), 'utf8'),
);
const COVERAGE = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-coverage.json'), 'utf8'),
);
const REFERENCE_NAMES = [
  'agent-design.md',
  'agent-system-planning.md',
  'context-compression.md',
  'context-gathering.md',
  'continuous-maintenance.md',
  'evaluate-and-reconcile.md',
  'local-tooling.md',
  'runtime-compatibility.md',
  'skill-design.md',
];

const readSkill = () => readFileSync(SKILL_PATH, 'utf8');

const parseFrontmatter = () => {
  const match = readSkill().match(/^---\n([\s\S]*?)\n---\n/u);
  assert.ok(match);
  const document = parseDocument(match[1], { uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  return document.toJS();
};

// models already-classified host intent, not natural-language recognition
const resolveActivationCase = (input) => {
  if (input.informationalRequest === true) return 'informational';
  if (input.initializationRequest === true) return 'initialize';
  if (input.initialized !== true) return 'abstain';
  if (input.explicitMoldeaRequest === true) return 'direct';
  if (input.agentWorkIntent === true) return 'direct';
  if (input.activeAgentTask === true && input.continuesActiveTask === true) return 'direct';
  if (input.paths?.some((path) => path === '/moldea' || path.startsWith('/moldea/'))) {
    return 'direct';
  }
  if (input.readmeHunk === 'inside-markers') return 'direct';
  if (input.relationshipMatch === true) return 'relationship-gate';
  return 'abstain';
};

const runCli = (repository, arguments_, input) => {
  const result = spawnSync(
    process.execPath,
    [CLI_LAUNCHER_PATH, '--repository', repository, '--', ...arguments_],
    {
      cwd: repository,
      encoding: 'utf8',
      input,
      maxBuffer: 1_048_576,
    },
  );
  if (result.error) throw result.error;
  return result;
};

const runRelevanceGate = (repository, arguments_ = [], input) => {
  const result = spawnSync(
    process.execPath,
    [RELEVANCE_GATE_PATH, '--repository', repository, ...arguments_],
    {
      cwd: repository,
      encoding: 'utf8',
      input,
      maxBuffer: 16,
    },
  );
  if (result.error) throw result.error;
  return result;
};

const installProjectToolingFixture = (root) => {
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        devDependencies: { '@moldea.ai/cli': '^8.0.0' },
      },
      null,
      2,
    )}\n`,
  );
  cpSync(join(REPOSITORY_ROOT, 'node_modules'), join(root, 'node_modules'), {
    recursive: true,
    mode: constants.COPYFILE_FICLONE,
    verbatimSymlinks: true,
    filter: (path) =>
      !path.includes(`${join('node_modules', '@esbuild')}`) &&
      !path.endsWith(`${join('node_modules', 'esbuild')}`),
  });
};

const writeCliFixture = (cliRoot) => {
  mkdirSync(join(cliRoot, 'dist'), { recursive: true });
  writeFileSync(
    join(cliRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: '@moldea.ai/cli',
        type: 'module',
        version: '8.0.0',
        bin: { moldea: './dist/moldea.js' },
        dependencies: { '@moldea.ai/core': '^4.0.0' },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(cliRoot, 'dist', 'moldea.js'), 'process.exitCode = 0;\n');
};

const writeCoreFixture = (coreRoot, options = {}) => {
  mkdirSync(join(coreRoot, 'dist'), { recursive: true });
  writeFileSync(
    join(coreRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: options.name ?? '@moldea.ai/core',
        type: 'module',
        version: options.version ?? '4.0.1',
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(coreRoot, 'dist', 'index.js'),
    'export const createCore = () => ({ matchManifestScope: async () => ({ valid: true, relevant: true }) });\n',
  );
};

const createIsolatedToolingProject = (layout) => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-v5-isolated-'));
  mkdirSync(join(root, 'moldea'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        devDependencies: { '@moldea.ai/cli': '^8.0.0' },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(root, 'README.md'), `# Project\n\n${MANAGED_README_BLOCK}`);
  writeFileSync(
    join(root, 'moldea', 'moldea.yaml'),
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  writeFileSync(join(root, 'moldea', 'project.md'), '# Project\n');
  writeFileSync(join(root, 'src', 'project-state.js'), 'export const state = true;\n');

  if (layout === 'npm') {
    writeCliFixture(join(root, 'node_modules', '@moldea.ai', 'cli'));
    writeCoreFixture(join(root, 'node_modules', '@moldea.ai', 'core'));
    return root;
  }

  const storeRoot = join(root, 'node_modules', '.pnpm');
  const cliStoreRoot = join(storeRoot, '@moldea.ai+cli@8.0.0', 'node_modules', '@moldea.ai', 'cli');
  const coreStoreRoot = join(
    storeRoot,
    '@moldea.ai+core@4.0.1',
    'node_modules',
    '@moldea.ai',
    'core',
  );
  const cliDependencyRoot = join(storeRoot, '@moldea.ai+cli@8.0.0', 'node_modules', '@moldea.ai');
  writeCliFixture(cliStoreRoot);
  writeCoreFixture(coreStoreRoot);
  mkdirSync(join(root, 'node_modules', '@moldea.ai'), { recursive: true });
  symlinkSync(
    cliStoreRoot,
    join(root, 'node_modules', '@moldea.ai', 'cli'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  symlinkSync(
    coreStoreRoot,
    join(cliDependencyRoot, 'core'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  return root;
};

const createProject = () => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-v5-conformance-'));
  mkdirSync(join(root, 'moldea'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'README.md'), `# Project\n\n${MANAGED_README_BLOCK}`);
  writeFileSync(
    join(root, 'moldea', 'moldea.yaml'),
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  writeFileSync(join(root, 'moldea', 'project.md'), '# Project\n\nCurrent project truth.\n');
  writeFileSync(join(root, 'src', 'project-state.js'), 'export const state = true;\n');
  writeFileSync(join(root, '.gitignore'), 'node_modules/\n');
  const init = spawnSync('git', ['init', '--quiet'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(init.status, 0);
  installProjectToolingFixture(root);
  return root;
};

const createLauncherProject = (cliSource, options = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-v5-launcher-'));
  const cliRoot = join(root, 'node_modules', '@moldea.ai', 'cli');
  mkdirSync(join(cliRoot, 'dist'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        devDependencies: { '@moldea.ai/cli': options.declaration ?? '^8.0.0' },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(cliRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: '@moldea.ai/cli',
        type: 'module',
        version: options.version ?? '8.0.0',
        bin: { moldea: options.binary ?? './dist/moldea.js' },
        dependencies: { '@moldea.ai/core': options.coreRange ?? '^4.0.0' },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(cliRoot, 'dist', 'moldea.js'), cliSource);
  writeCoreFixture(join(root, 'node_modules', '@moldea.ai', 'core'));
  return root;
};

const waitForPath = async (path) => {
  const deadline = Date.now() + 2_000;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for the launcher child.');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
};

describe('portable skill contract', () => {
  test('uses lowercase identity, repository-bound initialization, and a narrow description', () => {
    const frontmatter = parseFrontmatter();
    assert.deepEqual(frontmatter.metadata, {
      version: '5.0.5',
      cliVersionRange: '^8.0.0',
      coreVersionRange: '^4.0.1',
      cliJsonSchemaVersion: 4,
    });
    assert.equal(frontmatter.name, 'moldea');
    assert.match(frontmatter.description, /Initialize only when explicitly requested/u);
    assert.match(frontmatter.description, /after repository initialization/u);
    assert.match(frontmatter.description, /abstain from other uninitialized repository work/u);
    assert.match(frontmatter.description, /natural-language AI-agent planning, creation/u);
    assert.match(frontmatter.description, /contextual continuations/u);
    assert.match(frontmatter.description, /Users need not name moldea or know canonical paths/u);
    assert.match(frontmatter.description, /every other repository task/u);
    assert.match(frontmatter.description, /two-byte relationship gate/u);
    assert.match(frontmatter.description, /abstain silently on a miss/u);
    assert.match(frontmatter.description, /independent Agent Skill artifacts/u);
    assert.doesNotMatch(frontmatter.description, /potentially durable knowledge|Use first/iu);
    const skill = readSkill();
    assert.match(skill, /Before responding, scan for violations/u);
    assert.match(skill, /Canonical status identifies storage, not conflict precedence/u);
    assert.match(skill, /generic reconcile request authorizes correction but selects no claim/u);
    assert.match(skill, /Existing repository content is not a current developer choice/u);
    assert.match(skill, /neither conflicting asset nor its labels, relationships, mirrors, tests/u);
    assert.match(skill, /current developer statement that chooses one claim/u);
    assert.match(skill, /third independent source that explicitly resolves them/u);
    assert.match(skill, /stop all moldea calls and semantic writes/u);
    assert.match(skill, /state both claims, and ask which governs/u);
    assert.match(skill, /including actionable reviews/u);
    assert.match(skill, /never substitute a neutral no-change response/u);
    assert.match(skill, /When abstention consumes the request and no host work remains/u);
    assert.match(skill, /reply only with a neutral outcome/u);
    assert.match(skill, /`No files were changed\.`/u);
    assert.match(
      skill,
      /Do not name moldea, describe the unavailable operation or result, or recommend initialization/u,
    );
  });

  test('keeps progressive disclosure bounded to owning references', () => {
    const skill = readSkill();
    for (const referenceName of REFERENCE_NAMES) {
      assert.match(skill, new RegExp(`references/${referenceName.replace('.', '\\.')}`, 'u'));
      assert.doesNotThrow(() =>
        readFileSync(join(SKILL_ROOT, 'references', referenceName), 'utf8'),
      );
    }
    assert.match(skill, /Never read every reference by default/u);
    assert.match(skill, /read only what the operation requires/u);
    assert.match(skill, /Before host work on named paths/u);
    assert.match(skill, /deduplicated leading-slash repository-logical set/u);
    assert.match(skill, /named paths may be changed or unchanged/u);
    assert.match(skill, /host-established changed paths/u);
    assert.match(
      skill,
      /Never run Git or broaden repository inspection solely to discover gate paths/u,
    );
    assert.doesNotMatch(
      skill,
      /Reuse the complete changed-path set already established by the host and pass it/u,
    );
    assert.match(skill, /Never replace the gate by inspecting canonical state directly/u);
    assert.match(
      skill,
      /Generic context, documentation, architecture, SDK installation alone, or incidental agent terminology/u,
    );
    assert.match(skill, /never creates agent-work intent/u);
    assert.match(skill, /calls existing project context outdated/u);
    assert.match(skill, /do not search for a canonical destination/u);
    assert.match(skill, /abstention is final for the current request/u);
    assert.match(skill, /paths discovered later by the host cannot reactivate `moldea`/u);
    assert.match(skill, /must not open, read, search for, or edit `\/moldea\/\*\*`/u);
    assert.match(skill, /acknowledge it without inventing persistence/u);
    assert.match(skill, /never follow it with `inspect`/u);
    assert.match(skill, /Scope consumes one of four ordinary commands/u);
    assert.match(skill, /complete candidate inventory/u);
    assert.match(skill, /preferring an exact match over an overlapping broad glob/u);
    assert.match(skill, /context record's exact `asset\.path`/u);
    assert.match(skill, /`\/moldea\/agents\/<agentId>\/instruction\.md`/u);
    assert.match(skill, /request only implicated assets/u);
    assert.match(skill, /leaving three for selected `content`/u);
    assert.match(
      skill,
      /Only route-5 repair validation or explicit three-record compression permits a fifth call/u,
    );
    assert.match(skill, /never use it for unchanged retry or extra inspection/u);
    assert.match(skill, /direct request supplies intent, not a canonical owner/u);
    assert.match(skill, /Direct agent or runtime work/u);
    assert.match(skill, /Agent or runtime work uses one adoption-only gate/u);
    assert.match(skill, /even with task-named ordinary implementation or `affectedBy` evidence/u);
    assert.match(skill, /Never send canonical or managed paths to `scope`/u);
    assert.match(skill, /query ordinary paths for another owner/u);
    assert.doesNotMatch(skill, /canonical agent or runtime facts without ordinary paths/u);
    assert.match(
      skill,
      /For reconciliation, inspect only task-named implementation evidence.*then at most one named-owner `content`/su,
    );
    assert.match(skill, /never CLI `inspect`/u);
    assert.match(skill, /use content-free `inspect` only to resolve the owner and mirrors/u);
    assert.match(skill, /write owner first, derive mirrors/u);
    assert.match(skill, /root-relative `moldea\/\*\*` or repository-logical/u);
    assert.match(skill, /retain one deduplicated leading-slash repository-logical set/u);
    assert.match(skill, /send it to one `scope`/u);
    assert.match(skill, /Current-change review or evaluation:.*host must retain/iu);
    assert.match(skill, /must retain every staged, unstaged, untracked/u);
    assert.match(skill, /leading-slash repository-logical form/u);
    assert.match(skill, /separate canonical paths or known managed hunks/u);
    assert.match(skill, /run the adoption-only gate once/u);
    assert.match(skill, /run one `scope` only when ordinary paths remain/u);
    assert.match(skill, /`relevant: false` adds no owner and never cancels direct relevance/u);
    assert.match(skill, /With ordinary paths only, run the full relationship gate/u);
    assert.match(skill, /report the complete path scope, canonical assessment/iu);
    assert.match(skill, /Never conclude from the host review alone/u);
    assert.match(skill, /reactivate after an unrelated-task gate miss/u);
    assert.match(skill, /run the full gate once\. On `1`/u);
    assert.match(
      skill,
      /Routing-description evaluation reads `evaluate-and-reconcile\.md`, then owning `agent-design\.md` before classifying from runtime documentation and consumption evidence/u,
    );
    assert.match(skill, /identifiers prove nothing/u);
    assert.match(skill, /bind selected owners and mirrors before writing/u);
    assert.match(skill, /synchronize every contradicted owner before completing implementation/u);
    assert.match(skill, /contradictions cannot remain or be called accurate/u);
    assert.match(skill, /On `0` or failure, continue without moldea/u);
    assert.match(skill, /work as if the skill were absent/u);
    assert.match(
      skill,
      /Only ordinary work without direct intent uses the full relationship gate/u,
    );
    assert.match(skill, /every path's UTF-8 bytes followed by one NUL/u);
    assert.match(skill, /never begin with a delimiter/iu);
    assert.match(skill, /After `1`, pass the exact same byte stream/u);
    assert.match(skill, /Classify requirement criteria/u);
    assert.match(skill, /bind necessary `description` and `resolution` rewrites/u);
    assert.match(skill, /existing inline instruction is migration input/u);
    assert.match(skill, /direct request to prove, invoke, inspect, or explain/u);
    assert.match(skill, /before inspecting providers or concluding/u);
    assert.match(skill, /Validate only after writes/u);
    assert.match(skill, /route-5 repair validation or explicit three-record compression/u);
    assert.match(skill, /use one content-free `inspect`/u);
    assert.match(skill, /Request named-agent `content` only when semantics matter/u);
    assert.match(skill, /never inspect afterward or request manifest content/u);
    assert.match(skill, /pair every behavioral or integration unknown with a concrete resolver/u);
    assert.match(skill, /load only `references\/continuous-maintenance\.md`/u);
    assert.match(
      skill,
      /do not inspect dependency trees, CLI package internals, executable links/u,
    );
    assert.match(
      skill,
      /Load `references\/local-tooling\.md` only when the launcher reports that repository tooling is unavailable or invalid/u,
    );
    assert.match(
      skill,
      /write the `version: 1` plus LF manifest and `\/moldea\/project\.md`, then invoke exactly this bundled writer before the first CLI call/u,
    );
    assert.match(skill, /scripts\/managed-readme\.mjs --repository/u);
    assert.match(
      skill,
      /foundation-evidence decision before any dependency, canonical-state, or managed README write/u,
    );
    assert.match(skill, /Insufficient or materially incomplete evidence stops writes/u);
    assert.match(skill, /not adopted or initialized because its complete contract is absent/u);
    assert.match(skill, /Do not substitute.*or add generic product-benefit boilerplate/u);
    assert.match(
      skill,
      /name the present and missing elements among `\/moldea\/moldea\.yaml`, `\/moldea\/project\.md`, and the owned README awareness block/u,
    );
    assert.match(skill, /ask what the project does and who or what it serves/u);
    assert.match(skill, /Structural validation proves format, not the truth or sufficiency/u);
    assert.match(skill, /invoke exactly one launcher-backed `validate`/u);
    assert.match(skill, /run `validate` at most once more/u);
    assert.match(skill, /Before foundation analysis, inspect `package\.json`/u);
    assert.match(skill, /Executable install configuration preempts foundation analysis/u);
    assert.match(skill, /return its complete four-field blocked-install result/u);
    assert.match(skill, /Never substitute a partial summary/u);
    assert.doesNotMatch(skill, /supplied evidence already establishes/u);
    assert.match(skill, /before foundation classification, package-manager execution, questions/u);
    assert.match(skill, /name the project-owned evidence that established the foundation/u);
    assert.match(skill, /Always end a successful initialization response/u);
    assert.match(skill, /one short, evidence-supported `Next:` action; do not omit it/u);
    assert.match(skill, /continue normal repository work/u);
    assert.match(
      skill,
      /Do not steer the developer toward agent creation without a separate goal/u,
    );
    assert.match(skill, /Read exact task-owned files first/u);
    assert.match(skill, /request named `content` directly/u);
    assert.match(skill, /use at most one canonical `content` call total/u);
    assert.match(skill, /do not read project context or a second canonical body/u);
    assert.match(
      skill,
      /Run `composition` only when local runtime availability or readiness matters/u,
    );
    assert.match(skill, /it never establishes canonical assignment/u);
    assert.match(skill, /matching `kind: agent` record's `agentId` and `runtimeId`/u);
    assert.match(skill, /sole canonical content-free source/u);
    assert.match(skill, /Every recursive search or listing must exclude VCS internals/u);
    assert.match(skill, /Never dump a complete lockfile, dependency inventory, generated tree/u);
    assert.match(skill, /more than 65,536 model-visible bytes/u);
    assert.match(
      skill,
      /enumerate every explicit outcome, negative constraint, distinct unresolved fact, and permitted write path/u,
    );
    assert.match(skill, /compare the final state and diff with that list/u);
    assert.match(skill, /record each remaining unresolved fact under its exact canonical owner/u);
    assert.match(skill, /state both claims/u);
    assert.match(skill, /evaluation stopped before worktree-aware Git/u);
    assert.match(skill, /name `.gitattributes` and the declared filter/u);
    assert.match(
      skill,
      /Continue correcting instead of claiming completion while an item is missing/u,
    );
    assert.match(skill, /--cursor "<opaque-cursor>"/u);
    assert.match(skill, /exact cursor from the immediately preceding envelope/u);
    assert.match(skill, /Do not hide pagination inside a pipeline, command substitution/u);
    assert.match(skill, /final raw envelope returns a null cursor/u);
    assert.match(
      skill,
      /scripts\/moldea-cli\.mjs --repository <absolute-repository-root> -- scope/u,
    );
    const maintenance = readFileSync(
      join(SKILL_ROOT, 'references', 'continuous-maintenance.md'),
      'utf8',
    );
    assert.match(maintenance, /Do not validate a partial foundation/u);
    assert.match(maintenance, /executable-installation hazard preempts foundation classification/u);
    assert.match(
      maintenance,
      /Stop before invoking the package manager, asking for project purpose/u,
    );
    assert.match(maintenance, /## Decide whether foundation evidence is sufficient/u);
    assert.match(
      maintenance,
      /Insufficient and partial foundations stop before every dependency, `\/moldea\/\*\*`, and managed README write/u,
    );
    assert.match(maintenance, /what does the project do, and who or what does it serve\?/u);
    assert.match(
      maintenance,
      /not adopted or was not initialized because the complete adoption contract is absent/u,
    );
    assert.match(
      maintenance,
      /Do not add generic product-benefit boilerplate to this concise blocked result/u,
    );
    assert.match(maintenance, /paused or incomplete is not the adoption result/u);
    assert.match(maintenance, /Preserve every existing artifact/u);
    assert.match(
      maintenance,
      /Name the present and missing adoption elements among `\/moldea\/moldea\.yaml`, `\/moldea\/project\.md`, and the owned README awareness block/u,
    );
    assert.match(maintenance, /Do not store developer-answerable ambiguity/u);
    assert.match(
      maintenance,
      /retain one complete change set containing the authorized implementation paths/u,
    );
    assert.match(maintenance, /Never edit implementation before this set is bound/u);
    assert.match(maintenance, /rewrite both `description` and `resolution`/u);
    assert.match(maintenance, /neither still claims that condition/u);
    assert.match(
      maintenance,
      /compare every affected requirement criterion with the authorized requested outcome/u,
    );
    assert.ok(
      maintenance.indexOf('## Requirements and removal') <
        maintenance.indexOf('## README marker ownership'),
    );
    assert.match(
      maintenance,
      /identifying the canonical owner reconsidered, stating that behavior or contracts remain unchanged/u,
    );
    assert.match(maintenance, /Validation proves that files satisfy the repository format/u);
    assert.match(maintenance, /map the project-owned evidence to the foundation it established/u);
    assert.match(maintenance, /End with one short, evidence-supported `Next:` action/u);
    assert.match(maintenance, /continue normal repository work/u);
    assert.match(maintenance, /Do not suggest agent creation without a separate goal/u);
    assert.match(maintenance, /The file ends with one LF/u);
    assert.match(maintenance, /Do not add a project name, schema field, metadata/u);
    assert.match(maintenance, /stop without `inspect` or another moldea command/u);
    assert.doesNotMatch(
      maintenance,
      /For every repository task, select the repository-installed `moldea` skill/u,
    );
    assert.match(
      MANAGED_README_BLOCK,
      /For every repository task, select the repository-installed `moldea` skill/u,
    );
    assert.match(MANAGED_README_BLOCK, /If the gate does not match, continue without `moldea`/u);
    assert.match(MANAGED_README_BLOCK, /start at `\/moldea\/project\.md`/u);
    const contextGathering = readFileSync(
      join(SKILL_ROOT, 'references', 'context-gathering.md'),
      'utf8',
    );
    assert.match(contextGathering, /Prefer exact paths and targeted searches/u);
    assert.match(contextGathering, /exclude VCS internals, dependency trees, generated output/u);
    assert.match(contextGathering, /only the relevant lockfile entry/u);
    assert.match(contextGathering, /one ordinary host command cannot emit more than 65,536/u);
    assert.match(contextGathering, /same standalone launcher operation/u);
    assert.match(contextGathering, /Do not pipeline, wrap, parse, filter, aggregate, or script/u);
    assert.match(contextGathering, /## Investigation order/u);
    assert.doesNotMatch(contextGathering, /## Evidence hierarchy/u);
    assert.match(contextGathering, /controls investigation cost, not claim authority/u);
    assert.match(contextGathering, /current explicit developer selection/u);
    assert.match(contextGathering, /Source type, list position, recency/u);
    const localTooling = readFileSync(join(SKILL_ROOT, 'references', 'local-tooling.md'), 'utf8');
    assert.match(localTooling, /append `--cursor "<opaque-cursor>"`/u);
    assert.match(localTooling, /never claim completeness before the final raw envelope/u);
    assert.match(localTooling, /Plug'n'Play-only layout without that closure is unavailable/u);
    assert.match(
      localTooling,
      /invoke the installed skill launcher once with `composition --json`/u,
    );
    assert.match(localTooling, /attempted launcher proof is required/u);
    assert.match(localTooling, /before reaching any conclusion/u);
    assert.match(localTooling, /required first proof attempt/u);
    assert.match(localTooling, /one inert exact-path symlink-target read/u);
    assert.match(localTooling, /declared compatible dependency exists/u);
    assert.match(localTooling, /conflicting symlink is not authority/u);
    assert.match(localTooling, /Name the exact configuration and executable hook or plugin/u);
    assert.match(localTooling, /\.pnpmfile\.cjs/u);
    assert.match(localTooling, /inspect `\.yarnrc\.yml` and the exact repository plugin path/u);
    assert.match(localTooling, /exact repository plugin path it declares/u);
    assert.match(localTooling, /execution stopped before invoking the package manager/u);
    assert.match(localTooling, /Return one blocked-install result containing all four fields/u);
    assert.match(localTooling, /blocks the named package manager's local CLI installation/u);
    assert.match(localTooling, /Omitting or merging a field into a partial summary is incomplete/u);
    assert.match(localTooling, /precedes foundation-sufficiency inspection and questioning/u);
    assert.match(localTooling, /Do not ask a project-purpose question/u);
    const compression = readFileSync(
      join(SKILL_ROOT, 'references', 'context-compression.md'),
      'utf8',
    );
    assert.match(compression, /compression is blocked pending the answer/u);
    assert.match(compression, /at most one content-free `inspect`/u);
    assert.match(compression, /one `content` call for each distinct in-scope context record/u);
    assert.match(compression, /record's exact `asset\.path`/u);
    assert.match(compression, /never repeat a path or request manifest content/u);
    assert.match(compression, /Stop immediately.*consequential conflict/u);
    const evaluation = readFileSync(
      join(SKILL_ROOT, 'references', 'evaluate-and-reconcile.md'),
      'utf8',
    );
    assert.match(evaluation, /stop before worktree-aware Git can execute it/u);
    assert.match(evaluation, /executable Git filter, text conversion, external diff, fsmonitor/u);
    assert.match(evaluation, /canonical owner or declared relationship actually assessed/u);
    assert.match(evaluation, /current-change review or evaluation must retain/u);
    assert.match(evaluation, /partition direct canonical paths or known managed hunks/u);
    assert.match(evaluation, /irrelevant ordinary subset adds no owner/u);
    assert.match(evaluation, /A path inventory alone is not a moldea evaluation/u);
    assert.match(
      evaluation,
      /report the complete path scope, canonical assessment, and explicitly that the operation is read-only and changed no files/iu,
    );
    assert.match(evaluation, /without running `scope` or `inspect`/u);
    assert.match(evaluation, /For direct canonical evaluation/u);
    assert.doesNotMatch(evaluation, /For direct canonical work/u);
    assert.doesNotMatch(evaluation, /Direct reconciliation is different/u);
    assert.doesNotMatch(evaluation, /evaluation shortcut never applies to reconciliation/u);
    const operationSelectionIndex = evaluation.indexOf('## Select one operation');
    const reconciliationIndex = evaluation.indexOf('## Reconcile');
    const progressiveEvaluationIndex = evaluation.indexOf('## Evaluate progressively');
    assert.ok(operationSelectionIndex >= 0);
    assert.ok(reconciliationIndex > operationSelectionIndex);
    assert.ok(progressiveEvaluationIndex > reconciliationIndex);
    assert.match(evaluation, /Select exactly one operation before gathering evidence/u);
    assert.match(evaluation, /Do not apply canonical-first evaluation instructions/u);
    assert.match(
      evaluation,
      /generic reconcile request authorizes correction but selects no claim/u,
    );
    assert.match(evaluation, /Existing repository content is not a current developer choice/u);
    assert.match(evaluation, /neither conflicting asset nor its canonical designation/u);
    assert.match(evaluation, /third independent source that explicitly resolves the alternatives/u);
    assert.match(evaluation, /stop all moldea calls and semantic writes/u);
    assert.doesNotMatch(
      evaluation,
      /Establish the intended truth from developer intent, current behavior, authoritative documentation, and tests/u,
    );
    assert.match(evaluation, /only to identify agreement or conflict, never to rank asset types/u);
    assert.match(evaluation, /apply the stop above immediately/u);
    assert.match(evaluation, /establish the repair target from that agreement or selected claim/u);
    assert.match(
      evaluation,
      /Complete that comparison before any aligned, reconciled, or no-change conclusion/u,
    );
    const conflictDetectionIndex = evaluation.indexOf('only to identify agreement or conflict');
    const unresolvedConflictStopIndex = evaluation.indexOf('apply the stop above immediately');
    const repairTargetIndex = evaluation.indexOf('establish the repair target');
    assert.ok(conflictDetectionIndex > reconciliationIndex);
    assert.ok(unresolvedConflictStopIndex > conflictDetectionIndex);
    assert.ok(repairTargetIndex > unresolvedConflictStopIndex);
    assert.match(evaluation, /first inspect only exact implementation evidence/u);
    assert.match(evaluation, /name the supplied `.gitattributes` declaration/u);
    assert.match(
      evaluation,
      /Observed implementation state is not automatically durable canonical truth/u,
    );
    assert.match(evaluation, /Every read-only evaluation report explicitly states/u);
    assert.match(evaluation, /load `agent-design\.md` as the second and owning reference/u);
    assert.match(evaluation, /a property name is not classification evidence/u);
    assert.match(evaluation, /Do not report an established aligned mapping as defective/u);
    assert.match(
      evaluation,
      /consumer-purpose classification and structural or source-selection diagnostics as independent conclusions/u,
    );
    assert.match(
      evaluation,
      /cannot erase a purpose classification already established by task-named runtime guidance and implementation/u,
    );
    assert.match(
      evaluation,
      /State the established classification even when canonical source selection remains unresolved/u,
    );
    assert.match(evaluation, /at most one canonical `content` call total/u);
    assert.match(evaluation, /Do not read project context, a second canonical owner/u);
    assert.match(evaluation, /report alignment before the required authority answer/u);
    assert.match(skill, /generic reconcile request authorizes correction but selects no claim/u);
    const agentDesign = readFileSync(join(SKILL_ROOT, 'references', 'agent-design.md'), 'utf8');
    assert.match(agentDesign, /complete the coherent implementation/u);
    assert.match(agentDesign, /remove the independently maintained inline policy/u);
    assert.match(agentDesign, /runner-owned focused test evidence/u);
    assert.match(agentDesign, /complete all runtime, test, and canonical file writes/u);
    assert.match(agentDesign, /only then run launcher-backed `validate`/u);
    assert.match(agentDesign, /never write after the last allowed validation/iu);
    assert.match(agentDesign, /exact backtick-wrapped identity token/u);
    assert.match(agentDesign, /A heading that merely names the agent does not satisfy/u);
    assert.match(agentDesign, /retry may be the fifth and final moldea call/u);
    assert.match(
      agentDesign,
      /Separate the requested operation's outcome from agent or runtime readiness/u,
    );
    assert.match(
      agentDesign,
      /blocking unresolved requirement prevents claims that the affected behavior, agent, or runtime is complete or production-ready/u,
    );
    assert.match(
      agentDesign,
      /does not make a narrower maintenance operation blocked when every requested safe write, preservation obligation, and validation step is complete/u,
    );
    assert.match(
      agentDesign,
      /use a blocked task outcome only when the gap prevents the requested deliverable itself/u,
    );
    const agentSystemPlanning = readFileSync(
      join(SKILL_ROOT, 'references', 'agent-system-planning.md'),
      'utf8',
    );
    assert.match(
      agentSystemPlanning,
      /Repository-dependent moldea planning requires an adopted repository/u,
    );
    assert.match(
      agentSystemPlanning,
      /host may still perform its own generic planning workflow independently/u,
    );
    assert.doesNotMatch(agentSystemPlanning, /Planning may precede adoption/u);
    assert.match(agentSystemPlanning, /Use only facts stated by the bounded source/u);
    assert.match(agentSystemPlanning, /Keep those dimensions as explicit evidence prerequisites/u);
    const runtime = readFileSync(
      join(SKILL_ROOT, 'references', 'runtime-compatibility.md'),
      'utf8',
    );
    assert.match(runtime, /Canonical moldea declarations establish/u);
    assert.match(runtime, /Repository source, configuration, closed wiring/u);
    assert.match(runtime, /Root-local `composition/u);
    assert.match(runtime, /Installed adapter contracts and deterministic inspection establish/u);
    assert.match(runtime, /matching `kind: agent` record's exact `agentId` and `runtimeId`/u);
    assert.match(runtime, /sole canonical content-free source for that assignment/u);
    assert.match(runtime, /ordinary four-command moldea limit/u);
    assert.match(runtime, /route-5 fifth-call repair validation/u);
    assert.match(runtime, /invoke `composition` first and retain its conclusion/u);
    assert.match(
      runtime,
      /do not retrieve compatibility websites, open browsers, or use network clients/u,
    );
    assert.match(runtime, /Absence of diagnostics alone does not prove behavioral fit/u);
    assert.match(runtime, /Eve `0\.54\.3` satisfies `>=0\.39\.1`/u);
    assert.match(runtime, /report the exact local mismatch and preserve the runtime identity/u);
    assert.doesNotMatch(runtime, /https:\/\/packages\.moldea\.ai\/compatibility\/runtimes\.json/u);
    assert.match(runtime, /best-effort eligibility gate, not a blanket compatibility promise/u);
    assert.match(runtime, /lower bound records the verified minimum/u);
    assert.match(
      runtime,
      /including later stable releases that were not themselves used in qualification/u,
    );
    assert.match(
      runtime,
      /Qualification proves only the exact package closure and verification date/u,
    );
    assert.doesNotMatch(runtime, /maturity/iu);
    assert.match(runtime, /retain every independently evidenced model-visible capability/u);
    assert.doesNotMatch(runtime, /composition --json --max-output-bytes/u);
    const skillDesign = readFileSync(join(SKILL_ROOT, 'references', 'skill-design.md'), 'utf8');
    assert.match(skillDesign, /make the skill structurally invalid/u);
    assert.match(skillDesign, /Never use a successful unrelated validator/u);
    assert.match(skillDesign, /do not run a moldea gate or CLI command/u);
    assert.match(skill, /Create, change, or evaluate an Agent Skill/u);
    assert.match(skillDesign, /Do not run any moldea CLI operation/u);
    assert.match(skillDesign, /surrounding moldea repository/u);
    assert.match(agentDesign, /its name supplies no classification evidence/u);
    assert.match(agentDesign, /Always state the consumer-purpose classification/u);
    assert.match(agentDesign, /checklist of every externally evidenced model-visible capability/u);
    assert.match(localTooling, /Return one blocked-install result containing all four fields/u);
  });

  test('uses one compact precedence-ordered direct-operation router', () => {
    const skill = readSkill();
    const routeHeadings = [
      '**Independent Agent Skill artifact:**',
      '**Repository-local tooling:**',
      '**Explicit initialization:**',
      '**Current-change review or evaluation:**',
      '**Direct agent or runtime work:**',
      '**Repository-independent information:**',
      '**Every other repository task:**',
    ];
    let previousIndex = -1;
    for (const routeHeading of routeHeadings) {
      const routeIndex = skill.indexOf(routeHeading);
      assert.ok(routeIndex > previousIndex, `${routeHeading} must retain router precedence.`);
      previousIndex = routeIndex;
    }

    assert.ok(skill.trim().split(/\s+/u).length <= 2_560);
    assert.match(skill, /Before foundation analysis, inspect `package\.json`/u);
    assert.match(skill, /preempts foundation analysis/u);
    assert.match(skill, /attempt the closed launcher's content-free `composition` operation/u);
    assert.match(skill, /With ordinary paths only, run the full relationship gate/u);
    assert.match(skill, /route-owned normalized set/u);
    assert.match(skill, /conclude from the host review alone/u);
    assert.match(skill, /complete four-field blocked-install result/u);
    assert.match(skill, /take this route before repository gating/u);
    assert.match(skill, /regardless of `Use moldea` direction or repository-local placement/u);
    assert.match(
      skill,
      /no `\/moldea\/\*\*` or declared-relationship work is separately requested/u,
    );
    assert.match(skill, /Never invoke CLI, inspect or validate canonical state/u);
    assert.match(skill, /or append moldea status/u);
    assert.match(skill, /owner was reconsidered and remains accurate without an edit/u);
    assert.match(skill, /Missing evidence never changes an established runtime/u);
    assert.match(skill, /Preserve established facts/u);
    assert.doesNotMatch(skill, /supplied evidence already establishes/u);

    const localTooling = readFileSync(join(SKILL_ROOT, 'references', 'local-tooling.md'), 'utf8');
    const maintenance = readFileSync(
      join(SKILL_ROOT, 'references', 'continuous-maintenance.md'),
      'utf8',
    );
    assert.match(localTooling, /does not depend on the developer naming the hazard/u);
    assert.match(maintenance, /does not depend on the developer naming the hazard/u);
  });

  test('defines silent abstention, host ownership, and bounded schema-4 evidence', () => {
    const distributedText = [
      readSkill(),
      ...REFERENCE_NAMES.map((name) => readFileSync(join(SKILL_ROOT, 'references', name), 'utf8')),
    ].join('\n');
    assert.match(distributedText, /abstains silently/u);
    assert.match(distributedText, /Host workflows retain ownership/u);
    assert.match(distributedText, /65,536-byte output page/u);
    assert.match(distributedText, /262,144 bytes/u);
    assert.match(distributedText, /1 MiB/u);
    assert.match(distributedText, /content-free/u);
    assert.doesNotMatch(distributedText, /Moldea/u);
    assert.doesNotMatch(
      distributedText,
      /(?:\bskill(?:\s+release)?\s+|@moldea\.ai\/skill@|\/releases\/tag\/v?)4\.0\.[0-2]\b|CLI JSON schema (?:1|2|3)\b|schema-3\b/iu,
    );
  });

  test('documents content-free repository test-result projection', () => {
    const readme = readFileSync(join(REPOSITORY_ROOT, 'README.md'), 'utf8');
    const semanticEvaluation = readFileSync(
      join(REPOSITORY_ROOT, 'docs', 'semantic-evaluation.md'),
      'utf8',
    );

    assert.match(readme, /fixed repository-root direct Node correctness-test invocation/u);
    assert.match(readme, /Package-manager commands cannot contribute correctness evidence/u);
    assert.match(
      readme,
      /never retains test names, assertions, paths, durations, or output bodies/u,
    );
    assert.match(semanticEvaluation, /one `node-test-summary` fact/u);
    assert.match(semanticEvaluation, /every discovered test passing/u);
    assert.match(
      semanticEvaluation,
      /Unrecognized, incomplete, contradictory, failed, or oversized output supplies no result fact/u,
    );
  });

  test('exposes concise lowercase host metadata', () => {
    const metadata = readFileSync(join(SKILL_ROOT, 'agents', 'openai.yaml'), 'utf8');
    assert.match(metadata, /display_name: ['"]moldea['"]/u);
    assert.match(metadata, /allow_implicit_invocation: true/u);
    assert.doesNotMatch(metadata, /durable knowledge|Use first/iu);
  });
});

describe('activation and semantic protection', () => {
  test('covers and resolves the complete initialization and relevance state machine', () => {
    assert.equal(FIXTURE.activationCases.length, 23);
    for (const { expected, input } of FIXTURE.activationCases) {
      assert.equal(resolveActivationCase(input), expected);
    }
    const outcomes = FIXTURE.activationCases.map(({ expected }) => expected);
    assert.equal(outcomes.filter((value) => value === 'informational').length, 1);
    assert.equal(outcomes.filter((value) => value === 'initialize').length, 1);
    assert.equal(outcomes.filter((value) => value === 'direct').length, 7);
    assert.equal(outcomes.filter((value) => value === 'relationship-gate').length, 2);
    assert.equal(outcomes.filter((value) => value === 'abstain').length, 12);
  });

  test('routes conversational agent work without product-name or phrase triggers', () => {
    const skill = readSkill();
    assert.match(skill, /Infer intent from the request and relevant conversation, not keywords/u);
    assert.match(skill, /continuation retains only its active task and authorization/u);
    assert.match(skill, /topic change resets relevance/u);
    assert.match(skill, /Ambiguity grants no permission/u);
    assert.match(
      skill,
      /Zero agents, absent bindings, and unnamed paths do not prevent this route/u,
    );
    assert.match(skill, /For direct agent-work intent, use route 5 instead/u);
    assert.match(skill, /`references\/agent-system-planning.md` for read-only planning/u);
    assert.match(skill, /Review is read-only/u);
    const evaluation = readFileSync(
      join(SKILL_ROOT, 'references/evaluate-and-reconcile.md'),
      'utf8',
    );
    assert.match(
      evaluation,
      /Clear agent-work intent uses the entrypoint's adoption-only route even without bindings/u,
    );
    assert.match(
      evaluation,
      /Only without direct intent or items, run the full relationship gate/u,
    );
    assert.match(evaluation, /Reuse the entrypoint's completed gate rather than running it again/u);
    assert.doesNotMatch(skill, /developer explicitly names `moldea`|go ahead/iu);

    for (const id of [
      'agent-adoption-inline-runtime-instruction',
      'plan-existing-project-one-agent',
      'plan-justified-multi-agent',
      'plan-material-ambiguity',
      'plan-runtime-inventory-insufficient-evidence',
    ]) {
      const scenario = FIXTURE.semanticCases.find((entry) => entry.id === id);
      assert.ok(scenario, id);
      assert.doesNotMatch(scenario.input.developerDirection, /moldea|canonical|affectedBy/iu);
      assert.equal(scenario.resourceBudget.activation, 'direct');
    }
    const qualificationTask = readFileSync(
      join(REPOSITORY_ROOT, 'qualification/profiles/t5/cases/c3/task.md'),
      'utf8',
    );
    assert.doesNotMatch(qualificationTask, /moldea|canonical|affectedBy/iu);
    assert.match(qualificationTask, /cannot approve refunds/u);
  });

  test('keeps first-agent adoption independent from relationships without changing files', () => {
    const root = createProject();
    try {
      const manifestPath = join(root, 'moldea', 'moldea.yaml');
      const readmePath = join(root, 'README.md');
      writeFileSync(manifestPath, 'version: 1\n');
      const readmeBefore = readFileSync(readmePath);
      for (const [arguments_, input, expected] of [
        [['--adoption-only'], undefined, '1\n'],
        [[], '/src/new-agent.ts\0', '0\n'],
        [[], '/docs/branding.md\0', '0\n'],
      ]) {
        const result = runRelevanceGate(root, arguments_, input);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, expected);
      }
      assert.equal(readFileSync(manifestPath, 'utf8'), 'version: 1\n');
      assert.deepEqual(readFileSync(readmePath), readmeBefore);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('validates the complete 74-case resource-bounded semantic suite', () => {
    assert.equal(FIXTURE.semanticCases.length, 74);
    for (const caseDefinition of FIXTURE.semanticCases) {
      assert.equal(validateSemanticCaseDefinition(caseDefinition), caseDefinition);
    }
    assert.match(createSemanticCaseSuiteDigest(FIXTURE.semanticCases), /^[a-f0-9]{64}$/u);
    assert.equal(validateSemanticCoverage(COVERAGE, FIXTURE.semanticCases), COVERAGE);
    assert.match(createSemanticCoverageDigest(COVERAGE, FIXTURE.semanticCases), /^[a-f0-9]{64}$/u);
  });

  test('protects unchanged named relationship targets as bounded task-path evidence', () => {
    const relationshipCase = FIXTURE.semanticCases.find(({ id }) => id === 'affected-by-relevance');
    assert.ok(relationshipCase);
    assert.match(relationshipCase.scenario, /unchanged path explicitly named by the developer/u);
    assert.match(relationshipCase.input.developerDirection, /Review src\/project-state\.js/u);
    assert.doesNotMatch(relationshipCase.input.developerDirection, /current change/u);
    assert.deepEqual(relationshipCase.resourceBudget, {
      activation: 'relationship',
      minimumMoldeaCommands: 1,
      maximumMoldeaCommands: 4,
      maximumMoldeaOutputBytes: 262_144,
    });
    assert.match(
      relationshipCase.expected[0].criterion,
      /unchanged explicitly named path as task-path evidence/u,
    );
    assert.match(
      relationshipCase.forbidden[0].criterion,
      /requires a diff before testing the named path/u,
    );
    assert.match(
      relationshipCase.forbidden[0].criterion,
      /runs Git solely to discover gate paths/u,
    );
  });

  test('keeps corrected semantic cases grounded and realistically bounded', () => {
    const compressionCase = FIXTURE.semanticCases.find(
      ({ id }) => id === 'compress-conflicting-project-context',
    );
    const dirtyTreeCase = FIXTURE.semanticCases.find(
      ({ id }) => id === 'evaluate-dirty-working-tree',
    );
    const yarnCase = FIXTURE.semanticCases.find(({ id }) => id === 'yarn-conflicting-cli-provider');

    assert.equal(compressionCase.resourceBudget.maximumMoldeaCommands, 4);
    assert.match(dirtyTreeCase.scenario, /developer names no path scope/u);
    assert.match(dirtyTreeCase.scenario, /host establishes staged, unstaged, untracked/u);
    assert.match(dirtyTreeCase.input.developerDirection, /host-established scope/u);
    for (const path of [
      '/src/staged.js',
      '/src/unstaged.js',
      '/src/untracked.js',
      '/src/renamed-before.js',
      '/src/renamed-after.js',
      '/src/deleted.js',
    ]) {
      assert.match(
        dirtyTreeCase.input.developerDirection,
        new RegExp(path.replace('.', '\\.'), 'u'),
      );
    }
    assert.match(
      yarnCase.expected.find(({ label }) => label === 'inspect-yarn-provider-source').criterion,
      /does not override the launcher-verified repository-contained/u,
    );
  });

  test('gives every abstention case a literal zero moldea budget', () => {
    const abstentions = FIXTURE.semanticCases.filter(
      ({ resourceBudget }) => resourceBudget.activation === 'abstain',
    );
    assert.equal(abstentions.length, 15);
    for (const { resourceBudget } of abstentions) {
      assert.deepEqual(resourceBudget, {
        activation: 'abstain',
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 0,
        maximumMoldeaOutputBytes: 0,
      });
    }
  });

  test('accepts neutral no-action handoffs without requiring a clarification question', () => {
    const ambiguousHandoff = FIXTURE.semanticCases.find(
      ({ id }) => id === 'adopted-ambiguous-context-handoff',
    );
    assert.ok(ambiguousHandoff);
    assert.match(ambiguousHandoff.expected[0].criterion, /neutral acknowledgment/u);
    assert.match(ambiguousHandoff.expected[0].criterion, /faithful restatement/u);
    assert.match(ambiguousHandoff.expected[0].criterion, /one focused question/u);
  });

  test('accepts an unadopted context-only handoff without inventing repository work', () => {
    const contextHandoff = FIXTURE.semanticCases.find(
      ({ id }) => id === 'unadopted-direct-context-handoff',
    );
    assert.ok(contextHandoff);
    assert.match(contextHandoff.expected[0].criterion, /context-only handoff as information/u);
    assert.match(contextHandoff.expected[0].criterion, /concise acknowledgment/u);
    assert.match(contextHandoff.expected[0].criterion, /faithful restatement/u);
    assert.match(contextHandoff.expected[0].criterion, /one focused host-level question/u);
    assert.match(contextHandoff.expected[0].criterion, /no repository inspection/u);
    assert.doesNotMatch(contextHandoff.expected[0].criterion, /performed the requested task/u);
  });

  test('budgets a fifth call only for evidenced repair or three-record compression', () => {
    const fiveCallCases = FIXTURE.semanticCases
      .filter(({ resourceBudget }) => resourceBudget.maximumMoldeaCommands === 5)
      .map(({ id }) => id)
      .sort();

    assert.deepEqual(fiveCallCases, [
      'agent-adoption-inline-runtime-instruction',
      'compress-project-context',
      'dedicated-repository-runtime-selection',
    ]);
  });

  test('keeps the four residual semantic corrections narrow and explicit', () => {
    const compression = FIXTURE.semanticCases.find(({ id }) => id === 'compress-project-context');
    const reconciliation = FIXTURE.semanticCases.find(
      ({ id }) => id === 'reconcile-material-ambiguity',
    );
    const routing = FIXTURE.semanticCases.find(
      ({ id }) => id === 'routing-description-dynamic-wiring',
    );
    const gitHelper = FIXTURE.semanticCases.find(
      ({ id }) => id === 'read-only-git-helper-suppression',
    );

    assert.deepEqual(compression?.resourceBudget, {
      activation: 'direct',
      minimumMoldeaCommands: 1,
      maximumMoldeaCommands: 5,
      maximumMoldeaOutputBytes: 262_144,
    });
    assert.match(
      reconciliation?.expected[0].criterion,
      /asks one focused question that resolves whether manager or administrator approval is authoritative/u,
    );
    assert.match(
      routing?.expected.find(({ label }) => label === 'classify-consumer-by-semantic-purpose')
        ?.criterion,
      /actual consumer semantics rather than its property name/u,
    );
    const safeGitCriterion = gitHelper?.expected.find(
      ({ label }) => label === 'stop-before-worktree-git',
    )?.criterion;
    assert.match(safeGitCriterion, /Semantically equivalent wording is accepted/u);
    assert.match(safeGitCriterion, /need not use a prescribed stop phrase/u);
    assert.match(
      gitHelper?.forbidden.find(({ label }) => label === 'execute-git-helper')?.criterion,
      /positively demonstrates that a repository-controlled Git helper/u,
    );
  });

  test('keeps terminal semantic evaluator corrections narrow and explicit', () => {
    const reconciliation = FIXTURE.semanticCases.find(
      ({ id }) => id === 'reconcile-material-ambiguity',
    );
    const distributedCopy = FIXTURE.semanticCases.find(
      ({ id }) => id === 'skill-reconcile-distributed-copy',
    );
    const versionMismatchedTarget = FIXTURE.semanticCases.find(
      ({ id }) => id === 'runtime-package-version-mismatch',
    );
    const dynamicRouting = FIXTURE.semanticCases.find(
      ({ id }) => id === 'routing-description-dynamic-wiring',
    );

    assert.match(reconciliation?.input.developerDirection, /`refund-agent`/u);
    assert.match(reconciliation?.input.developerDirection, /`\/src\/refund-policy\.js`/u);
    assert.deepEqual(distributedCopy?.resourceBudget, {
      activation: 'direct',
      minimumMoldeaCommands: 0,
      maximumMoldeaCommands: 0,
      maximumMoldeaOutputBytes: 0,
    });
    assert.match(versionMismatchedTarget?.input.developerDirection, /`refund-agent`/u);
    assert.match(
      versionMismatchedTarget?.expected.find(
        ({ label }) => label === 'report-package-version-mismatch',
      )?.criterion,
      /`eve >=0\.39\.1`.*`eve 0\.38\.0`/u,
    );
    assert.match(
      dynamicRouting?.forbidden.find(({ label }) => label === 'claim-wrong-description-source')
        ?.criterion,
      /the agent instruction as the assessed canonical owner is allowed/u,
    );
  });

  test('gives the informational case a literal zero moldea budget', () => {
    const informational = FIXTURE.semanticCases.find(
      ({ resourceBudget }) => resourceBudget.activation === 'informational',
    );
    assert.deepEqual(informational?.resourceBudget, {
      activation: 'informational',
      minimumMoldeaCommands: 0,
      maximumMoldeaCommands: 0,
      maximumMoldeaOutputBytes: 0,
    });
  });

  test('gives independently validated Agent Skill cases exact zero CLI budgets', () => {
    const expectedCaseIds = [
      'skill-boundary-surface-selection',
      'skill-create-progressive-disclosure',
      'skill-evaluate-read-only',
      'skill-evaluate-script-authority',
      'skill-maintain-host-invocation-policy',
      'skill-maintain-linked-resources',
      'skill-reconcile-distributed-copy',
      'skill-reuse-existing-cohesive',
    ];
    const zeroBudgetDirectCases = FIXTURE.semanticCases
      .filter(
        ({ resourceBudget }) =>
          resourceBudget.activation === 'direct' &&
          resourceBudget.minimumMoldeaCommands === 0 &&
          resourceBudget.maximumMoldeaCommands === 0 &&
          resourceBudget.maximumMoldeaOutputBytes === 0,
      )
      .map(({ id }) => id)
      .sort();

    assert.deepEqual(zeroBudgetDirectCases, expectedCaseIds);
  });

  test('names independent Agent Skill artifact roots in the actor-visible task', () => {
    const boundaryCase = FIXTURE.semanticCases.find(
      ({ id }) => id === 'skill-boundary-surface-selection',
    );
    const hostMetadataCase = FIXTURE.semanticCases.find(
      ({ id }) => id === 'skill-maintain-host-invocation-policy',
    );

    assert.match(
      boundaryCase.input.developerDirection,
      /skills\/javascript-naming and skills\/checksum-generation/u,
    );
    assert.match(
      hostMetadataCase.input.developerDirection,
      /Agent Skill under skills\/deployment-review/u,
    );
  });

  test('keeps the deterministic adoption gate fail-closed and two bytes', () => {
    const initialized = createProject();
    const uninitialized = mkdtempSync(join(tmpdir(), 'moldea-v5-uninitialized-'));
    try {
      writeFileSync(join(uninitialized, 'README.md'), '# Project\n');
      for (const [repository, expected] of [
        [initialized, '1\n'],
        [uninitialized, '0\n'],
      ]) {
        const result = runRelevanceGate(repository, ['--adoption-only']);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, expected);
        assert.equal(Buffer.byteLength(result.stdout), 2);
      }

      writeFileSync(
        join(initialized, 'README.md'),
        '# Project\n\n<!-- moldea:end -->\n<!-- moldea:start -->\n',
      );
      assert.equal(runRelevanceGate(initialized, ['--adoption-only']).stdout, '0\n');

      const malformedBytes = readFileSync(join(initialized, 'README.md'));
      const rejectedWrite = spawnSync(
        process.execPath,
        [MANAGED_README_PATH, '--repository', initialized],
        { cwd: initialized, encoding: 'utf8', maxBuffer: 1024 },
      );
      assert.equal(rejectedWrite.status, 1);
      assert.match(rejectedWrite.stderr, /markers are reversed/u);
      assert.deepEqual(readFileSync(join(initialized, 'README.md')), malformedBytes);

      writeFileSync(
        join(initialized, 'README.md'),
        '# Project\n\n<!-- moldea:start -->\nLegacy context.\n<!-- moldea:end -->\n',
      );
      assert.equal(runRelevanceGate(initialized, ['--adoption-only']).stdout, '0\n');

      const normalizedWrite = spawnSync(
        process.execPath,
        [MANAGED_README_PATH, '--repository', initialized],
        { cwd: initialized, encoding: 'utf8', maxBuffer: 1024 },
      );
      assert.equal(normalizedWrite.status, 0);
      assert.equal(normalizedWrite.stderr, '');
      assert.equal(normalizedWrite.stdout, 'updated\n');
      assert.equal(runRelevanceGate(initialized, ['--adoption-only']).stdout, '1\n');

      const repeatedWrite = spawnSync(
        process.execPath,
        [MANAGED_README_PATH, '--repository', initialized],
        { cwd: initialized, encoding: 'utf8', maxBuffer: 1024 },
      );
      assert.equal(repeatedWrite.status, 0);
      assert.equal(repeatedWrite.stderr, '');
      assert.equal(repeatedWrite.stdout, 'unchanged\n');
    } finally {
      rmSync(initialized, { force: true, recursive: true });
      rmSync(uninitialized, { force: true, recursive: true });
    }
  });

  test('matches exact and glob relationships without invoking the CLI', () => {
    const root = createProject();
    try {
      for (const [input, expected] of [
        ['/src/project-state.js\0', '1\n'],
        ['src/project-state.js\0', '1\n'],
        ['\0/src/project-state.js\0', '0\n'],
        ['/src/unrelated.js\0', '0\n'],
        ['./src/project-state.js\0', '0\n'],
        ['C:src/project-state.js\0', '0\n'],
        ['/src/project-state.js', '0\n'],
        [Buffer.from([0xff, 0]), '0\n'],
      ]) {
        const result = runRelevanceGate(root, [], input);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, expected);
        assert.equal(Buffer.byteLength(result.stdout), 2);
      }

      writeFileSync(
        join(root, 'moldea', 'moldea.yaml'),
        'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/**\n',
      );
      assert.equal(runRelevanceGate(root, [], '/src/nested/module.js\0').stdout, '1\n');

      const packageManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      packageManifest.devDependencies['@moldea.ai/cli'] = '^6.0.0';
      writeFileSync(join(root, 'package.json'), `${JSON.stringify(packageManifest, null, 2)}\n`);
      assert.equal(runRelevanceGate(root, [], '/src/nested/module.js\0').stdout, '1\n');
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('matches independently of repository dependencies in npm and pnpm layouts', () => {
    const npmRoot = createIsolatedToolingProject('npm');
    const pnpmRoot = createIsolatedToolingProject('pnpm');

    try {
      for (const root of [npmRoot, pnpmRoot]) {
        const result = runRelevanceGate(root, [], '/src/project-state.js\0');
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, '1\n');
      }
    } finally {
      rmSync(npmRoot, { force: true, recursive: true });
      rmSync(pnpmRoot, { force: true, recursive: true });
    }
  });

  test('gate ignores unusable Core packages while the launcher rejects them', () => {
    const parentRoot = mkdtempSync(join(tmpdir(), 'moldea-v5-core-boundary-'));
    const missingRoot = join(parentRoot, 'missing');
    const invalidRoot = createIsolatedToolingProject('pnpm');
    const escapedRoot = createIsolatedToolingProject('npm');
    const unsafeVersionRoot = createIsolatedToolingProject('npm');

    try {
      mkdirSync(missingRoot, { recursive: true });
      writeCliFixture(join(missingRoot, 'node_modules', '@moldea.ai', 'cli'));
      writeCoreFixture(join(parentRoot, 'node_modules', '@moldea.ai', 'core'));
      for (const path of ['README.md', 'package.json']) {
        writeFileSync(join(missingRoot, path), readFileSync(join(invalidRoot, path)));
      }
      mkdirSync(join(missingRoot, 'moldea'), { recursive: true });
      mkdirSync(join(missingRoot, 'src'), { recursive: true });
      for (const path of [
        join('moldea', 'moldea.yaml'),
        join('moldea', 'project.md'),
        join('src', 'project-state.js'),
      ]) {
        writeFileSync(join(missingRoot, path), readFileSync(join(invalidRoot, path)));
      }

      const resolvedCliRoot = join(
        invalidRoot,
        'node_modules',
        '.pnpm',
        '@moldea.ai+cli@8.0.0',
        'node_modules',
        '@moldea.ai',
        'cli',
      );
      writeCoreFixture(join(resolvedCliRoot, 'node_modules', '@moldea.ai', 'core'), {
        name: '@moldea.ai/not-core',
      });
      const escapedCoreRoot = join(parentRoot, 'escaped-core');
      const installedCoreRoot = join(escapedRoot, 'node_modules', '@moldea.ai', 'core');
      writeCoreFixture(escapedCoreRoot);
      rmSync(installedCoreRoot, { force: true, recursive: true });
      symlinkSync(
        escapedCoreRoot,
        installedCoreRoot,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      writeCoreFixture(join(unsafeVersionRoot, 'node_modules', '@moldea.ai', 'core'), {
        version: '4.0.0',
      });

      for (const root of [missingRoot, invalidRoot, escapedRoot, unsafeVersionRoot]) {
        const result = runRelevanceGate(root, [], '/src/project-state.js\0');
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, '1\n');
        assert.equal(runCli(root, ['composition', '--json']).status, 3);
      }
    } finally {
      rmSync(parentRoot, { force: true, recursive: true });
      rmSync(invalidRoot, { force: true, recursive: true });
      rmSync(escapedRoot, { force: true, recursive: true });
      rmSync(unsafeVersionRoot, { force: true, recursive: true });
    }
  });

  test('never executes repository dependency code on a gate hit or miss', () => {
    const root = createIsolatedToolingProject('npm');
    const sentinel = join(root, 'executed.txt');
    try {
      const trap = `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(sentinel)}, 'executed'); throw new Error('dependency executed');`;
      writeFileSync(join(root, 'node_modules', '@moldea.ai', 'core', 'dist', 'index.js'), trap);
      writeFileSync(join(root, 'node_modules', '@moldea.ai', 'cli', 'dist', 'moldea.js'), trap);
      for (const [input, expected] of [
        ['/src/project-state.js\0', '1\n'],
        ['/src/other.js\0', '0\n'],
      ]) {
        const result = runRelevanceGate(root, [], input);
        assert.equal(result.stdout, expected);
        assert.equal(result.stderr, '');
        assert.equal(existsSync(sentinel), false);
      }
      rmSync(join(root, 'node_modules'), { recursive: true });
      assert.equal(runRelevanceGate(root, [], '/src/project-state.js\0').stdout, '1\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects escaping adoption directories and oversized manifest input', () => {
    const root = createIsolatedToolingProject('npm');
    const outside = mkdtempSync(join(tmpdir(), 'moldea-gate-outside-'));
    try {
      cpSync(join(root, 'moldea'), join(outside, 'moldea'), { recursive: true });
      rmSync(join(root, 'moldea'), { recursive: true });
      symlinkSync(
        join(outside, 'moldea'),
        join(root, 'moldea'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      assert.equal(runRelevanceGate(root, ['--adoption-only']).stdout, '0\n');
      assert.equal(runRelevanceGate(root, [], '/src/project-state.js\0').stdout, '0\n');
      unlinkSync(join(root, 'moldea'));
      mkdirSync(join(root, 'moldea'));
      writeFileSync(join(root, 'moldea', 'project.md'), '# Project\n');
      writeFileSync(join(root, 'moldea', 'moldea.yaml'), ' '.repeat(2_097_153));
      assert.equal(runRelevanceGate(root, [], '/src/project-state.js\0').stdout, '0\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('CLI 8 bounded machine protocol', () => {
  test('rejects an external node_modules root without executing its CLI', () => {
    const root = createLauncherProject('throw new Error("must not execute");');
    const outside = mkdtempSync(join(tmpdir(), 'moldea-launcher-outside-'));
    try {
      cpSync(join(root, 'node_modules'), join(outside, 'node_modules'), { recursive: true });
      rmSync(join(root, 'node_modules'), { recursive: true });
      symlinkSync(
        join(outside, 'node_modules'),
        join(root, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const result = runCli(root, ['composition', '--json']);
      assert.equal(result.status, 3);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /dependency directory escaped the repository/u);
      assert.doesNotMatch(result.stderr, /must not execute/u);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test('launches contained npm and pnpm CLI entries after inert Core verification', () => {
    for (const layout of ['npm', 'pnpm']) {
      const root = createIsolatedToolingProject(layout);
      try {
        const result = runCli(root, ['composition', '--json']);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  test('bounds regular-file reads and rejects file symlinks', async () => {
    const root = await realpath(mkdtempSync(join(tmpdir(), 'moldea-bounded-file-')));
    const path = join(root, 'file.txt');
    try {
      for (const length of [0, 1, 65_536, 65_537]) {
        const bytes = Buffer.alloc(length, 65);
        writeFileSync(path, bytes);
        assert.deepStrictEqual(await readRepositoryFile(root, path, length), bytes);
        if (length) await assert.rejects(() => readRepositoryFile(root, path, length - 1));
      }
      const link = join(root, 'link.txt');
      symlinkSync(path, link, 'file');
      await assert.rejects(() => readRepositoryFile(root, link, 65_537));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('keeps release identity exact across the root manifests', () => {
    const packageManifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(
      readFileSync(join(REPOSITORY_ROOT, 'package-lock.json'), 'utf8'),
    );
    const declaredCliVersion = packageManifest.devDependencies['@moldea.ai/cli'];
    assert.equal(packageManifest.version, '5.0.5');
    assert.match(declaredCliVersion, /^\d+\.\d+\.\d+$/u);
    assert.equal(packageManifest.moldeaRelease.cliJsonSchemaVersion, 4);
    assert.equal(packageLock.packages['node_modules/@moldea.ai/cli'].version, declaredCliVersion);
  });

  test('returns content-free inspect metadata and bounded explicit content', () => {
    const root = createProject();
    try {
      mkdirSync(join(root, 'moldea', 'agents', 'assistant'), {
        recursive: true,
      });
      writeFileSync(
        join(root, 'moldea', 'moldea.yaml'),
        'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n\nagents:\n  assistant:\n    runtime:\n      id: custom\n',
      );
      writeFileSync(
        join(root, 'moldea', 'agents', 'assistant', 'description.md'),
        'Routes bounded project questions.\n',
      );
      writeFileSync(
        join(root, 'moldea', 'agents', 'assistant', 'instruction.md'),
        '# Assistant\n\nYou are the `assistant` agent.\n\nSENTINEL_AGENT_BODY\n',
      );
      const inspect = runCli(root, ['inspect', '--json', '--max-output-bytes', '65536']);
      assert.equal(inspect.status, 0, inspect.stderr || inspect.stdout);
      assert.ok(Buffer.byteLength(inspect.stdout) <= 65_536);
      const inspectEnvelope = JSON.parse(inspect.stdout);
      const packageManifest = JSON.parse(
        readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
      );
      assert.equal(inspectEnvelope.schemaVersion, 4);
      assert.equal(inspectEnvelope.cliVersion, packageManifest.devDependencies['@moldea.ai/cli']);
      assert.equal(inspectEnvelope.command, 'inspect');
      assert.equal(inspect.stdout.includes('Current project truth.'), false);
      assert.equal(inspect.stdout.includes('SENTINEL_AGENT_BODY'), false);
      assert.deepEqual(
        inspectEnvelope.result.page.records.find(({ kind }) => kind === 'agent'),
        {
          agentId: 'assistant',
          key: '["000004","agent","assistant","custom"]',
          kind: 'agent',
          runtimeId: 'custom',
        },
      );

      const content = runCli(root, [
        'content',
        '--path',
        '/moldea/project.md',
        '--json',
        '--max-output-bytes',
        '65536',
      ]);
      assert.equal(content.status, 0);
      assert.ok(Buffer.byteLength(content.stdout) <= 65_536);
      assert.match(JSON.parse(content.stdout).result.chunk.content, /Current project truth/u);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('continues validation through standalone bounded launcher pages', () => {
    const root = createProject();
    try {
      const contextDeclarations = [];
      for (let index = 1; index <= 256; index += 1) {
        const id = String(index).padStart(3, '0');
        const canonicalPath = `/moldea/context/section-${id}.md`;
        contextDeclarations.push(`  ${canonicalPath}: {}`);
        mkdirSync(join(root, 'moldea', 'context'), { recursive: true });
        writeFileSync(join(root, canonicalPath.slice(1)), `# Context section ${id}\n`);
      }
      writeFileSync(
        join(root, 'moldea', 'moldea.yaml'),
        `version: 1\n\ncontext:\n${contextDeclarations.join('\n')}\n`,
      );

      const records = [];
      let cursor;
      let pageCount = 0;
      do {
        const arguments_ = ['validate', '--json', '--max-output-bytes', '65536'];
        if (cursor !== undefined) arguments_.push('--cursor', cursor);
        const page = runCli(root, arguments_);
        assert.equal(page.status, 1, page.stderr || page.stdout);
        assert.ok(Buffer.byteLength(page.stdout) <= 65_536);
        const envelope = JSON.parse(page.stdout);
        assert.equal(envelope.schemaVersion, 4);
        assert.equal(envelope.command, 'validate');
        assert.equal(envelope.status, 'invalid');
        assert.equal(envelope.error, null);
        records.push(...envelope.result.page.records);
        cursor = envelope.result.page.cursor ?? undefined;
        pageCount += 1;
      } while (cursor !== undefined);

      assert.ok(pageCount > 1);
      assert.equal(records.length, 256);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('rejects unsupported launcher commands, arguments, and package declarations', () => {
    const root = createProject();
    try {
      const unsupportedCommand = runCli(root, ['unknown', '--json']);
      assert.equal(unsupportedCommand.status, 3);
      assert.match(unsupportedCommand.stderr, /not supported/u);
      assert.equal(unsupportedCommand.stdout, '');

      const unsupportedArgument = runCli(root, ['inspect', '--json', '--repository', root]);
      assert.equal(unsupportedArgument.status, 3);
      assert.match(unsupportedArgument.stderr, /unsupported or duplicate/iu);
      assert.equal(unsupportedArgument.stdout, '');

      const packageManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      packageManifest.devDependencies['@moldea.ai/cli'] = '^7.0.0';
      writeFileSync(join(root, 'package.json'), `${JSON.stringify(packageManifest, null, 2)}\n`);
      const unsupportedPackage = runCli(root, ['inspect', '--json', '--max-output-bytes', '65536']);
      assert.equal(unsupportedPackage.status, 3);
      assert.match(unsupportedPackage.stderr, /unsupported CLI package closure/u);
      assert.equal(unsupportedPackage.stdout, '');
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('rejects missing, malformed, prerelease, and escaped CLI closures', () => {
    const missingRoot = mkdtempSync(join(tmpdir(), 'moldea-v5-launcher-missing-'));
    const malformedRoot = createLauncherProject('process.exitCode = 0;\n');
    const prereleaseRoot = createLauncherProject('process.exitCode = 0;\n', {
      version: '8.0.0-beta.1',
    });
    const escapedRoot = createLauncherProject('process.exitCode = 0;\n');
    try {
      writeFileSync(
        join(missingRoot, 'package.json'),
        '{"private":true,"devDependencies":{"@moldea.ai/cli":"^8.0.0"}}\n',
      );
      writeFileSync(join(malformedRoot, 'node_modules', '@moldea.ai', 'cli', 'package.json'), '{');
      const escapedCliRoot = join(escapedRoot, 'escaped-cli');
      const installedCliRoot = join(escapedRoot, 'node_modules', '@moldea.ai', 'cli');
      mkdirSync(join(escapedCliRoot, 'dist'), { recursive: true });
      writeFileSync(
        join(escapedCliRoot, 'package.json'),
        '{"name":"@moldea.ai/cli","version":"8.0.0","bin":{"moldea":"./dist/moldea.js"},"dependencies":{"@moldea.ai/core":"^4.0.0"}}\n',
      );
      writeFileSync(join(escapedCliRoot, 'dist', 'moldea.js'), 'process.exitCode = 0;\n');
      rmSync(installedCliRoot, { force: true, recursive: true });
      symlinkSync(
        escapedCliRoot,
        installedCliRoot,
        process.platform === 'win32' ? 'junction' : 'dir',
      );

      for (const root of [missingRoot, malformedRoot, prereleaseRoot, escapedRoot]) {
        const result = runCli(root, ['inspect', '--json', '--max-output-bytes', '65536']);
        assert.equal(result.status, 3);
        assert.equal(result.stdout, '');
        assert.notEqual(result.stderr, '');
      }
      assert.match(
        runCli(escapedRoot, ['inspect', '--json', '--max-output-bytes', '65536']).stderr,
        /escaped repository dependencies/u,
      );
    } finally {
      for (const root of [missingRoot, malformedRoot, prereleaseRoot, escapedRoot]) {
        rmSync(root, { force: true, recursive: true });
      }
    }
  });

  test('preserves completed child status and enforces stdout and stderr boundaries', () => {
    const exitRoot = createLauncherProject(
      "const command = process.argv[2]; process.stdout.write('{}\\n'); process.exitCode = command === 'inspect' ? 1 : 2;\n",
    );
    const stdoutRoot = createLauncherProject("process.stdout.write('x'.repeat(4097));\n");
    const stderrRoot = createLauncherProject("process.stderr.write('x'.repeat(32769));\n");
    try {
      assert.equal(runCli(exitRoot, ['inspect', '--json', '--max-output-bytes', '4096']).status, 1);
      assert.equal(
        runCli(exitRoot, ['validate', '--json', '--max-output-bytes', '4096']).status,
        2,
      );
      for (const root of [stdoutRoot, stderrRoot]) {
        const result = runCli(root, ['inspect', '--json', '--max-output-bytes', '4096']);
        assert.equal(result.status, 3);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /output exceeded the launcher boundary/u);
      }
    } finally {
      for (const root of [exitRoot, stdoutRoot, stderrRoot]) {
        rmSync(root, { force: true, recursive: true });
      }
    }
  });

  test(
    'force-terminates a child that ignores the output-boundary signal',
    { skip: process.platform === 'win32', timeout: 8_000 },
    () => {
      const root = createLauncherProject(
        "process.on('SIGTERM', () => {}); process.stdout.write('x'.repeat(4097)); setInterval(() => {}, 1000);\n",
      );
      try {
        const result = runCli(root, ['inspect', '--json', '--max-output-bytes', '4096']);
        assert.equal(result.status, 3);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /output exceeded the launcher boundary/u);
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    },
  );

  test(
    'relays cancellation and returns a launcher failure without partial output',
    { skip: process.platform === 'win32' },
    async () => {
      const root = createLauncherProject(
        "import { writeFileSync } from 'node:fs'; writeFileSync('.child-ready', ''); setInterval(() => {}, 1000);\n",
      );
      try {
        const child = spawn(
          process.execPath,
          [
            CLI_LAUNCHER_PATH,
            '--repository',
            root,
            '--',
            'inspect',
            '--json',
            '--max-output-bytes',
            '4096',
          ],
          { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        const stdout = [];
        const stderr = [];
        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        await waitForPath(join(root, '.child-ready'));
        child.kill('SIGTERM');
        const exitCode = await new Promise((resolvePromise, rejectPromise) => {
          child.once('error', rejectPromise);
          child.once('close', resolvePromise);
        });

        assert.equal(exitCode, 3);
        assert.equal(Buffer.concat(stdout).toString('utf8'), '');
        assert.match(Buffer.concat(stderr).toString('utf8'), /terminated by SIGTERM/u);
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    },
  );

  test('gates exact relationships through one bounded scope result', () => {
    const root = createProject();
    try {
      const related = runCli(
        root,
        ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
        '/src/project-state.js\0',
      );
      const unrelated = runCli(
        root,
        ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
        '/src/unrelated.js\0',
      );
      assert.equal(JSON.parse(related.stdout).result.relevant, true);
      assert.equal(JSON.parse(unrelated.stdout).result.relevant, false);
      assert.ok(Buffer.byteLength(related.stdout) <= 65_536);
      assert.ok(Buffer.byteLength(unrelated.stdout) <= 65_536);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('continues large Unicode content through bounded schema-4 chunks', () => {
    const root = createProject();
    try {
      const largeContent = `# Large context\n\n${'bounded🙂content\n'.repeat(2048)}`;
      writeFileSync(join(root, 'moldea', 'project.md'), largeContent);
      const chunks = [];
      let cursor;
      let commandCount = 0;
      let outputByteCount = 0;

      do {
        const arguments_ = [
          'content',
          '--path',
          '/moldea/project.md',
          '--json',
          '--max-output-bytes',
          '4096',
        ];
        if (cursor !== undefined) arguments_.push('--cursor', cursor);
        const content = runCli(root, arguments_);
        assert.equal(content.status, 0);
        const pageByteCount = Buffer.byteLength(content.stdout);
        assert.ok(pageByteCount <= 4_096);
        outputByteCount += pageByteCount;
        const envelope = JSON.parse(content.stdout);
        assert.equal(envelope.schemaVersion, 4);
        assert.equal(envelope.status, 'valid');
        chunks.push(envelope.result.chunk.content);
        cursor = envelope.result.cursor ?? undefined;
        commandCount += 1;
      } while (cursor !== undefined);

      assert.equal(chunks.join(''), largeContent);
      assert.ok(commandCount > 1);
      assert.ok(commandCount <= 32);
      assert.ok(outputByteCount <= 262_144);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('keeps validate, inspect, scope, and content read-only at the Git boundary', () => {
    const root = createProject();
    try {
      const beforeStatus = spawnSync('git', ['status', '--porcelain=v2', '-z'], {
        cwd: root,
        encoding: 'utf8',
      }).stdout;
      const beforeObjects = readdirSync(join(root, '.git', 'objects'), {
        recursive: true,
      }).sort();

      for (const [arguments_, input] of [
        [['validate', '--json', '--max-output-bytes', '65536']],
        [['inspect', '--json', '--max-output-bytes', '65536']],
        [
          ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
          '/src/project-state.js\0',
        ],
        [['content', '--path', '/moldea/project.md', '--json', '--max-output-bytes', '65536']],
      ]) {
        const result = runCli(root, arguments_, input);
        assert.equal(result.status, 0, result.stderr || result.stdout);
      }

      const afterStatus = spawnSync('git', ['status', '--porcelain=v2', '-z'], {
        cwd: root,
        encoding: 'utf8',
      }).stdout;
      const afterObjects = readdirSync(join(root, '.git', 'objects'), {
        recursive: true,
      }).sort();
      assert.equal(afterStatus, beforeStatus);
      assert.deepEqual(afterObjects, beforeObjects);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('rejects malformed, mismatched, leaking, and over-budget envelopes in fixtures', () => {
    const expectedById = new Map(
      FIXTURE.cliEnvelopeCases.map(({ id, expected }) => [id, expected]),
    );
    assert.equal(expectedById.get('inspect-valid'), 'interpret-result');
    assert.equal(expectedById.get('scope-valid'), 'interpret-result');
    assert.equal(expectedById.get('content-valid'), 'interpret-result');
    for (const id of [
      'schema-mismatch',
      'version-mismatch',
      'command-mismatch',
      'status-exit-mismatch',
      'inspect-content-leak',
    ]) {
      assert.equal(expectedById.get(id), 'reject-envelope');
    }
    assert.equal(expectedById.get('invocation-too-large'), 'reject-output');
    assert.equal(expectedById.get('ordinary-aggregate-too-large'), 'stop-traversal');
  });
});
