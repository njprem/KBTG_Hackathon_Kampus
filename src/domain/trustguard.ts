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

/** Where a Trust Zone place came from: the sign-up address, or the AI reading where the user often transfers. */
export type ZonePlaceSource = 'address' | 'frequent' | 'manual'

/** A coarse demo area; a manually chosen pin may also be kept in browser memory. */
export interface TrustZonePlace {
  id: string
  label: string
  area: string
  source: ZonePlaceSource
  /** User-positioned demo pin; no device location is requested or sent to TrustGuard. */
  latitude?: number
  longitude?: number
  radiusMeters?: number
}

/** A place the (simulated) AI proposes; the user decides whether to add it. */
export interface ZoneSuggestion extends TrustZonePlace {
  /** Plain-language reason shown to the user, e.g. how often they transferred there. */
  reason: string
}

export interface TrustGuardSettings {
  enabled: boolean
  monthlyLimitBaht: number
  trustContacts: TrustContactMember[]
  /** Places the user accepted into Trust Zone. Descriptive in the prototype; the check uses `zone`. */
  zonePlaces: TrustZonePlace[]
  /** Simulated current location status; a real product would compare the device location with `zonePlaces`. */
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
  /** Simulated place the sender is at (a known place id). Without it, the Settings location toggle is used. */
  placeId?: string
}

export interface ZoneCheck {
  state: CheckState
  status: TrustZoneStatus
  /** Name of the simulated place, when the transfer came with one. */
  placeLabel?: string
  /** The AI already knows this as a frequent place the user has not confirmed: not counted either way. */
  learned?: boolean
}

