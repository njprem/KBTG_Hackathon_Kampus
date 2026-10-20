import { useEffect, useState } from 'react'
import { ArrowRight, Check, MapPin, ShieldCheck, Users, WalletCards } from 'lucide-react'
import {
  DEMO_MONTHLY_SALARY_BAHT,
  DEMO_RECIPIENTS,
  DEMO_SIGNUP_ADDRESS,
  PAUSE_DELAY_MS,
  WATCH_PERIOD_DAYS,
  ZONE_SUGGESTIONS,
  setupContactMember,
  toZonePlace,
  type TrustGuardSettings,
  type TrustZonePlace,
} from '../domain/trustguard'
import { formatBahtShort } from '../ui/format'
import { Avatar, Button, Card, Heading, Steps, cx } from '../ui/primitives'
import { AiBadge, AiThinking, SuggestionCard } from '../ui/ZonePlaces'

const LIMIT_PRESETS = [5_000, 10_000, 15_000, 20_000]
/** Suggested starting limit: about half of the demo salary, rounded to a preset. */
const SUGGESTED_LIMIT = 15_000
/** How long the simulated AI "thinks" before showing Trust Zone suggestions. */
const AI_THINKING_MS = 1400
const STEP_COUNT = 4
const PEOPLE = DEMO_RECIPIENTS.filter((recipient) => recipient.kind === 'person')

/**
 * First-time setup: Trust Zone (AI suggestions), Trust Contact, Trust Limit, then a summary.
 * Nothing is checked until the user taps "เปิด TrustGuard" on the last step.
 */
