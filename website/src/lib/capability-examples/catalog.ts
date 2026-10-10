import { BOOKING_EXAMPLE } from '../booking-example/index.ts';
import {
  getLandingExampleFile,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_HERO_SOURCES,
  LANDING_EXAMPLE_INITIAL_FILES,
  LANDING_EXAMPLE_PREVIEW,
} from '../landing-example/index.ts';

import type { ICapabilityCategory } from './types.ts';

// canonical public explanations; repeated links retain one owner
const SOURCES = {
  foundation: { href: '/docs/project-state/', label: 'Project state' },
  format: { href: '/docs/repository-format/', label: 'Repository format' },
  planning: { href: '/docs/planning-agent-systems/', label: 'Agent-system planning' },
  agents: { href: '/docs/designing-agents/', label: 'Agent design' },
  skills: { href: '/docs/designing-skills/', label: 'Skill design' },
  maintenance: { href: '/docs/continuous-maintenance/', label: 'Continuous maintenance' },
  repair: { href: '/docs/evaluate-reconcile-validate/#repair-a-project', label: 'Repair guidance' },
  validation: { href: '/examples/validate-structure/', label: 'Validation example' },
  compatibility: {
    href: '/docs/compatibility-and-local-tooling/',
    label: 'Compatibility and local tooling',
  },
  support: { href: '/examples/create-a-support-agent/', label: 'Support-agent example' },
  refund: { href: '/examples/maintain-a-refund-policy/', label: 'Refund-policy example' },
  repositories: { href: '/examples/dedicated-repositories/', label: 'Dedicated repositories' },
  booking: { href: '/how-it-works/', label: 'Booking workflow' },
};

