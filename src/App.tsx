import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, Check, ChevronRight, Clock3, CreditCard, HelpCircle, Home, Info, LockKeyhole, MapPin, RefreshCcw, Send, Settings2, ShieldAlert, ShieldCheck, UserRoundCheck, Users, Wallet, X } from 'lucide-react'
import { PROTOTYPE_SCENARIOS, canSenderConfirm, evaluateTransfer, type ContactResponse, type DemoScenario, type Evaluation, type ProtectionLevel, type RecoveryState, type SenderOutcome, type TrustGuardSettings } from './domain/trustguard'

type Screen = 'home' | 'entry' | 'review' | 'pause' | 'contact' | 'outcome' | 'recovery' | 'settings'
type Outcome = SenderOutcome | 'demo-confirmed'
const formatBaht = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const firstScenario = PROTOTYPE_SCENARIOS[0]
const levels: Record<ProtectionLevel, { title: string; detail: string }> = {
  off: { title: 'ปิด', detail: 'ไม่มีการหยุดเพิ่มเติมจาก TrustGuard' },
  warn: { title: 'เตือน', detail: 'พัก 1 นาทีและขอความเห็นจากคนที่ไว้ใจ' },
  'approval-required': { title: 'ต้องได้รับอนุมัติ', detail: 'รอคนที่ไว้ใจอนุมัติก่อนดำเนินการ' },
}
const reasonLabel = (reason: Evaluation['reasons'][number]) => reason === 'monthly-limit' ? 'ยอดโอนสะสมถึงวงเงินที่คุณตั้งไว้' : reason === 'outside-trusted-zone' ? 'อยู่นอกพื้นที่ที่คุณตั้งไว้' : 'มีสัญญาณความเสี่ยงจำลองของบัญชีผู้รับ'

