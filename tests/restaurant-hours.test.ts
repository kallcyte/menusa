import assert from 'node:assert/strict'
import test from 'node:test'
import { getRestaurantHoursStatus } from '../src/lib/restaurantHours'

const weeklyHours = 'Sen–Kam 11–22 · Jum–Sab 11–22:30 · Min 12–21'
const at = (day: number, hour: number, minute = 0) => new Date(2024, 0, 7 + day, hour, minute)

test('reports an open restaurant with its closing time', () => {
  assert.deepEqual(getRestaurantHoursStatus('', weeklyHours, at(2, 14)), {
    kind: 'open',
    closingAt: 22 * 60,
  })
})

test('reports closing soon within the final hour', () => {
  assert.deepEqual(getRestaurantHoursStatus('', weeklyHours, at(2, 21, 30)), {
    kind: 'closingSoon',
    closingAt: 22 * 60,
  })
})

test('reports opening soon before the daily opening time', () => {
  assert.deepEqual(getRestaurantHoursStatus('', weeklyHours, at(2, 10, 30)), {
    kind: 'openingSoon',
    openingAt: 11 * 60,
    openingDay: 2,
  })
})

test('reports the next opening after closing', () => {
  assert.deepEqual(getRestaurantHoursStatus('', weeklyHours, at(2, 22)), {
    kind: 'closed',
    openingAt: 11 * 60,
    openingDay: 3,
  })
})

test('parses English 12-hour ranges', () => {
  assert.deepEqual(getRestaurantHoursStatus('', 'Mon–Thu 5–11pm · Fri–Sat 5–11:30pm', at(1, 17)), {
    kind: 'open',
    closingAt: 23 * 60,
  })
})

test('falls back when no machine-readable schedule exists', () => {
  assert.deepEqual(getRestaurantHoursStatus('Open today · until late', undefined, at(2, 14)), { kind: 'unknown' })
})
