import { defineScriptedJourney } from '../index.ts';

// the pilot starts with explicit adoption and verifies a subsequent read-only operation
export const scriptedJourney = defineScriptedJourney({
  id: 'new-project',
  title: 'Initialize and validate',
  summary: 'Adopt a small project, then validate the saved foundation without edits.',
  order: 1,
  fixture: { adopted: false, installCli: false },
  steps: [
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
          pattern: '"@moldea.ai/cli"\\s*:\\s*"11\\.0\\.0"',
        },
        { kind: 'path-exists', path: 'package-lock.json' },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['Validation ran after the final write.'],
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
          pattern: '\\bvalid\\b',
          absent: '\\binvalid\\b',
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
