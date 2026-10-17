/**
 * TrustGuard demo rules. Every account, person, amount, and response here is fictional.
 * This module does not move money, contact a bank, or use real risk/location data.
 * Amounts are whole Thai baht for this prototype; the UI may format them with .00.
 */

export type ProtectionLevel = "off" | "warn" | "approval-required";
export type RecipientWatchStatus = "watched" | "established";
export type RecipientRisk = "unknown" | "none" | "elevated";
export type TrustedZoneStatus = "inside" | "outside" | "unavailable";

export interface Recipient {
  id: string;
  name: string;
  maskedAccount: string;
  watchStatus: RecipientWatchStatus;
  risk: RecipientRisk;
}

export interface DemoTransfer {
  id: string;
  /** ISO timestamp with an explicit timezone or Z. */
  createdAt: string;
  senderName: string;
  sourceMaskedAccount: string;
  recipient: Recipient;
  amountBaht: number;
  purpose: string;
  zoneStatus: TrustedZoneStatus;
}

export interface PriorTransfer {
  id: string;
  /** ISO timestamp with an explicit timezone or Z. */
  createdAt: string;
  recipientWatchStatus: RecipientWatchStatus;
  amountBaht: number;
}

export interface TrustGuardSettings {
  level: ProtectionLevel;
  monthlyLimitBaht: number;
  trustedContact: {
    name: string;
    relationship: string;
    /** The demo assumes this person agreed to receive limited transfer details. */
    consented: boolean;
  };
}

export type PauseReason =
  | "monthly-limit"
  | "recipient-risk"
  | "outside-trusted-zone";

export interface Evaluation {
  action: "continue" | "smart-pause";
  reasons: PauseReason[];
  monthKey: string;
  monthlyPriorBaht: number;
  monthlyTotalBaht: number;
  monthlyLimitBaht: number;
  contactNotification: "none" | "advice-request" | "approval-request";
  /** Earliest manual confirmation in Warn; reaching this time never confirms automatically. */
  warnEligibleAt: string | null;
}

export type ContactResponse =
  | { kind: "no-response" }
  | { kind: "warn-advice"; advice: "looks-okay" | "concern"; respondedAt: string }
  | { kind: "approval-decision"; decision: "approved" | "rejected"; respondedAt: string };

/** Recovery is a separate simulated review, never instant sender approval. */
export type RecoveryState =
  | "not-started"
  | "request-drafted"
  | "pending-demo-review";

export type SenderOutcome =
  | "paused"
  | "cancelled"
  | "contact-approved"
  | "warn-manually-confirmed"
  | "recovery-pending";

export interface DemoScenario {
  id: "limit-only" | "split-transfers" | "ordinary-high-value";
  label: string;
  description: string;
  transfer: DemoTransfer;
  history: PriorTransfer[];
  settings: TrustGuardSettings;
}

const BANGKOK_TIMEZONE = "Asia/Bangkok";
export const WARN_MINIMUM_WAIT_MS = 120_000;

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || !/(?:Z|[+-]\d\d:\d\d)$/i.test(value)) {
    throw new Error(`Expected an ISO timestamp with timezone: ${value}`);
  }
  return parsed;
}

function validBaht(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/** Calendar month in Thailand, independent of the viewer's device timezone. */
export function getBangkokMonthKey(isoTimestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(timestamp(isoTimestamp)));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Could not determine Bangkok calendar month");
  return `${year}-${month}`;
}

export function evaluateTransfer(input: {
  transfer: DemoTransfer;
  history: readonly PriorTransfer[];
  settings: TrustGuardSettings;
  /** When this demo review begins; use current time to start the Warn timer. */
  reviewStartedAt: string;
}): Evaluation {
  const { transfer, history, settings, reviewStartedAt } = input;
  if (!validBaht(transfer.amountBaht) || !validBaht(settings.monthlyLimitBaht) || settings.monthlyLimitBaht === 0) {
    throw new Error("Transfer amount must be non-negative and monthly limit must be a positive whole baht amount");
  }
  const transferTime = timestamp(transfer.createdAt);
  const reviewStartTime = timestamp(reviewStartedAt);
  const monthKey = getBangkokMonthKey(transfer.createdAt);

  // Proposed demo assumption: all recipients remain watched until explicitly marked
  // established. A small earlier transfer never changes that status automatically.
  // Only completed prior transfers to watched recipients count, across recipients.
  const monthlyPriorBaht = history.reduce((sum, prior) => {
    if (!validBaht(prior.amountBaht)) throw new Error("Prior transfer amount must be whole, non-negative baht");
    return prior.id !== transfer.id &&
      prior.recipientWatchStatus === "watched" &&
      timestamp(prior.createdAt) < transferTime &&
      getBangkokMonthKey(prior.createdAt) === monthKey
      ? sum + prior.amountBaht
      : sum;
  }, 0);
  const monthlyTotalBaht = monthlyPriorBaht +
    (transfer.recipient.watchStatus === "watched" ? transfer.amountBaht : 0);

  const reasons: PauseReason[] = [];
  if (transfer.recipient.watchStatus === "watched" && monthlyTotalBaht >= settings.monthlyLimitBaht) {
    reasons.push("monthly-limit");
  }
  // These two signals are fictional inputs. Unknown risk and unavailable location
  // do not trigger or clear a pause. Being inside the zone cannot clear a limit.
  if (transfer.recipient.risk === "elevated") reasons.push("recipient-risk");
  if (transfer.zoneStatus === "outside") reasons.push("outside-trusted-zone");

  const paused = settings.level !== "off" && reasons.length > 0;
  const contactNotification = !paused || !settings.trustedContact.consented
    ? "none"
    : settings.level === "warn"
      ? "advice-request"
      : "approval-request";

  return {
    action: paused ? "smart-pause" : "continue",
    reasons,
    monthKey,
    monthlyPriorBaht,
    monthlyTotalBaht,
    monthlyLimitBaht: settings.monthlyLimitBaht,
    contactNotification,
    warnEligibleAt: paused && settings.level === "warn"
      ? new Date(reviewStartTime + WARN_MINIMUM_WAIT_MS).toISOString()
      : null,
  };
}

