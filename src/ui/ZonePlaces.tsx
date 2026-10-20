import type { ReactNode } from 'react'
import { Building2, Check, House, Plus, Sparkles, Store, X } from 'lucide-react'
import type { TrustZonePlace, ZoneSuggestion } from '../domain/trustguard'
import { cx } from './primitives'

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
