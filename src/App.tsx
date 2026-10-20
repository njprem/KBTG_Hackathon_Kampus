import { useEffect, useMemo, useRef, useState } from 'react'
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react'
import { ArrowLeft, Home, RefreshCcw, Send, Settings2, ShieldAlert, ShieldCheck, UserRoundCheck, UserRoundPlus } from 'lucide-react'
import { ProcessingOverlay, TapRipples } from './ui/motion'
import {
  DEMO_BALANCE_BAHT,
  DEMO_SETTINGS,
  NEW_USER_SETTINGS,
  PAUSE_DELAY_MS,
  countedMonthTotal,
  evaluateTransfer,
  findRecipient,
  suggestionsAfterTransfer,
  toZonePlace,
  weakeningChanges,
  type LimitBaseline,
  type CompletedTransfer,
  type DemoScenario,
  type Evaluation,
  type AiSuggestions,
  type ContactSuggestion,
  type ZoneSuggestion,
  type TrustGuardSettings,
} from './domain/trustguard'
import { BottomSheet } from './ui/BottomSheet'
import { formatBahtShort } from './ui/format'
import { Button, cx } from './ui/primitives'
import { HomeScreen } from './screens/Home'
import { OutcomeScreen, type OutcomeKind } from './screens/Outcome'
import { ReviewScreen } from './screens/Review'
import { SettingsScreen } from './screens/Settings'
import { SetupScreen } from './screens/Setup'
import { SmartPauseSheet } from './screens/SmartPause'
import { TransferScreen, amountError } from './screens/Transfer'

type Screen = 'home' | 'transfer' | 'review' | 'outcome' | 'settings' | 'setup'

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
  setup: 'เปิดใช้ TrustGuard',
}

/** How long the ordinary "processing" cover stays up before the result or Smart Pause. */
const CHECK_ANIMATION_MS = 600

const cloneSettings = (settings: TrustGuardSettings): TrustGuardSettings => ({
  ...settings,
  trustContacts: settings.trustContacts.map((member) => ({ ...member })),
  zonePlaces: settings.zonePlaces.map((place) => ({ ...place })),
})

