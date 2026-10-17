import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROTOTYPE_SCENARIOS,
  WARN_MINIMUM_WAIT_MS,
  canSenderConfirm,
  evaluateTransfer,
  getBangkokMonthKey,
} from '../src/domain/trustguard.ts'

const scenario = (id) => PROTOTYPE_SCENARIOS.find((item) => item.id === id)
const reviewStartedAt = '2026-10-16T03:00:00.000Z'

function evaluate(id, overrides = {}) {
  const item = scenario(id)
  return evaluateTransfer({
    transfer: item.transfer,
    history: item.history,
    settings: { ...item.settings, ...overrides },
    reviewStartedAt,
  })
}

test('Bangkok calendar month changes at local midnight', () => {
  assert.equal(getBangkokMonthKey('2026-10-31T16:59:59Z'), '2026-10')
  assert.equal(getBangkokMonthKey('2026-10-31T17:00:00Z'), '2026-11')
})

test('limit alone pauses even without a recipient risk flag', () => {
  const result = evaluate('limit-only')
  assert.equal(result.action, 'smart-pause')
  assert.deepEqual(result.reasons, ['monthly-limit'])
  assert.equal(result.contactNotification, 'advice-request')
  assert.equal(result.monthlyTotalBaht, 18_000)
})

test('split transfers accumulate during one month', () => {
  const result = evaluate('split-transfers')
  assert.equal(result.monthlyPriorBaht, 12_000)
  assert.equal(result.monthlyTotalBaht, 18_000)
  assert.equal(result.action, 'smart-pause')
})

test('Off skips additional TrustGuard pause', () => {
  const result = evaluate('limit-only', { level: 'off' })
  assert.equal(result.action, 'continue')
  assert.equal(result.contactNotification, 'none')
})

test('Warn cannot be self-confirmed until the full two minutes have passed', () => {
  const result = evaluate('limit-only')
  const eligibleAt = Date.parse(result.warnEligibleAt)
  assert.equal(WARN_MINIMUM_WAIT_MS, 120_000)
  assert.equal(eligibleAt - Date.parse(reviewStartedAt), WARN_MINIMUM_WAIT_MS)
  const base = { evaluation: result, level: 'warn', contactResponse: { kind: 'no-response' }, recoveryState: 'not-started' }
  assert.equal(canSenderConfirm({ ...base, now: new Date(eligibleAt - 1).toISOString() }), false)
  assert.equal(canSenderConfirm({ ...base, now: new Date(eligibleAt).toISOString() }), true)
})

test('Approval required needs contact approval and cannot self-release during recovery', () => {
  const result = evaluate('limit-only', { level: 'approval-required' })
  assert.equal(result.contactNotification, 'approval-request')
  const base = { evaluation: result, level: 'approval-required', now: reviewStartedAt, recoveryState: 'not-started' }
  assert.equal(canSenderConfirm({ ...base, contactResponse: { kind: 'no-response' } }), false)
  assert.equal(canSenderConfirm({ ...base, contactResponse: { kind: 'approval-decision', decision: 'rejected', respondedAt: reviewStartedAt } }), false)
  assert.equal(canSenderConfirm({ ...base, contactResponse: { kind: 'approval-decision', decision: 'approved', respondedAt: reviewStartedAt } }), true)
  assert.equal(canSenderConfirm({ ...base, recoveryState: 'pending-demo-review', contactResponse: { kind: 'approval-decision', decision: 'approved', respondedAt: reviewStartedAt } }), false)
})

test('the high-value normal scenario still triggers the chosen limit without claiming risk', () => {
  const result = evaluate('ordinary-high-value')
  assert.deepEqual(result.reasons, ['monthly-limit'])
  assert.equal(result.monthlyTotalBaht, 22_000)
})

test('Trusted Zone inside cannot clear a limit warning', () => {
  const item = scenario('limit-only')
  const result = evaluateTransfer({ ...item, transfer: { ...item.transfer, zoneStatus: 'inside' }, reviewStartedAt })
  assert.equal(result.action, 'smart-pause')
  assert.deepEqual(result.reasons, ['monthly-limit'])
})

test('unavailable location does not add a warning reason', () => {
  const item = scenario('limit-only')
  const result = evaluateTransfer({ ...item, transfer: { ...item.transfer, zoneStatus: 'unavailable' }, reviewStartedAt })
  assert.deepEqual(result.reasons, ['monthly-limit'])
})

test('outside Trusted Zone still follows the existing demo pause rule', () => {
  const item = scenario('limit-only')
  const result = evaluateTransfer({ ...item, transfer: { ...item.transfer, zoneStatus: 'outside' }, reviewStartedAt })
  assert.deepEqual(result.reasons, ['monthly-limit', 'outside-trusted-zone'])
})
