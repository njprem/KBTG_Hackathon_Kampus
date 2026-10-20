import { useEffect, useState, type RefObject } from 'react'
import { Hand, PhoneCall, ShieldAlert } from 'lucide-react'
import { DEMO_MONTHLY_SALARY_BAHT, salaryShare, type Evaluation, type Recipient } from '../domain/trustguard'
import { BottomSheet } from '../ui/BottomSheet'
import { CheckRow } from '../ui/CheckRow'
import { MEANING, limitStatusLine, contactStatusLine, zoneStatusLine } from '../ui/copy'
import { formatBaht, formatCountdown } from '../ui/format'
import { Button } from '../ui/primitives'

/**
 * The only red on the screen: a frame around the three checks, so the failed T's are where the eye lands.
 * One explanation opens at a time, so the sheet stays on one screen.
 */
export function ThreeTChecklist({ evaluation, recipient }: { evaluation: Evaluation; recipient: Recipient }) {
  const [openName, setOpenName] = useState<string | null>(null)
  const row = (name: string) => ({ open: openName === name, onOpenChange: (open: boolean) => setOpenName(open ? name : null) })

  // Any tap outside the rows and the open card closes it.
  useEffect(() => {
    if (openName === null) return
    const close = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target?.closest('[data-check-trigger], [role="region"]')) setOpenName(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [openName])
  return (
    <section aria-labelledby="three-t-title" className="rounded-[26px] bg-fail p-1.5 shadow-[0_14px_30px_rgb(179_19_31_/_0.24)]">
      <div className="flex items-center gap-2 px-3 pb-2 pt-1.5 text-white">
        <ShieldAlert size={17} aria-hidden="true" />
        <h3 id="three-t-title" className="flex-1 text-[14px] font-semibold">ผลการเช็ก 3T</h3>
      </div>
      <div className="rounded-[20px] bg-surface">
        <CheckRow name="Trust Zone" {...row('Trust Zone')} state={evaluation.zone.state} statusLine={zoneStatusLine(evaluation.zone.status, evaluation.zone.learned)} meaning={MEANING.zone} />
        <CheckRow name="Trust Contact" {...row('Trust Contact')} state={evaluation.contact.state} statusLine={contactStatusLine(evaluation, recipient)} meaning={MEANING.contact} />
        <CheckRow name="Trust Limit" {...row('Trust Limit')} state={evaluation.limit.state} statusLine={limitStatusLine(evaluation)} meaning={MEANING.limit} />
      </div>
      <p className="px-3 pb-1 pt-1.5 text-center text-[12px] text-white/85 short:hidden">แตะ (i) เพื่อดูว่าแต่ละข้อหมายถึงอะไร</p>
    </section>
  )
}

export function SmartPauseSheet({ open, onOpenChange, container, evaluation, recipient, amountBaht, remainingMs, onCancel, onContinue, onSkipWait }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: RefObject<HTMLElement | null>
  evaluation: Evaluation
  recipient: Recipient
  amountBaht: number
  remainingMs: number
  onCancel: () => void
  onContinue: () => void
  onSkipWait: () => void
}) {
  const waiting = remainingMs > 0
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      container={container}
      closeLabel="ปิดเพื่อกลับไปดูรายการ"
      badge={<Hand size={24} aria-hidden="true" />}
      title={<>
        <span className="mx-auto mb-2 flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[12.5px] font-semibold text-brand">
          TrustGuard พักรายการนี้ไว้ก่อน
        </span>
        เงินยังไม่ถูกโอน
      </>}
      description={`ไม่ผ่าน ${evaluation.failedCount} จาก 3 ข้อ ลองทบทวนก่อนตัดสินใจ`}
    >
      <div className="rounded-[22px] bg-surface px-4 py-3 text-center shadow-card short:py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
          <strong className="tabular text-[28px] font-semibold leading-tight tracking-tight text-ink">{formatBaht(amountBaht)}</strong>
          <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[12px] font-medium text-ink-muted">{salaryShare(amountBaht, DEMO_MONTHLY_SALARY_BAHT) || '<1'}% ของเงินเดือน</span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">ถึง {recipient.name} · บัญชี {recipient.maskedAccount}</p>
      </div>

      <div className="mt-3">
        <ThreeTChecklist evaluation={evaluation} recipient={recipient} />
      </div>

      <p className="mt-3 flex items-start gap-2.5 rounded-[20px] bg-caution-soft px-4 py-2.5 text-[14px] short:py-2 font-semibold leading-snug text-caution" role="note">
        <PhoneCall size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        ถ้ามีคนบอกให้กดข้ามหน้านี้ คนนั้นคือมิจฉาชีพ
      </p>

      {/* Short phones put the two actions side by side; Cancel stays first and filled. */}
      <div className="mt-4 grid gap-2 short:mt-3 short:grid-cols-2">
        <Button onClick={onCancel}>ยกเลิกการโอน</Button>
        <Button variant="secondary" disabled={waiting} onClick={onContinue} aria-describedby="continue-wait">
          {waiting ? <>โอนต่อได้ใน <span className="tabular">{formatCountdown(remainingMs)}</span></> : 'โอนต่อ'}
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-x-1 text-[12px] short:col-span-2 short:-mt-1">
          <p id="continue-wait" className="text-ink-faint">
            {waiting ? 'ระหว่างนี้ลองโทรถามคนที่คุณไว้ใจก่อน' : 'ครบเวลาแล้ว คุณตัดสินใจเองได้'}
          </p>
          {waiting && (
            <button type="button" onClick={onSkipWait} className="min-h-10 rounded-lg px-2 font-medium text-brand-accent underline underline-offset-2">
              ข้ามเวลารอ (เฉพาะการทดลอง)
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
