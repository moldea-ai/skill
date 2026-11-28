import {
  checkCaseScope,
  hasCaseLink,
  prepareSemanticEvaluationHome,
  readCaseFile,
  readCaseImpactPaths,
  writeCaseFixture,
} from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const DISPATCH_GUIDE = 'docs/dispatch-procedure.md';
export const BULLETIN_GUIDE = 'docs/bulletin-policy.md';
export const DISPATCH_CODE = '/src/dispatch-window.js';
export const EDITORIAL_INSTRUCTION = '/skills/bulletin-review/SKILL.md';
export const BULLETIN_SOURCE = '/content/bulletins/spring.md';
const cutoff = /\b16:00\b|\b4(?::00)?\s*p\.?m\b/iu;
const publishedApproval =
  /\b(?:requires?|must|only|before|until)\b[^.\n]*\b(?:sign[- ]off|approv)/iu;

export const semanticCase = defineSemanticCase({
  id: 'initialize-with-human-guides',
  scenario:
    'A community food cooperative has a dispatch procedure, a bulletin policy, working software, a repository Skill and an authored bulletin source before moldea adoption.',
  operation: 'initialize-canonical-rules',
  input: {
    developerDirection: 'initialize moldea',
    followUpDeveloperRequests: ['Yes.', 'Stop here.'],
    repositoryEvidence: [
      {
        claim: 'The dispatch procedure has the currently stated cutoff.',
        source: {
          kind: 'workspace-path',
          path: 'docs/dispatch-procedure.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The bulletin policy describes the editor sign-off.',
        source: { kind: 'workspace-path', path: 'docs/bulletin-policy.md', expectedType: 'file' },
      },
      {
        claim: 'The repository has no moldea manifest.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'missing' },
      },
      {
        claim: 'The checked-in review Skill governs the review procedure.',
        source: {
          kind: 'workspace-path',
          path: 'skills/bulletin-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The spring bulletin is authored source.',
        source: {
          kind: 'workspace-path',
          path: 'content/bulletins/spring.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The dispatch window is implemented in code.',
        source: { kind: 'workspace-path', path: 'src/dispatch-window.js', expectedType: 'file' },
      },
    ],
  },
  setup: async ({ actorToolDirectory, repositoryPath, sandboxHome }) => {
    await writeCaseFixture(repositoryPath, {
      'README.md':
        '# Elm Crossing Food Cooperative\n\nVolunteers pack member orders and distribute a community bulletin. Start with the [dispatch procedure](docs/dispatch-procedure.md) or the [bulletin policy](docs/bulletin-policy.md).\n',
      [DISPATCH_GUIDE]:
        '# Dispatch procedure\n\nClose same-day dispatch at 16:00 local time. Use the packing list to sort orders into collection and delivery. Report a missed collection in the shift notes.\n',
      [BULLETIN_GUIDE]:
        '# Bulletin policy\n\nPublication requires sign-off from the bulletin editor. Use the checklist to compile questions into one message for the editor. Record the approved edition in the issue log.\n',
      [DISPATCH_CODE.slice(1)]:
        'export const acceptsSameDayDispatch = (localHour) => localHour < 16;\n',
      [EDITORIAL_INSTRUCTION.slice(1)]:
        '---\nname: bulletin-review\ndescription: Review an Elm Crossing bulletin draft and prepare the editor’s review notes.\n---\n\n# Bulletin review\n\nRead the draft and its supplied notes. Collect unresolved dates and contacts for the editor. When editor sign-off is missing, leave the issue’s release status pending.\n',
      [BULLETIN_SOURCE.slice(1)]:
        '# Elm Crossing Spring Bulletin\n\nMember collection is moving to the courtyard during the spring repair. Contact the member desk for access changes.\n',
    });
    return {
      readOnlyToolMounts: await prepareSemanticEvaluationHome(sandboxHome, actorToolDirectory),
    };
  },
  verifyWorkspace: ({ repositoryPath, requestIndex, snapshot }) => {
    const entries = readCaseImpactPaths(snapshot);
    const dispatchGuide = readCaseFile(snapshot, DISPATCH_GUIDE);
    const bulletinGuide = readCaseFile(snapshot, BULLETIN_GUIDE);
    if (requestIndex === 0) {
      return [
        {
          id: 'human-rules-unaltered-before-confirmation',
          passed: cutoff.test(dispatchGuide) && publishedApproval.test(bulletinGuide),
        },
      ];
    }
    const dispatch = checkCaseScope(repositoryPath, DISPATCH_CODE);
    const bulletin = checkCaseScope(repositoryPath, BULLETIN_SOURCE);
    const skill = checkCaseScope(repositoryPath, EDITORIAL_INSTRUCTION);
    const dispatchOwner = dispatch?.records[0]?.path.slice(1);
    const bulletinOwner = bulletin?.records[0]?.path.slice(1);
    const validOwners =
      dispatchOwner !== undefined &&
      bulletinOwner !== undefined &&
      dispatchOwner !== bulletinOwner &&
      [dispatchOwner, bulletinOwner].every((owner) => owner.startsWith('moldea/context/')) &&
      dispatch?.records.length === 1 &&
      bulletin?.records.length === 1;
    const project = readCaseFile(snapshot, 'moldea/project.md');
    return [
      {
        id: 'focused-canonical-rules-linked-and-routed',
        passed:
          validOwners &&
          cutoff.test(readCaseFile(snapshot, dispatchOwner)) &&
          /(?:approv|sign[- ]off)/iu.test(readCaseFile(snapshot, bulletinOwner)) &&
          hasCaseLink(dispatchGuide, DISPATCH_GUIDE, dispatchOwner) &&
          hasCaseLink(bulletinGuide, BULLETIN_GUIDE, bulletinOwner) &&
          hasCaseLink(readCaseFile(snapshot, dispatchOwner), dispatchOwner, DISPATCH_GUIDE) &&
          hasCaseLink(readCaseFile(snapshot, bulletinOwner), bulletinOwner, BULLETIN_GUIDE) &&
          hasCaseLink(project, 'moldea/project.md', dispatchOwner) &&
          hasCaseLink(project, 'moldea/project.md', bulletinOwner),
      },
      {
        id: 'source-doc-statements-replaced',
        passed:
          !cutoff.test(dispatchGuide) &&
          !publishedApproval.test(bulletinGuide) &&
          dispatchGuide.includes('packing list') &&
          bulletinGuide.includes('checklist'),
      },
      {
        id: 'eligible-relationships-only',
        passed:
          validOwners &&
          skill?.records.some(({ path }) => path === '/' + bulletinOwner) === true &&
          [DISPATCH_GUIDE, BULLETIN_GUIDE].every(
            (guide) => checkCaseScope(repositoryPath, '/' + guide)?.relevant === false,
          ) &&
          [...entries.values()]
            .flat()
            .every((path) =>
              [DISPATCH_CODE, EDITORIAL_INSTRUCTION, BULLETIN_SOURCE].includes(path),
            ),
      },
    ];
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1_048_576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'propose-grounded-init-round',
      criterion:
        'The first request inspects the source evidence and proposes distinct owners for dispatch and bulletin policy and the human-doc rule moves. It leaves unconfirmed rule statements unchanged. A grounded foundation is allowed.',
    },
    {
      label: 'apply-confirmed-rule-moves',
      criterion:
        'After Yes, write the effective same-day cutoff and editor sign-off policy into their respective focused canonical contexts. Link each from project.md. Replace the previous rule statements in the human procedure and policy with valid links to their owners and retain their supporting procedures. Each owner links the corresponding human guide.',
    },
    {
      label: 'verify-only-eligible-relationships',
      criterion:
        'Relate the cutoff implementation, the project-owned bulletin review Skill and the authoritative bulletin source to the owners they affect. Neither human doc is selected by Scope. Per-cycle workspace checks pass and the actor runs a successful bundled Validate after its last write and by the end of the Stop request.',
    },
  ],
  forbidden: [
    {
      label: 'unconfirmed-or-duplicated-authority',
      criterion:
        'The actor moves a rule before confirmation, keeps a second rule statement in a guide after the move, relates a human doc as an impact path, changes application behavior, or changes Git controls.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'context-maintenance-and-compression'],
});
