/**
 * TrustGuard v3 demo rules (3T: Trust Zone, Trust Contact, Trust Limit).
 * Every account, person, amount and location here is fictional.
 * This module does not move money, contact a bank, or use real risk/location data.
 * Amounts are whole Thai baht; the UI may format them with .00.
 */

export type TrustZoneStatus = 'inside' | 'outside' | 'unavailable'
export type CheckState = 'pass' | 'fail' | 'unknown'

export interface Recipient {
  id: string
  name: string
  maskedAccount: string
  kind: 'person' | 'merchant'
  /** Short Thai description shown in pickers, e.g. relationship or shop type. */
  note: string
}

export interface TrustContactMember {
  recipientId: string
  /** ISO timestamp with timezone. Recently added members stay counted until the watch period ends. */
  addedAt: string
}

export interface TrustGuardSettings {
  enabled: boolean
  monthlyLimitBaht: number
  trustContacts: TrustContactMember[]
  /** Simulated in the prototype; a real product would learn usual transfer locations. */
  zone: TrustZoneStatus
}

export interface CompletedTransfer {
  id: string
  /** ISO timestamp with timezone. */
  createdAt: string
  recipientId: string
  amountBaht: number
  /** Whether this transfer counted toward Trust Limit when it was made. */
  counted: boolean
}

/**
 * Month total (counted transfers) at the moment the sender last continued past a pause.
 * Demo assumption: after the sender continues, Trust Limit fails again only when
 * another full limit accumulates, so a 20-baht transfer later that month is not paused.
 */
export interface LimitBaseline {
  monthKey: string
  baht: number
}

export interface TransferDraft {
  recipient: Recipient
  amountBaht: number
  createdAt: string
}

export interface ZoneCheck {
  state: CheckState
  status: TrustZoneStatus
}

export interface ContactCheck {
  state: CheckState
  inList: boolean
  /** Whole days left in the watch period, 0 when the recipient is not being watched. */
  watchDaysLeft: number
}

export interface LimitCheck {
  state: CheckState
  /** Whether this transfer counts toward Trust Limit (recipient not effectively trusted). */
  counted: boolean
  /** Counted total this Bangkok calendar month, including this transfer when counted. */
  monthTotalBaht: number
  /** Counted amount since the last time the sender continued past a pause. */
  sinceBaselineBaht: number
  limitBaht: number
}

export type Decision = 'complete' | 'notice' | 'pause'

export interface Evaluation {
  monthKey: string
  zone: ZoneCheck
  contact: ContactCheck
  limit: LimitCheck
  failedCount: number
  /** 0 failed → complete, 1 → quiet notice on review, 2 or more → Smart Pause. Off → complete. */
  decision: Decision
}

const BANGKOK_TIMEZONE = 'Asia/Bangkok'
const DAY_MS = 86_400_000

/** Demo assumption: a newly added Trust Contact member is still counted for this many days. */
export const WATCH_PERIOD_DAYS = 7
/** Mentor feedback: the earlier 2-minute wait was too long. A hypothesis to test, not policy. */
export const PAUSE_DELAY_MS = 30_000
/** Pause when this many of the 3T checks fail. */
export const PAUSE_FAILED_CHECKS = 2

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || !/(?:Z|[+-]\d\d:\d\d)$/i.test(value)) {
    throw new Error(`Expected an ISO timestamp with timezone: ${value}`)
  }
  return parsed
}

function validBaht(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

/** Calendar month in Thailand, independent of the viewer's device timezone. */
export function getBangkokMonthKey(isoTimestamp: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(timestamp(isoTimestamp)))
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  if (!year || !month) throw new Error('Could not determine Bangkok calendar month')
  return `${year}-${month}`
}

/** Whole days remaining in a member's watch period at `now`; 0 once it has ended. */
export function watchDaysLeft(member: TrustContactMember, now: string): number {
  const endsAt = timestamp(member.addedAt) + WATCH_PERIOD_DAYS * DAY_MS
  const left = endsAt - timestamp(now)
  return left > 0 ? Math.ceil(left / DAY_MS) : 0
}

/** A recipient is effectively trusted only when in the Trust Contact and past the watch period. */
export function isEffectivelyTrusted(settings: TrustGuardSettings, recipientId: string, now: string): boolean {
  const member = settings.trustContacts.find((item) => item.recipientId === recipientId)
  return member !== undefined && watchDaysLeft(member, now) === 0
}

/** Counted (Trust Limit) total for the Bangkok month of `now`, from completed transfers. */
export function countedMonthTotal(ledger: readonly CompletedTransfer[], now: string): number {
  const monthKey = getBangkokMonthKey(now)
  return ledger.reduce((sum, item) => {
    if (!validBaht(item.amountBaht)) throw new Error('Ledger amounts must be whole, non-negative baht')
    return item.counted && getBangkokMonthKey(item.createdAt) === monthKey ? sum + item.amountBaht : sum
  }, 0)
}

