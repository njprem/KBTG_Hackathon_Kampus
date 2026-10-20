import { useState, type ReactNode, type RefObject } from 'react'
import { m } from 'motion/react'
import { Building2, Check, ChevronRight, House, Plus, Sparkles, Store, X } from 'lucide-react'
import { WATCH_PERIOD_DAYS, findRecipient, toZonePlace, type AiSuggestions, type ContactSuggestion, type TrustZonePlace, type ZoneSuggestion } from '../domain/trustguard'
import { formatBaht } from './format'
import { Avatar, Button, cx } from './primitives'
import { BottomSheet } from './BottomSheet'

const PLACE_ICON: Record<string, typeof House> = { home: House, office: Building2, seven: Store }

export function PlaceIcon({ place }: { place: TrustZonePlace }) {
  const Icon = PLACE_ICON[place.id] ?? House
  return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={19} aria-hidden="true" /></span>
}

/** Small label that marks something as a (simulated) AI suggestion. */
export function AiBadge({ children = 'AI แนะนำ' }: { children?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#efe9fb] px-2 py-0.5 text-[11.5px] font-semibold text-[#5b3fa8]">
      <Sparkles size={12} aria-hidden="true" /> {children}
    </span>
  )
}

/** Placeholder while the simulated AI "reads" the sign-up address and past transfers. */
export function AiThinking({ label }: { label: string }) {
  return (
    <div role="status" className="rounded-[22px] bg-surface p-4 shadow-card">
      <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#5b3fa8]">
        <Sparkles size={17} className="motion-safe:animate-pulse" aria-hidden="true" /> {label}
      </span>
      <span aria-hidden="true" className="mt-3.5 grid gap-2.5">
        {[0, 1, 2].map((row) => (
          <span key={row} className="flex items-center gap-3">
            <span className="size-10 shrink-0 rounded-full bg-canvas motion-safe:animate-pulse" />
            <span className="grid flex-1 gap-1.5">
              <span className="h-3 w-2/5 rounded-full bg-canvas motion-safe:animate-pulse" />
              <span className="h-2.5 w-4/5 rounded-full bg-canvas motion-safe:animate-pulse" />
            </span>
          </span>
        ))}
      </span>
    </div>
  )
}

