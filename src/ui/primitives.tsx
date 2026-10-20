import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Info } from 'lucide-react'
import type { CheckState } from '../domain/trustguard'

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'quiet'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-[0_10px_22px_rgb(11_93_88_/_0.048)] hover:bg-brand-strong',
  secondary: 'border border-line-strong bg-surface text-brand hover:bg-brand-tint',
  quiet: 'text-ink-muted hover:bg-brand-tint',
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:active:scale-100',
        'disabled:bg-unknown-soft disabled:text-ink-faint disabled:shadow-none disabled:border-transparent',
        buttonStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-[24px] bg-surface p-5 shadow-card', className)}>{children}</section>
}

const pillStyles: Record<CheckState, string> = {
  pass: 'bg-pass-soft text-pass',
  fail: 'bg-fail-soft text-fail',
  unknown: 'bg-unknown-soft text-unknown',
}
const pillLabels: Record<CheckState, string> = { pass: 'ผ่าน', fail: 'ไม่ผ่าน', unknown: 'ไม่นับ' }

export function StatusPill({ state }: { state: CheckState }) {
  return (
    <span className={cx('inline-flex h-7 min-w-[4.25rem] items-center justify-center rounded-full px-3 text-[13px] font-semibold', pillStyles[state])}>
      {pillLabels[state]}
    </span>
  )
}

/** Thin outlined circle-i, matching the reference icon the team chose. */
export function InfoMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors group-hover:bg-brand-tint group-data-open:bg-brand-soft group-data-open:text-brand"
    >
      <Info size={21} strokeWidth={1.8} />
    </span>
  )
}

/** A heading row with an (i) button; tapping it expands the explanation underneath. */
export function InfoDisclosure({ title, icon, children, label }: { title: ReactNode; icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <Collapsible.Root className="group">
      <Collapsible.Trigger className="flex w-full items-center gap-2.5 rounded-xl text-left" aria-label={label}>
        {icon}
        <span className="flex-1 text-[15px] font-semibold text-ink">{title}</span>
        <InfoMark />
      </Collapsible.Trigger>
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <p className="pt-2 text-[13.5px] leading-relaxed text-ink-muted">{children}</p>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

/** `dense` tightens spacing on short phones (see the `snug` variant in styles.css). */
export function Steps({ current, total = 2, dense = false }: { current: number; total?: number; dense?: boolean }) {
  return (
    <div className={cx('mb-6 flex gap-1.5', dense && 'snug:mb-3 short:mb-2')} role="img" aria-label={`ขั้นตอน ${current} จาก ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={cx('h-1 flex-1 rounded-full', index < current ? 'bg-brand-accent' : 'bg-line')} />
      ))}
    </div>
  )
}

/** `dense` keeps only the title on short phones, where the header already names the step. */
export function Heading({ eyebrow, title, detail, centered = false, dense = false }: { eyebrow?: string; title: string; detail?: string; centered?: boolean; dense?: boolean }) {
  return (
    <div className={cx('mb-6', centered && 'text-center', dense && 'snug:mb-3 short:mb-2')}>
      {eyebrow && <p className={cx('mb-1 text-xs font-semibold tracking-wide text-brand-accent', dense && 'snug:hidden')}>{eyebrow}</p>}
      <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
      {detail && <p className={cx('mt-1.5 text-sm leading-relaxed text-ink-muted', dense && 'snug:hidden')}>{detail}</p>}
    </div>
  )
}

const avatarTones = ['bg-brand-soft text-brand', 'bg-[#efe9fb] text-[#5b3fa8]', 'bg-[#fff0e0] text-[#9a5200]', 'bg-[#e6f0fb] text-[#1f5a99]']

export function Avatar({ name, tone = 0, size = 'md' }: { name: string; tone?: number; size?: 'md' | 'lg' | 'xl' }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-semibold',
        size === 'xl' ? 'size-14 text-xl snug:size-12 snug:text-lg' : size === 'lg' ? 'size-12 text-lg' : 'size-10 text-[15px]',
        avatarTones[tone % avatarTones.length],
      )}
    >
      {name.slice(0, 1)}
    </span>
  )
}

export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-ink-faint">{label}</span>
      <span className="text-right font-medium text-ink [overflow-wrap:anywhere]">{value}</span>
    </div>
  )
}