export function evaluateTransfer(input: {
  draft: TransferDraft
  ledger: readonly CompletedTransfer[]
  settings: TrustGuardSettings
  baseline: LimitBaseline | null
}): Evaluation {
  const { draft, ledger, settings, baseline } = input
  if (!validBaht(draft.amountBaht) || draft.amountBaht === 0) throw new Error('Transfer amount must be a positive whole baht amount')
  if (!validBaht(settings.monthlyLimitBaht) || settings.monthlyLimitBaht === 0) throw new Error('Trust Limit must be a positive whole baht amount')

  const now = draft.createdAt
  const monthKey = getBangkokMonthKey(now)
  const member = settings.trustContacts.find((item) => item.recipientId === draft.recipient.id)
  const daysLeft = member ? watchDaysLeft(member, now) : 0
  const trusted = member !== undefined && daysLeft === 0

  const zone: ZoneCheck = {
    status: settings.zone,
    // Being inside never clears another check; unavailable location is not itself suspicious.
    state: settings.zone === 'outside' ? 'fail' : settings.zone === 'inside' ? 'pass' : 'unknown',
  }
  const contact: ContactCheck = { state: trusted ? 'pass' : 'fail', inList: member !== undefined, watchDaysLeft: daysLeft }

  const counted = !trusted
  const monthTotalBaht = countedMonthTotal(ledger, now) + (counted ? draft.amountBaht : 0)
  const baselineBaht = baseline && baseline.monthKey === monthKey ? baseline.baht : 0
  const sinceBaselineBaht = Math.max(0, monthTotalBaht - baselineBaht)
  const limit: LimitCheck = {
    counted,
    monthTotalBaht,
    sinceBaselineBaht,
    limitBaht: settings.monthlyLimitBaht,
    state: counted && sinceBaselineBaht >= settings.monthlyLimitBaht ? 'fail' : 'pass',
  }

  const failedCount = [zone, contact, limit].filter((check) => check.state === 'fail').length
  const decision: Decision = !settings.enabled || failedCount === 0
    ? 'complete'
    : failedCount >= PAUSE_FAILED_CHECKS ? 'pause' : 'notice'

  return { monthKey, zone, contact, limit, failedCount, decision }
}

/** Sender-only context: this transfer as a whole-number share of the demo monthly salary. */
export function salaryShare(amountBaht: number, monthlySalaryBaht: number): number {
  if (!validBaht(amountBaht) || !validBaht(monthlySalaryBaht) || monthlySalaryBaht === 0) {
    throw new Error('Amount and salary must be whole baht; salary must be positive')
  }
  return Math.round((amountBaht / monthlySalaryBaht) * 100)
}

/** Settings changes that lower protection and therefore need an explicit confirmation. */
export function weakeningChanges(before: TrustGuardSettings, after: TrustGuardSettings): Array<'disabled' | 'limit-raised'> {
  const changes: Array<'disabled' | 'limit-raised'> = []
  if (before.enabled && !after.enabled) changes.push('disabled')
  if (after.monthlyLimitBaht > before.monthlyLimitBaht) changes.push('limit-raised')
  return changes
}

export const DEMO_MONTHLY_SALARY_BAHT = 28_000
export const DEMO_BALANCE_BAHT = 28_000
export const DEMO_SENDER = { name: 'พลอย', maskedAccount: '•• 4821' }

export const DEMO_RECIPIENTS: readonly Recipient[] = [
  { id: 'niran', name: 'นิรันดร์', maskedAccount: '•• 6392', kind: 'person', note: 'ผู้ขายออนไลน์' },
  { id: 'it-shop', name: 'ร้านอุปกรณ์ไอทีตัวอย่าง', maskedAccount: '•• 1048', kind: 'merchant', note: 'ร้านค้า' },
  { id: 'mom', name: 'แม่', maskedAccount: '•• 2275', kind: 'person', note: 'ครอบครัว' },
  { id: 'min', name: 'มิน', maskedAccount: '•• 7730', kind: 'person', note: 'เพื่อนสนิท' },
]

export function findRecipient(id: string): Recipient {
  const recipient = DEMO_RECIPIENTS.find((item) => item.id === id)
  if (!recipient) throw new Error(`Unknown demo recipient: ${id}`)
  return recipient
}

/** Initial settings; Trust Contact members were added long ago so they are past the watch period. */
export const DEMO_SETTINGS: TrustGuardSettings = {
  enabled: true,
  monthlyLimitBaht: 15_000,
  trustContacts: [
    { recipientId: 'mom', addedAt: '2026-01-05T09:00:00+07:00' },
    { recipientId: 'min', addedAt: '2026-03-12T09:00:00+07:00' },
  ],
  zone: 'inside',
}

export interface DemoScenario {
  id: 'scam-deposit' | 'split-transfers' | 'laptop' | 'mom'
  title: string
  detail: string
  recipientId: string
  amountBaht: number
}

/** Prepared transfers on Home. Testers repeat the split transfer three times. */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  { id: 'scam-deposit', title: 'ค่าจองสินค้า', detail: 'โอนให้นิรันดร์', recipientId: 'niran', amountBaht: 18_000 },
  { id: 'split-transfers', title: 'โอนแบ่งจ่าย', detail: 'โอนให้นิรันดร์ ทำซ้ำ 3 ครั้ง', recipientId: 'niran', amountBaht: 6_000 },
  { id: 'laptop', title: 'ซื้อแล็ปท็อป', detail: 'จ่ายร้านอุปกรณ์ไอที', recipientId: 'it-shop', amountBaht: 22_000 },
  { id: 'mom', title: 'โอนให้แม่', detail: 'Trust Contact ของคุณ', recipientId: 'mom', amountBaht: 5_000 },
]