export function SetupScreen({ now, onFinish }: { now: string; onFinish: (settings: TrustGuardSettings) => void }) {
  const [step, setStep] = useState(0)
  const [thinking, setThinking] = useState(true)
  const [places, setPlaces] = useState<TrustZonePlace[]>([])
  const [contacts, setContacts] = useState<string[]>([])
  const [limit, setLimit] = useState(SUGGESTED_LIMIT)

  useEffect(() => {
    const timer = window.setTimeout(() => setThinking(false), AI_THINKING_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const togglePlace = (id: string) => {
    const suggestion = ZONE_SUGGESTIONS.find((item) => item.id === id)
    if (!suggestion) return
    setPlaces((current) => current.some((place) => place.id === id) ? current.filter((place) => place.id !== id) : [...current, toZonePlace(suggestion)])
  }
  const toggleContact = (id: string) => setContacts((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  function finish() {
    onFinish({
      enabled: true,
      monthlyLimitBaht: limit,
      // People chosen now count right away; only people added later are watched first.
      trustContacts: contacts.map((recipientId) => setupContactMember(recipientId, now)),
      zonePlaces: places,
      zone: 'inside',
    })
  }

  const fromAddress = ZONE_SUGGESTIONS.filter((item) => item.source === 'address')
  const frequent = ZONE_SUGGESTIONS.filter((item) => item.source === 'frequent')
  const last = step === STEP_COUNT - 1

  return (
    <>
      <Steps current={step + 1} total={STEP_COUNT} dense />

      {step === 0 && (
        <>
          <Heading dense eyebrow="ขั้นที่ 1 · Trust Zone" title="พื้นที่ที่คุณโอนเป็นประจำ" detail="AI ช่วยหาให้ เลือกเฉพาะที่ใช่ของคุณ" />
          {thinking ? (
            <AiThinking label="AI กำลังอ่านที่อยู่และประวัติการโอน (จำลอง)" />
          ) : (
            <div className="grid grid-cols-1 gap-3 snug:gap-2">
              <section aria-labelledby="from-address" className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="from-address" className="min-w-0 text-[13px] font-semibold text-ink-muted">จากที่อยู่ตอนเปิดบัญชี</h2>
                  <AiBadge>AI แปลงที่อยู่</AiBadge>
                </div>
                {fromAddress.map((suggestion) => (
                  // Show which (fictional) address the AI read, in place of the generic reason.
                  <SuggestionCard key={suggestion.id} suggestion={{ ...suggestion, reason: `แปลงจาก ${DEMO_SIGNUP_ADDRESS}` }} added={places.some((place) => place.id === suggestion.id)} onToggle={() => togglePlace(suggestion.id)} />
                ))}
              </section>
              <section aria-labelledby="frequent" className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="frequent" className="min-w-0 text-[13px] font-semibold text-ink-muted">ที่ที่คุณโอนบ่อย</h2>
                  <AiBadge>AI วิเคราะห์การโอน</AiBadge>
                </div>
                {frequent.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} added={places.some((place) => place.id === suggestion.id)} onToggle={() => togglePlace(suggestion.id)} />
                ))}
              </section>
            </div>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <Heading dense eyebrow="ขั้นที่ 2 · Trust Contact" title="คนที่คุณไว้ใจ" detail="โอนให้คนเหล่านี้จะไม่ถูกพักและไม่นับยอด" />
          <ul className="grid gap-2">
            {PEOPLE.map((person) => {
              const added = contacts.includes(person.id)
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    aria-pressed={added}
                    onClick={() => toggleContact(person.id)}
                    className={cx('flex w-full items-center gap-3 rounded-[20px] bg-surface px-3.5 py-3 text-left shadow-card ring-2 transition-shadow', added ? 'ring-brand-accent' : 'ring-transparent')}
                  >
                    <Avatar name={person.name} tone={DEMO_RECIPIENTS.indexOf(person)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold">{person.name}</span>
                      <span className="block text-[12.5px] text-ink-muted">{person.note} · {person.maskedAccount}</span>
                    </span>
                    <span className={cx('grid size-7 place-items-center rounded-full border-2 transition-colors', added ? 'border-brand-accent bg-brand-accent text-white' : 'border-line-strong text-transparent')}>
                      <Check size={15} strokeWidth={3} aria-hidden="true" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-muted">คนที่เลือกตอนนี้ใช้ได้ทันที ส่วนคนที่เพิ่มทีหลังจะถูกเฝ้าดู {WATCH_PERIOD_DAYS} วันก่อน กันไม่ให้มิจฉาชีพสั่งให้เพิ่มบัญชีของเขา</p>
        </>
      )}

      {step === 2 && (
        <>
          <Heading dense eyebrow="ขั้นที่ 3 · Trust Limit" title="วงเงินต่อเดือน" detail="สำหรับคนที่ไม่ใช่ Trust Contact ยอดรวมทั้งเดือนถึงวงเงินเมื่อไร ระบบจะช่วยเช็ก" />
          <div role="radiogroup" aria-label="Trust Limit ต่อเดือน" className="grid grid-cols-2 gap-2">
            {LIMIT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={limit === preset}
                onClick={() => setLimit(preset)}
                className={cx('relative flex min-h-[72px] flex-col items-center justify-center rounded-[20px] bg-surface shadow-card ring-2 transition-shadow', limit === preset ? 'ring-brand-accent' : 'ring-transparent')}
              >
                <span className={cx('tabular text-[20px] font-semibold tracking-tight', limit === preset ? 'text-brand' : 'text-ink')}>{formatBahtShort(preset)}</span>
                {preset === SUGGESTED_LIMIT && <span className="mt-0.5 text-[11.5px] font-semibold text-brand-accent">แนะนำ</span>}
              </button>
            ))}
          </div>
          <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-muted">แนะนำราวครึ่งหนึ่งของเงินเดือน {formatBahtShort(DEMO_MONTHLY_SALARY_BAHT)} เปลี่ยนได้ทุกเมื่อในตั้งค่า</p>
        </>
      )}

      {last && (
        <>
          <Heading dense eyebrow="ขั้นสุดท้าย" title="พร้อมเปิด TrustGuard" detail="เช็ก 3T ทุกครั้งก่อนเงินออก" />
          <Card className="grid gap-3.5 p-4">
            <SummaryRow icon={<MapPin size={18} aria-hidden="true" />} title="Trust Zone" value={places.length ? places.map((place) => place.label).join(', ') : 'ยังไม่ได้เลือก เพิ่มทีหลังได้'} />
            <SummaryRow icon={<Users size={18} aria-hidden="true" />} title="Trust Contact" value={contacts.length ? `${contacts.map((id) => PEOPLE.find((person) => person.id === id)?.name).join(', ')} · ใช้ได้ทันที` : 'ยังไม่ได้เลือก เพิ่มทีหลังได้'} />
            <SummaryRow icon={<WalletCards size={18} aria-hidden="true" />} title="Trust Limit" value={`${formatBahtShort(limit)} ต่อเดือน`} />
          </Card>
          <p className="mt-3 flex items-start gap-2 rounded-[20px] bg-brand-tint px-4 py-3 text-[13px] leading-snug text-brand">
            <ShieldCheck size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            ถ้าไม่ผ่าน 2 ใน 3 ข้อ TrustGuard จะพักรายการไว้ {PAUSE_DELAY_MS / 1000} วินาทีให้คุณทบทวนก่อน
          </p>
        </>
      )}

      <div className={cx('mt-auto grid gap-2 pt-6 snug:pt-4', step > 0 && 'grid-cols-[2fr_3fr]')}>
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>ย้อนกลับ</Button>}
        <Button disabled={step === 0 && thinking} onClick={last ? finish : () => setStep(step + 1)}>
          {last ? 'เปิด TrustGuard' : 'ถัดไป'} <ArrowRight size={18} />
        </Button>
      </div>
    </>
  )
}

function SummaryRow({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[13px] leading-snug text-ink-muted">{value}</span>
      </span>
    </div>
  )
}
