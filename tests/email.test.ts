import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sendBroadcast,
  sendDemotionEmail,
  sendPasswordResetEmail,
  sendPromotionEmail,
  sendVerificationEmail,
  sendWaitlistConfirmation,
} from '../server/email'

// Without RESEND_API_KEY every send helper must return skipped:true so the
// caller can fire-and-forget without treating it as a hard failure.
const emptyEnv = { PUBLIC_APP_URL: 'https://menu.example.com' }

test('sendWaitlistConfirmation is skipped when RESEND_API_KEY is missing', async () => {
  const result = await sendWaitlistConfirmation(emptyEnv, 'guest@example.com', 'Alba House')
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.skipped, true)
    assert.match(result.error, /RESEND_API_KEY/)
  }
})

test('sendWaitlistConfirmation without restaurantName still skips gracefully', async () => {
  const result = await sendWaitlistConfirmation(emptyEnv, 'guest@example.com', null)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})

test('sendPromotionEmail is skipped when RESEND_API_KEY is missing', async () => {
  const result = await sendPromotionEmail(emptyEnv, 'admin@example.com', 'Ada')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})

test('sendDemotionEmail is skipped when RESEND_API_KEY is missing', async () => {
  const result = await sendDemotionEmail(emptyEnv, 'user@example.com', 'Bob')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})

test('sendVerificationEmail is skipped when RESEND_API_KEY is missing', async () => {
  const result = await sendVerificationEmail(emptyEnv, 'new@example.com', 'https://menu.example.com/verify?token=abc')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})

test('sendPasswordResetEmail is skipped when RESEND_API_KEY is missing', async () => {
  const result = await sendPasswordResetEmail(emptyEnv, 'new@example.com', 'https://menu.example.com/reset?token=xyz')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})

test('sendBroadcast is skipped when RESEND_API_KEY is missing', async () => {
  const result = await sendBroadcast(emptyEnv, ['a@example.com', 'b@example.com'], 'Hello', '<p>Hi</p>', 'Hi')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})

test('sendBroadcast with empty recipient list still skips without calling Resend', async () => {
  const result = await sendBroadcast(emptyEnv, [], 'Hello', '<p>Hi</p>', 'Hi')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})

test('custom EMAIL_FROM and PUBLIC_APP_URL are accepted without throwing', async () => {
  const env = {
    RESEND_API_KEY: undefined,
    EMAIL_FROM: 'Custom <custom@example.com>',
    PUBLIC_APP_URL: 'https://custom.example.com/',
  }
  const result = await sendWaitlistConfirmation(env, 'x@example.com', null)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.skipped, true)
})
