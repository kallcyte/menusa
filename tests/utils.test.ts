import assert from 'node:assert/strict'
import test from 'node:test'
import { cn } from '../src/lib/utils'

test('cn merges class names', () => {
  assert.equal(cn('px-2', 'py-1'), 'px-2 py-1')
})

test('cn handles conditional classes', () => {
  assert.equal(cn('base', false && 'hidden', 'visible'), 'base visible')
  assert.equal(cn('base', undefined, null, 'extra'), 'base extra')
})

test('cn deduplicates conflicting tailwind classes via tailwind-merge', () => {
  // tailwind-merge should keep the last conflicting utility
  const result = cn('px-2', 'px-4')
  assert.equal(result, 'px-4')
  assert.equal(cn('text-red-500', 'text-blue-500'), 'text-blue-500')
})

test('cn handles empty input', () => {
  assert.equal(cn(), '')
  assert.equal(cn(''), '')
})

test('cn handles array and object inputs via clsx', () => {
  assert.equal(cn(['px-2', 'py-1']), 'px-2 py-1')
  assert.equal(cn({ active: true, hidden: false }), 'active')
})