// requests and outcomes are illustrative; source excerpts reuse the executable website fixtures
export const CAPABILITY_CATEGORIES: ICapabilityCategory[] = [
  {
    id: 'project-truth',
    label: 'Establish project truth',
    title: 'Give every session the same starting point.',
    description:
      'Save established purpose, boundaries, and decisions beside the code. Start with an ordinary project and add focused context when it earns its place.',
    guide: SOURCES.foundation,
    examples: [
      {
        id: 'initialize-without-agents',
        title: 'Start with a project, before any agents',
        request: 'Initialize moldea for this backend. We do not have runtime agents.',
        outcome:
          'Record the real project purpose, a version-1 manifest, and the managed README awareness block. Add no speculative agent.',
        boundary:
          'Initialization needs explicit intent and enough established project information. Empty folders and invented policy do not complete the foundation.',
        source: SOURCES.foundation,
        visual: {
          kind: 'source',
          path: '/moldea/moldea.yaml',
          language: 'yaml',
          source: 'version: 1',
          caption:
            'The complete minimal manifest. Project purpose belongs in project.md; the README block makes the installed skill discoverable.',
        },
      },
      {
        id: 'record-api-ownership',
        title: 'Make API ownership easy to recover',
        request: 'Save which part of the backend owns order status and refund eligibility.',
        outcome:
          'Keep the established backend responsibilities in concise project context so later coding sessions start from the same boundary.',
        boundary:
          'Context records the actual architecture. It does not move code or grant the agent permission to change orders.',
        source: SOURCES.support,
        visual: {
          kind: 'source',
          path: LANDING_EXAMPLE.paths.project,
          language: 'markdown',
          source: getLandingExampleFile(
            LANDING_EXAMPLE_HERO_SOURCES,
            LANDING_EXAMPLE.paths.project,
          ),
          caption: 'Current project context from the executable Trailside support example.',
        },
      },
      {
        id: 'preserve-permissions',
        title: 'Keep explanation and approval separate',
        request:
          'Our support agent can explain refunds, but only the application can decide eligibility.',
        outcome:
          'Save that permission boundary and keep the instruction aligned with the application-owned refund rule.',
        boundary:
          'Instructions communicate the boundary. Server-side authorization and deterministic policy still enforce it.',
        source: SOURCES.support,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Application', detail: 'Calculates refund eligibility.' },
            { title: 'Support agent', detail: 'Explains the decision and looks up an order.' },
            {
              title: 'Permission boundary',
              detail: 'The agent cannot approve refunds or change orders.',
            },
          ],
          caption:
            'The responsibilities already established by the Trailside fixture. Its custom tool dispatch remains unverified by static inspection.',
        },
      },
      {
        id: 'record-unresolved-decision',
        title: 'Preserve a decision that still needs an owner',
        request: 'We have not approved the retention window. Keep that uncertainty visible.',
        outcome:
          'Record a material unresolved requirement with a clear resolution condition and ask for the missing policy before implementing it.',
        boundary:
          'An unresolved requirement describes a current gap. It does not invent a default, fabricate a future file, or become a general backlog.',
        source: SOURCES.format,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Established', detail: 'Retention affects the current service.' },
            { title: 'Unresolved', detail: 'The permitted number of days is not approved.' },
            {
              title: 'Resolution',
              detail: 'Obtain the policy, then align context and implementation.',
            },
          ],
          caption: 'A policy gap remains explicit until its resolution criteria are satisfied.',
        },
      },
      {
        id: 'map-focused-context',
        title: 'Connect one policy to the code it governs',
        request: 'Use the support policy when working on the support service.',
        outcome:
          'Declare the existing policy and its coherent implementation subtree so relevant work can find that context.',
        boundary:
          'A matching path selects evidence for review. It does not require a context edit when the saved policy is already correct.',
        source: SOURCES.format,
        visual: {
          kind: 'source',
          path: '/moldea/moldea.yaml',
          language: 'yaml',
          source: `context:
  /moldea/context/support-policy.md:
    affectedBy:
      - /src/support/**`,
          caption:
            'Manifest excerpt. A subtree uses a glob; a bare directory is not an exact-file reference.',
        },
      },
      {
        id: 'save-retention-policy',
        title: 'Turn an approved retention rule into durable context',
        request: 'The approved retention window is 30 days. Keep the cleanup job aligned with it.',
        outcome:
          'Save the approved rule with its owner, follow the cleanup relationship, and update implementation or tests only where their behavior differs.',
        boundary:
          'A supplied proposal or temporary preference is not established policy. Clarify consequential uncertainty before writing.',
        source: SOURCES.maintenance,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Approved policy', detail: 'Retain records for 30 days.' },
            { title: 'Cleanup job', detail: 'Apply the same boundary in deterministic code.' },
            { title: 'Boundary test', detail: 'Verify records on either side of the cutoff.' },
          ],
          caption:
            'One approved fact, with separate context, implementation, and verification owners.',
        },
      },
      {
        id: 'coordinate-repository-context',
        title: 'Work with a dedicated context repository',
        request: 'The project context and application live in separate repositories. Review both.',
        outcome:
          'Inspect each authorized repository, explain the relationship, and verify each change independently.',
        boundary:
          'Version 1 bindings stay inside their owning repository. Coordinated work does not create cross-repository paths or a Git-atomic change.',
        source: SOURCES.repositories,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Context repository',
              detail: 'Owns project truth and project-local runtime guidance.',
            },
            {
              title: 'Application repository',
              detail: 'Owns the running implementation and its tests.',
            },
            {
              title: 'Coordination',
              detail: 'Each repository keeps its own authorization and verification.',
            },
          ],
          caption: 'Two repository boundaries remain visible throughout the work.',
        },
      },
      {
        id: 'recover-interrupted-foundation',
        title: 'Recover an interrupted initialization',
        request: 'Initialization stopped after writing part of the foundation. Fix moldea.',
        outcome:
          'Establish prior initialization, preserve existing content, and restore only the missing or damaged owned foundation surfaces.',
        boundary:
          'Missing purpose, ambiguous README markers, or unproven prior adoption needs direction. Repair does not silently initialize a new project.',
        source: SOURCES.repair,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Inspect inert evidence',
              detail: 'Read the foundation and managed README markers.',
            },
            { title: 'Establish recovery', detail: 'Identify what initialization already owned.' },
            { title: 'Restore and verify', detail: 'Use the managed writer and final validation.' },
          ],
          caption:
            'Recovery preserves unrelated README content and stops when ownership is uncertain.',
        },
      },
    ],
  },
  {
    id: 'plan-agent-systems',
    label: 'Plan agent systems',
    title: 'Put each responsibility where it belongs.',
    description:
      'Start from the outcome. Separate predictable rules, tools, model judgment, state, and human control before deciding how many agents you need.',
    guide: SOURCES.planning,
    examples: [
      {
        id: 'prefer-deterministic-rules',
        title: 'Keep a predictable rule in ordinary code',
        request: 'Do we need an agent to decide whether a booking can be confirmed?',
        outcome:
          'Keep availability and same-day approval state in the scheduling service. Use an assistant only where explanation or judgment adds value.',
        boundary:
          'Planning is read-only and may recommend zero agents. It does not replace a deterministic rule with a model.',
        source: SOURCES.booking,
        visual: {
          kind: 'source',
          path: BOOKING_EXAMPLE.files.service.path,
          language: 'typescript',
          source: BOOKING_EXAMPLE.serviceExcerpt,
          caption:
            'The executable booking fixture makes the confirmation decision in application code.',
        },
      },
      {
        id: 'plan-one-support-agent',
        title: 'Give one support agent a bounded job',
        request: 'Plan a support assistant for order questions and return-policy explanations.',
        outcome:
          'Define one customer-facing responsibility with validated input, structured output, a read-only lookup, and an application-owned policy boundary.',
        boundary:
          'A useful plan establishes permissions, failures, and state ownership before creating runtime artifacts.',
        source: SOURCES.planning,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Input', detail: 'Customer message and an optional order identifier.' },
            { title: 'Capability', detail: 'Look up an order and explain established policy.' },
            { title: 'Output', detail: 'A bounded support reply; no refund approval.' },
          ],
          caption: 'The same responsibility used by the Trailside implementation.',
        },
      },
      {
        id: 'plan-triage-and-specialist',
        title: 'Split triage from a specialist only when it helps',
        request: 'Compare one support agent with triage plus a billing specialist.',
        outcome:
          'Explain whether the specialist has a distinct responsibility, input, permissions, and handoff contract that justify the extra boundary.',
        boundary:
          'More agents add routing and failure cases. The plan can retain one agent when separation earns no practical benefit.',
        source: SOURCES.planning,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Triage', detail: 'Classify the request and choose a destination.' },
            {
              title: 'Billing specialist',
              detail: 'Receive the relevant facts with bounded permissions.',
            },
            { title: 'Application', detail: 'Own customer state and consequential mutations.' },
          ],
          caption: 'An illustrative decomposition to evaluate before choosing an implementation.',
        },
      },
      {
        id: 'plan-human-approval',
        title: 'Make human approval an explicit state',
        request: 'Same-day bookings need staff approval. The assistant must not confirm them.',
        outcome:
          'Plan the service state, staff decision, and assistant response together so a pending request stays pending.',
        boundary:
          'A model statement cannot grant approval. The service owns the transition to a confirmed booking.',
        source: SOURCES.booking,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Available today: 10:00',
              detail: 'The availability tool returns an actual slot.',
            },
            { title: 'pending_staff_approval', detail: 'The service requires a staff decision.' },
            {
              title: 'Customer explanation',
              detail: 'The assistant says the request is waiting for staff.',
            },
          ],
          caption: 'One of the booking fixture scenarios, with its actual application result.',
        },
      },
      {
        id: 'choose-tool-or-agent',
        title: 'Choose a tool for a bounded operation',
        request: 'Should order lookup be a separate agent or a tool?',
        outcome:
          'Use a deterministic lookup capability when the job is to retrieve one verified order. Keep interpretation with the support agent.',
        boundary:
          'A tool needs a real implementation and an accurate contract. A plausible name alone establishes no capability.',
        source: SOURCES.planning,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Tool', detail: 'Retrieve an order by identifier.' },
            { title: 'Agent', detail: 'Use the result to answer the customer.' },
            { title: 'Application', detail: 'Enforce ownership and mutation permissions.' },
          ],
          caption: 'Choose the boundary from the work it owns.',
        },
      },
      {
        id: 'plan-handoff-contracts',
        title: 'Define what crosses a handoff',
        request: 'Plan how triage hands a refund question to the returns agent.',
        outcome:
          'Specify the destination, transfer conditions, input facts, permission boundary, and behavior when transfer fails.',
        boundary:
          'Handoff registration stays runtime-native. Version 1 has no invented manifest handoffs field.',
        source: SOURCES.agents,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Transfer condition',
              detail: 'The request requires the returns responsibility.',
            },
            { title: 'Transferred context', detail: 'Only the facts the destination needs.' },
            { title: 'Destination', detail: 'A real registered agent with its own instructions.' },
          ],
          caption:
            'Routing descriptions explain when to transfer; instructions explain what to do after transfer.',
        },
      },
      {
        id: 'plan-retry-state-ownership',
        title: 'Assign retry and durable-state ownership',
        request: 'Plan what happens if a booking request is retried after a timeout.',
        outcome:
          'Keep durable booking state and duplicate protection in the application. Define how the assistant reports uncertain completion.',
        boundary:
          'An agent instruction cannot establish exactly-once persistence. The plan must identify the service guarantees and real failure behavior.',
        source: SOURCES.planning,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Request', detail: 'The application establishes operation identity.' },
            { title: 'Service', detail: 'Own persistence, duplicate handling, and recovery.' },
            {
              title: 'Assistant',
              detail: 'Explain the authoritative result or remaining uncertainty.',
            },
          ],
          caption: 'State ownership stays explicit before any implementation is proposed.',
        },
      },
      {
        id: 'choose-runtime-fit',
        title: 'Select a runtime from the integration you need',
        request: 'Compare a direct provider call, an agent SDK, and our custom wrapper.',
        outcome:
          'Identify the highest verified integration boundary, its supported target, and the project guidance needed for deviations.',
        boundary:
          'A supported runtime does not prove every source pattern. Preserve intentional custom designs and report evidence limits.',
        source: SOURCES.compatibility,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Direct provider call',
              detail: 'Provider request construction is the boundary.',
            },
            {
              title: 'Agent SDK',
              detail: 'Agent construction and native handoffs are the boundary.',
            },
            {
              title: 'Custom integration',
              detail: 'Explicit relationships and project guidance explain the design.',
            },
          ],
          caption:
            'Runtime selection follows repository evidence rather than a preferred coding style.',
        },
      },
    ],
  },
  {
    id: 'create-agents',
    label: 'Create agents',
    title: 'Build an agent from real project boundaries.',
    description:
      'Connect one responsibility to canonical instructions, executable contracts, real capabilities, and the runtime that actually receives them.',
    guide: SOURCES.agents,
    examples: [
      {
        id: 'write-canonical-policy',
        title: 'Give the agent one canonical instruction',
        request: 'Create support instructions from our existing refund policy.',
        outcome:
          'Describe the agent responsibility and derive its behavior from approved context without moving the application-owned eligibility decision.',
        boundary:
          'A saved instruction becomes runtime evidence only when the implementation actually consumes it.',
        source: SOURCES.support,
        visual: {
          kind: 'source',
          path: LANDING_EXAMPLE.paths.instruction,
          language: 'markdown',
          source: getLandingExampleFile(
            LANDING_EXAMPLE_INITIAL_FILES,
            LANDING_EXAMPLE.paths.instruction,
          ),
          caption: 'Canonical instructions from the executable support fixture.',
        },
      },
      {
        id: 'wire-direct-instruction-loader',
        title: 'Read that instruction at the runtime boundary',
        request: 'Make every support request use the canonical instruction.',
        outcome:
          'Connect the real loader to each material model invocation, including continuation requests.',
        boundary:
          'A declared loader or one correct call does not repair another call that still supplies inline instructions.',
        source: SOURCES.support,
        visual: {
          kind: 'source',
          path: LANDING_EXAMPLE.paths.instructionLoader,
          language: 'typescript',
          source: getLandingExampleFile(
            LANDING_EXAMPLE_INITIAL_FILES,
            LANDING_EXAMPLE.paths.instructionLoader,
          ),
          caption:
            'The source-backed direct UTF-8 loader. The fixture uses it on both provider calls.',
        },
      },
      {
        id: 'connect-structured-output',
        title: 'Connect executable input and output contracts',
        request: 'Validate support input and return a structured reply.',
        outcome:
          'Use the real schemas at their application and provider boundaries, then declare those relationships when they apply.',
        boundary:
          'A schema export alone does not prove the runtime uses it. Behavioral tests still verify the application flow.',
        source: SOURCES.support,
        visual: {
          kind: 'source',
          path: LANDING_EXAMPLE.paths.contracts,
          language: 'typescript',
          source: getLandingExampleFile(
            LANDING_EXAMPLE_HERO_SOURCES,
            LANDING_EXAMPLE.paths.contracts,
          ),
          caption:
            'Current schema excerpts. The fixture validates input before serialization and passes the output schema to the provider helper.',
        },
      },
      {
        id: 'connect-tool-and-schema',
        title: 'Connect the implementation, registration, and tool contract',
        request: 'Give the support agent our existing order lookup with its real input contract.',
        outcome:
          'Keep the local implementation, runtime name, registration, and parameters aligned with the request that receives the tool.',
        boundary:
          'A registered name or a matching file does not prove every relationship. Unsupported or mutated schema wiring can remain unverified.',
        source: SOURCES.format,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'lookupOrder', detail: 'The repository-local function retrieves the order.' },
            {
              title: 'lookupOrderTool',
              detail: 'Registration exposes lookup_order and an orderId parameter.',
            },
            {
              title: 'Provider request',
              detail: 'The tools array receives that actual registration.',
            },
          ],
          caption: 'Three separate relationships from the executable Trailside fixture.',
        },
      },
      {
        id: 'reuse-project-local-client',
        title: 'Keep the project-owned client and configuration',
        request: 'Create the agent using the client and SDK version this repository already uses.',
        outcome:
          'Inspect the established client boundary, imports, runtime target, and existing configuration before wiring the agent.',
        boundary:
          'Agent creation does not authorize broad SDK upgrades or exposing credentials in context, examples, or instructions.',
        source: SOURCES.agents,
        visual: {
          kind: 'source',
          path: LANDING_EXAMPLE.paths.agent,
          language: 'typescript',
          source: getLandingExampleFile(LANDING_EXAMPLE_HERO_SOURCES, LANDING_EXAMPLE.paths.agent),
          caption:
            'The actual fixture request. The application supplies client configuration; no credential values enter the example.',
        },
      },
      {
        id: 'declare-runtime-variables',
        title: 'Describe runtime variables without saving their values',
        request: 'The agent needs the current UTC time on each invocation.',
        outcome:
          'Declare CURRENT_DATETIME and connect its real provider. Supply the transient value at the runtime boundary.',
        boundary:
          'Version 1 records variable meaning and provider relationships, without persisting secret values or inventing default/type fields.',
        source: SOURCES.format,
        visual: {
          kind: 'source',
          path: '/moldea/moldea.yaml',
          language: 'yaml',
          source: `variables:
  CURRENT_DATETIME:
    description: Current UTC date and time.
bindings:
  variableProviders:
    CURRENT_DATETIME:
      path: /src/runtime-context.ts
      symbol: getCurrentDatetime`,
          caption:
            'Agent-entry excerpt. Both the declaration and provider must describe the actual integration.',
        },
      },
      {
        id: 'maintain-required-instruction-mirror',
        title: 'Create an exact mirror only when the runtime needs one',
        request: 'This runtime requires its instruction at a different tracked file path.',
        outcome:
          'Declare the outside-canonical destination as a derived mirror and synchronize it with the canonical instruction in the same change.',
        boundary:
          'A mirror is a regular tracked file, with equal normalized text. Templates, transformed output, and symlinks are different artifacts.',
        source: SOURCES.format,
        visual: {
          kind: 'flow',
          steps: [
            { title: '/moldea/agents/support/instruction.md', detail: 'Owns the instruction.' },
            {
              title: '/apps/runtime/support.md',
              detail: 'Contains the required exact derived copy.',
            },
            {
              title: 'Validation',
              detail: 'Checks equality after BOM and line-ending normalization.',
            },
          ],
          caption: 'A direct canonical read needs no unnecessary mirror.',
        },
      },
      {
        id: 'preserve-custom-loader-design',
        title: 'Keep an intentional custom integration',
        request: 'Our loader uses internal wrappers. Review it without rewriting the architecture.',
        outcome:
          'Inspect the declared relationships and project-local runtime guidance. Correct demonstrated defects and preserve an accurate intentional design.',
        boundary:
          'A scoped unverified warning identifies missing deterministic proof. It is not a requirement to adopt a different coding pattern.',
        source: SOURCES.compatibility,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Declared relationship',
              detail: 'The manifest names the actual implementation.',
            },
            { title: 'Adapter evidence', detail: 'Some source patterns remain unverified.' },
            {
              title: 'Coding-agent review',
              detail: 'Use implementation and guidance to assess the relationship.',
            },
          ],
          caption: 'Validity and runtime-inspection completion are reported separately.',
        },
      },
    ],
  },
  {
    id: 'build-agent-skills',
    label: 'Build Agent Skills',
    title: 'Package a repeatable workflow, not just a prompt.',
    description:
      'Give reusable coding-agent work precise activation, focused guidance, and real supporting resources. Keep the skill in its established native location.',
    guide: SOURCES.skills,
    examples: [
      {
        id: 'define-skill-activation',
        title: 'Make activation specific to the work',
        request:
          'Create a release-review skill that activates for release checks, not ordinary code review.',
        outcome:
          'Write a portable description that names the workflow and concrete triggers, then review positive and adjacent requests.',
        boundary:
          'Valid frontmatter cannot prove selective activation or complete behavior. Host metadata supplements the portable description.',
        source: SOURCES.skills,
        visual: {
          kind: 'source',
          path: '/.agents/skills/release-review/SKILL.md',
          language: 'markdown',
          source:
            '---\nname: release-review\ndescription: Review release candidates against the repository release policy and existing verifier. Use for release readiness and release-check requests.\n---',
          caption:
            'Illustrative frontmatter. The workflow still needs its real operating guidance and resources.',
        },
      },
      {
        id: 'disclose-focused-references',
        title: 'Load the relevant reference when it is needed',
        request:
          'Keep release policy details out of the skill entrypoint until a release review needs them.',
        outcome:
          'Keep the universal workflow concise and link directly to the focused reference that owns the details.',
        boundary:
          'References must resolve and remain aligned with the workflow. Deep chains and duplicated policy increase context and maintenance cost.',
        source: SOURCES.skills,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'SKILL.md',
              detail: 'Routes the coding agent to the release-review workflow.',
            },
            {
              title: 'references/release-policy.md',
              detail: 'Loads the policy details for that operation.',
            },
            {
              title: 'Existing verifier',
              detail: 'Provides the deterministic check the workflow requires.',
            },
          ],
          caption: 'Progressive disclosure gives each piece one purpose.',
        },
      },
      {
        id: 'delegate-to-skill-script',
        title: 'Delegate a deterministic check to a real script',
        request:
          'Have the skill run our existing release verifier instead of recreating its checks.',
        outcome:
          'Document the verifier’s actual inputs, outputs, side effects, dependencies, and exit behavior, then exercise meaningful success and failure cases.',
        boundary:
          'Linking a script grants no execution authority. Trust restrictions and the repository workflow still apply.',
        source: SOURCES.skills,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Skill procedure', detail: 'Establish the permitted release-review scope.' },
            { title: 'scripts/verify.mjs', detail: 'Run the established deterministic interface.' },
            {
              title: 'Verification result',
              detail: 'Report the real result and any incomplete checks.',
            },
          ],
          caption: 'The model interprets evidence; the script owns the deterministic calculation.',
        },
      },
      {
        id: 'use-skill-assets',
        title: 'Keep an output template in assets',
        request: 'Use our approved release-note template when preparing release notes.',
        outcome:
          'Store the reusable template as an asset and load or copy it only when the authorized workflow needs it.',
        boundary:
          'An asset does not establish product facts, release availability, or permission to publish.',
        source: SOURCES.skills,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'assets/release-notes.md', detail: 'Owns the approved output structure.' },
            {
              title: 'Verified release facts',
              detail: 'Supply the actual changes and limitations.',
            },
            {
              title: 'Draft release notes',
              detail: 'Remain reviewable before any publication action.',
            },
          ],
          caption: 'Output resources can stay outside model context until they are useful.',
        },
      },
      {
        id: 'trace-skill-consumers',
        title: 'Follow the skill to its real consumers',
        request: 'Update the release-review workflow and keep its installed copies aligned.',
        outcome:
          'Trace source, references, scripts, host metadata, installed copies, and actual consumers, then update only affected authorized surfaces.',
        boundary:
          'A copied directory or mention in an instruction does not prove runtime registration. Other repositories retain separate authority.',
        source: SOURCES.skills,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Authoritative skill',
              detail: 'Owns portable purpose and operating guidance.',
            },
            {
              title: 'Distribution and installation',
              detail: 'Preserve the complete artifact and its identity.',
            },
            {
              title: 'Actual consumer',
              detail: 'Receives the skill through the established host or runtime integration.',
            },
          ],
          caption: 'Complete artifacts stay distinct from evidence about who uses them.',
        },
      },
      {
        id: 'choose-agent-or-skill',
        title: 'Choose between runtime instructions and a coding-agent skill',
        request: 'Where should the support policy and release-review procedure live?',
        outcome:
          'Keep support behavior with the runtime agent, project policy in its canonical owner, and the repeatable development procedure in a skill.',
        boundary:
          'The surrounding repository does not turn every artifact-only skill edit into a canonical project change.',
        source: SOURCES.skills,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Project context', detail: 'Established policy and architecture.' },
            {
              title: 'Agent instruction',
              detail: 'Behavior after the runtime agent receives responsibility.',
            },
            { title: 'Agent Skill', detail: 'A reusable coding-agent workflow and its resources.' },
          ],
          caption: 'Choose the owner from the behavior being changed.',
        },
      },
      {
        id: 'verify-skill-implementation-export',
        title: 'Check a declared implementation export',
        request: 'The skill relationship points to releaseReviewSkill. Check that implementation.',
        outcome:
          'Follow the exact repository-local file and declared symbol, then assess its real capability and registration against the selected runtime.',
        boundary:
          'An existing file does not establish the named export or prove that a runtime consumes the implementation.',
        source: SOURCES.format,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Implementation binding',
              detail: 'Names the real local artifact and, when applicable, its symbol.',
            },
            {
              title: 'Export evidence',
              detail: 'Establishes whether the declared symbol is present.',
            },
            {
              title: 'Registration relationship',
              detail: 'Separately establishes how the runtime receives the capability.',
            },
          ],
          caption: 'Implementation and registration are separate pieces of evidence.',
        },
      },
      {
        id: 'review-unsupported-skill-registration',
        title: 'Report unsupported registration without inventing a fix',
        request:
          'Our runtime loads this skill through a custom registry. Evaluate that relationship.',
        outcome:
          'Report the scoped evidence limit and review the actual registry with project guidance. Correct a declaration only when evidence establishes the defect.',
        boundary:
          'An unverified warning can leave a project valid while runtime inspection remains incomplete. Preserve an intentional supported project design.',
        source: SOURCES.compatibility,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Local implementation', detail: 'The declared artifact exists.' },
            {
              title: 'Custom registration',
              detail: 'The adapter cannot establish the complete relationship.',
            },
            { title: 'Reported limit', detail: 'The relationship remains unverified for review.' },
          ],
          caption:
            'A warning communicates uncertainty rather than a universal coding prescription.',
        },
      },
    ],
  },
  {
    id: 'keep-behavior-current',
    label: 'Keep behavior current',
    title: 'Change one rule. Follow every connection.',
    description:
      'Follow established relationships from a changed fact to affected context, instructions, implementation, tests, and consumers. Leave accurate surfaces alone.',
    guide: SOURCES.maintenance,
    examples: [
      {
        id: 'maintain-refund-policy',
        title: 'Shorten the refund window coherently',
        request: LANDING_EXAMPLE.maintenanceRequest,
        outcome:
          'Align the approved policy, agent instruction, deterministic rule, and boundary tests with the 14-day window.',
        boundary:
          'The application continues to decide eligibility. Editing the instruction alone would leave contradictory behavior.',
        source: SOURCES.refund,
        visual: {
          kind: 'diff',
          ...LANDING_EXAMPLE_PREVIEW.contextDiff,
          language: 'markdown',
          caption:
            'A source-derived policy change from the executable 30-day and 14-day snapshots.',
        },
      },
      {
        id: 'maintain-tool-contract',
        title: 'Follow a tool-contract change to its callers',
        request: 'Order lookup now requires an ownership check. Update every affected contract.',
        outcome:
          'Inspect implementation, registration, input schema, instructions, callers, and meaningful tests before applying the authorized correction.',
        boundary:
          'Authorization remains server-side. A changed description or tool name cannot establish enforcement.',
        source: SOURCES.maintenance,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Implementation', detail: 'Enforces the established ownership boundary.' },
            {
              title: 'Runtime contract',
              detail: 'Exposes the actual accepted input and capability.',
            },
            { title: 'Consumers and tests', detail: 'Use and verify the changed contract.' },
          ],
          caption: 'Trace behavior across the whole affected tool path.',
        },
      },
      {
        id: 'maintain-schema-context',
        title: 'Keep schema changes connected to project meaning',
        request:
          'The support input schema changed. Check its saved assumptions and runtime wiring.',
        outcome:
          'Review the schema, its declared impact paths, runtime consumers, and relevant context; change only representations whose meaning changed.',
        boundary:
          'An implementation change can legitimately require no context edit. A schema export does not establish runtime consumption.',
        source: SOURCES.support,
        visual: {
          kind: 'flow',
          steps: [
            { title: '/src/contracts.ts', detail: 'Owns executable input and output schemas.' },
            { title: 'affectedBy', detail: 'Connects schema work to the support agent.' },
            { title: 'Runtime invocation', detail: 'Uses the actual schemas at their boundaries.' },
          ],
          caption: 'The Trailside manifest includes the contracts file among its impact paths.',
        },
      },
      {
        id: 'maintain-multiple-consumers',
        title: 'Check every material consumer',
        request: 'This instruction loader is used by two request paths. Update both.',
        outcome:
          'Trace every supported invocation, including continuations, and keep all of them aligned with the same canonical instruction.',
        boundary: 'One correct consumer does not cancel a proven mismatch in another consumer.',
        source: SOURCES.support,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Canonical instruction', detail: 'One maintained source of behavior.' },
            { title: 'Initial request', detail: 'Calls loadSupportInstruction().' },
            {
              title: 'Continuation request',
              detail: 'Calls the same loader instead of an independent inline prompt.',
            },
          ],
          caption: 'Both real request paths in the support fixture use the loader.',
        },
      },
      {
        id: 'remove-superseded-decision',
        title: 'Remove wording that an approved decision supersedes',
        request:
          'We approved the replacement policy. Remove the obsolete rule where it still applies.',
        outcome:
          'Establish which prior statement is superseded, preserve unique rationale and unresolved boundaries, and synchronize affected references.',
        boundary:
          'Ordinary maintenance does not authorize broad compression or deleting a requirement whose resolution criteria remain unmet.',
        source: SOURCES.maintenance,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Approved replacement', detail: 'Establishes the intended current rule.' },
            {
              title: 'Affected old wording',
              detail: 'Is removed or revised in its owning surface.',
            },
            {
              title: 'Retained knowledge',
              detail: 'Unique facts and still-relevant rationale remain available.',
            },
          ],
          caption: 'Scope follows the approved change rather than a general cleanup opportunity.',
        },
      },
      {
        id: 'synchronize-instruction-mirror',
        title: 'Keep the required mirror synchronized',
        request: 'The support instruction changed. Update the runtime’s declared mirror too.',
        outcome:
          'Apply the same canonical change to its declared exact mirror and verify normalized equality.',
        boundary:
          'The mirror remains derived. Its destination must not become a second independently maintained instruction.',
        source: SOURCES.format,
        visual: {
          kind: 'diff',
          ...LANDING_EXAMPLE_PREVIEW.instructionDiff,
          language: 'markdown',
          caption:
            'The canonical instruction change. A required mirror receives the identical normalized text.',
        },
      },
      {
        id: 'include-discovered-paths',
        title: 'Recheck scope when ordinary work discovers another path',
        request: 'The implementation also touches the order helper we found during the task.',
        outcome:
          'Assess the newly discovered path once at an existing scope checkpoint and retain the owners already matched earlier in the task.',
        boundary:
          'Discovery selects relevant evidence. It does not authorize unrelated edits or repeated full-repository scanning.',
        source: SOURCES.maintenance,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Known task paths', detail: 'Establish the initial relevant owners.' },
            {
              title: 'Newly discovered helper',
              detail: 'Receives one bounded relationship check.',
            },
            {
              title: 'Combined relevant scope',
              detail: 'Preserves earlier matches without restarting the task.',
            },
          ],
          caption: 'Selective activation follows actual task scope as it develops.',
        },
      },
      {
        id: 'preserve-cross-repository-ownership',
        title: 'Coordinate a policy change across repository owners',
        request:
          'Update the saved policy here and its implementation in the application repository.',
        outcome:
          'Make the smallest authorized correction in each owner and verify each repository separately before reporting the coordinated result.',
        boundary:
          'Authorization and verification do not transfer automatically between repositories. Cross-repository work is not Git-atomic.',
        source: SOURCES.repositories,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Canonical owner', detail: 'Maintains the approved policy.' },
            { title: 'Application owner', detail: 'Maintains implementation and behavior tests.' },
            {
              title: 'Coordinated report',
              detail: 'States exactly what each repository changed and verified.',
            },
          ],
          caption: 'A dedicated context repository never fabricates local implementation bindings.',
        },
      },
    ],
  },
  {
    id: 'evaluate-and-repair',
    label: 'Evaluate and repair',
    title: 'Inspect first. Repair only when asked.',
    description:
      'Separate demonstrated errors, scoped warnings, semantic findings, and operations that did not complete. Authorize repair from that evidence.',
    guide: SOURCES.repair,
    examples: [
      {
        id: 'detect-shipment-instruction-mismatch',
        title: 'Catch an instruction that the runtime bypasses',
        request:
          'Validate shipment-explainer after replacing its loader with an inline instruction.',
        outcome:
          'For the supported source pattern, validation reports the proven loader-consumption mismatch even though the referenced instruction file still exists.',
        boundary:
          'Every material consumer matters. A second correct request cannot hide the disconnected one.',
        source: SOURCES.validation,
        visual: {
          kind: 'source',
          path: '/src/shipment-explainer/agents.ts',
          language: 'typescript',
          source:
            'instructions: "Be helpful."\n// Declared loader: loadInstruction\n// OPENAI_INSTRUCTION_LOADER_NOT_WIRED\n// severity: error',
          caption:
            'Illustrative request excerpt and the diagnostic contract exercised by the OpenAI adapter fixtures.',
        },
      },
      {
        id: 'interpret-unverified-warning',
        title: 'Read a warning without treating it as a coding defect',
        request: 'Validation is valid but runtime inspection is incomplete. Explain the warning.',
        outcome:
          'Name the unverified relationship and reason, inspect its real implementation, and preserve a correct intentional design.',
        boundary:
          'A warning means deterministic proof is incomplete. It neither proves a defect nor establishes semantic readiness.',
        source: SOURCES.compatibility,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'valid: true', detail: 'There are no error diagnostics.' },
            {
              title: 'runtimeInspection: incomplete',
              detail: 'A named relationship remains unverified.',
            },
            { title: 'Review', detail: 'Use project guidance and implementation evidence.' },
          ],
          caption: 'Validity and inspection completion are independent result fields.',
        },
      },
      {
        id: 'repair-missing-tool',
        title: 'Repair a missing declared tool from real evidence',
        request: 'Fix the missing order tool reported by inspection.',
        outcome:
          'Establish whether the declaration is stale or the intended implementation is missing, then make the smallest authorized coherent correction.',
        boundary:
          'Do not create a plausible tool merely to clear an error. Unknown behavior or permissions requires input.',
        source: SOURCES.repair,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Declared capability',
              detail: 'Names an implementation the repository cannot resolve.',
            },
            {
              title: 'Intended behavior',
              detail: 'Comes from real project evidence or an owner decision.',
            },
            {
              title: 'Verified correction',
              detail: 'Aligns implementation, registration, consumers, and meaningful checks.',
            },
          ],
          caption: 'The repair direction depends on evidence about what the tool should do.',
        },
      },
      {
        id: 'recover-validated-cli-target',
        title: 'Recover necessary local tooling to the validated target',
        request: 'Fix moldea. The repository-local CLI installation is missing or broken.',
        outcome:
          'Inspect inert package evidence, follow the installed skill’s exact cliRepairVersion through the established manager, and verify composition before canonical repair.',
        boundary:
          'No-install and trust restrictions still apply. Healthy newer compatible tooling stays in place; downgrades and version-policy conflicts need direction.',
        source: SOURCES.repair,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Installed skill metadata',
              detail: 'Owns the exact validated repair target.',
            },
            {
              title: 'Local package manager',
              detail:
                'Repairs the necessary tooling with scripts disabled and unrelated locks preserved.',
            },
            {
              title: 'Composition, then validation',
              detail:
                'Establishes installed closure and deterministic validity, without claiming production readiness.',
            },
          ],
          caption:
            'Updating the skill changes guidance; project recovery remains an explicit operation.',
        },
      },
      {
        id: 'detect-mutated-tool-schema',
        title: 'Expose a schema relationship that source mutation obscures',
        request:
          'Our code replaces the tool parameters after construction. Can inspection prove that schema?',
        outcome:
          'The supported OpenAI fixture retains established registration evidence and reports the tool-input-schema relationship as unverified.',
        boundary:
          'Do not reuse earlier schema evidence after mutation. The warning does not prove the replacement is wrong.',
        source: SOURCES.validation,
        visual: {
          kind: 'source',
          path: '/src/tools/find-order.ts',
          language: 'typescript',
          source:
            'findOrderTool.parameters = replacement;\n// OPENAI_RUNTIME_RELATIONSHIP_UNVERIFIED\n// relationship: tool-input-schema\n// reason: unsupported-source-pattern',
          caption: 'The mutation boundary exercised by the OpenAI adapter integration fixture.',
        },
      },
      {
        id: 'detect-missing-provider-export',
        title: 'Check the export behind a declared provider relationship',
        request: 'The instruction-loader file exists, but the declared export was renamed.',
        outcome:
          'For the supported OpenAI source pattern, report the missing declared loader symbol and correct the relationship or implementation according to real intent.',
        boundary:
          'A present file is insufficient evidence for a named export. Repair must follow the intended current API.',
        source: SOURCES.validation,
        visual: {
          kind: 'flow',
          steps: [
            { title: 'Declared loader', detail: 'Names an exact file and exported symbol.' },
            { title: 'Actual module', detail: 'No longer exports that symbol.' },
            { title: 'Confirmed error', detail: 'OPENAI_INSTRUCTION_LOADER_SYMBOL_NOT_FOUND.' },
          ],
          caption:
            'The provider-adapter fixture verifies export presence independently from file existence.',
        },
      },
      {
        id: 'review-dynamic-handoff-description',
        title: 'Keep dynamic handoff evidence honest',
        request:
          'The agent SDK computes the handoff description dynamically. Evaluate the relationship.',
        outcome:
          'Keep the established native handoff registrations and report the routing-description relationship as unverified when its dynamic value cannot be proved.',
        boundary:
          'A dynamic description is not a confirmed wrong destination or missing registration. Review the implementation without forcing a different design.',
        source: SOURCES.compatibility,
        visual: {
          kind: 'source',
          path: '/src/triage-agent.ts',
          language: 'typescript',
          source:
            'handoffDescription: createRoutingDescription()\n// OPENAI_AGENTS_SDK_RUNTIME_RELATIONSHIP_UNVERIFIED\n// relationship: routing-description\n// reason: dynamic-source-pattern',
          caption:
            'The OpenAI Agents SDK integration fixture preserves native handoff evidence while warning about the dynamic description.',
        },
      },
      {
        id: 'report-interrupted-resource-limited-repair',
        title: 'Stop honestly when repair or inspection cannot complete',
        request:
          'The install was interrupted, or source inspection hit its resource limit. Fix moldea.',
        outcome:
          'Preserve partial installation state or completed evidence, explain the failed operation, and establish a safe next step before continuing.',
        boundary:
          'Do not claim a completed inspection, blindly reinstall, or split user source automatically. Output pagination does not paginate a parser’s syntax tree.',
        source: SOURCES.repair,
        visual: {
          kind: 'flow',
          steps: [
            {
              title: 'Interrupted installation',
              detail: 'Preserve manifest, lock, and installed partial state.',
            },
            {
              title: 'Resource-limited inspection',
              detail: 'Report an operational failure, without inventing a validity result.',
            },
            {
              title: 'Next step',
              detail: 'Use new evidence and the trusted setup workflow where required.',
            },
          ],
          caption:
            'The 8 MiB general file allowance remains distinct from bounded parser-process resources.',
        },
      },
    ],
  },
];
