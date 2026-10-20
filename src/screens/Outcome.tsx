import { useState } from 'react'
import { Check, Phone, RefreshCcw, X } from 'lucide-react'
import { WATCH_PERIOD_DAYS, findRecipient, toZonePlace, type ContactSuggestion, type Recipient, type ZoneSuggestion } from '../domain/trustguard'
import { formatBaht } from '../ui/format'
import { m } from 'motion/react'
import { Avatar, Button, DataRow, cx } from '../ui/primitives'
import { EdgeBadge } from '../ui/motion'
import { AiBadge, AiSuggestionRow, PlaceIcon } from '../ui/ZonePlaces'

export type OutcomeKind = 'completed' | 'continued' | 'cancelled'

const COPY: Record<OutcomeKind, { title: string; detail: string }> = {
  completed: { title: 'โอนสำเร็จ (จำลอง)', detail: 'ผ่านการเช็ก 3T ไม่มีการพักรายการ' },
  continued: { title: 'คุณเลือกโอนต่อ (จำลอง)', detail: 'TrustGuard จะเริ่มนับ Trust Limit ใหม่จากยอดนี้' },
  cancelled: { title: 'ยกเลิกการโอนแล้ว', detail: 'เงินยังอยู่ในบัญชีของคุณ' },
}

export function OutcomeScreen({ kind, recipient, amountBaht, suggestions, zoneAdded, contactAdded, onAcceptZone, onAcceptContact, onAgain, onHome }: {
  kind: OutcomeKind
  recipient: Recipient
  amountBaht: number
  /** AI suggestions captured when the transfer finished; empty after a cancel. */
  suggestions: { zone?: ZoneSuggestion; contact?: ContactSuggestion }
  zoneAdded: boolean
  contactAdded: boolean
  onAcceptZone: (suggestion: ZoneSuggestion) => void
  onAcceptContact: (suggestion: ContactSuggestion) => void
  onAgain: () => void
  onHome: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  return (
    <>
      <m.section
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="relative mt-12 rounded-[28px] bg-surface px-5 pb-4 pt-12 text-center shadow-card"
      >
        <EdgeBadge tone={kind === 'cancelled' ? 'brand' : 'pass'}>
          {kind === 'cancelled' ? <X size={26} strokeWidth={2.6} /> : <Check size={26} strokeWidth={2.6} />}
        </EdgeBadge>
        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink">{COPY[kind].title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{COPY[kind].detail}</p>
        <p className={cx('tabular mt-5 text-[32px] font-semibold tracking-tight', kind === 'cancelled' && 'text-ink-faint line-through decoration-2')}>{formatBaht(amountBaht)}</p>
        <div className="mt-3 border-t border-dashed border-line-strong pt-2 text-left">
          <DataRow label="ผู้รับ" value={recipient.name} />
          <DataRow label="บัญชี" value={recipient.maskedAccount} />
          <DataRow label="เงินจริง" value="ไม่มีการโอนจริง" />
        </div>
      </m.section>

      {(suggestions.zone || suggestions.contact) && !dismissed && (
        // Sticks just above the bottom nav so the suggestion is seen right away; it settles in place when scrolled to.
        <m.section
          aria-labelledby="ai-title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 mt-3 grid grid-cols-1 gap-2 rounded-[22px] bg-surface p-3.5 shadow-[0_-6px_30px_rgb(16_56_51_/_0.16)] ring-1 ring-line"
        >
          <div className="flex items-center gap-2 px-0.5">
            <h2 id="ai-title" className="min-w-0 flex-1 text-[14px] font-semibold">AI พบว่าคุณโอนแบบนี้บ่อย</h2>
            <AiBadge />
            <button type="button" aria-label="ไว้ทีหลัง" onClick={() => setDismissed(true)} className="-my-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-canvas hover:text-ink">
              <X size={17} />
            </button>
          </div>
          {suggestions.zone && (
            <AiSuggestionRow
              icon={<PlaceIcon place={toZonePlace(suggestions.zone)} />}
              title={`เพิ่ม ${suggestions.zone.label} เข้า Trust Zone`}
              reason={suggestions.zone.reason}
              added={zoneAdded}
              addLabel={`เพิ่ม ${suggestions.zone.label} เข้า Trust Zone`}
              onAdd={() => suggestions.zone && onAcceptZone(suggestions.zone)}
            />
          )}
          {suggestions.contact && (
            <AiSuggestionRow
              icon={<Avatar name={findRecipient(suggestions.contact.recipientId).name} tone={1} />}
              title={`ตั้ง ${findRecipient(suggestions.contact.recipientId).name} เป็น Trust Contact`}
              reason={suggestions.contact.reason}
              note={`เพิ่มทีหลังจะเฝ้าดู ${WATCH_PERIOD_DAYS} วันก่อน`}
              added={contactAdded}
              addLabel={`ตั้ง ${findRecipient(suggestions.contact.recipientId).name} เป็น Trust Contact`}
              onAdd={() => suggestions.contact && onAcceptContact(suggestions.contact)}
            />
          )}
        </m.section>
      )}

      {kind !== 'completed' && (
        <div className="mt-3 flex items-start gap-3 rounded-[20px] bg-surface px-4 py-3.5 shadow-card">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Phone size={17} aria-hidden="true" /></span>
          <p className="text-[13.5px] leading-snug text-ink">
            <span className="block font-semibold">สงสัยว่ากำลังถูกหลอก?</span>
            <span className="block text-ink-muted">โทรสายด่วน AOC <strong className="tabular font-semibold text-ink">1441</strong> ตลอด 24 ชั่วโมง</span>
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-2">
        <Button onClick={onAgain}>โอนรายการเดิมอีกครั้ง <RefreshCcw size={17} /></Button>
        <Button variant="quiet" onClick={onHome}>กลับหน้าหลัก</Button>
      </div>
    </>
  )
}
