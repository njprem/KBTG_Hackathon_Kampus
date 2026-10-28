import { useState, type RefObject } from 'react'
import { Switch } from '@base-ui/react/switch'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Toggle } from '@base-ui/react/toggle'
import { MapPin, Plus, ShieldCheck, Store, Users, WalletCards, X } from 'lucide-react'
import { DEMO_RECIPIENTS, WATCH_PERIOD_DAYS, findRecipient, pendingContactSuggestions, pendingZoneSuggestions, watchDaysLeft, type Recipient, type TrustGuardSettings, type TrustZoneStatus, type ZoneSuggestion } from '../domain/trustguard'
import { MEANING, ZONE_LABEL } from '../ui/copy'
import { formatBahtShort } from '../ui/format'
import { Avatar, Card, Heading, InfoDisclosure, cx } from '../ui/primitives'
import { AiBadge, AiSuggestionRow, SuggestionCard, ZonePlaceRow } from '../ui/ZonePlaces'
import { ZoneMapPickerLazy as ZoneMapPicker } from '../ui/ZoneMapPickerLazy'

const LIMIT_PRESETS = [5_000, 10_000, 15_000, 20_000]
const ZONES: TrustZoneStatus[] = ['inside', 'outside', 'unavailable']

export function SettingsScreen({ draft, now, onChange, container }: {
  draft: TrustGuardSettings
  now: string
  onChange: (next: TrustGuardSettings) => void
  container: RefObject<HTMLElement | null>
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const [mapSuggestion, setMapSuggestion] = useState<ZoneSuggestion | null>(null)
  const suggestions = pendingZoneSuggestions(draft.zonePlaces)
  // AI-suggested accounts get their own row with a reason, so they are not repeated as plain chips.

  return (
    <div className="grid grid-cols-1 gap-3">
      <Heading eyebrow="การปกป้องของคุณ" title="ตั้งค่า TrustGuard" detail="เช็ก 3T ก่อนเงินออก ไม่ผ่าน 2 ใน 3 ข้อ จะพักไว้ 30 วินาที" />

      <Card className="p-4">
        <label className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand"><ShieldCheck size={20} aria-hidden="true" /></span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">เปิด TrustGuard</span>
            <span className="block text-[12.5px] text-ink-muted">{draft.enabled ? 'เช็ก 3T ทุกครั้งก่อนโอน' : 'ไม่มีการเช็กหรือพักรายการ'}</span>
          </span>
          <Switch.Root
            checked={draft.enabled}
            onCheckedChange={(enabled) => onChange({ ...draft, enabled })}
            className="relative flex h-8 w-[52px] shrink-0 rounded-full bg-line-strong p-1 transition-colors duration-200 data-checked:bg-brand-accent"
          >
            <Switch.Thumb className="size-6 rounded-full bg-white shadow transition-transform duration-200 data-checked:translate-x-5" />
          </Switch.Root>
        </label>
      </Card>

      <Card className="p-4">
        <InfoDisclosure title="Trust Zone" label="Trust Zone แตะเพื่อดูความหมาย" icon={<MapPin size={19} className="text-brand" aria-hidden="true" />}>{MEANING.zone}</InfoDisclosure>
        {draft.zonePlaces.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-2">
            {draft.zonePlaces.map((place) => (
              <ZonePlaceRow key={place.id} place={place} onRemove={() => onChange({ ...draft, zonePlaces: draft.zonePlaces.filter((item) => item.id !== place.id) })} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-canvas px-3.5 py-3 text-[13px] text-ink-muted">ยังไม่มีพื้นที่ใน Trust Zone</p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-[12.5px] text-ink-faint">AI พบพื้นที่ที่คุณน่าจะใช้ประจำ</p>
              <AiBadge />
            </div>
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} added={false} onToggle={() => { setMapSuggestion(suggestion); setMapOpen(true) }} />
            ))}
          </div>
        )}
        <button type="button" onClick={() => { setMapSuggestion(null); setMapOpen(true) }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface px-3 text-[13.5px] font-semibold text-brand">
          <Plus size={17} aria-hidden="true" /> เพิ่มพื้นที่บนแผนที่
        </button>
        <p id="zone-label" className="mt-4 text-[13px] text-ink-muted">ตำแหน่งตอนนี้ (จำลองสำหรับการทดลอง)</p>
        <ToggleGroup
          value={[draft.zone]}
          onValueChange={(value) => { const next = value[0] as TrustZoneStatus | undefined; if (next) onChange({ ...draft, zone: next }) }}
          aria-labelledby="zone-label"
          className="mt-2 grid gap-1.5"
        >
          {ZONES.map((zone) => (
            <Toggle key={zone} value={zone} className="min-h-11 rounded-xl border border-line px-3.5 text-left text-[13.5px] font-medium text-ink-muted transition-colors data-pressed:border-brand-accent data-pressed:bg-brand-tint data-pressed:text-brand">
              {ZONE_LABEL[zone]}
            </Toggle>
          ))}
        </ToggleGroup>
      </Card>

      <TrustPeopleCard kind="person" draft={draft} now={now} onChange={onChange} />
      <TrustPeopleCard kind="merchant" draft={draft} now={now} onChange={onChange} />

      <Card className="p-4">
        <InfoDisclosure title="Trust Limit" label="Trust Limit แตะเพื่อดูความหมาย" icon={<WalletCards size={19} className="text-brand" aria-hidden="true" />}>{MEANING.limit}</InfoDisclosure>
        <p id="limit-label" className="mt-3 text-[13px] text-ink-muted">วงเงินต่อเดือน สำหรับคนที่ไม่ใช่ Trust Contact</p>
        <ToggleGroup
          value={[String(draft.monthlyLimitBaht)]}
          onValueChange={(value) => { const next = Number(value[0]); if (next) onChange({ ...draft, monthlyLimitBaht: next }) }}
          aria-labelledby="limit-label"
          className="mt-2 grid grid-cols-4 gap-1.5"
        >
          {LIMIT_PRESETS.map((preset) => (
            <Toggle key={preset} value={String(preset)} className="tabular min-h-11 rounded-xl border border-line text-[13.5px] font-semibold text-ink-muted transition-colors data-pressed:border-brand-accent data-pressed:bg-brand-tint data-pressed:text-brand">
              {formatBahtShort(preset)}
            </Toggle>
          ))}
        </ToggleGroup>
      </Card>
      <ZoneMapPicker open={mapOpen} onOpenChange={setMapOpen} container={container} suggestion={mapSuggestion} onSave={(place) => onChange({ ...draft, zonePlaces: [...draft.zonePlaces.filter((item) => item.id !== place.id), place] })} />
    </div>
  )
}

