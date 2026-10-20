import { useId } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Check, Minus, X } from 'lucide-react'
import type { CheckState } from '../domain/trustguard'
import { InfoMark, cx } from './primitives'

const MARK_LABEL: Record<CheckState, string> = { pass: 'ผ่าน', fail: 'ไม่ผ่าน', unknown: 'ไม่นับ' }

/** Filled round mark in front of each T: green check, red cross, or grey dash. */
function CheckMark({ state }: { state: CheckState }) {
  return (
    <span
      className={cx(
        'grid size-7 shrink-0 place-items-center rounded-full text-white transition-transform duration-300 ease-(--ease-pop) group-data-open:scale-110',
        state === 'pass' ? 'bg-pass' : state === 'fail' ? 'bg-fail' : 'bg-unknown',
      )}
    >
      {state === 'pass' ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : state === 'fail' ? <X size={16} strokeWidth={3} aria-hidden="true" /> : <Minus size={16} strokeWidth={3} aria-hidden="true" />}
    </span>
  )
}

/**
 * One line of the 3T checklist: ✓/✗ mark, name, and an (i) button.
 * Tapping the line opens a card with what happened and what this T means.
 * The card floats over the rows below instead of pushing them down, so Smart Pause never needs to scroll.
 */
export function CheckRow({ name, state, statusLine, meaning, open, onOpenChange }: {
  name: string
  state: CheckState
  statusLine: string
  meaning: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const panelId = useId()
  return (
    <div className={cx('relative border-b border-line last:border-b-0', open && 'z-20')}>
      <button
        type="button"
        data-check-trigger=""
        data-open={open ? '' : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className="group flex min-h-12 w-full items-center gap-3 px-4 text-left short:min-h-11"
      >
        <CheckMark state={state} />
        <span className="flex-1 text-[16px] font-semibold text-ink">{name}</span>
        <span className="sr-only">{MARK_LABEL[state]} แตะเพื่อดูรายละเอียด</span>
        <InfoMark />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            id={panelId}
            role="region"
            aria-label={`${name}: รายละเอียด`}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-x-2 top-[calc(100%-0.25rem)] origin-top rounded-2xl bg-surface px-3.5 py-3 shadow-[0_14px_34px_rgb(16_56_51_/_0.044)] ring-1 ring-line"
          >
            <p className={cx('text-[13.5px] font-semibold leading-snug', state === 'fail' ? 'text-fail' : 'text-ink')}>{statusLine}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{meaning}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