/** This only gates a demo sender action; it does not initiate a transfer. */
export function canSenderConfirm(input: {
  evaluation: Evaluation;
  level: ProtectionLevel;
  now: string;
  contactResponse: ContactResponse;
  recoveryState: RecoveryState;
}): boolean {
  const { evaluation, level, now, contactResponse, recoveryState } = input;
  if (recoveryState !== "not-started") return false;
  if (evaluation.action === "continue") return true;
  if (level === "warn") {
    return evaluation.warnEligibleAt !== null && timestamp(now) >= timestamp(evaluation.warnEligibleAt);
  }
  return level === "approval-required" &&
    evaluation.contactNotification === "approval-request" &&
    contactResponse.kind === "approval-decision" &&
    contactResponse.decision === "approved";
}

const demoContact = { name: "มิน", relationship: "เพื่อนที่ไว้ใจ", consented: true };
const demoSettings: TrustGuardSettings = {
  level: "warn",
  monthlyLimitBaht: 15_000,
  trustedContact: demoContact,
};
const demoSender = { senderName: "พลอย", sourceMaskedAccount: "•• 4821" };

/** Fixed fictional examples; 2026 dates make demo behavior deterministic. */
export const PROTOTYPE_SCENARIOS: readonly DemoScenario[] = [
  {
    id: "limit-only",
    label: "ค่าจองสินค้า · ฿18,000",
    description: "โอน ฿18,000 ให้ผู้รับที่เฝ้าดู โดยไม่มีสัญญาณความเสี่ยงของบัญชี",
    settings: demoSettings,
    history: [],
    transfer: {
      id: "demo-limit-1",
      createdAt: "2026-10-16T10:00:00+07:00",
      ...demoSender,
      recipient: { id: "niran", name: "นิรันดร์", maskedAccount: "•• 6392", watchStatus: "watched", risk: "unknown" },
      amountBaht: 18_000,
      purpose: "ค่าจองสินค้า",
      zoneStatus: "inside",
    },
  },
  {
    id: "split-transfers",
    label: "ค่าจองสินค้า · ฿6,000",
    description: "ครั้งที่สามของการโอน ฿6,000 ในเดือนเดียวกัน ทำให้ยอดสะสมถึง ฿18,000",
    settings: demoSettings,
    history: [
      { id: "demo-split-1", createdAt: "2026-10-03T09:00:00+07:00", recipientWatchStatus: "watched", amountBaht: 6_000 },
      { id: "demo-split-2", createdAt: "2026-10-10T09:00:00+07:00", recipientWatchStatus: "watched", amountBaht: 6_000 },
    ],
    transfer: {
      id: "demo-split-3",
      createdAt: "2026-10-16T10:00:00+07:00",
      ...demoSender,
      recipient: { id: "niran", name: "นิรันดร์", maskedAccount: "•• 6392", watchStatus: "watched", risk: "unknown" },
      amountBaht: 6_000,
      purpose: "ค่าจองสินค้า",
      zoneStatus: "inside",
    },
  },
  {
    id: "ordinary-high-value",
    label: "ซื้อแล็ปท็อป · ฿22,000",
    description: "ซื้อแล็ปท็อป ฿22,000 จริง แต่ยังต้องผ่านการทบทวนตามวงเงินที่ตั้งไว้",
    settings: demoSettings,
    history: [],
    transfer: {
      id: "demo-laptop-1",
      createdAt: "2026-10-16T10:00:00+07:00",
      ...demoSender,
      recipient: { id: "demo-shop", name: "ร้านอุปกรณ์ไอทีตัวอย่าง", maskedAccount: "•• 1048", watchStatus: "watched", risk: "none" },
      amountBaht: 22_000,
      purpose: "ซื้อแล็ปท็อป",
      zoneStatus: "unavailable",
    },
  },
];
