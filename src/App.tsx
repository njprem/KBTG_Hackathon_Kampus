import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, CreditCard, HelpCircle, Home, Info, LockKeyhole, MapPin, Phone, PhoneIncoming, RefreshCcw, Send, Settings2, ShieldAlert, ShieldCheck, UserRoundCheck, Users, Wallet, X } from 'lucide-react'
import { DEMO_BALANCE_BAHT, DEMO_MONTHLY_SALARY_BAHT, EMPTY_SCAM_CHECK, PROTOTYPE_SCENARIOS, SCAM_CHECK_QUESTIONS, canSenderConfirm, evaluateTransfer, salaryShare, scamCheckSignals, type ContactResponse, type ScamCheckAnswers, type ScamCheckQuestion, type DemoScenario, type Evaluation, type ProtectionLevel, type RecoveryState, type SenderOutcome, type TrustedZoneStatus, type TrustGuardSettings } from './domain/trustguard'

type Screen = 'home' | 'entry' | 'review' | 'pause' | 'contact' | 'outcome' | 'recovery' | 'settings'
type Outcome = SenderOutcome | 'demo-confirmed'
type Callback = 'idle' | 'requested' | 'calling'
const formatBaht = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const firstScenario = PROTOTYPE_SCENARIOS[0]
const levels: Record<ProtectionLevel, { title: string; detail: string }> = {
  off: { title: 'ปิด', detail: 'ไม่มีการพักรายการเพิ่มเติม' },
  warn: { title: 'เตือน', detail: 'พัก 2 นาทีและขอความเห็นจากคนที่ไว้ใจ' },
  'approval-required': { title: 'ต้องได้รับอนุมัติ', detail: 'รอคนที่ไว้ใจอนุมัติก่อนดำเนินการ' },
}
const reasonLabel = (reason: Evaluation['reasons'][number]) => reason === 'monthly-limit' ? 'ยอดโอนสะสมถึง Trusted Limit ที่คุณตั้งไว้' : reason === 'outside-trusted-zone' ? 'คุณอยู่นอก Trusted Zone' : 'มีสัญญาณความเสี่ยงจำลองของบัญชีผู้รับ'
const contactReasonLabel = (reason: Evaluation['reasons'][number]) => reason === 'monthly-limit' ? 'ยอดโอนสะสมถึง Trusted Limit ที่พลอยตั้งไว้' : reason === 'outside-trusted-zone' ? 'พลอยอยู่นอก Trusted Zone' : 'มีสัญญาณความเสี่ยงจำลองของบัญชีผู้รับ'
const scamQuestionLabels: Record<ScamCheckQuestion, string> = {
  'on-call': 'ตอนนี้มีคนอยู่ในสายหรือแชตกับคุณไหม',
  secrecy: 'มีคนบอกให้เก็บเรื่องนี้เป็นความลับไหม',
  deadline: 'มีคนเร่งให้โอนภายในเวลาจำกัดไหม',
}
const contactSignalLabels: Record<ScamCheckQuestion, string> = {
  'on-call': 'มีคนอยู่ในสายหรือแชตกับพลอย',
  secrecy: 'มีคนบอกให้เก็บเรื่องนี้เป็นความลับ',
  deadline: 'มีคนเร่งให้โอนภายในเวลาจำกัด',
}
// Rotated per evaluation so repeated warnings do not look identical.
const pauseLeads = [
  'พบรายการที่ควรหยุดทบทวนก่อนตัดสินใจ',
  'ใช้เวลาสักครู่ ตรวจให้แน่ใจก่อนส่งเงิน',
  'ถ้ามีคนเร่งให้โอน นั่นคือเหตุผลที่ควรหยุด',
  'รายการนี้เข้าเงื่อนไขที่คุณตั้งไว้ตอนมีสติ',
]
const PAUSE_ALARM_MS = 2000
const zoneLabels: Record<TrustedZoneStatus, string> = {
  inside: 'คุณอยู่ใน Trusted Zone',
  outside: 'คุณอยู่นอก Trusted Zone',
  unavailable: 'ไม่สามารถตรวจสอบ Trusted Zone ได้',
}