/** An AI suggestion the user can add to (or leave out of) Trust Zone. */
export function SuggestionCard({ suggestion, added, onToggle }: { suggestion: ZoneSuggestion; added: boolean; onToggle: () => void }) {
  return (
    <div className={cx('flex items-center gap-3 rounded-[20px] bg-surface px-3.5 py-3 shadow-card ring-2 transition-shadow snug:py-2', added ? 'ring-brand-accent' : 'ring-transparent')}>
      <PlaceIcon place={suggestion} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold">{suggestion.label}</span>
        <span className="block truncate text-[12.5px] text-ink-muted">{suggestion.area}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-[#5b3fa8]"><Sparkles size={12} className="shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{suggestion.reason}</span></span>
      </span>
      <button
        type="button"
        aria-pressed={added}
        aria-label={`${added ? 'เอาออก' : 'เพิ่ม'} ${suggestion.label} ใน Trust Zone`}
        onClick={onToggle}
        className={cx(
          'flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
          added ? 'bg-brand-accent text-white' : 'border border-line-strong text-brand hover:bg-brand-tint',
        )}
      >
        {added ? <><Check size={15} aria-hidden="true" /> เพิ่มแล้ว</> : <><Plus size={15} aria-hidden="true" /> เพิ่ม</>}
      </button>
    </div>
  )
}

/** A place already in Trust Zone, with where it came from and a remove button. */
export function ZonePlaceRow({ place, onRemove }: { place: TrustZonePlace; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5">
      <PlaceIcon place={place} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold">{place.label}</span>
        <span className="block truncate text-[12.5px] text-ink-muted">{place.area} · {place.source === 'address' ? 'จากที่อยู่ตอนเปิดบัญชี' : 'AI พบว่าโอนบ่อย'}</span>
      </span>
      <button type="button" aria-label={`เอา${place.label}ออกจาก Trust Zone`} onClick={onRemove} className="grid size-10 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink">
        <X size={18} />
      </button>
    </li>
  )
}

/** A compact AI suggestion inside a card: what to add, why, and an add button that turns into a check. */
export function AiSuggestionRow({ icon, title, reason, note, added, addLabel, onAdd }: {
  icon: ReactNode
  title: string
  reason: string
  note?: string
  added: boolean
  addLabel: string
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold leading-snug">{title}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-[#5b3fa8]"><Sparkles size={12} className="shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{reason}</span></span>
        {note && <span className="mt-0.5 block text-[11.5px] text-ink-faint">{note}</span>}
      </span>
      <button
        type="button"
        disabled={added}
        aria-label={added ? `${addLabel} แล้ว` : addLabel}
        onClick={onAdd}
        className={cx(
          'flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
          added ? 'bg-brand-accent text-white' : 'bg-surface text-brand shadow-card hover:bg-brand-tint',
        )}
      >
        {added ? <><Check size={15} aria-hidden="true" /> เพิ่มแล้ว</> : <><Plus size={15} aria-hidden="true" /> เพิ่ม</>}
      </button>
    </div>
  )
}

/** Shops are trusted as a "Trust List" entry; people stay "Trust Contact". Both use the same list underneath. */
export function trustListName(recipientId: string) {
  return findRecipient(recipientId).kind === 'merchant' ? 'Trust List' : 'Trust Contact'
}

/**
 * Small button under the slip, shown when a finished transfer pushes the AI's data past its threshold.
 * Tapping it opens the full suggestions in a bottom sheet, so the slip itself stays clean.
 */
export function AiSuggestionsButton({ ai, container, onAcceptZone, onAcceptContact, onOpen }: {
  ai: AiShown
  container: RefObject<HTMLElement | null>
  onAcceptZone: (suggestion: ZoneSuggestion) => void
  onAcceptContact: (suggestion: ContactSuggestion) => void
  /** Called when the user opens the suggestions here, so Home does not show them again. */
  onOpen: () => void
}) {
  const [open, setOpen] = useState(false)
  const lists = [ai.zone && 'Trust Zone', ai.contact && trustListName(ai.contact.recipientId)].filter(Boolean).join(' และ ')
  return (
    <>
      <m.button
        type="button"
        onClick={() => { setOpen(true); onOpen() }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        // White pill with a purple ring and glow so it stands out on the grey page, still quieter than the main button.
        className="mx-auto mt-3 flex min-h-12 max-w-full items-center gap-2.5 rounded-full bg-surface py-1.5 pl-1.5 pr-3.5 text-[13.5px] font-semibold text-[#4a2c96] shadow-[0_8px_22px_rgb(91_63_168_/_0.044)] ring-2 ring-[#8b6ee0] transition-transform active:scale-[0.98]"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#6d4fd0] text-white"><Sparkles size={16} aria-hidden="true" /></span>
        <span className="truncate">ร้านประจำ? เพิ่มเข้า {lists}</span>
        <ChevronRight size={17} className="shrink-0" aria-hidden="true" />
      </m.button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        container={container}
        closeLabel="ปิดคำแนะนำ"
        title="AI พบว่าคุณโอนแบบนี้บ่อย"
        description={<span className="flex flex-wrap items-center gap-x-2 gap-y-1"><AiBadge /><span>จากการโอนล่าสุด: {findRecipient(ai.recipientId).name} {formatBaht(ai.amountBaht)}</span></span>}
      >
        <div className="grid grid-cols-1 gap-2">
          <AiSuggestionRows ai={ai} onAcceptZone={onAcceptZone} onAcceptContact={onAcceptContact} />
          <Button className="mt-2" onClick={() => setOpen(false)}>เสร็จแล้ว</Button>
        </div>
      </BottomSheet>
    </>
  )
}

type AiShown = AiSuggestions & { zoneAdded: boolean; contactAdded: boolean }

/** The add-to-Trust Zone and add-to-Trust Contact/List rows, shared by the slip sheet and the Home card. */
function AiSuggestionRows({ ai, onAcceptZone, onAcceptContact }: {
  ai: AiShown
  onAcceptZone: (suggestion: ZoneSuggestion) => void
  onAcceptContact: (suggestion: ContactSuggestion) => void
}) {
  const contactName = ai.contact ? findRecipient(ai.contact.recipientId).name : ''
  return (
    <>
      {ai.zone && (
        <AiSuggestionRow
          icon={<PlaceIcon place={toZonePlace(ai.zone)} />}
          title={`เพิ่ม ${ai.zone.label} เข้า Trust\u00a0Zone`}
          reason={ai.zone.reason}
          added={ai.zoneAdded}
          addLabel={`เพิ่ม ${ai.zone.label} เข้า Trust Zone`}
          onAdd={() => ai.zone && onAcceptZone(ai.zone)}
        />
      )}
      {ai.contact && (
        <AiSuggestionRow
          icon={<Avatar name={contactName} tone={1} />}
          // Non-breaking space keeps "Trust List" on one line.
          title={`เพิ่ม ${contactName} เข้า ${trustListName(ai.contact.recipientId).replace(' ', '\u00a0')}`}
          reason={ai.contact.reason}
          note={`ไม่ถูกพักและไม่นับยอด · เพิ่มทีหลังจะเฝ้าดู ${WATCH_PERIOD_DAYS} วันก่อน`}
          added={ai.contactAdded}
          addLabel={`เพิ่ม ${contactName} เข้า ${trustListName(ai.contact.recipientId)}`}
          onAdd={() => ai.contact && onAcceptContact(ai.contact)}
        />
      )}
    </>
  )
}

/**
 * Home card for suggestions the user did not open on the slip.
 * x closes it; ticking "ไม่แสดงอีก 30 วัน" first keeps AI suggestions off Home for 30 days.
 */
export function AiSuggestionsCard({ ai, onAcceptZone, onAcceptContact, onDismiss }: {
  ai: AiShown
  onAcceptZone: (suggestion: ZoneSuggestion) => void
  onAcceptContact: (suggestion: ContactSuggestion) => void
  onDismiss: (snooze: boolean) => void
}) {
  const [snooze, setSnooze] = useState(false)
  return (
    <m.section
      aria-labelledby="ai-home-title"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      className="grid grid-cols-1 gap-2 rounded-[24px] bg-surface p-4 shadow-card ring-1 ring-[#e6ddf8]"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#efe9fb] text-[#5b3fa8]"><Sparkles size={19} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <h2 id="ai-home-title" className="text-[15px] font-semibold">AI พบว่าคุณโอนแบบนี้บ่อย</h2>
          <span className="block truncate text-[12.5px] text-ink-muted">จากการโอนล่าสุด: {findRecipient(ai.recipientId).name} {formatBaht(ai.amountBaht)}</span>
        </span>
        <button type="button" aria-label="ปิดคำแนะนำ" onClick={() => onDismiss(snooze)} className="-mr-1.5 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-canvas hover:text-ink">
          <X size={18} />
        </button>
      </div>
      <AiSuggestionRows ai={ai} onAcceptZone={onAcceptZone} onAcceptContact={onAcceptContact} />
      <label className="mt-1 flex min-h-10 cursor-pointer items-center gap-2.5 px-1 text-[13px] text-ink-muted">
        <input type="checkbox" checked={snooze} onChange={(event) => setSnooze(event.target.checked)} className="size-[18px] accent-brand-accent" />
        ไม่แสดงอีก 30 วัน
      </label>
    </m.section>
  )
}
