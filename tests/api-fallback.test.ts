import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, shouldFallbackToLocalData } from '../src/api'

test('network errors fall back to local demo data', () => {
  assert.equal(shouldFallbackToLocalData(new TypeError('fetch failed')), true)
  assert.equal(shouldFallbackToLocalData(new Error('something else')), true)
})

test('server 5xx errors fall back, client 4xx errors do not', () => {
  assert.equal(shouldFallbackToLocalData(new ApiError(500, 'boom')), true)
  assert.equal(shouldFallbackToLocalData(new ApiError(503, 'unavailable')), true)
  assert.equal(shouldFallbackToLocalData(new ApiError(401, 'Unauthorized')), false)
  assert.equal(shouldFallbackToLocalData(new ApiError(404, 'Menu not found')), false)
  assert.equal(shouldFallbackToLocalData(new ApiError(409, 'Conflict')), false)
})
