import { defineScriptedJourney } from '../index.ts';

// related implementation changes must keep their selected policy owner accurate
export const scriptedJourney = defineScriptedJourney({
  id: 'everyday-work',
  title: 'Keep everyday policy aligned',
  summary:
    'Apply approved pickup rules in code and context, then answer a read-only policy question.',
  order: 2,
  fixture: { adopted: true, installCli: true },
  steps: [
    {
      id: 'pickup-window',
      request:
        'The approved pickup window is now 72 hours instead of 48 hours. Update src/pickup.js and its established canonical policy to reflect this change.',
      dependsOn: [],
      checks: [
        { kind: 'content-matches', path: 'src/pickup.js', pattern: 'pickupWindowHours\\s*=\\s*72' },
        { kind: 'content-matches', path: 'moldea/context/pickup.md', pattern: '\\b72\\b' },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['Selected the related owner before editing.'],
    },
    {
      id: 'identity-option',
      request:
        'Implement this approved pickup rule in src/pickup.js: allowGovernmentId must now be true. Staff may accept a government ID as an alternative to the pickup code. Keep the related canonical policy accurate.',
      dependsOn: ['pickup-window'],
      checks: [
        { kind: 'paths-changed', paths: ['moldea/context/pickup.md'] },
        { kind: 'content-matches', path: 'moldea/context/pickup.md', pattern: 'government ID' },
        {
          kind: 'content-matches',
          path: 'src/pickup.js',
          pattern: 'allowGovernmentId\\s*=\\s*true',
        },
        { kind: 'validate', result: 'valid' },
      ],
      unverified: ['Reconsidered the selected owner after the implementation change.'],
    },
    {
      id: 'read-policy',
      request:
        'Read the saved pickup policy and tell me the current pickup window in hours. Do not edit files.',
      dependsOn: ['identity-option'],
      checks: [{ kind: 'no-changes' }, { kind: 'reply-matches', pattern: '\\b72\\b' }],
      unverified: [],
    },
  ],
});
