// day-specific slots shared by the availability tool and the displayed booking examples
const bookingAvailability = { today: ['10:00'], tomorrow: ['14:30'] } as const;

// customer-visible scenarios used by the illustrated project and its executable tests
const bookingChecks = [
  {
    slot: '11:00',
    isSameDay: true,
    label: 'Time is unavailable',
    result: 'unavailable',
    outcome: 'Not offered',
  },
  {
    slot: '10:00',
    isSameDay: true,
    label: 'Available, same day',
    result: 'pending_staff_approval',
    outcome: 'Waiting for staff',
  },
  {
    slot: '14:30',
    isSameDay: false,
    label: 'Available, later day',
    result: 'confirmed',
    outcome: 'Booking confirmed',
  },
] as const;

// one illustrative project shared by the workflow's files, code, and booking checks
export const BOOKING_EXAMPLE = {
  request:
    'Make our booking assistant offer only available times and send same-day requests to staff.',
  availability: bookingAvailability,
  files: {
    service: {
      id: 'service',
      path: 'src/booking-service.ts',
      label: 'Booking rule',
      language: 'typescript',
      source: `export const requestBooking = (
  slot: string,
  availableSlots: string[],
  isSameDay: boolean,
) => {
  if (!availableSlots.includes(slot)) {
    return 'unavailable';
  }
  return isSameDay
    ? 'pending_staff_approval'
    : 'confirmed';
};`,
    },
    availability: {
      id: 'availability',
      path: 'src/get-availability.ts',
      label: 'Available times',
      language: 'typescript',
      source: `const slotsByDay = ${JSON.stringify(bookingAvailability, null, 2)};

export const getAvailability = async (isSameDay: boolean) => ({
  slots: slotsByDay[isSameDay ? 'today' : 'tomorrow'],
});`,
    },
    instructions: {
      id: 'instructions',
      path: 'moldea/agents/booking/instruction.md',
      label: 'Agent instructions',
      language: 'markdown',
      source: `# Booking assistant

Offer only times returned by get-availability.
If the service returns pending_staff_approval, tell the customer their request is waiting for staff.
Never describe a pending request as confirmed.`,
    },
    policy: {
      id: 'policy',
      path: 'moldea/context/booking-policy.md',
      label: 'Booking policy',
      language: 'markdown',
      source: `# Booking policy

Same-day requests need staff approval.
The scheduling service enforces availability and approval state.
The assistant explains the result. Staff owns the approval decision.`,
    },
    tests: {
      id: 'tests',
      path: 'src/booking-service.test-unit.ts',
      label: 'Booking checks',
      language: 'typescript',
      source: `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestBooking } from './booking-service.ts';
import { getAvailability } from './get-availability.ts';

const checks = ${JSON.stringify(bookingChecks, null, 2)};

for (const { slot, isSameDay, label, result } of checks) {
  test(label, async () => {
    const { slots } = await getAvailability(isSameDay);
    assert.equal(requestBooking(slot, slots, isSameDay), result);
  });
}

test('Empty availability cannot produce a booking', () => {
  assert.equal(requestBooking('10:00', [], false), 'unavailable');
});

test('An available later-day slot needs no staff approval', () => {
  assert.equal(requestBooking('10:00', ['10:00'], false), 'confirmed');
});

test('Tomorrow availability cannot be booked today', async () => {
  const { slots } = await getAvailability(true);
  assert.equal(requestBooking('14:30', slots, true), 'unavailable');
});

test('Today availability cannot be booked tomorrow', async () => {
  const { slots } = await getAvailability(false);
  assert.equal(requestBooking('10:00', slots, false), 'unavailable');
});`,
    },
  },
  serviceExcerpt: `if (!availableSlots.includes(slot)) {
  return 'unavailable';
}
return isSameDay
  ? 'pending_staff_approval'
  : 'confirmed';`,
  checks: bookingChecks,
} as const;

// the existing project before the illustrative change; absent files are additions
export const BOOKING_EXAMPLE_BEFORE_FILES: Partial<Record<string, string>> = {
  [BOOKING_EXAMPLE.files.service.path]: `export const requestBooking = (
  slot: string,
  availableSlots: string[],
) => availableSlots.includes(slot) ? 'confirmed' : 'unavailable';`,
  [BOOKING_EXAMPLE.files.availability.path]: BOOKING_EXAMPLE.files.availability.source,
  [BOOKING_EXAMPLE.files.instructions.path]: `# Booking assistant

Offer only times returned by get-availability.
Tell the customer when the booking service confirms their booking.`,
  [BOOKING_EXAMPLE.files.policy.path]: BOOKING_EXAMPLE.files.policy.source,
};