export interface ContactCheck {
  state: CheckState
  inList: boolean
  /** The AI already knows this as an account the user pays often but has not confirmed: not counted either way. */
  learned?: boolean
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

/**
 * A Trust Contact chosen during first-time setup counts immediately (owner decision, 20 October 2026).
 * The watch period guards later additions, which is when a scammer would coach a victim to add their account.
 */
export function setupContactMember(recipientId: string, now: string): TrustContactMember {
  return { recipientId, addedAt: new Date(timestamp(now) - WATCH_PERIOD_DAYS * DAY_MS).toISOString() }
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

  // A transfer made at a known place is inside only if that place is in the user's Trust Zone.
  const place = draft.placeId ? findPlace(draft.placeId) : undefined
  const zoneStatus: TrustZoneStatus = draft.placeId
    ? settings.zonePlaces.some((item) => item.id === draft.placeId) ? 'inside' : 'outside'
    : settings.zone
  // Owner decision (20 October 2026): a frequent place or account the AI already recognises, but the user has not
  // confirmed yet, is not counted either way, so everyday purchases there are not paused while the AI suggests it.
  const zoneLearned = zoneStatus === 'outside' && ZONE_SUGGESTIONS.some((item) => item.id === draft.placeId && item.source === 'frequent')
  const zone: ZoneCheck = {
    status: zoneStatus,
    // Being inside never clears another check; unavailable location is not itself suspicious.
    state: zoneLearned ? 'unknown' : zoneStatus === 'outside' ? 'fail' : zoneStatus === 'inside' ? 'pass' : 'unknown',
    ...(place && { placeLabel: place.label }),
    ...(zoneLearned && { learned: true }),
  }
  const contactLearned = member === undefined && CONTACT_SUGGESTIONS.some((item) => item.recipientId === draft.recipient.id)
  const contact: ContactCheck = {
    state: trusted ? 'pass' : contactLearned ? 'unknown' : 'fail',
    inList: member !== undefined,
    watchDaysLeft: daysLeft,
    ...(contactLearned && { learned: true }),
  }

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
  { id: 'pork-stall', name: 'ร้านหมูปิ้งป้าแดง', maskedAccount: '•• 1048', kind: 'merchant', note: 'ร้านหมูปิ้งหน้าเซเว่น' },
  { id: 'mom', name: 'แม่', maskedAccount: '•• 2275', kind: 'person', note: 'ครอบครัว' },
  { id: 'min', name: 'มิน', maskedAccount: '•• 7730', kind: 'person', note: 'เพื่อนสนิท' },
]

export function findRecipient(id: string): Recipient {
  const recipient = DEMO_RECIPIENTS.find((item) => item.id === id)
  if (!recipient) throw new Error(`Unknown demo recipient: ${id}`)
  return recipient
}

/** Fictional address the user gave when opening the account; the simulated AI turns it into a Trust Zone area. */
export const DEMO_SIGNUP_ADDRESS = '88/8 หมู่บ้านตัวอย่าง ซอยลาดพร้าว 71 เขตวังทองหลาง กรุงเทพฯ'

/**
 * Simulated AI output. A real product would geocode the sign-up address into a coarse area
 * and cluster the locations of past transfers; here the results are fixed demo data.
 */
export const ZONE_SUGGESTIONS: readonly ZoneSuggestion[] = [
  { id: 'home', label: 'บ้าน', area: 'ลาดพร้าว 71 · รัศมี 1 กม.', source: 'address', reason: 'แปลงจากที่อยู่ตอนเปิดบัญชี' },
  { id: 'office', label: 'ที่ทำงาน', area: 'อโศก · รัศมี 1 กม.', source: 'frequent', reason: 'โอน 14 ครั้งใน 30 วัน ส่วนใหญ่ช่วงพักเที่ยง' },
  { id: 'seven', label: 'หน้าเซเว่น ซอยอารีย์ 1', area: 'อารีย์ · รัศมี 500 ม.', source: 'frequent', reason: 'จ่ายร้านหมูปิ้งที่นี่ 9 ครั้งใน 3 สัปดาห์' },
]

function findPlace(id: string): TrustZonePlace | undefined {
  return ZONE_SUGGESTIONS.find((item) => item.id === id)
}

/** A recipient the (simulated) AI proposes as a Trust Contact because the user pays them often. */
export interface ContactSuggestion {
  recipientId: string
  reason: string
}

/** Simulated AI output from past transfers; fixed demo data. */
export const CONTACT_SUGGESTIONS: readonly ContactSuggestion[] = [
  { recipientId: 'pork-stall', reason: 'โอน 9 ครั้งใน 3 สัปดาห์ ครั้งละไม่เกิน ฿60' },
]

/** Contact suggestions for people or shops not already in Trust Contact. */
export function pendingContactSuggestions(settings: TrustGuardSettings): ContactSuggestion[] {
  return CONTACT_SUGGESTIONS.filter((suggestion) => !settings.trustContacts.some((member) => member.recipientId === suggestion.recipientId))
}

/**
 * What the AI offers after a transfer: the place, if the user often transfers there and it is not in Trust Zone,
 * and the recipient, if the user often pays them and they are not a Trust Contact. Offered only once the transfer
 * is finished, never during a pause, so it cannot be used to talk someone past a warning.
 */
/** AI suggestions waiting on Home, with the transfer that triggered them. */
export interface AiSuggestions {
  zone?: ZoneSuggestion
  contact?: ContactSuggestion
  recipientId: string
  amountBaht: number
}

export function suggestionsAfterTransfer(settings: TrustGuardSettings, recipientId: string, placeId?: string): { zone?: ZoneSuggestion; contact?: ContactSuggestion } {
  const zone = placeId ? pendingZoneSuggestions(settings.zonePlaces).find((item) => item.id === placeId && item.source === 'frequent') : undefined
  const contact = pendingContactSuggestions(settings).find((item) => item.recipientId === recipientId)
  return { ...(zone && { zone }), ...(contact && { contact }) }
}

/** Suggestions the user has not accepted yet, in display order. */
export function pendingZoneSuggestions(places: readonly TrustZonePlace[]): ZoneSuggestion[] {
  return ZONE_SUGGESTIONS.filter((suggestion) => !places.some((place) => place.id === suggestion.id))
}

/** Accepting a suggestion stores the place without the AI's reason text. */
export function toZonePlace({ id, label, area, source }: ZoneSuggestion): TrustZonePlace {
  return { id, label, area, source }
}

/** Initial settings; Trust Contact members were added long ago so they are past the watch period. */
export const DEMO_SETTINGS: TrustGuardSettings = {
  enabled: true,
  monthlyLimitBaht: 15_000,
  trustContacts: [
    { recipientId: 'mom', addedAt: '2026-01-05T09:00:00+07:00' },
    { recipientId: 'min', addedAt: '2026-03-12T09:00:00+07:00' },
  ],
  zonePlaces: ZONE_SUGGESTIONS.slice(0, 2).map(toZonePlace),
  zone: 'inside',
}

/** A user who has not turned TrustGuard on yet: nothing is checked until they finish setup. */
export const NEW_USER_SETTINGS: TrustGuardSettings = {
  enabled: false,
  monthlyLimitBaht: 15_000,
  trustContacts: [],
  zonePlaces: [],
  zone: 'inside',
}

export interface DemoScenario {
  id: 'scam-deposit' | 'split-transfers' | 'pork' | 'mom'
  title: string
  detail: string
  recipientId: string
  amountBaht: number
  /** Simulated place the sender is at for this scenario. */
  placeId?: string
}

/** Prepared transfers on Home. Testers repeat the split transfer three times. */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  { id: 'scam-deposit', title: 'ค่าจองสินค้า', detail: 'โอนให้นิรันดร์', recipientId: 'niran', amountBaht: 18_000 },
  { id: 'split-transfers', title: 'โอนแบ่งจ่าย', detail: 'โอนให้นิรันดร์ ทำซ้ำ 3 ครั้ง', recipientId: 'niran', amountBaht: 6_000 },
  // An everyday purchase at a place and shop the AI already knows: it passes, then the AI suggests trusting them.
  { id: 'pork', title: 'หมูปิ้งหน้าเซเว่น', detail: 'จ่ายร้านหมูปิ้งป้าแดง', recipientId: 'pork-stall', amountBaht: 25, placeId: 'seven' },
  { id: 'mom', title: 'โอนให้แม่', detail: 'Trust Contact ของคุณ', recipientId: 'mom', amountBaht: 5_000 },
]
