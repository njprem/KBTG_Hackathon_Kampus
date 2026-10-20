import { ArrowRight, Info, MapPin, Send } from 'lucide-react'
import { DEMO_SENDER, type Evaluation, type Recipient } from '../domain/trustguard'
import { ZONE_LABEL, limitStatusLine, contactStatusLine, zoneStatusLine } from '../ui/copy'
import { formatBaht } from '../ui/format'
import { Button, Card, DataRow, Heading, Steps } from '../ui/primitives'

/** With exactly one failed check there is no pause: a quiet note on review, then the user continues. */
function singleFailNote(evaluation: Evaluation, recipient: Recipient) {
  if (evaluation.zone.state === 'fail') return zoneStatusLine(evaluation.zone.status)
  if (evaluation.contact.state === 'fail') return contactStatusLine(evaluation, recipient)
  return limitStatusLine(evaluation)
}

export function ReviewScreen({ evaluation, recipient, amountBaht, paused, onConfirm, onEdit }: {
  evaluation: Evaluation
  recipient: Recipient
  amountBaht: number
  /** True when Smart Pause was opened and dismissed; the hold is kept. */
  paused: boolean
  onConfirm: () => void
  onEdit: () => void
}) {
  return (
    <>
      <Steps current={2} />
      <Heading eyebrow="ก่อนโอน" title="ตรวจสอบอีกครั้ง" detail="ชื่อผู้รับและจำนวนเงินถูกต้องหรือไม่" />

      <Card className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand"><Send size={23} aria-hidden="true" /></span>
        <p className="mt-4 text-[12.5px] text-ink-faint">จำนวนเงินที่ต้องการโอน</p>
        <p className="tabular mt-0.5 text-[34px] font-semibold tracking-tight">{formatBaht(amountBaht)}</p>
        <div className="mt-4 border-t border-line pt-2 text-left">
          <DataRow label="จาก" value={`บัญชีใช้จ่าย ${DEMO_SENDER.maskedAccount}`} />
          <DataRow label="ถึง" value={recipient.name} />
          <DataRow label="บัญชีผู้รับ" value={recipient.maskedAccount} />
          <DataRow label="ตำแหน่ง" value={<span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" />{ZONE_LABEL[evaluation.zone.status]} <span className="text-ink-faint">(จำลอง)</span></span>} />
        </div>
      </Card>

      {evaluation.decision === 'notice' && (
        <div className="mt-3 flex items-start gap-2.5 rounded-[20px] bg-caution-soft px-4 py-3 text-caution" role="note">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[13.5px] leading-snug">
            <span className="block font-semibold">{singleFailNote(evaluation, recipient)}</span>
            <span className="block">ไม่ผ่าน 1 จาก 3 ข้อ ตรวจชื่อผู้รับให้แน่ใจแล้วโอนต่อได้เลย</span>
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-2">
        <Button onClick={onConfirm}>{paused ? 'กลับไปดูคำเตือน' : 'ยืนยันการโอน'} <ArrowRight size={18} /></Button>
        <Button variant="quiet" onClick={onEdit}>แก้ไขรายการ</Button>
      </div>
    </>
  )
}
