// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { getQualificationMaximumTokenCount } from './stages.ts';
import { createQualificationBatchTokenController } from './token-admission.ts';

describe('qualification batch token admission', () => {
  test('accepts the exact four-worker in-flight boundary and rejects one more stage', () => {
    const controller = createQualificationBatchTokenController({ workerCount: 4 });

    for (let reservationIndex = 0; reservationIndex < 4; reservationIndex += 1) {
      controller.reserve();
    }

    expect(controller.getSnapshot()).toStrictEqual({
      inFlightTokenLimit: getQualificationMaximumTokenCount(4),
      reservationTokenCount: getQualificationMaximumTokenCount(1),
      tokensConsumed: 0,
      tokensReserved: getQualificationMaximumTokenCount(4),
      totalTokenLimit: null,
    });
    expect(() => controller.reserve()).toThrow('Qualification in-flight token admission reached');
  });

  test('releases and settles reservations without multiplying the total ceiling', () => {
    const reservation = getQualificationMaximumTokenCount(1);
    const controller = createQualificationBatchTokenController({
      initialTokensConsumed: reservation,
      totalTokenLimit: reservation * 2,
      workerCount: 2,
    });

    controller.reserve();
    expect(() => controller.reserve()).toThrow('Qualification batch token admission reached');
    controller.release();
    controller.reserve();
    controller.settle(null);

    expect(controller.getSnapshot()).toMatchObject({
      tokensConsumed: reservation * 2,
      tokensReserved: 0,
    });
    expect(() => controller.reserve()).toThrow('Qualification batch token admission reached');
  });
});
