import { useRef } from 'react'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Radio } from '@base-ui/react/radio'
import { ArrowRight, CreditCard, ShieldCheck, X } from 'lucide-react'
import { DEMO_RECIPIENTS, type TrustGuardSettings } from '../domain/trustguard'
import { formatBaht } from '../ui/format'
import { Avatar, Button, Card, Heading, Steps, cx } from '../ui/primitives'

export const MAX_DEMO_TRANSFER_BAHT = 1_000_000

export function amountError(input: string, balance: number): string | null {
  if (input === '') return null
  const amount = Number(input)
  if (!Number.isSafeInteger(amount) || amount <= 0) return 'กรอกจำนวนเงินเป็นจำนวนเต็มบาท'
  if (amount > balance) return `ยอดเงินในบัญชีไม่พอ คงเหลือ ${formatBaht(balance)}`
  if (amount > MAX_DEMO_TRANSFER_BAHT) return 'กรอกได้ไม่เกิน ฿1,000,000'
  return null
}

export function TransferScreen({ recipientId, amountInput, balance, settings, onRecipient, onAmount, onNext }: {
  recipientId: string
  amountInput: string
  balance: number
  settings: TrustGuardSettings
  onRecipient: (id: string) => void
  onAmount: (value: string) => void
  onNext: () => void
}) {
  const amountRef = useRef<HTMLInputElement>(null)
  const error = amountError(amountInput, balance)
  const canContinue = amountInput !== '' && error === null
  const selected = DEMO_RECIPIENTS.find((recipient) => recipient.id === recipientId) ?? DEMO_RECIPIENTS[0]
  const selectedTrusted = settings.trustContacts.some((member) => member.recipientId === selected.id)

  return (
    <>
      <Steps current={1} />
      <Heading eyebrow="โอนเงิน" title="โอนให้ใคร เท่าไร" detail="เลือกผู้รับสมมติที่เตรียมไว้สำหรับการทดลอง" />

      <Card className="p-4">
        <h2 id="recipient-label" className="mb-3 text-[13px] font-semibold text-ink-muted">ผู้รับ</h2>
        <RadioGroup value={recipientId} onValueChange={(value) => onRecipient(String(value))} aria-labelledby="recipient-label" className="grid grid-cols-4 gap-1">
          {DEMO_RECIPIENTS.map((recipient, index) => {
            const inList = settings.trustContacts.some((member) => member.recipientId === recipient.id)
            return (
              <label key={recipient.id} className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-2xl py-1">
                <Radio.Root
                  value={recipient.id}
                  aria-label={`${recipient.name}${inList ? ' Trust Contact' : ''}`}
                  className="relative rounded-full p-[3px] ring-2 ring-transparent transition-[box-shadow,transform] duration-200 ease-(--ease-pop) data-checked:scale-105 data-checked:ring-brand-accent"
                >
                  <Avatar name={recipient.name} tone={index} size="xl" />
                  {inList && (
                    <span className="absolute bottom-0 right-0 grid size-5 place-items-center rounded-full bg-pass ring-2 ring-surface" title="Trust Contact">
                      <ShieldCheck size={12} className="text-white" aria-hidden="true" />
                    </span>
                  )}
                </Radio.Root>
                <span className={cx('w-full truncate text-center text-[12.5px]', recipient.id === recipientId ? 'font-semibold text-ink' : 'text-ink-muted')}>{recipient.name}</span>
              </label>
            )
          })}
        </RadioGroup>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-canvas px-3.5 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-brand shadow-card"><CreditCard size={17} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[14px] font-semibold">
              {selected.name}
              {selectedTrusted && <span className="rounded-full bg-pass-soft px-2 py-px text-[11px] font-semibold text-pass">Trust Contact</span>}
            </span>
            <span className="block truncate text-[12.5px] text-ink-muted">{selected.note} · {selected.maskedAccount}</span>
          </span>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <label htmlFor="amount" className="text-[13px] font-semibold text-ink-muted">จำนวนเงิน (บาท)</label>
        <div className={cx('mt-2 flex items-center gap-2 rounded-2xl bg-canvas px-3.5 py-2 ring-2 transition-shadow focus-within:ring-brand-accent', error ? 'ring-fail' : 'ring-transparent')}>
          <span className="text-[26px] font-semibold text-brand" aria-hidden="true">฿</span>
          <input
            ref={amountRef}
            id="amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amountInput === '' ? '' : Number(amountInput).toLocaleString('en-US')}
            onChange={(event) => onAmount(event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
            aria-invalid={error !== null}
            aria-describedby="amount-help"
            className="tabular w-full min-w-0 bg-transparent text-[30px] font-semibold tracking-tight text-ink outline-none placeholder:text-line-strong"
          />
          {amountInput && (
            <button type="button" aria-label="ล้างจำนวนเงิน" onClick={() => { onAmount(''); amountRef.current?.focus() }} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink-faint shadow-card">
              <X size={17} />
            </button>
          )}
        </div>
        <p id="amount-help" className={cx('mt-2 px-1 text-[12.5px]', error ? 'font-medium text-fail' : 'text-ink-faint')} role={error ? 'alert' : undefined}>
          {error ?? `คงเหลือในบัญชี ${formatBaht(balance)}`}
        </p>
      </Card>

      <div className="mt-6">
        <Button disabled={!canContinue} onClick={onNext}>ตรวจสอบรายการ <ArrowRight size={18} /></Button>
      </div>
    </>
  )
}
