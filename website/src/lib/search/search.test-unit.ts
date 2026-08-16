// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { parseSearchDocuments, searchDocuments, type ISearchDocument } from './search.ts';

const documents: ISearchDocument[] = [
  {
    description: 'Create one grounded support agent.',
    searchText: 'agent design instructions capabilities runtime',
    title: 'Create a support agent',
    url: '/examples/create-a-support-agent/',
  },
  {
    description: 'Plan deterministic and agent responsibilities.',
    searchText: 'architecture planning zero agents human control',
    title: 'Plan an agent-enabled system',
    url: '/examples/plan-an-agent-system/',
  },
];

describe('searchDocuments', () => {
  test('ranks title matches before supporting-text matches', () => {
    expect(searchDocuments('support agent', documents)).toStrictEqual([documents[0]]);
    expect(searchDocuments('human control', documents)).toStrictEqual([documents[1]]);
  });

  test('normalizes case and diacritics while requiring every query token', () => {
    expect(searchDocuments('AGENT DESIGN', documents)).toStrictEqual([documents[0]]);
    expect(searchDocuments('agent missing', documents)).toStrictEqual([]);
  });
});

describe('parseSearchDocuments', () => {
  test('accepts the generated boundary and rejects malformed records', () => {
    expect(parseSearchDocuments(documents)).toStrictEqual(documents);
    expect(() => parseSearchDocuments([{ title: 'Incomplete' }])).toThrow(
      'The documentation search index is invalid.',
    );
  });
});