function App() {
  const mainRef = useRef<HTMLElement>(null)
  const pauseRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)
  const confirmWasOpen = useRef(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [scenario, setScenario] = useState<DemoScenario>(firstScenario)
  const [amountInput, setAmountInput] = useState(String(firstScenario.transfer.amountBaht))
  const [purposeInput, setPurposeInput] = useState(firstScenario.transfer.purpose)
  const [zoneStatus, setZoneStatus] = useState<TrustedZoneStatus>(firstScenario.transfer.zoneStatus)
  const [settings, setSettings] = useState<TrustGuardSettings>({ ...firstScenario.settings })
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [contactResponse, setContactResponse] = useState<ContactResponse>({ kind: 'no-response' })
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('not-started')
  const [outcome, setOutcome] = useState<Outcome>('paused')
  const [nowMs, setNowMs] = useState(Date.now())
  const [fastForwarded, setFastForwarded] = useState(false)
  const [draft, setDraft] = useState<TrustGuardSettings>({ ...firstScenario.settings })
  const [showAuth, setShowAuth] = useState(false)
  const [settingsReturn, setSettingsReturn] = useState<Screen>('home')
  const [showWarnConfirm, setShowWarnConfirm] = useState(false)
  const [scamCheck, setScamCheck] = useState<ScamCheckAnswers>(EMPTY_SCAM_CHECK)
  const [callback, setCallback] = useState<Callback>('idle')
  const [evaluationCount, setEvaluationCount] = useState(0)
  const [calmFor, setCalmFor] = useState<Evaluation | null>(null)

  useEffect(() => { const timer = window.setInterval(() => setNowMs(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { if (screen === 'pause') pauseRef.current?.focus(); else mainRef.current?.focus() }, [screen])
  useEffect(() => {
    if (showWarnConfirm) confirmRef.current?.focus()
    else if (confirmWasOpen.current && screen === 'pause') continueRef.current?.focus()
    confirmWasOpen.current = showWarnConfirm
  }, [showWarnConfirm, screen])
  const amountBaht = Number(amountInput)
  const amountIsValid = amountInput !== '' && Number.isSafeInteger(amountBaht) && amountBaht > 0 && amountBaht <= 1_000_000
  const purpose = purposeInput.trim() || 'ไม่ได้ระบุ'
  const transfer = useMemo(() => ({ ...scenario.transfer, amountBaht, purpose, zoneStatus }), [scenario, amountBaht, purpose, zoneStatus])
  const eligibleAt = evaluation?.warnEligibleAt ? Date.parse(evaluation.warnEligibleAt) : 0
  const secondsLeft = Math.max(0, Math.ceil((eligibleAt - nowMs) / 1000))
  const effectiveNow = new Date(fastForwarded ? Math.max(nowMs, eligibleAt) : nowMs).toISOString()
  const mayConfirm = evaluation ? canSenderConfirm({ evaluation, level: settings.level, now: effectiveNow, contactResponse, recoveryState }) : false
  const pauseOpen = screen === 'pause' && evaluation !== null
  const calm = evaluation !== null && calmFor === evaluation
  const signals = scamCheckSignals(scamCheck)
  const contactName = settings.trustedContact.name
  const share = amountIsValid ? salaryShare(amountBaht, DEMO_MONTHLY_SALARY_BAHT) : 0
  const remainingBaht = DEMO_BALANCE_BAHT - amountBaht

  // Alarm first (red, shake), then settle into a calmer state so the sender can think.
  // Reopening the same held transfer skips the alarm to avoid warning fatigue.
  useEffect(() => {
    if (!pauseOpen || calm) return
    const timer = window.setTimeout(() => setCalmFor(evaluation), PAUSE_ALARM_MS)
    return () => window.clearTimeout(timer)
  }, [pauseOpen, calm, evaluation])
  const visibleScreen = pauseOpen ? 'review' : screen

  function chooseScenario(item: DemoScenario) {
    setScenario(item); setAmountInput(String(item.transfer.amountBaht)); setPurposeInput(item.transfer.purpose); setEvaluation(null)
    setContactResponse({ kind: 'no-response' }); setRecoveryState('not-started'); setFastForwarded(false); setShowWarnConfirm(false); setScamCheck(EMPTY_SCAM_CHECK); setCallback('idle'); setScreen('entry')
  }
  function reset() {
    setScenario(firstScenario); setAmountInput(String(firstScenario.transfer.amountBaht)); setPurposeInput(firstScenario.transfer.purpose); setZoneStatus(firstScenario.transfer.zoneStatus); setSettings({ ...firstScenario.settings })
    setEvaluation(null); setContactResponse({ kind: 'no-response' }); setRecoveryState('not-started'); setFastForwarded(false); setShowWarnConfirm(false); setScamCheck(EMPTY_SCAM_CHECK); setCallback('idle'); setScreen('home')
  }
  function evaluate() {
    const startedAt = new Date()
    const result = evaluateTransfer({ transfer, history: scenario.history, settings, reviewStartedAt: startedAt.toISOString() })
    setNowMs(startedAt.getTime())
    setEvaluation(result); setContactResponse({ kind: 'no-response' }); setRecoveryState('not-started'); setFastForwarded(false); setShowWarnConfirm(false)
    setScamCheck(EMPTY_SCAM_CHECK); setCallback('idle'); setEvaluationCount(count => count + 1)
    if (result.action === 'smart-pause') setScreen('pause')
    else { setOutcome('demo-confirmed'); setScreen('outcome') }
  }
  function finish(next: Outcome) { setShowWarnConfirm(false); setOutcome(next); setScreen('outcome') }
  function closePause() { setShowWarnConfirm(false); setScreen('review') }
  function goBack() {
    if (screen === 'entry') setScreen('home')
    else if (screen === 'review') { setEvaluation(null); setScreen('entry') }
    else if (screen === 'pause') closePause()
    else if (screen === 'contact' || screen === 'recovery') setScreen('pause')
    else if (screen === 'settings') setScreen(settingsReturn === 'pause' ? 'review' : settingsReturn)
    else setScreen('home')
  }
  function openSettings(from: Screen) { setDraft({ ...settings, trustedContact: { ...settings.trustedContact } }); setShowAuth(false); setSettingsReturn(from); setScreen('settings') }
  function applyDraft() { setShowAuth(false); setSettings(draft); setEvaluation(null); setScreen(settingsReturn === 'pause' ? 'review' : settingsReturn) }
  function saveSettings() { if (weakensProtection(settings, draft)) setShowAuth(true); else applyDraft() }
  const titles: Record<Screen, string> = { home: 'หน้าหลัก', entry: 'โอนเงิน', review: 'ตรวจสอบรายการ', pause: 'Smart Pause', contact: 'มุมคนที่ไว้ใจ', outcome: 'สถานะรายการ', recovery: 'ขอความช่วยเหลือ', settings: 'ตั้งค่า TrustGuard' }

  return <div className="site-shell">
    <div className="phone-shell" inert={pauseOpen || showWarnConfirm || showAuth}>
      <div className="brandbar"><strong><ShieldCheck size={19} /> TrustGuard</strong><span>ต้นแบบสำหรับทดลอง</span></div>
      <header className="app-header"><button className="icon-button" onClick={screen === 'home' ? undefined : goBack} aria-label="ย้อนกลับ" disabled={screen === 'home'}><ArrowLeft size={20} /></button><strong>{titles[visibleScreen]}</strong><button className="icon-button" onClick={reset} aria-label="เริ่มการทดลองใหม่"><RefreshCcw size={18} /></button></header>
      <main className="screen-body" key={visibleScreen} ref={mainRef} tabIndex={-1} aria-label={titles[visibleScreen]}>
        {screen === 'home' && <>
          <div className="intro"><span>สวัสดี พลอย</span></div>
          <section className="balance-card"><div><span><Wallet size={16} /> บัญชีใช้จ่าย</span><small>ข้อมูลจำลอง</small></div><p>ยอดเงินคงเหลือ</p><strong>{formatBaht(28_000)}</strong><footer><span>•• 4821</span><span>เงินเดือนตัวอย่าง ฿28,000</span></footer></section>
          <button className="quick-action" onClick={() => chooseScenario(scenario)}><span className="quick-icon"><Send size={21} /></span><span><strong>โอนเงิน</strong><small>เริ่มจากรายการตัวอย่าง</small></span><ArrowRight size={20} /></button>
          <div className="section-header"><h2>รายการโอนที่เตรียมไว้</h2><span>เลือก 1 รายการ</span></div>
          <div className="scenario-list">{PROTOTYPE_SCENARIOS.map((item, index) => <button className="scenario" key={item.id} onClick={() => chooseScenario(item)}><span className="scenario-index">0{index + 1}</span><span><strong>{item.label}</strong></span><ChevronRight size={19} /></button>)}</div>
          <button className="settings-link" onClick={() => openSettings('home')}><ShieldCheck size={22} /><span><strong>TrustGuard · {levels[settings.level].title}</strong><small>Trusted Limit {formatBaht(settings.monthlyLimitBaht)} / เดือน</small></span><ChevronRight size={18} /></button>
          <p className="fine-print">ทุกรายการ บุคคล และยอดเงินเป็นข้อมูลสมมติ ไม่มีการโอนเงินจริง</p>
        </>}

        {screen === 'entry' && <>
          <Steps current={1} /><Heading eyebrow="รายการตัวอย่าง" title="โอนให้ใคร เท่าไร" detail="ใช้เฉพาะผู้รับสมมติที่เตรียมไว้สำหรับการทดลอง" />
          <section className="card"><div className="field-label">จากบัญชี</div><div className="account-row"><span className="account-icon"><CreditCard size={19} /></span><span><strong>บัญชีใช้จ่ายของพลอย</strong><small>บัญชีตัวอย่าง •• 4821</small></span></div><hr /><div className="field-label">ถึงผู้รับ</div><div className="account-row"><span className="avatar">{transfer.recipient.name.slice(0, 1)}</span><span><strong>{transfer.recipient.name}</strong><small>บัญชีสมมติ {transfer.recipient.maskedAccount}</small></span></div></section>
          <section className="card"><label htmlFor="amount" className="field-label">จำนวนเงิน (บาท)</label><div className="large-input"><span>฿</span><input ref={amountRef} id="amount" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" value={amountInput} onChange={event => setAmountInput(event.target.value.replace(/\D/g, ''))} aria-describedby="amount-help" />{amountInput && <button className="amount-clear" type="button" aria-label="ล้างจำนวนเงิน" onClick={() => { setAmountInput(''); amountRef.current?.focus() }}><X size={19} /></button>}</div><p className="help" id="amount-help">{amountInput && !amountIsValid ? 'กรอกจำนวนเต็ม 1–1,000,000 บาท' : 'จำนวนเงินจะไม่แสดงให้คนที่ไว้ใจเห็น'}</p></section>
          <section className="card"><label htmlFor="purpose" className="field-label">โอนไปเพื่ออะไร</label><input id="purpose" className="text-input" type="text" maxLength={60} autoComplete="off" placeholder="เช่น ค่าจองสินค้า ค่ามัดจำห้อง" value={purposeInput} onChange={event => setPurposeInput(event.target.value)} aria-describedby="purpose-help" /><p className="help" id="purpose-help">คนที่ไว้ใจจะเห็นข้อความนี้ประกอบการให้ความเห็น</p></section>
          <Actions><button className="primary" disabled={!amountIsValid} onClick={() => setScreen('review')}>ตรวจสอบรายการ <ArrowRight size={18} /></button></Actions>
        </>}

        {(screen === 'review' || pauseOpen) && <>
          <Steps current={pauseOpen ? 3 : 2} /><Heading eyebrow="ก่อนดำเนินการ" title="ตรวจสอบอีกครั้ง" detail="ชื่อผู้รับและจำนวนเงินถูกต้องหรือไม่" />
          <ZoneStatus status={zoneStatus} />
          <section className="card summary"><div className="summary-icon"><Send size={24} /></div><span className="muted">จำนวนเงินที่ต้องการโอน</span><div className="big-money">{formatBaht(amountBaht)}</div><hr /><Row label="จาก" value="บัญชีใช้จ่าย •• 4821" /><Row label="ถึง" value={transfer.recipient.name} /><Row label="บัญชีผู้รับ" value={transfer.recipient.maskedAccount} /><Row label="รายละเอียด" value={transfer.purpose} /></section>
          <Actions><button className="primary" onClick={evaluation?.action === 'smart-pause' ? () => setScreen('pause') : evaluate}>{evaluation?.action === 'smart-pause' ? 'กลับไปดูคำเตือน' : 'ดำเนินการต่อ'} <ArrowRight size={18} /></button><button className="text-button" onClick={() => { setEvaluation(null); setScreen('entry') }}>แก้ไขรายการ</button></Actions>
        </>}

        {screen === 'contact' && evaluation && <>
          <div className="role-banner"><UserRoundCheck size={18} /> มุมมองของคนที่ไว้ใจ · จำลอง</div><Heading eyebrow="คำขอจากพลอย" title="ช่วยดูรายการนี้หน่อย" detail="คุณเห็นเฉพาะข้อมูลจำเป็นสำหรับการให้ความเห็น" />
          {evaluation.reasons.includes('outside-trusted-zone') && <div className="contact-zone-alert"><ShieldAlert size={20} /><span><strong>ผู้โอนอยู่นอก Trusted Zone</strong><small>กรุณาติดต่อพลอยก่อนให้ความเห็น · ไม่แสดงที่อยู่หรือพิกัด</small></span></div>}
          {callback === 'requested' && <div className="contact-callback"><PhoneIncoming size={20} /><span><strong>พลอยขอให้คุณโทรหาตอนนี้</strong><small>คุยกันก่อนให้ความเห็น · พลอยไม่ต้องวางสายที่คุยอยู่</small></span><button type="button" className="primary" onClick={() => { setCallback('calling'); setScreen('pause') }}><Phone size={17} /> โทรหาพลอย (จำลอง)</button></div>}
          {callback === 'calling' && <div className="contact-callback calling"><Phone size={20} /><span><strong>คุณกำลังโทรหาพลอย (จำลอง)</strong><small>ให้ความเห็นหลังคุยกันแล้ว</small></span></div>}
          <section className="card"><div className="account-row"><span className="avatar">พ</span><span><strong>พลอยต้องการโอนเงิน</strong><small>คำขอให้ช่วยตรวจสอบรายการ</small></span></div><div className="contact-money">฿XX,XXX<small>ไม่แสดงยอดเงินจริงเพื่อความเป็นส่วนตัว</small></div><Row label="ผู้รับ" value={transfer.recipient.name} /><Row label="บัญชีผู้รับ" value={transfer.recipient.maskedAccount} /><Row label="รายละเอียดการโอน" value={transfer.purpose} /><Row label="เหตุผลที่ถาม" value={evaluation.reasons.map(contactReasonLabel).join(' · ')} /></section>
          <section className={`card contact-answers ${signals.length ? 'flagged' : ''}`}><h2>สิ่งที่พลอยตอบระหว่างรอ</h2>{signals.length ? <ul>{signals.map(signal => <li key={signal}>{contactSignalLabels[signal]}</li>)}</ul> : <p>{SCAM_CHECK_QUESTIONS.every(question => scamCheck[question] === 'no') ? 'พลอยตอบว่าไม่มีสัญญาณเหล่านี้' : 'พลอยยังไม่ได้ตอบว่ามีสัญญาณเสี่ยง'}</p>}{signals.length > 0 && <strong>เป็นสัญญาณที่มิจฉาชีพใช้บ่อย ควรโทรคุยกับพลอยก่อน</strong>}</section>
          <Notice icon={<Info size={17} />}>รายละเอียดการโอนเป็นข้อความที่ผู้โอนพิมพ์เอง ไม่ใช่หลักฐานว่าผู้รับน่าเชื่อถือ คุณจะไม่เห็นยอดเงินคงเหลือหรือข้อมูลบัญชีเต็มของพลอย การตอบกลับนี้เป็นการจำลอง</Notice>
          <Actions>{settings.level === 'warn' ? <><button className="primary concern-action" onClick={() => { setContactResponse({ kind: 'warn-advice', advice: 'concern', respondedAt: new Date().toISOString() }); setScreen('pause') }}>ฉันกังวล ขอให้หยุดโอนแล้วคุยกันก่อน <ArrowRight size={18} /></button><button className="outline" onClick={() => { setContactResponse({ kind: 'warn-advice', advice: 'looks-okay', respondedAt: new Date().toISOString() }); setScreen('pause') }}>ยังไม่พบข้อกังวลจากข้อมูลที่เห็น</button></> : <><button className="primary" onClick={() => { setContactResponse({ kind: 'approval-decision', decision: 'approved', respondedAt: new Date().toISOString() }); setScreen('pause') }}>อนุมัติรายการจำลอง <Check size={18} /></button><button className="outline reject" onClick={() => { setContactResponse({ kind: 'approval-decision', decision: 'rejected', respondedAt: new Date().toISOString() }); setScreen('pause') }}>ไม่อนุมัติรายการ <X size={18} /></button></>}<button className="text-button" onClick={() => setScreen('pause')}>ยังไม่ตอบตอนนี้</button></Actions>
        </>}

        {screen === 'recovery' && <>
          <div className="status-icon neutral"><HelpCircle size={29} /></div><Heading centered eyebrow="เส้นทางช่วยเหลือแยก" title="ขอให้ช่วยตรวจสอบ" detail="หากคนที่ไว้ใจไม่สามารถอนุมัติได้ คุณสามารถเริ่มคำขอทบทวนในตัวอย่างนี้" />
          <section className="card"><h2>ขั้นตอนที่จำลอง</h2><div className="recovery-step"><span>1</span> แจ้งคำขอและตรวจสอบตัวตนเพิ่มเติม</div><div className="recovery-step"><span>2</span> ตรวจสอบความเสี่ยงของรายการอีกครั้ง</div><div className="recovery-step"><span>3</span> รอผลการพิจารณา ไม่ปล่อยรายการทันที</div></section><Notice icon={<Info size={17} />}>ต้นแบบนี้ไม่ได้เชื่อมต่อธนาคาร และไม่มีการตรวจสอบตัวตนจริง</Notice>
          <Actions><button className="primary" onClick={() => { setRecoveryState('pending-demo-review'); finish('recovery-pending') }}>ส่งคำขอจำลอง <ArrowRight size={18} /></button><button className="text-button" onClick={() => setScreen('pause')}>กลับไปดูรายการที่พักไว้</button></Actions>
        </>}

        {screen === 'outcome' && <>
          <div className={`status-icon ${outcome === 'cancelled' ? 'neutral' : outcome === 'recovery-pending' || outcome === 'paused' ? 'warning' : 'success'}`}>{outcome === 'cancelled' ? <X size={29} /> : outcome === 'recovery-pending' || outcome === 'paused' ? <Clock3 size={29} /> : <Check size={29} />}</div>
          <Heading centered eyebrow="สถานะรายการจำลอง" title={outcome === 'cancelled' ? 'ยกเลิกรายการแล้ว' : outcome === 'recovery-pending' ? 'คำขออยู่ระหว่างรอ' : outcome === 'contact-approved' ? 'ได้รับอนุมัติในตัวอย่าง' : outcome === 'warn-manually-confirmed' ? 'คุณเลือกดำเนินการต่อ' : outcome === 'demo-confirmed' ? 'รายการผ่านขั้นตอนจำลอง' : 'รายการยังพักอยู่'} detail={outcome === 'recovery-pending' ? 'คำขอทบทวนถูกบันทึกในต้นแบบเท่านั้น ยังไม่มีผลการพิจารณา' : outcome === 'cancelled' ? 'ไม่มีเงินถูกส่งในต้นแบบนี้' : 'นี่คือผลของการทดลอง ไม่มีการโอนเงินจริงหรือส่งคำขอไปยังธนาคาร'} />
          <section className="card summary"><h2>รายละเอียดรายการ</h2><div className="big-money">{formatBaht(amountBaht)}</div><Row label="ผู้รับ" value={transfer.recipient.name} /><Row label="บัญชี" value={transfer.recipient.maskedAccount} /><Row label="การปกป้อง" value={levels[settings.level].title} /><Row label="สถานะเงินจริง" value="ไม่มีการโอน" /></section>
          {contactResponse.kind !== 'no-response' && <Notice icon={<Avatar name={contactName} />}>{contactResponse.kind === 'warn-advice' ? contactResponse.advice === 'concern' ? `${settings.trustedContact.name} กังวลและขอให้หยุดโอนแล้วคุยกันก่อน` : `${settings.trustedContact.name} ยังไม่พบข้อกังวลจากข้อมูลที่เห็น` : `${settings.trustedContact.name} ${contactResponse.decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}ในตัวอย่าง`}</Notice>}
          <Actions><button className="primary" onClick={reset}>ทดลองอีกครั้ง <RefreshCcw size={18} /></button><button className="text-button" onClick={() => setScreen('home')}>กลับหน้าหลัก</button></Actions>
        </>}

        {screen === 'settings' && <>
          <Heading eyebrow="การปกป้องของคุณ" title="ตั้งค่า TrustGuard" detail="เลือกระดับที่เหมาะกับคุณ" />
          <section className="settings-section"><h2>ระดับการปกป้อง</h2><div className="level-list">{(['off', 'warn', 'approval-required'] as const).map(level => <button key={level} className={`level ${draft.level === level ? 'selected' : ''}`} onClick={() => setDraft({ ...draft, level })}><span className="radio">{draft.level === level && <Check size={13} />}</span><span><strong>{levels[level].title}</strong><small>{levels[level].detail}</small></span></button>)}</div></section>
          <section className="card settings-section"><h2><ShieldCheck size={19} /> Trusted Limit</h2><label htmlFor="monthly-limit" className="field-label">วงเงินโอนสะสมต่อเดือน (บาท)</label><div className="setting-input">฿ <input id="monthly-limit" type="number" inputMode="numeric" min="1" step="1000" value={draft.monthlyLimitBaht} onChange={event => setDraft({ ...draft, monthlyLimitBaht: Number(event.target.value) })} /></div><p className="help">นับรายการไปยังผู้รับที่เฝ้าดูในเดือนปฏิทินตามเวลาไทย เริ่มใหม่วันที่ 1 ของเดือน</p></section>
          <section className="card settings-section"><h2><Users size={19} /> Trusted Contact</h2><label htmlFor="trusted-person" className="field-label">คนที่คุณเลือก</label><select id="trusted-person" value={draft.trustedContact.name} onChange={event => setDraft({ ...draft, trustedContact: { ...draft.trustedContact, name: event.target.value, relationship: event.target.value === 'มิน' ? 'เพื่อนที่ไว้ใจ' : 'พี่สาว' } })}><option value="มิน">มิน · เพื่อนที่ไว้ใจ</option><option value="ฟ้า">ฟ้า · พี่สาว</option></select><label className="check-row"><input type="checkbox" checked={draft.trustedContact.consented} onChange={event => setDraft({ ...draft, trustedContact: { ...draft.trustedContact, consented: event.target.checked } })} /><span>คนนี้ยินยอมรับรายละเอียดจำกัดในตัวอย่าง</span></label><p className="help">เห็นชื่อผู้โอน ชื่อผู้รับ บัญชีผู้รับแบบปิดบางส่วน รายละเอียดการโอนที่ผู้โอนพิมพ์ และเหตุผลที่เตือน แต่ไม่เห็นยอดเงินจริง</p></section>
          <section className="card settings-section"><h2><MapPin size={19} /> Trusted Zone</h2><label htmlFor="zone-status" className="field-label">สถานะตำแหน่งสำหรับการทดลอง</label><select id="zone-status" value={zoneStatus} onChange={event => setZoneStatus(event.target.value as TrustedZoneStatus)}><option value="inside">อยู่ใน Trusted Zone</option><option value="outside">อยู่นอก Trusted Zone</option><option value="unavailable">ไม่สามารถตรวจสอบตำแหน่ง</option></select><p className="help">ใช้สถานะจำลอง ไม่ขอพิกัดจริง การอยู่ใน Trusted Zone ไม่ล้างคำเตือนจากกฎอื่น</p></section>
        </>}
      </main>
      {screen === 'settings' && <div className="settings-save-bar"><button className="primary" disabled={!Number.isSafeInteger(draft.monthlyLimitBaht) || draft.monthlyLimitBaht <= 0} onClick={saveSettings}>บันทึกในตัวอย่าง <Check size={18} /></button></div>}
      <nav className="bottom-nav" aria-label="เมนูหลัก"><button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')}><Home size={20} />หน้าหลัก</button><button className={['entry', 'review', 'pause', 'contact', 'outcome', 'recovery'].includes(screen) ? 'active' : ''} onClick={() => chooseScenario(scenario)}><Send size={20} />โอนเงิน</button><button className={screen === 'settings' ? 'active' : ''} onClick={() => openSettings(screen)}><Settings2 size={20} />ตั้งค่า</button></nav>
    </div>
    {pauseOpen && evaluation && <div className="pause-backdrop" inert={showWarnConfirm}>
      <div className={`pause-dialog ${calm ? 'calm' : 'alarm'}`} ref={pauseRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="pause-title" aria-describedby="pause-description" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closePause() } else trapDialogTab(event) }}>
        <div className="pause-topline"><span>Smart Pause · รายการที่ต้องทบทวน</span><button type="button" className="icon-button" onClick={closePause} aria-label="กลับไปตรวจสอบรายการ"><X size={19} /></button></div>
        <div className="pause-alert"><div className="pause-triggered"><ShieldAlert size={30} aria-hidden="true" /><span>TrustGuard Triggered</span></div><h2 id="pause-title">รายการนี้ยังไม่ถูกโอน</h2><p id="pause-description">{pauseLeads[(evaluationCount - 1 + pauseLeads.length) % pauseLeads.length]}</p><div className="pause-reasons">{evaluation.reasons.map(reason => <strong key={reason}>{reason === 'monthly-limit' ? `ยอดโอนสะสมเดือนนี้ ${formatBaht(evaluation.monthlyTotalBaht)} ถึง Trusted Limit ${formatBaht(evaluation.monthlyLimitBaht)} ที่คุณตั้งไว้` : reasonLabel(reason)}</strong>)}</div>{transfer.recipient.risk === 'unknown' && <small>เรายังไม่มีข้อมูลความเสี่ยงของบัญชีผู้รับ</small>}<p className="pause-calm-line" aria-hidden={!calm}>หายใจลึก ๆ ไม่ต้องรีบ เงินยังอยู่กับคุณ</p></div>
        <div className="pause-panel">
        <div className="pause-transfer"><div><strong>{formatBaht(amountBaht)}</strong><span>{transfer.recipient.name} · {transfer.recipient.maskedAccount}</span></div><span className="pause-badge">ยังไม่ถูกโอน</span></div>
        <p className="pause-impact"><strong>{share}% ของเงินเดือน</strong> · {remainingBaht >= 0 ? `โอนแล้วจะเหลือในบัญชี ${formatBaht(remainingBaht)}` : 'มากกว่ายอดเงินคงเหลือ'}</p>
        <ZoneStatus status={zoneStatus} />
        <div className="pause-contact"><Avatar name={contactName} /><div><strong>{contactName} · Trusted Contact</strong><span>{evaluation.contactNotification === 'none' ? `${contactName}ยังไม่ได้ยินยอม จึงไม่มีการแจ้งเตือน` : contactResponse.kind === 'no-response' ? `${contactName}ยังไม่ได้ตอบ · ส่งคำขอจำลองแล้ว` : contactResponse.kind === 'warn-advice' ? contactResponse.advice === 'concern' ? `${contactName}กังวล และขอให้หยุดโอนแล้วคุยกันก่อน` : `${contactName}ยังไม่พบข้อกังวลจากข้อมูลที่เห็น` : contactResponse.decision === 'approved' ? `${contactName}อนุมัติรายการจำลอง` : `${contactName}ไม่อนุมัติรายการ`}</span></div></div>
        <div className="pause-wait">{settings.level === 'warn' ? <Clock3 size={18} /> : <LockKeyhole size={18} />}<div><strong>{settings.level === 'warn' ? fastForwarded ? 'ข้ามเวลารอสำหรับการทดลองแล้ว' : secondsLeft > 0 ? `รออีก ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')} นาที` : 'ครบเวลารอ 2 นาทีแล้ว' : `ต้องได้รับอนุมัติจาก${contactName}`}</strong><small>{settings.level === 'warn' ? 'ครบเวลาแล้วต้องกดยืนยันเอง ไม่มีการโอนอัตโนมัติ' : 'หากติดต่อไม่ได้ ให้ใช้เส้นทางขอความช่วยเหลือแยก'}</small></div></div>
        {settings.level === 'warn' && mayConfirm && contactResponse.kind === 'no-response' && <div className="pause-no-response" role="alert"><strong>ยังไม่ได้รับความเห็นจาก{contactName}</strong><span>เราแนะนำให้หยุดการโอนไว้ก่อน</span></div>}
        <section className="scam-check" aria-labelledby="scam-check-title"><strong id="scam-check-title">เช็กสั้น ๆ ระหว่างรอ</strong>
          {SCAM_CHECK_QUESTIONS.map(question => <div className="scam-question" key={question}><span id={`scam-${question}`}>{scamQuestionLabels[question]}</span><div className="yes-no" role="group" aria-labelledby={`scam-${question}`}>{(['yes', 'no'] as const).map(answer => <button type="button" key={answer} aria-pressed={scamCheck[question] === answer} className={scamCheck[question] === answer ? `on ${answer}` : ''} onClick={() => setScamCheck({ ...scamCheck, [question]: answer })}>{answer === 'yes' ? 'ใช่' : 'ไม่ใช่'}</button>)}</div></div>)}
          {signals.length > 0 && <div className="scam-alert" role="alert"><strong>นี่คือสัญญาณที่มิจฉาชีพใช้บ่อย</strong><span>เราแนะนำให้หยุดการโอน{signals.includes('on-call') && evaluation.contactNotification !== 'none' ? ` แล้วให้${contactName}โทรหาคุณตอนนี้` : ''}</span></div>}
        </section>
        <div className="pause-actions">
          {evaluation.contactNotification !== 'none' && (callback === 'idle'
            ? <button type="button" className={signals.includes('on-call') ? 'primary callback-urgent' : 'outline'} onClick={() => setCallback('requested')}><Phone size={17} /> ขอให้{contactName}โทรหาฉันตอนนี้</button>
            : <div className={`callback-status ${callback}`} role="status"><PhoneIncoming size={18} /><span>{callback === 'requested' ? `ส่งคำขอให้${contactName}โทรหาคุณแล้ว (จำลอง)` : `${contactName}กำลังโทรหาคุณ (จำลอง) · รับสายก่อนตัดสินใจ`}</span></div>)}
          {evaluation.contactNotification !== 'none' && <button type="button" className={signals.includes('on-call') ? 'outline' : 'primary'} onClick={() => setScreen('contact')}><UserRoundCheck size={17} /> เปิดมุมคนที่ไว้ใจ (จำลอง)</button>}
          <button type="button" className={signals.length ? 'primary stop-strong' : 'outline pause-stop'} onClick={() => finish('cancelled')}>หยุดการโอนไว้ก่อน</button>
          {settings.level === 'approval-required' && !(contactResponse.kind === 'approval-decision' && contactResponse.decision === 'approved') && <button type="button" className="outline" onClick={() => setScreen('recovery')}><HelpCircle size={17} /> ขอให้ช่วยตรวจสอบผ่านเส้นทางแยก</button>}
          <button type="button" ref={continueRef} className="pause-continue" disabled={!mayConfirm} onClick={() => settings.level === 'warn' ? setShowWarnConfirm(true) : finish('contact-approved')}>{settings.level === 'warn' ? 'ยืนยันดำเนินการต่อ' : 'ดำเนินการต่อหลังได้รับอนุมัติ'}</button>
          {settings.level === 'warn' && secondsLeft > 0 && !fastForwarded && <button type="button" className="demo-link" onClick={() => setFastForwarded(true)}>ข้ามเวลารอ 2 นาที (เฉพาะการทดลอง)</button>}
        </div>
        </div>
      </div>
    </div>}
    {showWarnConfirm && <div className="confirm-backdrop" role="presentation"><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setShowWarnConfirm(false) } else trapDialogTab(event) }}><button type="button" className="confirm-close icon-button" onClick={() => setShowWarnConfirm(false)} aria-label="กลับไปดูคำเตือน"><X size={19} /></button><ShieldAlert size={32} /><h2 id="confirm-title">ยังต้องการดำเนินการต่อหรือไม่?</h2><p id="confirm-description">{contactResponse.kind === 'no-response' ? `ตอนนี้${contactName}ยังไม่ได้ตอบ เราขอแนะนำให้หยุดการโอนไว้ก่อน` : contactResponse.kind === 'warn-advice' && contactResponse.advice === 'concern' ? `${contactName}กังวล และขอให้หยุดโอนแล้วคุยกันก่อน` : 'ตรวจสอบชื่อผู้รับและจำนวนเงินอีกครั้งก่อนตัดสินใจ'}<br /><strong>มิจฉาชีพมักเร่งให้โอนเงินทันที</strong></p><div className="confirm-summary"><span>รายการนี้ยังไม่ถูกโอน</span><strong>{formatBaht(amountBaht)} · {transfer.recipient.name}</strong></div><button ref={confirmRef} className="primary confirm-stop" onClick={() => finish('cancelled')}>หยุดการโอน</button><HoldButton className="pause-continue confirm-proceed" onComplete={() => { if (mayConfirm && settings.level === 'warn') finish('warn-manually-confirmed') }}>กดค้าง 3 วินาที เพื่อยืนยันดำเนินการต่อ (จำลอง)</HoldButton></div></div>}
    {showAuth && <div className="confirm-backdrop" role="presentation"><div className="confirm-dialog auth-dialog" role="alertdialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setShowAuth(false) } else trapDialogTab(event) }}><button type="button" className="confirm-close icon-button" onClick={() => setShowAuth(false)} aria-label="กลับไปแก้ไขการตั้งค่า"><X size={19} /></button><LockKeyhole size={32} /><h2 id="auth-title">ยืนยันตัวตนก่อนลดการปกป้อง</h2><p id="auth-description">การเปลี่ยนนี้ทำให้ TrustGuard ปกป้องคุณน้อยลง<br /><strong>หากมีคนบอกให้คุณปิดการปกป้องหรือเพิ่มวงเงิน นั่นอาจเป็นมิจฉาชีพ</strong></p><div className="confirm-summary">{weakeningChanges(settings, draft).map(change => <span key={change}>{change}</span>)}<strong>{settings.trustedContact.consented ? `${settings.trustedContact.name} จะได้รับแจ้งการเปลี่ยนแปลงนี้ (จำลอง)` : 'ไม่มี Trusted Contact ที่ได้รับแจ้ง'}</strong></div><button className="primary confirm-stop" onClick={() => { setDraft({ ...settings, trustedContact: { ...settings.trustedContact } }); setShowAuth(false) }}>คงการปกป้องเดิมไว้</button><button className="pause-continue confirm-proceed" onClick={applyDraft}>ยืนยันตัวตนและบันทึก (จำลอง)</button></div></div>}
  </div>
}

