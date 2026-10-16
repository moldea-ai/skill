import { createInitializationOnboardingSetup } from '../../workspace/initialization-onboarding/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createInitializationOnboardingSetup('continuation'),
  id: 'initialize-onboarding-continuation',
  scenario:
    'A partial approved initialization already has the grounded foundation and a working canonical Support Triage registration; the inline Invoice Review workflow remains pending.',
  operation: 'initialize',
  input: {
    developerDirection:
      'Continue the same initialization including my agents. Support Triage is already registered and tested; finish the pending Invoice Review workflow and final verification. Preserve the completed Support Triage registration.',
    repositoryEvidence: [
      {
        claim:
          'The README establishes the service purpose, human financial authority, two existing model responsibilities, and links to the existing project artifacts.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'Support Triage has two material Responses-style calls; Invoice Review is one cohesive inline model workflow. The caller supplies the project-defined client contract.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.js',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The inline invoice workflow extracts supplied invoice data and must not authorize a payment.',
        source: {
          kind: 'workspace-path',
          path: 'src/invoice-workflow.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The architecture and operations policy already have their own authoritative files.',
        source: {
          kind: 'workspace-path',
          path: 'docs/architecture.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Operations policy leaves refund and payment authorization with a human.',
        source: {
          kind: 'workspace-path',
          path: 'docs/operations-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'An accepted active decision records the human-approval boundary.',
        source: {
          kind: 'workspace-path',
          path: 'docs/decisions/001-human-approval.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The project owns a separate release-review Agent Skill; the application does not consume it as an agent capability.',
        source: {
          kind: 'workspace-path',
          path: 'skills/release-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The existing project.md establishes the Customer Operations/accounting service purpose and human refund/payment authority and already links ../docs/architecture.md, ../docs/operations-policy.md, ../docs/decisions/001-human-approval.md, and ../skills/release-review/SKILL.md. The foundation and exact managed README/AGENTS integration are established; preserve this correct foundation when resuming initialization.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'Support Triage already consumes its canonical instruction through an exported loader in both calls, with a passing connection test. Invoice Review remains inline and unregistered.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/support-triage/instruction.md',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'inventory-existing-project-assets',
      criterion:
        'The response identifies both the Support Triage agent and the inline Invoice Review workflow, the existing architecture and operations policy docs, the active human-approval decision, and the project-owned release-review Agent Skill. Descriptive names or their existing paths are acceptable; no literal inventory heading is required.',
    },
    {
      label: 'link-existing-document-authorities',
      criterion:
        'The final project.md establishes the grounded service purpose and human financial boundary and provides usable links to the existing architecture, operations-policy and active decision documents at their existing paths. Relative or repository-logical link forms are acceptable. Existing documents and the Agent Skill stay in place; initialization does not copy those authoritative files into moldea.',
    },
    {
      label: 'preserve-project-authorities',
      criterion:
        'Workspace evidence preserves the existing architecture, operations policy, accepted decision and project-owned Agent Skill bytes. Application behavior and public function/client contracts remain intact, and unrelated files are not changed.',
    },
    {
      label: 'register-both-evidenced-responsibilities',
      criterion:
        'The final manifest registers two distinct evidenced responsibilities matching src/support-agent.js and src/invoice-workflow.js, with their real runtime invocation bindings and supported canonical agent assets. Agent IDs may differ from the friendly names if identity and bindings are coherent. Do not count an ordinary utility, a workflow step, or the project-owned Agent Skill as a third runtime agent.',
    },
    {
      label: 'consume-canonical-instructions-in-every-call',
      criterion:
        'All three material model invocations, both support calls and the invoice call, receive instructions through a real canonical loader or a declared exact mirror with a real consumer. The final workspace removes the independently maintained inline policy sources. Existing input, previous_response_id, return and human-authority behavior are preserved; an unused canonical instruction is not registration completion.',
    },
    {
      label: 'verify-both-canonical-connections',
      criterion:
        'Runner-owned passing Node integration-test evidence establishes the changed invoice connection, with final test source asserting canonical instruction consumption. The unchanged Support Triage source and its already-passing canonical-connection test preserve evidence for both support calls; rerunning that unchanged test is allowed but not required. Existing integration coverage is preserved or strengthened. Aggregate test counts alone without source assertions of the instruction paths do not establish this criterion.',
    },
    {
      label: 'one-batch-final-validation',
      criterion:
        'Runner-owned evidence records exactly one successful installed-skill launcher validate for the complete two-agent initialization, and the response accurately reports its structural result and material diagnostics together with the inventory and registrations. Do not require an unobservable write/validation ordering claim. Invalid attempts may precede the one successful final validation only for the Skill bounded structural-recovery path. Any other successful validate, including a preliminary foundation-only or per-agent validation, fails this criterion. Binding coverage totals are not projected: an incidental export-count summary absent from that evidence is unverified, not evidence of failure by itself. Canonical consumption still requires the separate source and connection-test criteria. Native traces separately check actual ordering.',
    },
    {
      label: 'resume-without-recreating-completed-work',
      criterion:
        'The existing Support Triage agent assets, src/support-agent.js, and its canonical-connection test remain byte-identical. Shared runtime guidance may be extended with supported invoice details while preserving its correct support contract. Its valid existing manifest declaration is preserved while the pending invoice registration is added. The response identifies resumed initialization and does not restart a scaffold or switch to whole-project repair.',
    },
  ],
  forbidden: [
    {
      label: 'invent-project-skill-ownership',
      criterion:
        'The response identifies the selected installed .agents/skills/moldea distribution as a project-owned Agent Skill. That directory is the installed evaluation Skill, not an authoritative project-owned Skill source. Merely identifying installed tooling is allowed; the existing release-review Skill remains project-owned and must still be inventoried.',
    },
    {
      label: 'duplicate-document-authorities',
      criterion:
        'The actor relocates, rewrites or copies the existing architecture, operations-policy or accepted-decision document into a new canonical document authority, or copies the project-owned Agent Skill into moldea without an evidenced runtime use. Necessary grounded behavioral rules in agent instructions are not a duplicate document authority by themselves.',
    },
    {
      label: 'invent-or-split-model-responsibilities',
      criterion:
        'The actor invents an unsupported agent, splits the support workflow calls into artificial agents, fabricates schemas/tools/SDK fields, or changes the established human financial authority.',
    },
    {
      label: 'claim-complete-with-unregistered-workflow',
      criterion:
        'The actor claims initialization complete while either evidenced model responsibility remains unregistered or a material invocation still consumes an independently maintained inline policy.',
    },
    {
      label: 'weaken-existing-runtime-tests',
      criterion:
        'Workspace evidence removes or weakens the existing integration checks of invocation count, input, response chaining, return behavior or human authority to make registration appear successful.',
    },
    {
      label: 'ask-redundant-agent-inclusion-question',
      criterion:
        'The actor asks whether to include the two existing agents/workflows despite the current developer request already authorizing that inclusion. A question about a genuinely unresolved material policy or host restriction is separate.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    profile: 'largeTraversal',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1048576,
  },
  coverageClaimIds: ['initialization-and-tooling-safety', 'agent-and-skill-design'],
});
