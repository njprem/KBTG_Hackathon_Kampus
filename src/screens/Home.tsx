import { useState } from 'react'
import { ArrowRight, ArrowUpRight, ChevronRight, Eye, EyeOff, HeartHandshake, MapPin, PackageOpen, Plus, Repeat2, Send, ShieldCheck, Store, Users, WalletCards } from 'lucide-react'
import { DEMO_RECIPIENTS, DEMO_SCENARIOS, DEMO_SENDER, evaluateTransfer, findRecipient, type Evaluation, type LimitBaseline, type CompletedTransfer, type DemoScenario, type TrustGuardSettings } from '../domain/trustguard'
import { ZONE_LABEL } from '../ui/copy'
import { formatBaht, formatBahtShort } from '../ui/format'
import { Avatar, Button, cx } from '../ui/primitives'
import { AiBadge } from '../ui/ZonePlaces'
import { ProgressRing } from '../ui/motion'

type Preview = Evaluation['decision'] | 'balance'
const PREVIEW_LABEL: Record<Preview, string> = { pause: 'จะถูกพัก', notice: 'มีคำเตือน', complete: 'โอนผ่าน', balance: 'ยอดเงินไม่พอ' }
const PREVIEW_STYLE: Record<Preview, string> = {
  pause: 'bg-caution-soft text-caution',
  notice: 'bg-brand-soft text-brand',
  complete: 'bg-pass-soft text-pass',
  balance: 'bg-unknown-soft text-unknown',
}
const SCENARIO_ICON: Record<string, typeof Send> = { 'scam-deposit': PackageOpen, 'split-transfers': Repeat2, pork: Store, mom: HeartHandshake }

const THREE_T = [
  { icon: MapPin, name: 'Trust Zone', detail: 'ที่ที่โอนประจำ' },
  { icon: Users, name: 'Trust Contact', detail: 'คนที่ไว้ใจ' },
  { icon: WalletCards, name: 'Trust Limit', detail: 'วงเงินต่อเดือน' },
] as const

