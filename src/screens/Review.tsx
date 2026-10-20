import { ArrowRight, Info, MapPin, Send } from 'lucide-react'
import { DEMO_SENDER, type Evaluation, type Recipient } from '../domain/trustguard'
import { ZONE_LABEL, limitStatusLine, contactStatusLine, zoneStatusLine } from '../ui/copy'
import { formatBaht } from '../ui/format'
import { Button, Card, DataRow, Heading, Steps, cx } from '../ui/primitives'

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
  // The amber note needs the room, so the decorative icon steps aside when it shows.
  const hasNote = evaluation.decision === 'notice'
  return (
    <>
      <Steps current={2} dense />
      <Heading dense eyebrow="ก่อนโอน" title="ตรวจสอบอีกครั้ง" detail="ชื่อผู้รับและจำนวนเงินถูกต้องหรือไม่" />

      <Card className="text-center snug:p-4 short:px-4 short:py-3">
        <span className={cx('mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brand-soft text-brand snug:hidden', hasNote && 'hidden')}><Send size={23} aria-hidden="true" /></span>
        <p className="text-[12.5px] text-ink-faint">จำนวนเงินที่ต้องการโอน</p>
        <p className="tabular mt-0.5 text-[34px] font-semibold tracking-tight">{formatBaht(amountBaht)}</p>
        <div className="mt-4 border-t border-line pt-2 text-left snug:mt-3 snug:pt-1 snug:[&>div]:py-1">
          <DataRow label="จาก" value={`บัญชีใช้จ่าย ${DEMO_SENDER.maskedAccount}`} />
          <DataRow label="ถึง" value={recipient.name} />
          <DataRow label="บัญชีผู้รับ" value={recipient.maskedAccount} />
          <DataRow label="ตำแหน่ง" value={<span className="inline-flex items-center gap-1"><MapPin size={14} className="shrink-0" aria-hidden="true" />{evaluation.zone.placeLabel ? `${evaluation.zone.placeLabel} · ` : ''}{ZONE_LABEL[evaluation.zone.status]} <span className="text-ink-faint">(จำลอง)</span></span>} />
        </div>
      </Card>

      {hasNote && (
        <div className="mt-3 flex items-start gap-2.5 rounded-[20px] bg-caution-soft px-4 py-3 text-caution snug:mt-2 snug:py-2.5 short:py-2" role="note">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[13.5px] leading-snug">
            <span className="block font-semibold">{singleFailNote(evaluation, recipient)}</span>
            <span className="block">ไม่ผ่าน 1 จาก 3 ข้อ ตรวจชื่อผู้รับให้แน่ใจแล้วโอนต่อได้เลย</span>
          </p>
        </div>
      )}

      {/* Compact phones: edit on the left, confirm on the right, in one row above the nav. */}
      <div className="mt-auto grid gap-2 pt-6 snug:grid-cols-[2fr_3fr] snug:pt-4">
        <Button onClick={onConfirm} className="snug:col-start-2 snug:row-start-1">{paused ? 'กลับไปดูคำเตือน' : 'ยืนยันการโอน'} <ArrowRight size={18} /></Button>
        <Button variant="secondary" className="snug:col-start-1 snug:row-start-1" onClick={onEdit}>แก้ไขรายการ</Button>
      </div>
    </>
  )
}
