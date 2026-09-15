// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createDocumentationBreadcrumbs } from './index.ts';

describe('createDocumentationBreadcrumbs', () => {
  test.each([
    [
      'Docs root',
      { route: '/docs/', section: 'start', title: 'Agent Skill overview' },
      [{ href: '/', label: 'Home' }, { label: 'Agent Skill overview' }],
    ],
    [
      'documentation detail',
      { route: '/docs/project-state/', section: 'concepts', title: 'Git-owned project state' },
      [
        { href: '/', label: 'Home' },
        { href: '/docs/', label: 'Docs' },
        { label: 'Git-owned project state' },
      ],
    ],
    [
      'Examples index',
      { route: '/examples/', section: 'examples', title: 'Examples' },
      [{ href: '/', label: 'Home' }, { href: '/docs/', label: 'Docs' }, { label: 'Examples' }],
    ],
    [
      'example detail',
      {
        route: '/examples/create-a-support-agent/',
        section: 'examples',
        title: 'Create a support agent',
      },
      [
        { href: '/', label: 'Home' },
        { href: '/docs/', label: 'Docs' },
        { href: '/examples/', label: 'Examples' },
        { label: 'Create a support agent' },
      ],
    ],
  ] as const)(
    'createDocumentationBreadcrumbs(%s) -> expected hierarchy',
    (_, document, expected) => {
      expect(createDocumentationBreadcrumbs(document)).toStrictEqual(expected);
    },
  );
});