const levelRank: Record<ProtectionLevel, number> = { off: 0, warn: 1, 'approval-required': 2 }
function weakeningChanges(before: TrustGuardSettings, after: TrustGuardSettings) {
  const changes: string[] = []
  if (levelRank[after.level] < levelRank[before.level]) changes.push(`ระดับการปกป้อง: ${levels[before.level].title} → ${levels[after.level].title}`)
  if (after.monthlyLimitBaht > before.monthlyLimitBaht) changes.push(`Trusted Limit: ${formatBaht(before.monthlyLimitBaht)} → ${formatBaht(after.monthlyLimitBaht)}`)
  if (before.trustedContact.consented && !after.trustedContact.consented) changes.push('ยกเลิกการแจ้ง Trusted Contact')
  if (after.trustedContact.name !== before.trustedContact.name) changes.push(`เปลี่ยน Trusted Contact: ${before.trustedContact.name} → ${after.trustedContact.name}`)
  return changes
}
const weakensProtection = (before: TrustGuardSettings, after: TrustGuardSettings) => weakeningChanges(before, after).length > 0

function Steps({ current }: { current: number }) { return <div className="steps" aria-label={`ขั้นตอน ${current} จาก 3`}>{[1, 2, 3].map(n => <span key={n} className={n <= current ? 'on' : ''} />)}</div> }
function Heading({ eyebrow, title, detail, centered = false }: { eyebrow: string; title: string; detail: string; centered?: boolean }) { return <div className={`heading ${centered ? 'centered' : ''}`}><span>{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div> }
function Row({ label, value }: { label: string; value: string }) { return <div className="data-row"><span>{label}</span><strong>{value}</strong></div> }
function ZoneStatus({ status }: { status: TrustedZoneStatus }) { return <div className={`zone-status ${status}`}><MapPin size={18} /><span>{zoneLabels[status]}</span><small>จำลอง</small></div> }
function Avatar({ name }: { name: string }) { return <span className={`contact-avatar ${name === 'มิน' ? 'tone-a' : 'tone-b'}`} aria-hidden="true">{name.slice(0, 1)}</span> }
const HOLD_TO_CONFIRM_MS = 3000
/** Press and hold (pointer, Space or Enter) for the full duration; releasing early resets it. */
function HoldButton({ onComplete, className, children }: { onComplete: () => void; className: string; children: React.ReactNode }) {
  const [progress, setProgress] = useState(0)
  const frame = useRef<number | null>(null)
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current) }, [])
  function begin() {
    if (frame.current !== null) return
    const started = performance.now()
    const tick = (time: number) => {
      const next = Math.min(1, (time - started) / HOLD_TO_CONFIRM_MS)
      setProgress(next)
      if (next >= 1) { frame.current = null; onComplete() } else frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }
  function cancel() { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; setProgress(0) }
  const isHoldKey = (key: string) => key === ' ' || key === 'Enter'
  return <button type="button" className={`hold-button ${className}`} style={{ '--hold': progress } as React.CSSProperties} onPointerDown={begin} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onContextMenu={event => event.preventDefault()} onKeyDown={event => { if (isHoldKey(event.key)) { event.preventDefault(); if (!event.repeat) begin() } }} onKeyUp={event => { if (isHoldKey(event.key)) cancel() }} onBlur={cancel}>{children}<span className="hold-track" aria-hidden="true"><span /></span></button>
}
function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) { return <div className="notice">{icon}<span>{children}</span></div> }
function Actions({ children }: { children: React.ReactNode }) { return <div className="actions">{children}</div> }
function trapDialogTab(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'Tab') return
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
export default App
