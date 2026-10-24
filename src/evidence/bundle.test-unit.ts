// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { calculateSha256 } from '../filesystem/index.ts';
import {
  createEvidenceBundle,
  decodeEvidenceBundle,
  encodeEvidenceBundle,
  validateEvidenceBundle,
} from './bundle.ts';

const createBundle = () =>
  createEvidenceBundle({
    artifacts: [
      {
        content: Buffer.from('same content\n'),
        mediaType: 'text/plain',
        path: 'project/first.txt',
      },
      {
        content: Buffer.from('same content\n'),
        mediaType: 'text/plain',
        path: 'project/second.txt',
      },
    ],
    classification: 'official',
    kind: 'semantic',
    payload: { cases: [{ id: 'case-one', status: 'passed' }] },
    run: {
      attemptId: 'semantic-1',
      evaluatedAt: '2026-09-19T12:00:00.000Z',
      provenance: { source: 'synthetic-test' },
      status: 'passed',
      version: '5.0.9',
    },
  });

describe('evidence bundles', () => {
  test.each([
    ['.evidence/private-semantic/attempt/case/actor.jsonl', 'ordinary text'],
    ['renamed.txt', '{"moldeaPrivateTrace":true}\n{"type":"item.completed"}\n'],
  ])('rejects private diagnostic artifacts at %s', (path, content) => {
    const original = createBundle();

    expect(() =>
      createEvidenceBundle({
        classification: original.classification,
        kind: original.kind,
        payload: original.payload,
        run: original.run,
        artifacts: [{ path, content: Buffer.from(content), mediaType: 'text/plain' }],
      }),
    ).toThrow(/private diagnostic/u);
  });

  test('rejects private diagnostic paths and markers in public payloads', () => {
    for (const payload of [
      { tracePath: '.evidence/private-semantic/attempt/case/actor.jsonl' },
      { moldeaPrivateTrace: true },
    ]) {
      const bundle = createBundle();
      bundle.payload = payload;

      expect(() => validateEvidenceBundle(bundle)).toThrow(/private diagnostic/u);
      expect(() => encodeEvidenceBundle(bundle)).toThrow(/private diagnostic/u);
    }
  });

  test('rejects private diagnostics in provenance and unreferenced blobs', () => {
    const bundle = createBundle();
    bundle.run.provenance['trace'] = '.evidence/private-semantic/attempt/case/actor.jsonl';
    expect(() => validateEvidenceBundle(bundle)).toThrow(/private diagnostic/u);
    delete bundle.run.provenance['trace'];
    const content = Buffer.from('{"moldeaPrivateTrace":true}\n');
    bundle.artifacts.blobs.push({
      byteCount: content.length,
      contentBase64: content.toString('base64'),
      sha256: calculateSha256(content),
    });
    expect(() => validateEvidenceBundle(bundle)).toThrow(/private diagnostic/u);
  });

  test('round trips a complete bundle and deduplicates exact artifact bytes', () => {
    const bundle = createBundle();
    const encoded = encodeEvidenceBundle(bundle);

    expect(bundle.artifacts.files).toHaveLength(2);
    expect(bundle.artifacts.blobs).toHaveLength(1);
    expect(decodeEvidenceBundle(encoded)).toStrictEqual(bundle);
    expect(calculateSha256(encodeEvidenceBundle(bundle))).toBe(calculateSha256(encoded));
  });

  test('rejects changed and missing artifact blobs', () => {
    const changedBundle = structuredClone(createBundle());
    changedBundle.artifacts.blobs[0]!.contentBase64 = Buffer.from('changed').toString('base64');
    expect(() => validateEvidenceBundle(changedBundle)).toThrow(/invalid content evidence/u);

    const missingBundle = structuredClone(createBundle());
    missingBundle.artifacts.blobs = [];
    expect(() => validateEvidenceBundle(missingBundle)).toThrow(/missing blob/u);
  });

  test('rejects unsafe paths, executable artifacts, and sensitive payload properties', () => {
    expect(() =>
      createEvidenceBundle({
        artifacts: [
          { content: Buffer.from('text'), mediaType: 'text/plain', path: '../outside.txt' },
        ],
        classification: 'fixture',
        kind: 'semantic',
        payload: {},
        run: {
          attemptId: 'attempt-1',
          evaluatedAt: '2026-09-19T12:00:00.000Z',
          provenance: {},
          status: 'failed',
          version: 'test',
        },
      }),
    ).toThrow(/portable relative artifact path/u);

    expect(() =>
      createEvidenceBundle({
        artifacts: [
          { content: Buffer.from('MZfake'), mediaType: 'text/plain', path: 'project/tool.exe' },
        ],
        classification: 'fixture',
        kind: 'semantic',
        payload: {},
        run: {
          attemptId: 'attempt-1',
          evaluatedAt: '2026-09-19T12:00:00.000Z',
          provenance: {},
          status: 'failed',
          version: 'test',
        },
      }),
    ).toThrow(/executable/u);

    expect(() =>
      createEvidenceBundle({
        classification: 'fixture',
        kind: 'semantic',
        payload: { authorization: 'Bearer private' },
        run: {
          attemptId: 'attempt-1',
          evaluatedAt: '2026-09-19T12:00:00.000Z',
          provenance: {},
          status: 'failed',
          version: 'test',
        },
      }),
    ).toThrow(/sensitive property authorization/u);
  });

  test('rejects executable content when validating an externally supplied bundle', () => {
    const bundle = createBundle();
    const executableContent = Buffer.from('MZfake');
    const executableSha256 = calculateSha256(executableContent);
    bundle.artifacts.blobs = [
      {
        byteCount: executableContent.byteLength,
        contentBase64: executableContent.toString('base64'),
        sha256: executableSha256,
      },
    ];
    bundle.artifacts.files = [
      {
        mediaType: 'text/plain',
        path: 'project/innocent.txt',
        sha256: executableSha256,
      },
    ];

    expect(() => validateEvidenceBundle(bundle)).toThrow(/executable binary content/u);
  });

  test('rejects malformed compressed content', () => {
    expect(() => decodeEvidenceBundle(Buffer.from('not gzip'))).toThrow(/decompressed/u);
  });
});
