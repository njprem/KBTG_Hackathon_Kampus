import { WATCH_PERIOD_DAYS, type Evaluation, type Recipient, type TrustZoneStatus } from '../domain/trustguard'
import { formatBahtShort } from './format'

/** Plain-language meaning of each T, shown when the (i) button is tapped. */
export const MEANING = {
  zone: 'Trust Zone คือพื้นที่ที่คุณโอนเงินเป็นประจำ เช่น บ้านหรือที่ทำงาน ระบบเรียนรู้จากตำแหน่งที่คุณโอนบ่อย ในต้นแบบนี้ใช้ตำแหน่งจำลอง ไม่ใช้พิกัดจริง',
  contact: `Trust Contact คือคนที่คุณไว้ใจ เช่น พ่อแม่ แฟน เพื่อนสนิท โอนให้คนเหล่านี้จะไม่ถูกพักและไม่นับยอด คนที่เพิ่งเพิ่มต้องรอ ${WATCH_PERIOD_DAYS} วันก่อน กันไม่ให้มิจฉาชีพสั่งให้เพิ่มบัญชีของเขา`,
  limit: 'Trust Limit คือวงเงินที่คุณตั้งเองว่าในหนึ่งเดือน จะโอนให้คนที่ไม่ใช่ Trust Contact ได้เท่าไรโดยไม่ต้องหยุดคิด ระบบนับยอดรวมทั้งเดือน การแบ่งโอนทีละน้อยจึงถูกนับรวมด้วย',
} as const

export const ZONE_LABEL: Record<TrustZoneStatus, string> = {
  inside: 'อยู่ใน Trust Zone',
  outside: 'อยู่นอก Trust Zone',
  unavailable: 'ตรวจสอบตำแหน่งไม่ได้',
}

export function zoneStatusLine(status: TrustZoneStatus) {
  if (status === 'inside') return 'คุณอยู่ในพื้นที่ที่โอนเงินเป็นประจำ'
  if (status === 'outside') return 'คุณอยู่นอกพื้นที่ที่โอนเงินเป็นประจำ'
  return 'ตรวจสอบตำแหน่งไม่ได้ จึงไม่นับข้อนี้'
}

export function contactStatusLine(evaluation: Evaluation, recipient: Recipient) {
  const { contact } = evaluation
  if (contact.state === 'pass') return `${recipient.name} เป็น Trust Contact ของคุณ`
  if (contact.inList) return `${recipient.name} เพิ่งถูกเพิ่ม ยังเฝ้าดูอีก ${contact.watchDaysLeft} วัน`
  return `${recipient.name} ไม่ใช่ Trust Contact ของคุณ`
}

export function limitStatusLine(evaluation: Evaluation) {
  const { limit } = evaluation
  if (!limit.counted) return 'โอนให้ Trust Contact ไม่นับยอด'
  const sinceLastConfirm = limit.sinceBaselineBaht !== limit.monthTotalBaht
  const total = formatBahtShort(sinceLastConfirm ? limit.sinceBaselineBaht : limit.monthTotalBaht)
  const cap = formatBahtShort(limit.limitBaht)
  const prefix = sinceLastConfirm ? 'ยอดใหม่หลังยืนยันครั้งก่อน' : 'ยอดเดือนนี้'
  return limit.state === 'fail' ? `${prefix} ${total} ถึงวงเงิน ${cap}` : `${prefix} ${total} จากวงเงิน ${cap}`
}