export default function App() {
  const phoneRef = useRef<HTMLDivElement>(null)
  const [screen, setScreen] = useState<Screen>('home')
  /** Demo users: one who already set TrustGuard up, and a new one who has not turned it on yet. */
  const [onboarded, setOnboarded] = useState(true)
  const [settings, setSettings] = useState<TrustGuardSettings>(() => cloneSettings(DEMO_SETTINGS))
  const [draftSettings, setDraftSettings] = useState<TrustGuardSettings>(() => cloneSettings(DEMO_SETTINGS))
  const [confirmWeaken, setConfirmWeaken] = useState(false)
  const [balance, setBalance] = useState(DEMO_BALANCE_BAHT)
  const [ledger, setLedger] = useState<CompletedTransfer[]>([])
  const [baseline, setBaseline] = useState<LimitBaseline | null>(null)
  const [recipientId, setRecipientId] = useState('niran')
  const [amountInput, setAmountInput] = useState('')
  /** Simulated place of the current transfer (set by a scenario); undefined uses the Settings location toggle. */
  const [placeId, setPlaceId] = useState<string | undefined>(undefined)
  /** AI suggestions captured when the last transfer finished, so they stay visible after the user accepts one. */
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null)
  /** Set once the user opened the suggestions on the slip or closed the Home card: no Home card for them. */
  const [aiHomeDone, setAiHomeDone] = useState(false)
  /** Demo-clock time until which Home shows no AI card ("ไม่แสดงอีก 30 วัน"). */
  const [aiSnoozedUntil, setAiSnoozedUntil] = useState(0)
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

  function startTransfer(nextRecipientId = recipientId, amount = '', nextPlaceId?: string) {
    setRecipientId(nextRecipientId)
    setAmountInput(amount)
    setPlaceId(nextPlaceId)
    setEvaluation(null)
    setPause(null)
    go('transfer')
  }

  /** Demo scenarios fill the transfer form; the user still reviews it before going on. */
  function startScenario(scenario: DemoScenario) {
    startTransfer(scenario.recipientId, String(scenario.amountBaht), scenario.placeId)
  }

  function toReview() {
    if (amountError(amountInput, balance) !== null || amountInput === '') return
    const createdAt = new Date().toISOString()
    setNowMs(Date.parse(createdAt))
    setReviewAt(createdAt)
    setEvaluation(evaluateTransfer({ draft: { recipient, amountBaht, createdAt, placeId }, ledger, settings, baseline }))
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
    // A finished transfer can push the AI's data past its threshold (e.g. the 10th หมูปิ้ง purchase).
    // A small button under the slip offers it; cancelled transfers never get suggestions.
    setAiSuggestions(null)
    if (kind !== 'cancelled') {
      const found = suggestionsAfterTransfer(settings, recipientId, placeId)
      if (found.zone || found.contact) {
        setAiSuggestions({ ...found, recipientId, amountBaht })
        setAiHomeDone(false)
      }
    }
    setOutcome(kind)
    setPause(null)
    go('outcome')
  }

  /** Restores the demo for the given user (the current one by default). */
  function resetDemo(asOnboarded = onboarded) {
    const initial = asOnboarded ? DEMO_SETTINGS : NEW_USER_SETTINGS
    setOnboarded(asOnboarded)
    setSettings(cloneSettings(initial))
    setDraftSettings(cloneSettings(initial))
    setBalance(DEMO_BALANCE_BAHT)
    setLedger([])
    setBaseline(null)
    setRecipientId('niran')
    setAmountInput('')
    setPlaceId(undefined)
    setAiSuggestions(null)
    setAiHomeDone(false)
    setAiSnoozedUntil(0)
    setEvaluation(null)
    setPause(null)
    setConfirmWeaken(false)
    window.clearTimeout(checkTimer.current)
    setChecking(false)
    go('home')
  }

  function openSettings() {
    // Until TrustGuard is turned on, Settings is the setup flow.
    if (!onboarded) return go('setup')
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

  function finishSetup(next: TrustGuardSettings) {
    setSettings(cloneSettings(next))
    setDraftSettings(cloneSettings(next))
    setOnboarded(true)
    go('home')
  }

  /** Accepting an AI suggestion after a transfer; a new Trust Contact is still watched like any later addition. */
  function acceptZone(suggestion: ZoneSuggestion) {
    const next = { ...settings, zonePlaces: [...settings.zonePlaces, toZonePlace(suggestion)] }
    setSettings(next)
    setDraftSettings(cloneSettings(next))
  }

  function acceptContact(suggestion: ContactSuggestion) {
    const next = { ...settings, trustContacts: [...settings.trustContacts, { recipientId: suggestion.recipientId, addedAt: new Date().toISOString() }] }
    setSettings(next)
    setDraftSettings(cloneSettings(next))
  }

  /** x on the Home card; with "ไม่แสดงอีก 30 วัน" ticked, Home shows no AI card for 30 days. */
  function dismissAi(snooze: boolean) {
    setAiHomeDone(true)
    if (snooze) setAiSnoozedUntil(Date.now() + 30 * 86_400_000)
  }

  function back() {
    if (screen === 'review') { setEvaluation(null); setPause(null); go('transfer') }
    else go('home')
  }

  const weakening = weakeningChanges(settings, draftSettings)
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(draftSettings)
  const aiShown = aiSuggestions && {
    ...aiSuggestions,
    zoneAdded: aiSuggestions.zone !== undefined && settings.zonePlaces.some((place) => place.id === aiSuggestions.zone?.id),
    contactAdded: aiSuggestions.contact !== undefined && settings.trustContacts.some((member) => member.recipientId === aiSuggestions.contact?.recipientId),
  }
  // Home shows the card only for suggestions not opened on the slip, not closed, not snoozed and not all added.
  const aiOnHome = aiShown && !aiHomeDone && nowMs >= aiSnoozedUntil && !(aiShown.zoneAdded && aiShown.contactAdded) ? aiShown : null
  const navActive = screen === 'home' ? 0 : screen === 'settings' || screen === 'setup' ? 2 : 1
  // Transfer, review and setup pin their actions to the bottom, just above the nav, so each step fits one screen.
  const inTransferFlow = screen === 'transfer' || screen === 'review' || screen === 'setup'


  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh items-center justify-center md:p-8">
        <div
          ref={phoneRef}
          className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-canvas md:h-[min(880px,calc(100dvh-4rem))] md:rounded-[40px] md:border md:border-line md:shadow-[0_30px_80px_rgb(16_56_51_/_0.036)]"
        >
          <div className="flex h-12 shrink-0 items-center justify-between bg-brand px-5 text-white">
            <span className="flex items-center gap-2 text-[16px] font-bold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-white/15"><ShieldCheck size={17} aria-hidden="true" /></span>
              TrustGuard
            </span>
            <span className="rounded-full border border-white/40 px-2.5 py-0.5 text-[11px]">Prototype 4.0</span>
          </div>

          <header className="grid h-[68px] shrink-0 grid-cols-[44px_1fr_44px] items-center bg-canvas px-4 text-center">
            {screen === 'home' ? (
              // Demo control: switch between the set-up user and a new user who has not turned TrustGuard on.
              <button
                type="button"
                onClick={() => resetDemo(!onboarded)}
                aria-label={onboarded ? 'สลับเป็นผู้ใช้ใหม่ที่ยังไม่เปิด TrustGuard' : 'สลับเป็นผู้ใช้ที่ตั้งค่า TrustGuard แล้ว'}
                title={onboarded ? 'ผู้ใช้ที่ตั้งค่าแล้ว · แตะเพื่อสลับเป็นผู้ใช้ใหม่' : 'ผู้ใช้ใหม่ · แตะเพื่อสลับเป็นผู้ใช้ที่ตั้งค่าแล้ว'}
                className={cx('grid size-11 place-items-center rounded-full shadow-card transition-transform active:scale-90', onboarded ? 'bg-surface text-brand' : 'bg-brand text-white')}
              >
                {onboarded ? <UserRoundCheck size={20} /> : <UserRoundPlus size={20} />}
              </button>
            ) : (
              <button type="button" onClick={back} disabled={checking} aria-label="ย้อนกลับ" className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-card transition-transform active:scale-90 disabled:invisible">
                <ArrowLeft size={20} />
              </button>
            )}
            <p className="text-[15px] font-semibold text-ink-muted">{TITLES[screen]}</p>
            <button type="button" onClick={() => resetDemo()} aria-label="เริ่มการทดลองใหม่ทั้งหมด" className="grid size-11 place-items-center rounded-full bg-surface text-ink-muted shadow-card transition-transform active:scale-90">
              <RefreshCcw size={18} />
            </button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <m.div
              key={screen}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              className={cx('px-5 pt-2', inTransferFlow ? 'flex min-h-full flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]' : screen === 'settings' ? 'pb-44' : 'pb-28')}
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
                  onboarded={onboarded}
                  onStartSetup={() => go('setup')}
                  ai={aiOnHome}
                  onAcceptZone={acceptZone}
                  onAcceptContact={acceptContact}
                  onDismissAi={dismissAi}
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
                <OutcomeScreen
                  kind={outcome}
                  recipient={recipient}
                  amountBaht={amountBaht}
                  ai={aiShown}
                  sheetContainer={phoneRef}
                  onAcceptZone={acceptZone}
                  onAcceptContact={acceptContact}
                  onOpenAi={() => setAiHomeDone(true)}
                  onAgain={() => startTransfer(recipientId, amountInput, placeId)}
                  onHome={() => go('home')}
                />
              )}
              {screen === 'setup' && <SetupScreen now={nowIso} onFinish={finishSetup} />}
              {screen === 'settings' && <SettingsScreen draft={draftSettings} now={nowIso} onChange={setDraftSettings} />}
            </m.div>
          </main>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-canvas from-60% to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {screen === 'settings' && (
              <div className="pointer-events-auto mb-3">
                <Button disabled={!settingsDirty} onClick={saveSettings}>บันทึกการตั้งค่า</Button>
              </div>
            )}
            <nav aria-label="เมนูหลัก" className="pointer-events-auto relative grid grid-cols-3 rounded-full bg-surface p-1.5 shadow-[0_12px_32px_rgb(16_56_51_/_0.032)]">
              <span
                aria-hidden="true"
                className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-brand shadow-[0_8px_18px_rgb(11_93_88_/_0.056)] transition-transform duration-[420ms] ease-(--ease-sheet)"
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