export function HomeScreen({ balance, settings, countedThisMonth, ledger, baseline, now, onboarded, onTransfer, onScenario, onSettings, onStartSetup }: {
  balance: number
  /** False for the demo user who has not turned TrustGuard on yet. */
  onboarded: boolean
  onStartSetup: () => void
  baseline: LimitBaseline | null
  now: string
  settings: TrustGuardSettings
  countedThisMonth: number
  ledger: readonly CompletedTransfer[]
  onTransfer: (recipientId?: string) => void
  onScenario: (scenario: DemoScenario) => void
  onSettings: () => void
}) {
  const [hidden, setHidden] = useState(false)

  /** What the scenario would do right now, with the current settings and this month's transfers. */
  function previewScenario(scenario: DemoScenario): Preview {
    if (scenario.amountBaht > balance) return 'balance'
    const result = evaluateTransfer({
      draft: { recipient: findRecipient(scenario.recipientId), amountBaht: scenario.amountBaht, createdAt: now, placeId: scenario.placeId },
      ledger,
      settings,
      baseline,
    })
    return result.decision
  }
  const ratio = countedThisMonth / settings.monthlyLimitBaht
  const percent = Math.round(ratio * 100)
  const recent = [...ledger].reverse().slice(0, 3)

  return (
    <div className="grid gap-5">
      <p className="text-[24px] font-semibold tracking-tight">สวัสดี {DEMO_SENDER.name}</p>

      {!onboarded && (
        <section aria-labelledby="invite-title" className="rounded-[28px] bg-surface p-4 shadow-card ring-2 ring-brand-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_10px_22px_rgb(11_93_88_/_0.24)]"><ShieldCheck size={22} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <h2 id="invite-title" className="text-[18px] font-bold leading-tight tracking-tight">เปิดใช้ TrustGuard ไหม?</h2>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted">เช็ก 3T ให้ทุกครั้งก่อนเงินออก</span>
            </span>
            <AiBadge>AI ช่วยตั้งค่า</AiBadge>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-1.5">
            {THREE_T.map(({ icon: Icon, name, detail }) => (
              <li key={name} className="flex flex-col items-center gap-1 rounded-2xl bg-canvas px-1.5 py-2.5 text-center">
                <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={16} aria-hidden="true" /></span>
                <span className="text-[12.5px] font-semibold leading-tight">{name}</span>
                <span className="text-[11px] leading-tight text-ink-muted">{detail}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Button onClick={onStartSetup}>เริ่มตั้งค่า <ArrowRight size={18} /></Button>
            <p className="mt-1.5 text-center text-[12px] text-ink-faint">ใช้เวลาประมาณ 1 นาที เปลี่ยนได้ทุกเมื่อ</p>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0b5d58_0%,#087f72_60%,#14957f_100%)] p-5 text-white shadow-[0_18px_30px_rgb(11_93_88_/_0.28)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border border-white/15 shadow-[0_0_0_34px_rgb(255_255_255_/_0.05),0_0_0_70px_rgb(255_255_255_/_0.035)]" />
        <div className="relative flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-semibold"><WalletCards size={16} aria-hidden="true" /> บัญชีใช้จ่าย</span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px]">ข้อมูลจำลอง</span>
        </div>
        <p className="relative mt-6 text-[12.5px] text-white/75">ยอดเงินคงเหลือ</p>
        <div className="relative flex items-center gap-3">
          <strong className="tabular text-[36px] font-semibold tracking-tight">{hidden ? '฿ ••••••' : formatBaht(balance)}</strong>
          <button type="button" onClick={() => setHidden(!hidden)} aria-label={hidden ? 'แสดงยอดเงิน' : 'ซ่อนยอดเงิน'} className="grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10">
            {hidden ? <Eye size={19} /> : <EyeOff size={19} />}
          </button>
        </div>
        <div className="relative mt-5 flex items-center justify-between border-t border-white/20 pt-3.5 text-[12px] text-white/80">
          <span className="tabular">{DEMO_SENDER.maskedAccount}</span>
          <span>เงินเดือนตัวอย่าง ฿28,000</span>
        </div>
      </section>

      {onboarded && (
        <section aria-labelledby="demo-title">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="demo-title" className="text-[15px] font-semibold">ลองฟีเจอร์ TrustGuard</h2>
            <span className="text-[12px] text-ink-faint">แตะเพื่อกรอกรายการโอนให้</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO_SCENARIOS.map((scenario, index) => {
              const recipient = findRecipient(scenario.recipientId)
              const preview = previewScenario(scenario)
              const Icon = SCENARIO_ICON[scenario.id] ?? Send
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onScenario(scenario)}
                  className="relative flex min-h-[132px] flex-col rounded-[22px] bg-surface p-3.5 text-left shadow-card transition-transform active:scale-[0.97]"
                >
                  <span className="flex w-full items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={19} aria-hidden="true" /></span>
                    <span className="tabular grid size-6 place-items-center rounded-full bg-canvas text-[11.5px] font-semibold text-ink-faint" aria-hidden="true">{index + 1}</span>
                  </span>
                  <span className="mt-2.5 block text-[15px] font-semibold leading-tight">{scenario.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-ink-muted">{formatBahtShort(scenario.amountBaht)} · {recipient.name}</span>
                  <span className={cx('mt-auto w-fit translate-y-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold', PREVIEW_STYLE[preview])}>{PREVIEW_LABEL[preview]}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="quick-title" className="rounded-[24px] bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quick-title" className="text-[15px] font-semibold">โอนเงิน</h2>
          <span className="text-[12px] text-ink-faint">แตะชื่อเพื่อโอนด่วน</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          <button type="button" onClick={() => onTransfer()} className="flex flex-col items-center gap-1.5 rounded-2xl py-1 text-[12px] font-medium text-brand">
            <span className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-[0_8px_16px_rgb(11_93_88_/_0.25)]"><Plus size={22} aria-hidden="true" /></span>
            โอนใหม่
          </button>
          {DEMO_RECIPIENTS.map((recipient, index) => {
            const trusted = settings.trustContacts.some((member) => member.recipientId === recipient.id)
            return (
              <button key={recipient.id} type="button" onClick={() => onTransfer(recipient.id)} aria-label={`โอนให้ ${recipient.name}`} className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl py-1 text-[12px] font-medium text-ink">
                <span className="relative">
                  <Avatar name={recipient.name} tone={index} size="lg" />
                  {trusted && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full bg-pass ring-2 ring-surface" title="Trust Contact">
                      <ShieldCheck size={11} className="text-white" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center">{recipient.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {onboarded && (
        <button type="button" onClick={onSettings} className="rounded-[24px] bg-surface p-4 text-left shadow-card transition-transform active:scale-[0.99]">
          <span className="flex items-center gap-2">
            <ShieldCheck size={19} className="text-brand" aria-hidden="true" />
            <span className="flex-1 text-[15px] font-semibold">TrustGuard 3T</span>
            <span className={cx('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', settings.enabled ? 'bg-pass-soft text-pass' : 'bg-unknown-soft text-unknown')}>
              {settings.enabled ? 'เปิดอยู่' : 'ปิดอยู่'}
            </span>
            <ChevronRight size={18} className="text-ink-faint" aria-hidden="true" />
          </span>
          <span className="mt-4 flex items-center gap-4">
            <ProgressRing value={ratio} tone={ratio >= 1 ? 'caution' : 'brand'} label={`Trust Limit ใช้ไป ${percent}%`}>
              <span className={cx('tabular text-[20px] font-semibold tracking-tight', ratio >= 1 ? 'text-caution' : 'text-ink')}>{percent}%</span>
            </ProgressRing>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted"><WalletCards size={14} aria-hidden="true" /> Trust Limit เดือนนี้</span>
              <span className="tabular mt-0.5 block text-[19px] font-semibold tracking-tight">{formatBahtShort(countedThisMonth)} <span className="text-[14px] font-medium text-ink-faint">/ {formatBahtShort(settings.monthlyLimitBaht)}</span></span>
              <span className="mt-2.5 flex flex-wrap gap-1.5 text-[12px] text-ink-muted">
                <span className="flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1"><MapPin size={13} aria-hidden="true" /> {ZONE_LABEL[settings.zone]}</span>
                <span className="flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1"><Users size={13} aria-hidden="true" /> Trust Contact {settings.trustContacts.length} คน</span>
              </span>
            </span>
          </span>
        </button>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-[15px] font-semibold">รายการล่าสุด</h2>
          <div className="divide-y divide-line rounded-[20px] bg-surface shadow-card">
            {recent.map((item) => {
              const recipient = findRecipient(item.recipientId)
              return (
                <div key={item.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="grid size-9 place-items-center rounded-full bg-canvas text-ink-muted"><ArrowUpRight size={17} aria-hidden="true" /></span>
                  <span className="flex-1">
                    <span className="block text-[14px] font-medium">{recipient.name}</span>
                    <span className="block text-[12px] text-ink-faint">{!onboarded ? 'โอนสำเร็จ (จำลอง)' : item.counted ? 'นับใน Trust Limit' : 'Trust Contact · ไม่นับยอด'}</span>
                  </span>
                  <span className="tabular text-[14px] font-semibold">-{formatBahtShort(item.amountBaht)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <p className="pb-2 text-center text-[11.5px] leading-relaxed text-ink-faint">ทุกรายการ บุคคล และยอดเงินเป็นข้อมูลสมมติ ไม่มีการโอนเงินจริง</p>
    </div>
  )
}
