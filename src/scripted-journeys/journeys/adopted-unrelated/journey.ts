import { defineScriptedJourney } from '../index.ts';

// an unrelated source edit must preserve the adopted project foundation
export const scriptedJourney = defineScriptedJourney({
  id: 'adopted-unrelated',
  title: 'An unrelated code change',
  summary: 'Change a greeting while preserving established project knowledge.',
  order: 0,
  fixture: { adopted: true, installCli: true },
  steps: [
    {
      id: 'greeting',
      request:
        'In src/greeting.js, change the greeting prefix from "Welcome, " to "Hello, ". Keep the exported function and its template interpolation unchanged.',
      dependsOn: [],
      checks: [
        { kind: 'content-matches', path: 'src/greeting.js', pattern: 'Hello,\\s*\\$\\{name\\}!' },
        {
          kind: 'paths-unchanged',
          paths: ['moldea/**', 'README.md', 'AGENTS.md'],
          since: 'fixture',
        },
      ],
      unverified: ['No mention of the installed skill before relevance was established.'],
    },
  ],
});
