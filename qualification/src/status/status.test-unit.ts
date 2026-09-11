// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { QUALIFICATION_EVIDENCE_PROTOCOL_VERSION } from '../constants/index.ts';
import type {
  IQualificationStatusAttempt,
  IQualificationStatusUnavailableAttempt,
} from './types.ts';
import { createQualificationStatusPage } from './status.ts';

/** Creates one stable attempt projection for pagination cases. */
const createAttempt = (
  index: number,
  attemptId = `attempt-${index}`,
): IQualificationStatusAttempt => ({
  kind: 'attempt',
  protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  attemptId,
  adapterId: 'custom',
  implementationId: 'custom',
  status: 'failed',
  mode: 'official',
  createdAt: '2026-09-06T00:00:00.000Z',
  updatedAt: '2026-09-06T00:00:00.000Z',
  completedAt: '2026-09-06T00:00:00.000Z',
  isRecorded: true,
});

describe('createQualificationStatusPage', () => {
  test('pages at most 64 records and continues through the exact snapshot', () => {
    const attempts = Array.from({ length: 65 }, (_, index) => createAttempt(index));
    const unavailableAttempts: IQualificationStatusUnavailableAttempt[] = [
      {
        kind: 'unavailable-attempt',
        attemptId: 'unavailable-attempt',
        reason: 'invalid-status-summary',
        protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      },
    ];
    const latestResults = [
      {
        protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
        adapterId: 'custom',
        implementationId: 'custom',
        latestAttemptId: 'attempt-64',
        latestStatus: 'failed' as const,
        lastPassingAttemptId: null,
        updatedAt: '2026-09-06T00:00:00.000Z',
      },
    ];

    const firstPage = createQualificationStatusPage({
      attempts,
      unavailableAttempts,
      latestResults,
      isAll: true,
    });

    expect(firstPage.records).toHaveLength(64);
    expect(firstPage.counts).toStrictEqual({
      attempts: 65,
      unavailableAttempts: 1,
      latestResults: 1,
      total: 67,
    });
    expect(firstPage.nextCursor).not.toBeNull();
    const nextCursor = firstPage.nextCursor;

    if (nextCursor === null) {
      throw new Error('Expected a continuation cursor.');
    }

    const finalPage = createQualificationStatusPage({
      attempts,
      unavailableAttempts,
      latestResults,
      isAll: true,
      cursor: nextCursor,
    });

    expect(finalPage.records).toStrictEqual([
      createAttempt(64),
      unavailableAttempts[0],
      {
        kind: 'latest-result',
        ...latestResults[0],
      },
    ]);
    expect(finalPage.nextCursor).toBeNull();
    expect(finalPage.snapshot).toBe(firstPage.snapshot);
  });

  test('rejects malformed, wrong-scope, and stale cursors', () => {
    const firstPage = createQualificationStatusPage({
      attempts: Array.from({ length: 65 }, (_, index) => createAttempt(index)),
      unavailableAttempts: [],
      latestResults: [],
      isAll: true,
    });
    const cursor = firstPage.nextCursor ?? '';

    if (cursor.length === 0) {
      throw new Error('Expected a continuation cursor.');
    }

    expect(() =>
      createQualificationStatusPage({
        attempts: [],
        unavailableAttempts: [],
        latestResults: [],
        isAll: true,
        cursor: 'not+a+base64url+cursor',
      }),
    ).toThrow('Invalid qualification status cursor.');
    expect(() =>
      createQualificationStatusPage({
        attempts: Array.from({ length: 65 }, (_, index) => createAttempt(index)),
        unavailableAttempts: [],
        latestResults: [],
        isAll: false,
        cursor,
      }),
    ).toThrow('does not match the requested scope');
    expect(() =>
      createQualificationStatusPage({
        attempts: Array.from({ length: 66 }, (_, index) => createAttempt(index)),
        unavailableAttempts: [],
        latestResults: [],
        isAll: true,
        cursor,
      }),
    ).toThrow('cursor is stale');
  });

  test('reduces the record count to keep pretty JSON within 65,536 bytes', () => {
    const attempts = Array.from({ length: 64 }, (_, index) =>
      createAttempt(index, `${String(index).padStart(2, '0')}-${'a'.repeat(1_000)}`),
    );

    const page = createQualificationStatusPage({
      attempts,
      unavailableAttempts: [],
      latestResults: [],
      isAll: true,
    });

    expect(page.records.length).toBeGreaterThan(0);
    expect(page.records.length).toBeLessThan(64);
    expect(Buffer.byteLength(`${JSON.stringify(page, null, 2)}\n`, 'utf8')).toBeLessThanOrEqual(
      65_536,
    );
    expect(page.nextCursor).not.toBeNull();
  });

  test('rejects a single record that cannot fit within the output ceiling', () => {
    expect(() =>
      createQualificationStatusPage({
        attempts: [createAttempt(0, 'a'.repeat(70_000))],
        unavailableAttempts: [],
        latestResults: [],
        isAll: true,
      }),
    ).toThrow('Qualification status record exceeds the 65536-byte output ceiling.');
  });
});
