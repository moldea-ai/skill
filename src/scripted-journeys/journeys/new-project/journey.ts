import {
  defineScriptedJourney,
  VALIDATION_REPLY_PATTERN,
  VALIDATION_REPLY_CONTRADICTION_PATTERN,
} from '../index.ts';

// adoption, durable context, unrelated work, and read-only verification share one conversation
export const scriptedJourney = defineScriptedJourney({
  id: 'new-project',
  title: 'From first question to adoption',
  summary:
    'Read project facts, initialize, refine its purpose, make an unrelated edit, and validate.',
  order: 1,
  fixture: { adopted: false, installCli: false },
  steps: [
    {
      id: 'read-project',
      request:
        'Read README.md and tell me what staff must check before marking a parcel collected. This is a read-only question; do not initialize anything.',
      dependsOn: [],
      checks: [{ kind: 'no-changes' }, { kind: 'reply-matches', pattern: 'pickup code' }],
      unverified: [],
    },
    {
      id: 'initialize',
      request: 'Initialize moldea.',
      dependsOn: [],
      checks: [
        { kind: 'path-exists', path: 'moldea/moldea.yaml' },
        { kind: 'path-exists', path: 'moldea/project.md' },
        { kind: 'content-matches', path: 'README.md', pattern: '<!-- moldea:start -->' },
        { kind: 'content-matches', path: 'AGENTS.md', pattern: '<!-- moldea:start -->' },
        {
          kind: 'content-matches',
          path: 'package.json',
          pattern: '"@moldea.ai/cli"\\s*:\\s*"\\d+\\.\\d+\\.\\d+"',
        },
        { kind: 'path-exists', path: 'package-lock.json' },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['Validation ran after the final write.'],
    },
    {
      id: 'purpose',
      request:
        'A correction to our established project purpose: Parcel desk serves volunteer-run library pickup desks. Persist that purpose in the project overview. Preserve the pickup-code and contact-logging boundaries.',
      dependsOn: ['initialize'],
      checks: [
        { kind: 'paths-changed', paths: ['moldea/project.md'] },
        {
          kind: 'content-matches',
          path: 'moldea/project.md',
          pattern: 'volunteer[- ]run library pickup desks',
        },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['Validation ran after the final canonical write.'],
    },
    {
      id: 'greeting',
      request:
        'In src/greeting.js, change the greeting prefix from "Welcome, " to "Hello, ". Keep the exported function and its template interpolation unchanged.',
      dependsOn: ['purpose'],
      checks: [
        { kind: 'paths-unchanged', paths: ['moldea/**'] },
        { kind: 'content-matches', path: 'src/greeting.js', pattern: 'Hello,\\s*\\$\\{name\\}!' },
      ],
      unverified: [],
    },
    {
      id: 'validate',
      request: 'Validate moldea.',
      dependsOn: ['initialize'],
      checks: [
        { kind: 'no-changes' },
        { kind: 'validate', result: 'valid' },
        {
          kind: 'reply-matches',
          pattern: VALIDATION_REPLY_PATTERN,
          absent: VALIDATION_REPLY_CONTRADICTION_PATTERN,
          skillBehavior: true,
          reference: {
            path: 'moldea/references/local-tooling.md',
            statement:
              'The launcher preserves exit 0 for valid; warnings do not invalidate a project.',
          },
        },
      ],
      unverified: ['The agent invoked validation rather than inferring its result.'],
    },
  ],
});