function App() {
  const mainRef = useRef<HTMLElement>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [scenario, setScenario] = useState<DemoScenario>(firstScenario)
  const [amountBaht, setAmountBaht] = useState(firstScenario.transfer.amountBaht)
  const [settings, setSettings] = useState<TrustGuardSettings>({ ...firstScenario.settings })
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [contactResponse, setContactResponse] = useState<ContactResponse>({ kind: 'no-response' })
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('not-started')
  const [outcome, setOutcome] = useState<Outcome>('paused')
  const [nowMs, setNowMs] = useState(Date.now())
  const [fastForwarded, setFastForwarded] = useState(false)
  const [settingsReturn, setSettingsReturn] = useState<Screen>('home')

  useEffect(() => { const timer = window.setInterval(() => setNowMs(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { mainRef.current?.focus() }, [screen])
  const transfer = useMemo(() => ({ ...scenario.transfer, amountBaht }), [scenario, amountBaht])
  const eligibleAt = evaluation?.warnEligibleAt ? Date.parse(evaluation.warnEligibleAt) : 0
  const secondsLeft = Math.max(0, Math.ceil((eligibleAt - nowMs) / 1000))
  const effectiveNow = new Date(fastForwarded ? Math.max(nowMs, eligibleAt) : nowMs).toISOString()
  const mayConfirm = evaluation ? canSenderConfirm({ evaluation, level: settings.level, now: effectiveNow, contactResponse, recoveryState }) : false

  function chooseScenario(item: DemoScenario) {
    setScenario(item); setAmountBaht(item.transfer.amountBaht); setEvaluation(null)
    setContactResponse({ kind: 'no-response' }); setRecoveryState('not-started'); setFastForwarded(false); setScreen('entry')
  }
  function reset() {
    setScenario(firstScenario); setAmountBaht(firstScenario.transfer.amountBaht); setSettings({ ...firstScenario.settings })
    setEvaluation(null); setContactResponse({ kind: 'no-response' }); setRecoveryState('not-started'); setFastForwarded(false); setScreen('home')
  }
  function evaluate() {
    const startedAt = new Date()
    const result = evaluateTransfer({ transfer, history: scenario.history, settings, reviewStartedAt: startedAt.toISOString() })
    setNowMs(startedAt.getTime())
    setEvaluation(result); setContactResponse({ kind: 'no-response' }); setRecoveryState('not-started'); setFastForwarded(false)
    if (result.action === 'smart-pause') setScreen('pause')
    else { setOutcome('demo-confirmed'); setScreen('outcome') }
  }
  function finish(next: Outcome) { setOutcome(next); setScreen('outcome') }
  function goBack() {
    if (screen === 'entry') setScreen('home')
    else if (screen === 'review') setScreen('entry')
    else if (screen === 'pause') setScreen('review')
    else if (screen === 'contact' || screen === 'recovery') setScreen('pause')
    else if (screen === 'settings') setScreen(settingsReturn === 'pause' ? 'review' : settingsReturn)
    else setScreen('home')
  }
  function openSettings(from: Screen) { setSettingsReturn(from); setScreen('settings') }
  const titles: Record<Screen, string> = { home: 'หน้าหลัก', entry: 'โอนเงิน', review: 'ตรวจสอบรายการ', pause: 'Smart Pause', contact: 'มุมคนที่ไว้ใจ', outcome: 'สถานะรายการ', recovery: 'ขอความช่วยเหลือ', settings: 'ตั้งค่า TrustGuard' }

  return <div className="site-shell">
    <aside className="desktop-note" aria-hidden="true"><div className="desktop-brand"><ShieldCheck /> TrustGuard</div><span>PAUSE WITH PURPOSE</span><h1>โอนอย่างมั่นใจ<br /><em>ในจังหวะของคุณ</em></h1><p>ต้นแบบประสบการณ์โอนเงินที่ช่วยให้คุณทบทวนรายการสำคัญ และขอความเห็นจากคนที่ไว้ใจ</p><small>INTERACTIVE PROTOTYPE · 2026</small></aside>
    <div className="phone-shell">
      <div className="brandbar"><strong><ShieldCheck size={19} /> TrustGuard</strong><span>ต้นแบบสำหรับทดลอง</span></div>
      <header className="app-header"><button className="icon-button" onClick={screen === 'home' ? undefined : goBack} aria-label="ย้อนกลับ" disabled={screen === 'home'}><ArrowLeft size={20} /></button><strong>{titles[screen]}</strong><button className="icon-button" onClick={reset} aria-label="เริ่มการทดลองใหม่"><RefreshCcw size={18} /></button></header>
      <main className="screen-body" key={screen} ref={mainRef} tabIndex={-1} aria-label={titles[screen]}>
        {screen === 'home' && <>
          <div className="intro"><span>สวัสดี พลอย</span><p>วันนี้คุณดูแลเงินของตัวเองได้อีกนิด</p></div>
          <section className="balance-card"><div><span><Wallet size={16} /> บัญชีใช้จ่าย</span><small>ข้อมูลจำลอง</small></div><p>ยอดเงินคงเหลือ</p><strong>{formatBaht(28_000)}</strong><footer><span>•• 4821</span><span>เงินเดือนตัวอย่าง ฿28,000</span></footer></section>
          <button className="quick-action" onClick={() => chooseScenario(scenario)}><span className="quick-icon"><Send size={21} /></span><span><strong>โอนเงิน</strong><small>เริ่มจากรายการตัวอย่าง</small></span><ArrowRight size={20} /></button>
          <div className="section-header"><h2>ทดลองสถานการณ์</h2><span>เลือก 1 รายการ</span></div>
          <div className="scenario-list">{PROTOTYPE_SCENARIOS.map((item, index) => <button className="scenario" key={item.id} onClick={() => chooseScenario(item)}><span className="scenario-index">0{index + 1}</span><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={19} /></button>)}</div>
          <button className="settings-link" onClick={() => openSettings('home')}><ShieldCheck size={22} /><span><strong>TrustGuard · {levels[settings.level].title}</strong><small>วงเงิน {formatBaht(settings.monthlyLimitBaht)} / เดือน</small></span><ChevronRight size={18} /></button>
          <p className="fine-print">ทุกรายการ บุคคล และยอดเงินเป็นข้อมูลสมมติ ไม่มีการโอนเงินจริง</p>
        </>}

        {screen === 'entry' && <>
          <Steps current={1} /><Heading eyebrow="รายการตัวอย่าง" title="โอนให้ใคร เท่าไร" detail="ใช้เฉพาะผู้รับสมมติที่เตรียมไว้สำหรับการทดลอง" />
          <section className="card"><div className="field-label">จากบัญชี</div><div className="account-row"><span className="account-icon"><CreditCard size={19} /></span><span><strong>บัญชีใช้จ่ายของพลอย</strong><small>บัญชีตัวอย่าง •• 4821</small></span></div><hr /><div className="field-label">ถึงผู้รับ</div><div className="account-row"><span className="avatar">{transfer.recipient.name.slice(0, 1)}</span><span><strong>{transfer.recipient.name}</strong><small>บัญชีสมมติ {transfer.recipient.maskedAccount}</small></span></div></section>
          <section className="card"><label htmlFor="amount" className="field-label">จำนวนเงิน (บาท)</label><div className="large-input"><span>฿</span><input id="amount" type="number" inputMode="numeric" min="1" max="1000000" step="1" value={amountBaht} onChange={event => setAmountBaht(Number(event.target.value))} /></div><p className="help">วัตถุประสงค์: {transfer.purpose}</p></section>
          <Notice icon={<Info size={17} />}>{scenario.id === 'split-transfers' ? 'ก่อนหน้านี้มีโอน ฿6,000 สองครั้งในเดือนเดียวกัน' : scenario.id === 'ordinary-high-value' ? 'ตัวอย่างนี้เป็นการซื้อสินค้าจริง เพื่อดูว่าการเตือนรบกวนมากแค่ไหน' : 'ผู้รับรายนี้ยังอยู่ในกลุ่มที่เฝ้าดู แม้ไม่มีข้อมูลความเสี่ยงของบัญชี'}</Notice>
          <Actions><button className="primary" disabled={!Number.isSafeInteger(amountBaht) || amountBaht <= 0 || amountBaht > 1_000_000} onClick={() => setScreen('review')}>ตรวจสอบรายการ <ArrowRight size={18} /></button></Actions>
        </>}

        {screen === 'review' && <>
          <Steps current={2} /><Heading eyebrow="ก่อนดำเนินการ" title="ตรวจสอบอีกครั้ง" detail="ชื่อผู้รับและจำนวนเงินถูกต้องหรือไม่" />
          <section className="card summary"><div className="summary-icon"><Send size={24} /></div><span className="muted">จำนวนเงินที่ต้องการโอน</span><div className="big-money">{formatBaht(amountBaht)}</div><hr /><Row label="จาก" value="บัญชีใช้จ่าย •• 4821" /><Row label="ถึง" value={transfer.recipient.name} /><Row label="บัญชีผู้รับ" value={transfer.recipient.maskedAccount} /><Row label="รายละเอียด" value={transfer.purpose} /></section>
          <Notice icon={<ShieldCheck size={18} />}>TrustGuard จะตรวจตามระดับ <strong>{levels[settings.level].title}</strong> และวงเงิน {formatBaht(settings.monthlyLimitBaht)}</Notice>
          <Actions><button className="primary" onClick={evaluate}>ตรวจสอบกับ TrustGuard <ArrowRight size={18} /></button><button className="text-button" onClick={() => setScreen('entry')}>แก้ไขรายการ</button></Actions>
        </>}

        {screen === 'pause' && evaluation && <>
          <Steps current={3} /><div className="status-icon warning"><ShieldAlert size={29} /></div><Heading centered eyebrow="SMART PAUSE · กำลังพักรายการ" title="รายการนี้ยังไม่ถูกโอน" detail="คุณยังมีเวลาตรวจสอบก่อนตัดสินใจ" />
          <section className="card"><h2>เหตุผลที่พักรายการ</h2>{evaluation.reasons.map(reason => <div className="reason" key={reason}><ShieldAlert size={17} /> {reasonLabel(reason)}</div>)}<hr /><Row label="ยอดโอนครั้งนี้" value={formatBaht(amountBaht)} /><Row label="ยอดสะสมเดือนนี้" value={formatBaht(evaluation.monthlyTotalBaht)} /><Row label="วงเงินที่ตั้งไว้" value={formatBaht(evaluation.monthlyLimitBaht)} /></section>
          {transfer.recipient.risk === 'unknown' && <Notice icon={<Info size={17} />}>เรายังไม่มีข้อมูลความเสี่ยงของบัญชีนี้ แต่รายการเข้าเงื่อนไขที่คุณตั้งไว้</Notice>}
          {transfer.zoneStatus === 'unavailable' && <Notice icon={<MapPin size={17} />}>ไม่ได้ใช้ตำแหน่งในตัวอย่างนี้ รายการยังดำเนินต่อได้</Notice>}
          <section className="card contact-panel"><div className="contact-head"><span className="contact-icon"><Users size={20} /></span><div><strong>{settings.level === 'warn' ? 'ขอความเห็นจากคนที่ไว้ใจ' : 'รอการอนุมัติจากคนที่ไว้ใจ'}</strong><small>{settings.trustedContact.name} · {settings.trustedContact.relationship}</small></div></div><div className="contact-status"><Bell size={15} /> {evaluation.contactNotification === 'none' ? 'ยังไม่ได้รับความยินยอม จึงไม่มีการแจ้งเตือน' : contactResponse.kind === 'no-response' ? 'ยังไม่มีคำตอบในตัวอย่างนี้' : contactResponse.kind === 'warn-advice' ? contactResponse.advice === 'concern' ? `${settings.trustedContact.name} แนะนำให้หยุดและคุยกันก่อน` : `${settings.trustedContact.name} ให้ตรวจรายละเอียดอีกครั้ง` : `${settings.trustedContact.name} ${contactResponse.decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}รายการในตัวอย่าง`}</div>{evaluation.contactNotification !== 'none' && <button className="outline" onClick={() => setScreen('contact')}><UserRoundCheck size={17} /> เปิดมุมของ {settings.trustedContact.name} <ArrowRight size={16} /></button>}</section>
          <div className="wait-card">{settings.level === 'warn' ? <Clock3 size={20} /> : <LockKeyhole size={20} />}<div><strong>{settings.level === 'warn' ? fastForwarded ? 'ข้ามเวลารอสำหรับการทดลองแล้ว' : secondsLeft > 0 ? `รออีก ${secondsLeft} วินาที` : 'ครบเวลารอ 1 นาทีแล้ว' : 'ต้องได้รับอนุมัติก่อน'}</strong><p>{settings.level === 'warn' ? 'ครบเวลาแล้วต้องกดยืนยันเอง ไม่มีการโอนอัตโนมัติ' : 'หากติดต่อไม่ได้ ให้ขอความช่วยเหลือผ่านเส้นทางแยก'}</p></div></div>
          <Actions>{settings.level === 'warn' && secondsLeft > 0 && !fastForwarded && <button className="demo-link" onClick={() => setFastForwarded(true)}>ข้ามเวลารอ 1 นาที (เฉพาะการทดลอง)</button>}<button className="primary" disabled={!mayConfirm} onClick={() => finish(settings.level === 'warn' ? 'warn-manually-confirmed' : 'contact-approved')}>{settings.level === 'warn' ? 'ฉันตรวจแล้ว ดำเนินการต่อในตัวอย่าง' : 'ดำเนินการต่อหลังได้รับอนุมัติ'} <ArrowRight size={18} /></button>{settings.level === 'approval-required' && !(contactResponse.kind === 'approval-decision' && contactResponse.decision === 'approved') && <button className="outline" onClick={() => setScreen('recovery')}><HelpCircle size={17} /> {contactResponse.kind === 'approval-decision' && contactResponse.decision === 'rejected' ? 'ไม่ได้รับอนุมัติ? ขอให้ช่วยตรวจสอบ' : 'ติดต่อไม่ได้? ขอให้ช่วยตรวจสอบ'}</button>}<button className="text-button danger" onClick={() => finish('cancelled')}>ยกเลิกรายการ</button></Actions>
        </>}

        {screen === 'contact' && evaluation && <>
          <div className="role-banner"><UserRoundCheck size={18} /> มุมมองของคนที่ไว้ใจ · จำลอง</div><Heading eyebrow="คำขอจากพลอย" title="ช่วยดูรายการนี้หน่อย" detail="คุณเห็นเฉพาะข้อมูลจำเป็นสำหรับการให้ความเห็น" />
          <section className="card"><div className="account-row"><span className="avatar">พ</span><span><strong>พลอยต้องการโอนเงิน</strong><small>คำขอจำลองจาก TrustGuard</small></span></div><div className="contact-money">{formatBaht(amountBaht)}</div><Row label="ผู้รับ" value={transfer.recipient.name} /><Row label="บัญชี" value={transfer.recipient.maskedAccount} /><Row label="เหตุผลที่ถาม" value={evaluation.reasons.map(reasonLabel).join(' · ')} /></section>
          <Notice icon={<Info size={17} />}>คุณจะไม่เห็นยอดเงินคงเหลือหรือข้อมูลบัญชีเต็มของพลอย การตอบกลับนี้เป็นการจำลอง</Notice>
          <Actions>{settings.level === 'warn' ? <><button className="primary" onClick={() => { setContactResponse({ kind: 'warn-advice', advice: 'concern', respondedAt: new Date().toISOString() }); setScreen('pause') }}>แนะนำให้หยุดและคุยกันก่อน <ArrowRight size={18} /></button><button className="outline" onClick={() => { setContactResponse({ kind: 'warn-advice', advice: 'looks-okay', respondedAt: new Date().toISOString() }); setScreen('pause') }}>ดูแล้ว ให้ตรวจรายละเอียดอีกครั้ง</button></> : <><button className="primary" onClick={() => { setContactResponse({ kind: 'approval-decision', decision: 'approved', respondedAt: new Date().toISOString() }); setScreen('pause') }}>อนุมัติรายการจำลอง <Check size={18} /></button><button className="outline reject" onClick={() => { setContactResponse({ kind: 'approval-decision', decision: 'rejected', respondedAt: new Date().toISOString() }); setScreen('pause') }}>ไม่อนุมัติรายการ <X size={18} /></button></>}<button className="text-button" onClick={() => setScreen('pause')}>ยังไม่ตอบกลับ · กลับไปมุมผู้โอน</button></Actions>
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
          {contactResponse.kind !== 'no-response' && <Notice icon={<Bell size={17} />}>{contactResponse.kind === 'warn-advice' ? contactResponse.advice === 'concern' ? `${settings.trustedContact.name} แนะนำให้หยุดและคุยกันก่อน` : `${settings.trustedContact.name} ให้ตรวจรายละเอียดอีกครั้ง` : `${settings.trustedContact.name} ${contactResponse.decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}ในตัวอย่าง`}</Notice>}
          <Actions><button className="primary" onClick={reset}>ทดลองอีกครั้ง <RefreshCcw size={18} /></button><button className="text-button" onClick={() => setScreen('home')}>กลับหน้าหลัก</button></Actions>
        </>}

        {screen === 'settings' && <>
          <Heading eyebrow="การปกป้องของคุณ" title="ตั้งค่า TrustGuard" detail="เลือกการปกป้องที่เหมาะกับคุณในตัวอย่างนี้" />
          <section className="settings-section"><h2>ระดับการปกป้อง</h2><div className="level-list">{(['off', 'warn', 'approval-required'] as const).map(level => <button key={level} className={`level ${settings.level === level ? 'selected' : ''}`} onClick={() => setSettings({ ...settings, level })}><span className="radio">{settings.level === level && <Check size={13} />}</span><span><strong>{levels[level].title}</strong><small>{levels[level].detail}</small></span></button>)}</div></section>
          <section className="card settings-section"><h2><ShieldCheck size={19} /> Trusted Limit</h2><label htmlFor="monthly-limit" className="field-label">วงเงินโอนสะสมต่อเดือน (บาท)</label><div className="setting-input">฿ <input id="monthly-limit" type="number" inputMode="numeric" min="1" step="1000" value={settings.monthlyLimitBaht} onChange={event => setSettings({ ...settings, monthlyLimitBaht: Number(event.target.value) })} /></div><p className="help">นับรายการไปยังผู้รับที่เฝ้าดูในเดือนปฏิทินตามเวลาไทย เริ่มใหม่วันที่ 1 ของเดือน</p></section>
          <section className="card settings-section"><h2><Users size={19} /> Trusted Contact</h2><label htmlFor="trusted-person" className="field-label">คนที่คุณเลือก</label><select id="trusted-person" value={settings.trustedContact.name} onChange={event => setSettings({ ...settings, trustedContact: { ...settings.trustedContact, name: event.target.value, relationship: event.target.value === 'มิน' ? 'เพื่อนที่ไว้ใจ' : 'พี่สาว' } })}><option value="มิน">มิน · เพื่อนที่ไว้ใจ</option><option value="ฟ้า">ฟ้า · พี่สาว</option></select><label className="check-row"><input type="checkbox" checked={settings.trustedContact.consented} onChange={event => setSettings({ ...settings, trustedContact: { ...settings.trustedContact, consented: event.target.checked } })} /><span>คนนี้ยินยอมรับรายละเอียดจำกัดในตัวอย่าง</span></label><p className="help">เห็นชื่อผู้โอน จำนวนเงิน ชื่อและบัญชีผู้รับแบบปิดบางส่วน และเหตุผลที่เตือน</p></section>
          <section className="card settings-section"><h2><MapPin size={19} /> Trusted Zone</h2><p className="help">อยู่นอกพื้นที่ที่ตั้งไว้จะเพิ่มการทบทวน ถ้าไม่อนุญาตตำแหน่ง ยังใช้รายการตัวอย่างต่อได้</p></section>
          <Notice icon={<Info size={17} />}>กติกาผู้รับที่เฝ้าดูและขั้นตอนกู้คืนเป็นข้อสมมติสำหรับต้นแบบ ยังรอการตัดสินใจของทีม</Notice>
          <Actions><button className="primary" disabled={!Number.isSafeInteger(settings.monthlyLimitBaht) || settings.monthlyLimitBaht <= 0} onClick={() => { setEvaluation(null); setScreen(settingsReturn === 'pause' ? 'review' : settingsReturn) }}>บันทึกในตัวอย่าง <Check size={18} /></button></Actions>
        </>}
      </main>
      <nav className="bottom-nav" aria-label="เมนูหลัก"><button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')}><Home size={20} />หน้าหลัก</button><button className={['entry', 'review', 'pause', 'contact', 'outcome', 'recovery'].includes(screen) ? 'active' : ''} onClick={() => chooseScenario(scenario)}><Send size={20} />โอนเงิน</button><button className={screen === 'settings' ? 'active' : ''} onClick={() => openSettings(screen)}><Settings2 size={20} />ตั้งค่า</button></nav>
    </div>
  </div>
}

function Steps({ current }: { current: number }) { return <div className="steps" aria-label={`ขั้นตอน ${current} จาก 3`}>{[1, 2, 3].map(n => <span key={n} className={n <= current ? 'on' : ''} />)}</div> }
function Heading({ eyebrow, title, detail, centered = false }: { eyebrow: string; title: string; detail: string; centered?: boolean }) { return <div className={`heading ${centered ? 'centered' : ''}`}><span>{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div> }
function Row({ label, value }: { label: string; value: string }) { return <div className="data-row"><span>{label}</span><strong>{value}</strong></div> }
function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) { return <div className="notice">{icon}<span>{children}</span></div> }
function Actions({ children }: { children: React.ReactNode }) { return <div className="actions">{children}</div> }
export default App
