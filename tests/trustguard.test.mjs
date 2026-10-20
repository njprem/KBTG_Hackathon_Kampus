import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEMO_SETTINGS,
  WATCH_PERIOD_DAYS,
  countedMonthTotal,
  evaluateTransfer,
  findRecipient,
  getBangkokMonthKey,
  salaryShare,
  setupContactMember,
  watchDaysLeft,
  weakeningChanges,
} from '../src/domain/trustguard.ts'

const NOW = '2026-10-20T10:00:00+07:00'
const settings = (overrides = {}) => ({ ...DEMO_SETTINGS, trustContacts: [...DEMO_SETTINGS.trustContacts], ...overrides })
const draft = (recipientId, amountBaht, createdAt = NOW) => ({ recipient: findRecipient(recipientId), amountBaht, createdAt })
const done = (recipientId, amountBaht, createdAt, counted = true) => ({ id: `${recipientId}-${createdAt}`, recipientId, amountBaht, createdAt, counted })

test('Bangkok calendar month changes at local midnight', () => {
  assert.equal(getBangkokMonthKey('2026-10-31T16:59:59Z'), '2026-10')
  assert.equal(getBangkokMonthKey('2026-10-31T17:00:00Z'), '2026-11')
})

test('scam-style transfer fails Trust Contact and Trust Limit, so it pauses', () => {
  const result = evaluateTransfer({ draft: draft('niran', 18_000), ledger: [], settings: settings(), baseline: null })
  assert.equal(result.zone.state, 'pass')
  assert.equal(result.contact.state, 'fail')
  assert.equal(result.limit.state, 'fail')
  assert.equal(result.failedCount, 2)
  assert.equal(result.decision, 'pause')
})

test('one failed check shows a notice instead of a pause', () => {
  const result = evaluateTransfer({ draft: draft('niran', 6_000), ledger: [], settings: settings(), baseline: null })
  assert.equal(result.failedCount, 1)
  assert.equal(result.decision, 'notice')
})

test('split transfers are counted together and the third one pauses', () => {
  const ledger = [done('niran', 6_000, '2026-10-03T09:00:00+07:00'), done('niran', 6_000, '2026-10-10T09:00:00+07:00')]
  const result = evaluateTransfer({ draft: draft('niran', 6_000), ledger, settings: settings(), baseline: null })
  assert.equal(result.limit.monthTotalBaht, 18_000)
  assert.equal(result.decision, 'pause')
})

test('transfers from the previous month do not count', () => {
  const ledger = [done('niran', 14_000, '2026-09-30T09:00:00+07:00')]
  const result = evaluateTransfer({ draft: draft('niran', 6_000), ledger, settings: settings(), baseline: null })
  assert.equal(result.limit.monthTotalBaht, 6_000)
  assert.equal(result.limit.state, 'pass')
})

test('a Trust Contact passes immediately and is not counted', () => {
  const result = evaluateTransfer({ draft: draft('mom', 20_000), ledger: [], settings: settings(), baseline: null })
  assert.equal(result.contact.state, 'pass')
  assert.equal(result.limit.counted, false)
  assert.equal(result.decision, 'complete')
})

test('a newly added Trust Contact stays watched and counted', () => {
  const s = settings({ trustContacts: [...DEMO_SETTINGS.trustContacts, { recipientId: 'niran', addedAt: '2026-10-19T10:00:00+07:00' }] })
  const result = evaluateTransfer({ draft: draft('niran', 18_000), ledger: [], settings: s, baseline: null })
  assert.equal(result.contact.state, 'fail')
  assert.equal(result.contact.inList, true)
  assert.equal(result.contact.watchDaysLeft, WATCH_PERIOD_DAYS - 1)
  assert.equal(result.decision, 'pause')
})

test('watch period ends after the configured days', () => {
  const member = { recipientId: 'niran', addedAt: '2026-10-01T10:00:00+07:00' }
  assert.equal(watchDaysLeft(member, '2026-10-02T10:00:00+07:00'), WATCH_PERIOD_DAYS - 1)
  assert.equal(watchDaysLeft(member, '2026-10-08T10:00:00+07:00'), 0)
})

test('outside Trust Zone fails; unavailable location is not counted as a failure', () => {
  const outside = evaluateTransfer({ draft: draft('niran', 500), ledger: [], settings: settings({ zone: 'outside' }), baseline: null })
  assert.equal(outside.zone.state, 'fail')
  assert.equal(outside.decision, 'pause')
  const unavailable = evaluateTransfer({ draft: draft('niran', 500), ledger: [], settings: settings({ zone: 'unavailable' }), baseline: null })
  assert.equal(unavailable.zone.state, 'unknown')
  assert.equal(unavailable.decision, 'notice')
})

test('after continuing past a pause, small transfers that month do not pause again', () => {
  const ledger = [done('niran', 18_000, '2026-10-16T10:00:00+07:00')]
  const baseline = { monthKey: '2026-10', baht: 18_000 }
  const small = evaluateTransfer({ draft: draft('niran', 20), ledger, settings: settings(), baseline })
  assert.equal(small.limit.state, 'pass')
  assert.equal(small.decision, 'notice')
  const big = evaluateTransfer({ draft: draft('niran', 15_000), ledger, settings: settings(), baseline })
  assert.equal(big.limit.state, 'fail')
  assert.equal(big.decision, 'pause')
})

test('TrustGuard off never pauses', () => {
  const result = evaluateTransfer({ draft: draft('niran', 18_000), ledger: [], settings: settings({ enabled: false }), baseline: null })
  assert.equal(result.decision, 'complete')
})

test('counted month total ignores uncounted transfers', () => {
  const ledger = [done('mom', 5_000, '2026-10-05T10:00:00+07:00', false), done('niran', 3_000, '2026-10-06T10:00:00+07:00')]
  assert.equal(countedMonthTotal(ledger, NOW), 3_000)
})

test('weakening changes are detected', () => {
  assert.deepEqual(weakeningChanges(settings(), settings({ enabled: false, monthlyLimitBaht: 20_000 })), ['disabled', 'limit-raised'])
  assert.deepEqual(weakeningChanges(settings(), settings({ monthlyLimitBaht: 10_000 })), [])
})

test('salary share is a whole percent', () => {
  assert.equal(salaryShare(18_000, 28_000), 64)
  assert.throws(() => salaryShare(1, 0))
})

test('invalid amounts are rejected', () => {
  assert.throws(() => evaluateTransfer({ draft: draft('niran', 0), ledger: [], settings: settings(), baseline: null }))
  assert.throws(() => evaluateTransfer({ draft: draft('niran', 1.5), ledger: [], settings: settings(), baseline: null }))
})

test('a Trust Contact chosen during first setup is trusted immediately', () => {
  const now = '2026-10-20T10:00:00+07:00'
  const member = setupContactMember('mom', now)
  assert.equal(watchDaysLeft(member, now), 0)
  const later = { recipientId: 'min', addedAt: now }
  assert.equal(watchDaysLeft(later, now), WATCH_PERIOD_DAYS)
})

test('a frequent place and shop the AI already knows are not counted, so a ฿25 purchase passes', () => {
  const now = '2026-10-20T12:00:00+07:00'
  const result = evaluateTransfer({ draft: { recipient: findRecipient('pork-stall'), amountBaht: 25, createdAt: now, placeId: 'seven' }, ledger: [], settings: DEMO_SETTINGS, baseline: null })
  assert.equal(result.zone.state, 'unknown')
  assert.equal(result.contact.state, 'unknown')
  assert.equal(result.decision, 'complete')
})
