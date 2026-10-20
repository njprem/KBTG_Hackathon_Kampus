import { Collapsible } from '@base-ui/react/collapsible'
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
 * Tapping the line expands what happened and what this T means underneath.
 */
export function CheckRow({ name, state, statusLine, meaning }: {
  name: string
  state: CheckState
  statusLine: string
  meaning: string
}) {
  return (
    <Collapsible.Root className="group border-b border-line last:border-b-0">
      <Collapsible.Trigger className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
        <CheckMark state={state} />
        <span className="flex-1 text-[16px] font-semibold text-ink">{name}</span>
        <span className="sr-only">{MARK_LABEL[state]} แตะเพื่อดูรายละเอียด</span>
        <InfoMark />
      </Collapsible.Trigger>
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="mx-4 mb-3.5 rounded-xl bg-brand-tint px-3.5 py-3">
          <p className={cx('text-[13.5px] font-semibold leading-snug', state === 'fail' ? 'text-fail' : 'text-ink')}>{statusLine}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{meaning}</p>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