const PEOPLE_CARDS = {
  person: { title: 'Trust Contact', icon: Users, meaning: MEANING.contact, noun: 'คนที่ไว้ใจ', empty: 'ยังไม่มีคนใน Trust Contact', ai: 'AI พบคนที่คุณโอนให้บ่อย' },
  merchant: { title: 'Trust List', icon: Store, meaning: MEANING.list, noun: 'ร้านประจำ', empty: 'ยังไม่มีร้านใน Trust List', ai: 'AI พบร้านที่คุณจ่ายบ่อย' },
} as const

/**
 * People (Trust Contact) and shops (Trust List) are shown as separate cards.
 * Both live in the same trusted list underneath, so the 3T rule and the watch period are the same.
 */
function TrustPeopleCard({ kind, draft, now, onChange }: {
  kind: Recipient['kind']
  draft: TrustGuardSettings
  now: string
  onChange: (next: TrustGuardSettings) => void
}) {
  const copy = PEOPLE_CARDS[kind]
  const ofKind = (recipientId: string) => findRecipient(recipientId).kind === kind
  const members = draft.trustContacts.filter((member) => ofKind(member.recipientId))
  const suggestions = pendingContactSuggestions(draft).filter((item) => ofKind(item.recipientId))
  // AI-suggested accounts get their own row with a reason, so they are not repeated as plain chips.
  const notInList = DEMO_RECIPIENTS.filter((recipient) => recipient.kind === kind
    && !draft.trustContacts.some((member) => member.recipientId === recipient.id)
    && !suggestions.some((item) => item.recipientId === recipient.id))
  const add = (recipientId: string) => onChange({ ...draft, trustContacts: [...draft.trustContacts, { recipientId, addedAt: now }] })
  const Icon = copy.icon
  return (
    <Card className="p-4">
      <InfoDisclosure title={copy.title} label={`${copy.title} แตะเพื่อดูความหมาย`} icon={<Icon size={19} className="text-brand" aria-hidden="true" />}>{copy.meaning}</InfoDisclosure>
      {members.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-2">
          {members.map((member) => {
            const recipient = findRecipient(member.recipientId)
            const daysLeft = watchDaysLeft(member, now)
            return (
              <li key={member.recipientId} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5">
                <Avatar name={recipient.name} tone={DEMO_RECIPIENTS.indexOf(recipient)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">{recipient.name}</span>
                  <span className={cx('block text-[12.5px]', daysLeft > 0 ? 'text-caution' : 'text-ink-muted')}>
                    {daysLeft > 0 ? `เพิ่งเพิ่ม · ยังนับยอดอีก ${daysLeft} วัน` : `${recipient.note} · ${recipient.maskedAccount}`}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`เอา${recipient.name}ออกจาก ${copy.title}`}
                  onClick={() => onChange({ ...draft, trustContacts: draft.trustContacts.filter((item) => item.recipientId !== member.recipientId) })}
                  className="grid size-10 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink"
                >
                  <X size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-canvas px-3.5 py-3 text-[13px] text-ink-muted">{copy.empty}</p>
      )}
      {suggestions.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 text-[12.5px] text-ink-faint">{copy.ai}</p>
            <AiBadge />
          </div>
          {suggestions.map((suggestion) => {
            const recipient = findRecipient(suggestion.recipientId)
            return (
              <AiSuggestionRow
                key={suggestion.recipientId}
                icon={<Avatar name={recipient.name} tone={DEMO_RECIPIENTS.indexOf(recipient)} />}
                title={recipient.name}
                reason={suggestion.reason}
                note={`เฝ้าดู ${WATCH_PERIOD_DAYS} วันก่อนเริ่มไม่นับยอด`}
                added={false}
                addLabel={`เพิ่ม ${recipient.name} เข้า ${copy.title}`}
                onAdd={() => add(suggestion.recipientId)}
              />
            )
          })}
        </div>
      )}
      {notInList.length > 0 && (
        <div className="mt-3">
          <p className="text-[12.5px] text-ink-faint">เพิ่ม{copy.noun} (เฝ้าดู {WATCH_PERIOD_DAYS} วันก่อนเริ่มไม่นับยอด)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {notInList.map((recipient) => (
              <button
                key={recipient.id}
                type="button"
                onClick={() => add(recipient.id)}
                className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 text-[13px] font-medium text-brand hover:bg-brand-tint"
              >
                <Plus size={15} aria-hidden="true" /> {recipient.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
