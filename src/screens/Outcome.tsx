import { Check, Phone, RefreshCcw, X } from 'lucide-react'
import type { RefObject } from 'react'
import type { AiSuggestions, ContactSuggestion, Recipient, ZoneSuggestion } from '../domain/trustguard'
import { formatBaht } from '../ui/format'
import { m } from 'motion/react'
import { Button, DataRow, cx } from '../ui/primitives'
import { EdgeBadge } from '../ui/motion'
import { AiSuggestionsButton } from '../ui/ZonePlaces'

export type OutcomeKind = 'completed' | 'continued' | 'cancelled'

const COPY: Record<OutcomeKind, { title: string; detail: string }> = {
  completed: { title: 'โอนสำเร็จ (จำลอง)', detail: 'ผ่านการเช็ก 3T ไม่มีการพักรายการ' },
  continued: { title: 'คุณเลือกโอนต่อ (จำลอง)', detail: 'TrustGuard จะเริ่มนับ Trust Limit ใหม่จากยอดนี้' },
  cancelled: { title: 'ยกเลิกการโอนแล้ว', detail: 'เงินยังอยู่ในบัญชีของคุณ' },
}

/** The slip stays clean (people screenshot it); AI suggestions are one small button under it. */
export function OutcomeScreen({ kind, recipient, amountBaht, ai, sheetContainer, onAcceptZone, onAcceptContact, onOpenAi, onAgain, onHome }: {
  kind: OutcomeKind
  recipient: Recipient
  amountBaht: number
  ai: (AiSuggestions & { zoneAdded: boolean; contactAdded: boolean }) | null
  sheetContainer: RefObject<HTMLElement | null>
  onAcceptZone: (suggestion: ZoneSuggestion) => void
  onAcceptContact: (suggestion: ContactSuggestion) => void
  onOpenAi: () => void
  onAgain: () => void
  onHome: () => void
}) {
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

      {ai && <AiSuggestionsButton ai={ai} container={sheetContainer} onAcceptZone={onAcceptZone} onAcceptContact={onAcceptContact} onOpen={onOpenAi} />}

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
