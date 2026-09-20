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
        kind: 'qualification',
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
        kind: 'qualification',
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
        kind: 'qualification',
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
