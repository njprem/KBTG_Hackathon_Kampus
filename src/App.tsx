import { useEffect, useMemo, useRef, useState } from 'react'
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react'
import { ArrowLeft, Home, RefreshCcw, Send, Settings2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { ProcessingOverlay, TapRipples } from './ui/motion'
import {
  DEMO_BALANCE_BAHT,
  DEMO_SETTINGS,
  PAUSE_DELAY_MS,
  countedMonthTotal,
  evaluateTransfer,
  findRecipient,
  weakeningChanges,
  type LimitBaseline,
  type CompletedTransfer,
  type DemoScenario,
  type Evaluation,
  type TrustGuardSettings,
} from './domain/trustguard'
import { BottomSheet } from './ui/BottomSheet'
import { formatBahtShort } from './ui/format'
import { Button, cx } from './ui/primitives'
import { HomeScreen } from './screens/Home'
import { OutcomeScreen, type OutcomeKind } from './screens/Outcome'
import { ReviewScreen } from './screens/Review'
import { SettingsScreen } from './screens/Settings'
import { SmartPauseSheet } from './screens/SmartPause'
import { TransferScreen, amountError } from './screens/Transfer'

type Screen = 'home' | 'transfer' | 'review' | 'outcome' | 'settings'

interface Pause {
  open: boolean
  startedAt: number
  skipped: boolean
}

const TITLES: Record<Screen, string> = {
  home: 'หน้าหลัก',
  transfer: 'โอนเงิน',
  review: 'ตรวจสอบรายการ',
  outcome: 'สถานะรายการ',
  settings: 'ตั้งค่า TrustGuard',
}

/** How long the ordinary "processing" cover stays up before the result or Smart Pause. */
const CHECK_ANIMATION_MS = 600

const cloneSettings = (settings: TrustGuardSettings): TrustGuardSettings => ({ ...settings, trustContacts: settings.trustContacts.map((member) => ({ ...member })) })

export default function App() {
  const phoneRef = useRef<HTMLDivElement>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [settings, setSettings] = useState<TrustGuardSettings>(() => cloneSettings(DEMO_SETTINGS))
  const [draftSettings, setDraftSettings] = useState<TrustGuardSettings>(() => cloneSettings(DEMO_SETTINGS))
  const [confirmWeaken, setConfirmWeaken] = useState(false)
  const [balance, setBalance] = useState(DEMO_BALANCE_BAHT)
  const [ledger, setLedger] = useState<CompletedTransfer[]>([])
  const [baseline, setBaseline] = useState<LimitBaseline | null>(null)
  const [recipientId, setRecipientId] = useState('niran')
  const [amountInput, setAmountInput] = useState('')
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [reviewAt, setReviewAt] = useState('')
  const [pause, setPause] = useState<Pause | null>(null)
  const [outcome, setOutcome] = useState<OutcomeKind>('completed')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [checking, setChecking] = useState(false)
  const checkTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(checkTimer.current), [])

  const recipient = findRecipient(recipientId)
  const amountBaht = Number(amountInput)
  const nowIso = new Date(nowMs).toISOString()
  const countedThisMonth = useMemo(() => countedMonthTotal(ledger, nowIso), [ledger, nowIso])
  const remainingMs = pause ? (pause.skipped ? 0 : Math.max(0, pause.startedAt + PAUSE_DELAY_MS - nowMs)) : 0

  // A coarse clock: drives the Smart Pause countdown and watch-period labels.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), pause ? 250 : 15_000)
    return () => window.clearInterval(timer)
  }, [pause])

  function go(next: Screen) {
    setScreen(next)
    phoneRef.current?.querySelector('main')?.scrollTo({ top: 0 })
  }

  function startTransfer(nextRecipientId = recipientId, amount = '') {
    setRecipientId(nextRecipientId)
    setAmountInput(amount)
    setEvaluation(null)
    setPause(null)
    go('transfer')
  }

  /** Demo scenarios fill the transfer form; the user still reviews it before going on. */
  function startScenario(scenario: DemoScenario) {
    startTransfer(scenario.recipientId, String(scenario.amountBaht))
  }

  function toReview() {
    if (amountError(amountInput, balance) !== null || amountInput === '') return
    const createdAt = new Date().toISOString()
    setNowMs(Date.parse(createdAt))
    setReviewAt(createdAt)
    setEvaluation(evaluateTransfer({ draft: { recipient, amountBaht, createdAt }, ledger, settings, baseline }))
    setPause(null)
    go('review')
  }

  function confirmTransfer() {
    if (!evaluation || checking) return
    // Re-opening a pause that is already running skips the check animation and keeps its timer.
    if (pause) return setPause({ ...pause, open: true })
    setChecking(true)
    checkTimer.current = window.setTimeout(() => {
      setChecking(false)
      if (evaluation.decision !== 'pause') return finish('completed')
      setNowMs(Date.now())
      setPause({ open: true, startedAt: Date.now(), skipped: false })
    }, CHECK_ANIMATION_MS)
  }

  function finish(kind: OutcomeKind) {
    if (!evaluation) return
    if (kind !== 'cancelled') {
      setLedger((items) => [...items, { id: `t${items.length + 1}-${reviewAt}`, createdAt: reviewAt, recipientId, amountBaht, counted: evaluation.limit.counted }])
      setBalance((value) => value - amountBaht)
      if (kind === 'continued') setBaseline({ monthKey: evaluation.monthKey, baht: evaluation.limit.monthTotalBaht })
    }
    setOutcome(kind)
    setPause(null)
    go('outcome')
  }

  function resetDemo() {
    setSettings(cloneSettings(DEMO_SETTINGS))
    setDraftSettings(cloneSettings(DEMO_SETTINGS))
    setBalance(DEMO_BALANCE_BAHT)
    setLedger([])
    setBaseline(null)
    setRecipientId('niran')
    setAmountInput('')
    setEvaluation(null)
    setPause(null)
    setConfirmWeaken(false)
    window.clearTimeout(checkTimer.current)
    setChecking(false)
    go('home')
  }

  function openSettings() {
    setDraftSettings(cloneSettings(settings))
    setNowMs(Date.now())
    go('settings')
  }

  function saveSettings() {
    if (weakeningChanges(settings, draftSettings).length > 0) return setConfirmWeaken(true)
    applySettings()
  }

  function applySettings() {
    setSettings(cloneSettings(draftSettings))
    setConfirmWeaken(false)
    go('home')
  }

  function back() {
    if (screen === 'review') { setEvaluation(null); setPause(null); go('transfer') }
    else go('home')
  }

  const weakening = weakeningChanges(settings, draftSettings)
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(draftSettings)
  const navActive = screen === 'home' ? 0 : screen === 'settings' ? 2 : 1

  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh items-center justify-center md:p-8">
        <div
          ref={phoneRef}
          className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-canvas md:h-[min(880px,calc(100dvh-4rem))] md:rounded-[40px] md:border md:border-line md:shadow-[0_30px_80px_rgb(16_56_51_/_0.18)]"
        >
          <div className="flex h-12 shrink-0 items-center justify-between bg-brand px-5 text-white">
            <span className="flex items-center gap-2 text-[16px] font-bold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-white/15"><ShieldCheck size={17} aria-hidden="true" /></span>
              TrustGuard
            </span>
            <span className="rounded-full border border-white/40 px-2.5 py-0.5 text-[11px]">ต้นแบบ v3.0 · ทดลอง</span>
          </div>

          <header className="grid h-[68px] shrink-0 grid-cols-[44px_1fr_44px] items-center bg-canvas px-4 text-center">
            <button type="button" onClick={back} disabled={screen === 'home' || checking} aria-label="ย้อนกลับ" className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-card transition-transform active:scale-90 disabled:invisible">
              <ArrowLeft size={20} />
            </button>
            <p className="text-[15px] font-semibold text-ink-muted">{TITLES[screen]}</p>
            <button type="button" onClick={resetDemo} aria-label="เริ่มการทดลองใหม่ทั้งหมด" className="grid size-11 place-items-center rounded-full bg-surface text-ink-muted shadow-card transition-transform active:scale-90">
              <RefreshCcw size={18} />
            </button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <m.div
              key={screen}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              className={cx('px-5 pt-2', screen === 'settings' ? 'pb-44' : 'pb-28')}
            >
              {screen === 'home' && (
                <HomeScreen
                  balance={balance}
                  settings={settings}
                  countedThisMonth={countedThisMonth}
                  ledger={ledger}
                  baseline={baseline}
                  now={nowIso}
                  onTransfer={(id) => startTransfer(id)}
                  onScenario={startScenario}
                  onSettings={openSettings}
                />
              )}
              {screen === 'transfer' && (
                <TransferScreen
                  recipientId={recipientId}
                  amountInput={amountInput}
                  balance={balance}
                  settings={settings}
                  onRecipient={setRecipientId}
                  onAmount={setAmountInput}
                  onNext={toReview}
                />
              )}
              {screen === 'review' && evaluation && (
                <ReviewScreen
                  evaluation={evaluation}
                  recipient={recipient}
                  amountBaht={amountBaht}
                  paused={pause !== null}
                  onConfirm={confirmTransfer}
                  onEdit={back}
                />
              )}
              {screen === 'outcome' && (
                <OutcomeScreen kind={outcome} recipient={recipient} amountBaht={amountBaht} onAgain={() => startTransfer(recipientId, amountInput)} onHome={() => go('home')} />
              )}
              {screen === 'settings' && <SettingsScreen draft={draftSettings} now={nowIso} onChange={setDraftSettings} />}
            </m.div>
          </main>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-canvas from-60% to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {screen === 'settings' && (
              <div className="pointer-events-auto mb-3">
                <Button disabled={!settingsDirty} onClick={saveSettings}>บันทึกการตั้งค่า</Button>
              </div>
            )}
            <nav aria-label="เมนูหลัก" className="pointer-events-auto relative grid grid-cols-3 rounded-full bg-surface p-1.5 shadow-[0_12px_32px_rgb(16_56_51_/_0.16)]">
              <span
                aria-hidden="true"
                className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-brand shadow-[0_8px_18px_rgb(11_93_88_/_0.28)] transition-transform duration-[420ms] ease-(--ease-sheet)"
                style={{ transform: `translateX(${navActive * 100}%)` }}
              />
              {([
                ['หน้าหลัก', Home, () => go('home')],
                ['โอนเงิน', Send, () => startTransfer()],
                ['ตั้งค่า', Settings2, openSettings],
              ] as const).map(([label, Icon, onClick], index) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  disabled={checking}
                  aria-current={navActive === index ? 'page' : undefined}
                  className={cx(
                    'relative flex h-12 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors duration-300',
                    navActive === index ? 'text-white' : 'text-ink-faint hover:text-ink-muted',
                  )}
                >
                  <Icon size={19} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <ProcessingOverlay active={checking} title="กำลังทำรายการ" detail="กรุณารอสักครู่" />
          <TapRipples target={phoneRef} />

          {evaluation && pause && (
            <SmartPauseSheet
              open={pause.open}
              onOpenChange={(open) => setPause((current) => current && { ...current, open })}
              container={phoneRef}
              evaluation={evaluation}
              recipient={recipient}
              amountBaht={amountBaht}
              remainingMs={remainingMs}
              onCancel={() => finish('cancelled')}
              onContinue={() => finish('continued')}
              onSkipWait={() => setPause((current) => current && { ...current, skipped: true })}
            />
          )}

          <BottomSheet
            open={confirmWeaken}
            onOpenChange={setConfirmWeaken}
            container={phoneRef}
            closeLabel="กลับไปแก้ไขการตั้งค่า"
            title="ยืนยันก่อนลดการปกป้อง"
            description="การเปลี่ยนนี้ทำให้ TrustGuard ปกป้องคุณน้อยลง"
          >
            <ul className="grid gap-2 rounded-2xl bg-surface p-4 text-[14px] shadow-card">
              {weakening.map((change) => (
                <li key={change} className="font-medium">
                  {change === 'disabled' ? 'ปิด TrustGuard' : `Trust Limit ${formatBahtShort(settings.monthlyLimitBaht)} → ${formatBahtShort(draftSettings.monthlyLimitBaht)}`}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-caution-soft px-4 py-3 text-[14px] font-semibold leading-snug text-caution" role="note">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              ถ้ามีคนบอกให้คุณปิดการปกป้องหรือเพิ่มวงเงิน คนนั้นคือมิจฉาชีพ
            </p>
            <div className="mt-5 grid gap-2.5">
              <Button onClick={() => { setDraftSettings(cloneSettings(settings)); setConfirmWeaken(false) }}>คงการปกป้องเดิมไว้</Button>
              <Button variant="secondary" onClick={applySettings}>ยืนยันและบันทึก (จำลอง)</Button>
            </div>
          </BottomSheet>
        </div>
      </div>
    </MotionConfig>
    </LazyMotion>
  )
}
